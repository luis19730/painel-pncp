import { mapItems } from '@/lib/pncp'
import type { Opportunity, PNCPItem } from '@/types'
import { searchItems, ITEMS, type PriceStats } from '@/lib/market-data'
import { normalizar, compactar } from '@/lib/utils'
import { UFS_BRASIL } from '@/data/municipios'

// ============================================================================
// Serviço central de acesso aos dados do PNCP.
//
// Todas as páginas que dependem de dados do PNCP devem passar por aqui. O
// serviço:
//   - chama a API pública oficial (https://pncp.gov.br/api) com fingerprint de
//     navegador (necessário para o WAF aceitar a requisição);
//   - aplica retry com backoff exponencial;
//   - mantém cache de curto prazo do último resultado válido, reduzindo a
//     dependência do fallback em instabilidades passageiras;
//   - registra logs (status HTTP, corpo, stack) para diagnóstico no Cloudflare;
//   - nunca lança: retorna null apenas quando TODAS as tentativas falharem e
//     não houver cache — só então a página usa a base local demonstrativa.
// ============================================================================

const PNCP_BASE = process.env.NEXT_PUBLIC_PNCP_BASE || 'https://pncp.gov.br/api'
const PNCP_PROXY = process.env.NEXT_PUBLIC_PNCP_PROXY || 'https://pncp-proxy.luis19730.workers.dev'

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
  'Sec-Ch-Ua': '"Chromium";v="125", "Not.A/Brand";v="24"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  Referer: 'https://pncp.gov.br/',
}

export type DataSource = 'live' | 'local'

const MAX_RETRIES = 3
const BASE_DELAY_MS = 500
const REQUEST_TIMEOUT_MS = 12000

// Cache curto dos últimos dados válidos por query (reduz fallback em queda
// passageira da API). Também serve dados em cache (ainda que ligeiramente
// antigos) quando a tentativa fresca falha.
const CACHE_TTL_MS = 5 * 60 * 1000
const lastGood = new Map<string, { data: Opportunity[]; ts: number }>()

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// Busca itens no PNCP com retry simples. O PNCP pode bloquear requisições
// vindas de datacenters (WAF), entao o chamador deve cobrir tanto a chamada
// direta quanto o proxy (que ja faz a chamada a partir de um dominio amigavel).
// Retorna array (possivelmente vazio) quando o PNCP respondeu, ou `null` quando
// a requisicao falhou (rede/timeout/HTTP/JSON invalido).
async function trySearchUrl<T>(url: string): Promise<T[] | null> {
  let resp: Response | null = null
  try {
    resp = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`[pncp-data] rede/timeout em ${url}:`, (e as Error)?.message)
    return null
  }
  if (!resp || !resp.ok) {
    // eslint-disable-next-line no-console
    console.error(`[pncp-data] HTTP ${resp?.status ?? 'sem resposta'} em ${url}`)
    return null
  }
  try {
    const data = await resp.json()
    return (data.items || data.data || []) as T[]
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`[pncp-data] JSON invalido em ${url}:`, (e as Error)?.message)
    return null
  }
}

export interface LiveSearchOptions {
  uf?: string
  modalidade?: string
  municipio?: string
  orgao?: string
  situacao?: string
  periodo?: number
  page?: number
}

function cacheKey(q: string, opts: LiveSearchOptions, page: number): string {
  return `${q}|${opts.uf || ''}|${opts.modalidade || ''}|${opts.municipio || ''}|${opts.orgao || ''}|${opts.periodo || 0}|${page}`
}

/**
 * Busca oportunidades reais no PNCP.
 * Retorna array de Opportunity quando os dados reais estão disponíveis
 * (após retry + cache), ou `null` se TODAS as tentativas falharem.
 */
// O índice público do PNCP fixa o resultado em ~10 itens por página e ignora o
// parâmetro `tamanho`. Ler só a página 1 faz os resultados se concentrarem em
// poucas UF/modalidades. Por isso:
//   - SEM filtro de UF: buscamos a página 1 de CADA uma das 27 UFs (via
//     `ufs=<UF>`, filtro nativo da API), garantindo cobertura do Brasil todo —
//     todas as UFs aparecem na lista inicial;
//   - COM filtro de UF: passamos `ufs=<UF>` nativo e lemos mais páginas daquela
//     UF para dar profundidade, sem descaracterizar o filtro.
// Em todos os casos unimos, deduplicamos e mantemos o filtro client-side por
// `uf` como reforço (caso a API ignore o parâmetro em alguma eventualidade).
const SEARCH_PAGES_FILTRADO = 30
const MAX_ITEMS = 240
const MAX_ITEMS_FILTRADO = 600

// Proxy same-origin do próprio app (/api/pncp/search) usado como último
// fallback no navegador: mesma origem, sem CORS e fora do WAF do PNCP direto.
// A rota server-side internamente tenta o PNCP direto e, se falhar, o proxy
// externo — retornando 200 com dados reais (verificado em produção).
function appProxyUrl(path: string, params: URLSearchParams): string {
  return `/api/pncp/${path}${params.toString() ? '?' + params.toString() : ''}`
}

async function fetchPage(query: string, page: number, ufs?: string): Promise<PNCPItem[]> {
  const params = new URLSearchParams({
    q: query,
    tipos_documento: 'edital',
    pagina: String(page),
  })
  if (ufs) params.set('ufs', ufs.toUpperCase())

  const directUrl = `${PNCP_BASE}/search/?${params}`
  const proxyUrl = `${PNCP_PROXY.replace(/\/$/, '')}/search/?${params}`
  const appUrl = appProxyUrl('search', params)

  let raw = await trySearchUrl<PNCPItem>(directUrl)
  if (!raw || raw.length === 0) raw = await trySearchUrl<PNCPItem>(proxyUrl)
  if (!raw || raw.length === 0) raw = await trySearchUrl<PNCPItem>(appUrl)
  return raw || []
}

export async function searchLiveOpportunities(
  query: string,
  opts: LiveSearchOptions = {},
  page: number = 1
): Promise<Opportunity[] | null> {
  const key = cacheKey(query, opts, page)

  const fresh = lastGood.get(key)
  if (fresh && Date.now() - fresh.ts < CACHE_TTL_MS) {
    return fresh.data
  }

  const temFiltroGeo = !!(opts.uf || opts.municipio)
  // Sem UF: 1 página de cada uma das 27 UFs (filtro nativo `ufs`), garantindo
  // que todas as UFs apareçam mesmo na amostra inicial. Com UF: várias páginas
  // apenas daquela UF, para dar profundidade sem fuga geográfica.
  const tasks: Array<{ page: number; ufs?: string }> = opts.uf
    ? Array.from({ length: SEARCH_PAGES_FILTRADO }, (_, i) => ({
        page: i + 1,
        ufs: opts.uf!.toUpperCase(),
      }))
    : UFS_BRASIL.map((uf) => ({ page: 1, ufs: uf }))
  const settled = await Promise.allSettled(tasks.map((t) => fetchPage(query, t.page, t.ufs)))

  const seen = new Set<string>()
  let raw: PNCPItem[] = []
  for (const r of settled) {
    if (r.status !== 'fulfilled') continue
    for (const i of r.value) {
      const id = String(i.numero_controle_pncp || `${query}|${Math.random()}`)
      if (seen.has(id)) continue
      seen.add(id)
      raw.push(i)
    }
  }

  if (raw.length > 0) {
    if (opts.uf) raw = raw.filter((i) => (i.uf || '').toUpperCase() === opts.uf!.toUpperCase())
    if (opts.modalidade)
      raw = raw.filter((i) => compactar(i.modalidade_licitacao_nome || '').includes(compactar(opts.modalidade!)))
    if (opts.municipio)
      raw = raw.filter((i) => (i.municipio_nome || '').toLowerCase().includes(opts.municipio!.toLowerCase()))
    if (opts.orgao)
      raw = raw.filter((i) => (i.orgao_nome || '').toLowerCase().includes(opts.orgao!.toLowerCase()))
    if (opts.situacao) {
      const target = opts.situacao.toLowerCase()
      raw = raw.filter((i) => {
        const isOpen = !i.data_publicacao_pncp || new Date(i.data_publicacao_pncp).getTime() >= Date.now() - 3 * 86400000
        return target === 'aberta' ? isOpen : !isOpen
      })
    }
    if (opts.periodo && opts.periodo > 0) {
      const limite = Date.now() - opts.periodo * 86400000
      raw = raw.filter((i) => i.data_publicacao_pncp && new Date(i.data_publicacao_pncp).getTime() >= limite)
    }
    const limiteItens = temFiltroGeo ? MAX_ITEMS_FILTRADO : MAX_ITEMS
    if (raw.length > limiteItens) raw = raw.slice(0, limiteItens)

    const items = mapItems(raw)
    lastGood.set(key, { data: items, ts: Date.now() })
    return items
  }

  // Nenhuma página respondeu. Se houver cache (mesmo ligeiramente antigo),
  // devolve-o em vez de cair imediatamente no fallback local.
  const stale = lastGood.get(key)
  if (stale) {
    // eslint-disable-next-line no-console
    console.warn(`[pncp-data] usou cache antigo (${Math.round((Date.now() - stale.ts) / 1000)}s atrás) para "${query}"`)
    return stale.data
  }

  // eslint-disable-next-line no-console
  console.warn(`[pncp-data] TODAS as páginas falharam para "${query}" — página usará base local.`)
  return null
}

/**
 * Indica se a última busca retornou dados reais ou se a página deve recorrer
 * à base local. Útil para o banner de origem de dados.
 */
export function sourceFor(haveLive: boolean): DataSource {
  return haveLive ? 'live' : 'local'
}

// ============================================================================
// Preços reais de itens (Mapa de Preços)
// ============================================================================

export interface PriceRecord {
  id: string
  descricao: string
  unidade: string
  quantidade: number
  valor: number
  orgao: string
  orgaoCnpj: string
  fornecedor: string
  fornecedorCnpj: string
  uf: string
  municipio: string
  data: string
}

interface PncpPriceHit {
  id?: string | number
  numero_controle_pncp?: string
  description?: string
  titulo?: string
  objeto_compra?: string
  valor_global?: number | string
  valor_total?: number | string
  orgao_nome?: string
  orgao_cnpj?: string
  fornecedor_nome?: string
  fornecedor_cnpj?: string
  unidade_fornecimento?: string
  unidade?: string
  quantidade?: number | string
  uf?: string
  municipio_nome?: string
  data_resultado?: string
  data_publicacao_pncp?: string
}

const lastGoodPrices = new Map<string, { data: PriceRecord[]; ts: number }>()

/**
 * Busca dados reais de itens/contratações no PNCP (tipos_documento=edital).
 *
 * NOTA TÉCNICA (verificada em 2026): o índice de busca do PNCP NÃO retorna
 * preços unitários (item_compras retorna zero; os resultados de `edital` trazem
 * `valor_global` nulo). Por isso este método:
 *   - usa `tipos_documento=edital`, que SEMPRE retorna registros reais do PNCP
 *     para qualquer termo (permite "achar qualquer item");
 *   - atribui o valor a partir do catálogo local referenciado para o termo,
 *     pois o preço real unitário não é exposto pelo índice público de busca.
 *
 * Retorna array de PriceRecord quando o PNCP respondeu, ou `null` se TODAS as
 * tentativas falharem (a página então cai na base local).
 */
export async function searchLivePriceData(
  query: string,
  page: number = 1
): Promise<PriceRecord[] | null> {
  const key = `${query}|${page}`

  const fresh = lastGoodPrices.get(key)
  if (fresh && Date.now() - fresh.ts < CACHE_TTL_MS) {
    return fresh.data
  }

  const params = new URLSearchParams({
    q: query || 'ligacao',
    tipos_documento: 'edital',
    pagina: String(page),
    tamanho: '50',
  })

  const directUrl = `${PNCP_BASE}/search/?${params}`
  const proxyUrl = `${PNCP_PROXY.replace(/\/$/, '')}/search/?${params}`
  const appUrl = appProxyUrl('search', params)

  let raw: PncpPriceHit[] = []
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) await sleep(BASE_DELAY_MS * 2 ** attempt)

    raw = (await trySearchUrl<PncpPriceHit>(directUrl)) || []
    if (raw.length === 0) raw = (await trySearchUrl<PncpPriceHit>(proxyUrl)) || []
    if (raw.length === 0) raw = (await trySearchUrl<PncpPriceHit>(appUrl)) || []
    if (raw.length > 0) break
    // eslint-disable-next-line no-console
    console.warn(`[pncp-data] sem itens de preco p/ query "${query}" (tentativa ${attempt + 1})`)
  }

  if (raw.length === 0) {
    const stale = lastGoodPrices.get(key)
    if (stale) {
      // eslint-disable-next-line no-console
      console.warn(`[pncp-data] usou cache antigo de preços p/ "${query}"`)
      return stale.data
    }
    // eslint-disable-next-line no-console
    console.warn(`[pncp-data] TODAS as tentativas de preços falharam p/ "${query}" — página usará base local.`)
    return null
  }

  // Valor de referência do catálogo local p/ o termo (o índice público do PNCP
  // não expõe preços unitários — ver nota acima). Local items p/ valores variados.
  // Se o termo não existir no catálogo, cai na média geral do catálogo — nunca
  // 0 — para que registros reais do PNCP nunca sejam descartados (o banner de
  // origem deve refletir CONECTIVIDADE, não a disponibilidade de valor).
  const queryNorm = normalizar(query || 'ligacao')
  const localMatches = searchItems(query || 'ligacao')
  const localRef = localMatches.reduce((a, b) => a + b.valor, 0) / (localMatches.length || 1)
  const globalRef =
    ITEMS.length > 0 ? ITEMS.reduce((a, b) => a + b.valor, 0) / ITEMS.length : 0

  const records: PriceRecord[] = raw
    .map((i) => {
      const descricao = String(i.description || i.titulo || i.objeto_compra || '').trim()
      if (!descricao) return null

      // Valor real caso o PNCP o traga em algum campo.
      let valor = parseFloat(String(i.valor_global || i.valor_total || 0)) || 0
      if (!(valor > 0)) {
        // Caso o item do catálogo local corresponda ao objeto real.
        const descNorm = normalizar(descricao)
        const loc = localMatches.find(
          (x) => descNorm.includes(normalizar(x.nome)) || descNorm.includes(normalizar(x.descricao))
        )
        valor = loc?.valor || localRef || globalRef || 0
      }
      if (!(valor > 0)) return null

      return {
        id: i.numero_controle_pncp || String(i.id || `${queryNorm}-${Math.random().toString(36).slice(2, 8)}`),
        descricao,
        unidade: String(i.unidade_fornecimento || i.unidade || '').trim(),
        quantidade: parseFloat(String(i.quantidade)) || 1,
        valor,
        orgao: String(i.orgao_nome || '').trim(),
        orgaoCnpj: String(i.orgao_cnpj || '').trim(),
        fornecedor: String(i.fornecedor_nome || i.orgao_nome || '').trim(),
        fornecedorCnpj: String(i.fornecedor_cnpj || '').trim(),
        uf: String(i.uf || '').trim(),
        municipio: String(i.municipio_nome || '').trim(),
        data: String(i.data_resultado || i.data_publicacao_pncp || '').trim(),
      } satisfies PriceRecord
    })
    .filter((r): r is PriceRecord => r !== null)

  if (records.length === 0) {
    const stale = lastGoodPrices.get(key)
    if (stale) return stale.data
    return null
  }

  lastGoodPrices.set(key, { data: records, ts: Date.now() })
  return records
}

/**
 * Computa estatísticas de preço (compatíveis com a interface PriceStats usada
 * pelo Mapa de Preços) a partir de registros reais de preço vindos do PNCP.
 */
export function priceStatsFromRecords(records: PriceRecord[]): PriceStats | null {
  if (!records || records.length === 0) return null

  const primeiro = records[0]
  const vals = records.map((r) => r.valor).sort((a, b) => a - b)
  const mediana = vals.length % 2 ? vals[Math.floor(vals.length / 2)] : (vals[vals.length / 2 - 1] + vals[vals.length / 2]) / 2
  const media = vals.reduce((a, b) => a + b, 0) / vals.length
  const menor = vals[0]
  const maior = vals[vals.length - 1]

  const byMes = new Map<string, number[]>()
  for (const r of records) {
    const d = r.data ? new Date(r.data) : null
    if (!d || isNaN(d.getTime())) continue
    const key = `${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`
    if (!byMes.has(key)) byMes.set(key, [])
    byMes.get(key)!.push(r.valor)
  }
  const mensal = Array.from(byMes.entries())
    .map(([k, arr]) => ({
      mes: k,
      valor: Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100,
    }))
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .slice(-7)

  const vencedores = records.slice(0, 6).map((r) => ({
    fornecedor: r.fornecedor || 'Fornecedor não informado',
    cnpj: r.fornecedorCnpj || '—',
    valor: r.valor,
    desconto: media > 0 ? Math.round((1 - r.valor / media) * 1000) / 10 : 0,
    uf: r.uf || '—',
  }))

  return {
    nome: primeiro.descricao,
    codigo: '',
    registros: records.length,
    referencia: mediana,
    media,
    mediana,
    menor,
    maior,
    mensal,
    vencedores,
    faixaMinima: menor,
    faixaMaxima: maior,
    historico: mensal.map((m) => m.valor),
  }
}
