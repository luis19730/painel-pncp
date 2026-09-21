import type { PNCPSearchResponse, PNCPItem, Opportunity } from '@/types'
import { ITEMS } from '@/lib/market-data'

const PNCP_BASE = process.env.NEXT_PUBLIC_PNCP_BASE || 'https://pncp.gov.br/api'
const CACHE_TTL = 120000
const searchCache = new Map<string, { data: PNCPSearchResponse; ts: number }>()

function cacheKey(q: string, page: number): string {
  return `${q}|${page}`
}

async function fetchPNCP(path: string, params: string): Promise<PNCPSearchResponse> {
  const url = `${PNCP_BASE}${path}?${params}`
  const key = cacheKey(url, 0)

  const cached = searchCache.get(key)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    const resp = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      next: { revalidate: 120 },
    })
    clearTimeout(timeout)
    if (!resp.ok) throw new Error(`PNCP API ${resp.status}`)
    const data = await resp.json()
    searchCache.set(key, { data, ts: Date.now() })
    return data
  } catch (e) {
    clearTimeout(timeout)
    throw e
  }
}

export async function searchOpportunities(
  query: string,
  page: number = 1,
  filters?: { uf?: string; modalidade?: string }
): Promise<PNCPSearchResponse> {
  const params = new URLSearchParams({
    q: query,
    tipos_documento: 'edital',
    pagina: String(page),
  })

  const data = await fetchPNCP('/search/', params.toString())

  let items = data.items || data.data || []
  if (filters?.uf) items = items.filter((i) => i.uf === filters.uf)
  if (filters?.modalidade)
    items = items.filter((i) =>
      (i.modalidade_licitacao_nome || '').toLowerCase().includes(filters.modalidade!.toLowerCase())
    )
  return { ...data, items }
}

function detailToItem(detail: any): PNCPItem {
  return {
    numero_controle_pncp: detail.numeroControlePNCP || '',
    orgao_cnpj: detail.orgaoEntidade?.cnpj || '',
    orgao_nome: detail.orgaoEntidade?.razaoSocial || '',
    unidade_nome: detail.unidadeOrgao?.nomeUnidade || '',
    ano: detail.anoCompra || 0,
    numero_sequencial: detail.sequencialCompra || 0,
    description: detail.objetoCompra || '',
    objeto_compra: detail.objetoCompra || '',
    modalidade_licitacao_nome: detail.modalidadeNome || '',
    esfera_nome: detail.orgaoEntidade?.esferaId ? (detail.orgaoEntidade.esferaId === 'F' ? 'Federal' : detail.orgaoEntidade.esferaId === 'E' ? 'Estadual' : detail.orgaoEntidade.esferaId === 'M' ? 'Municipal' : detail.orgaoEntidade.esferaId) : '',
    uf: detail.unidadeOrgao?.ufSigla || '',
    municipio_nome: detail.unidadeOrgao?.municipioNome || '',
    situacao_nome: detail.situacaoCompraNome || '',
    data_publicacao_pncp: detail.dataPublicacaoPncp || '',
    data_fim_vigencia: detail.dataEncerramentoProposta || '',
    valor_global: detail.valorTotalEstimado || detail.valorTotalHomologado || 0,
    item_url: detail.linkSistemaOrigem || '',
    titulo: detail.objetoCompra || '',
    numero: detail.numeroCompra || detail.numeroControlePNCP || '',
  }
}

export async function getOpportunityById(id: string): Promise<PNCPItem | null> {
  const match = id.match(/^(\d{14})-(\d+)-(\d+)\/(\d{4})$/)
  try {
    if (match) {
      const [, cnpj, , seq, ano] = match
      const resp = await fetchWithTimeout(`${PNCP_BASE}/consulta/v1/orgaos/${cnpj}/compras/${ano}/${Number(seq)}`, 8000)
      if (resp.ok) {
        const detail = await resp.json()
        if (detail && detail.numeroControlePNCP) return detailToItem(detail)
      }
    }
    const data = await fetchPNCP('/search/', new URLSearchParams({ q: id, tipos_documento: 'edital', pagina: '1' }).toString())
    const found = (data.items || data.data || []).find((i) => i.numero_controle_pncp === id)
    return found || null
  } catch {
    return null
  }
}

/**
 * URL oficial da listagem de editais do PNCP (fallback quando um registro não
 * possui identificadores suficientes para montar o link específico do edital).
 */
export const PNCP_EDITAIS_URL = 'https://pncp.gov.br/app/editais'

/**
 * FUNÇÃO CENTRAL — gera o endereço oficial do edital no PNCP para um resultado.
 *
 * Usada por todos os componentes que exibem oportunidades (Busca, Oportunidades,
 * Dashboard, Modalidades, Calendário, Favoritos), de modo que o clique leve o
 * usuário ao EDITAL correspondente no site oficial do PNCP — e nunca a uma
 * página interna do painel, nem a uma URL inventada.
 *
 *   - Se já houver um link oficial e específico do PNCP (construído a partir dos
 *     identificadores reais), usa-o.
 *   - Senão, se o campo `id` for o número de controle PNCP
 *     (máscara 99999999999999-1-999999/9999), deriva o link específico da compra.
 *   - Sem identificador suficiente -> NÃO inventa URL; usa a listagem oficial.
 */
export function buildPncpEditalUrl(o: { link?: string | null; id?: string }): string {
  const link = (o.link || '').trim()
  const id = String(o.id || '').trim()
  const m = id.match(/^(\d{14})-(\d+)-(\d+)\/(\d{4})$/)

  // 1) Link oficial e ESPECÍFICO do PNCP já disponível (ex.: app/compras/<cnpj>/<ano>/<seq>).
  //    A listagem genérica (/app/editais) NÃO conta como específico — nesse caso
  //    preferimos montar o deep link a partir do número de controle.
  const ehListagem = /\/app\/editais\/?$/.test(link)
  if (link.startsWith('https://pncp.gov.br/app/') && !ehListagem) return link

  // 2) id no formato do número de controle PNCP -> deep link específico do edital.
  //    `Number(seq)` remove zeros à esquerda (o PNCP usa o sequencial sem padding).
  if (m) {
    const [, cnpj, , seq, ano] = m
    return `https://pncp.gov.br/app/compras/${cnpj}/${ano}/${Number(seq)}`
  }

  // 3) Sem identificador suficiente -> NÃO criar URL fictícia; abrir a listagem oficial.
  return PNCP_EDITAIS_URL
}

export function mapItem(item: PNCPItem): Opportunity {
  const cnpj = item.orgao_cnpj || ''
  const controle = item.numero_controle_pncp || ''
  const itemOrigin = item.item_url
    ? item.item_url.startsWith('http')
      ? item.item_url
      : `https://pncp.gov.br/app${item.item_url.startsWith('/') ? item.item_url : '/' + item.item_url}`
    : null

  return {
    id: controle,
    numero: item.numero || controle,
    objeto: (item.description || item.objeto_compra || '').substring(0, 300),
    orgao: item.orgao_nome || '',
    unidade: item.unidade_nome || '',
    cnpj,
    modalidade: item.modalidade_licitacao_nome || '',
    esfera: item.esfera_nome || '',
    uf: item.uf || '',
    municipio: item.municipio_nome || '',
    situacao: item.situacao_nome || '',
    dataAbertura: item.data_publicacao_pncp || '',
    dataEncerramento: item.data_fim_vigencia || '',
    valor: parseFloat(String(item.valor_global)) || 0,
    link: buildPncpEditalUrl({ link: itemOrigin, id: controle }),
    score: 0,
  }
}

export function mapItems(items: PNCPItem[]): Opportunity[] {
  return items.map(mapItem)
}

/**
 * Indica se o item possui um link real para o PNCP (app/compras/...) capaz de
 * abrir o edital da licitação no site oficial. Retorna false para itens locais
 * (demonstrativos), que não possuem edital real no PNCP, ou para links quebrados.
 */
export function isPncpeditalLink(link: string | null | undefined): boolean {
  return !!link && link.startsWith('https://pncp.gov.br/app/')
}

function mockOpportunities(
  query: string,
  filters?: { uf?: string; modalidade?: string }
): Opportunity[] {
  const q = (query || '').toLowerCase()
  let list = ITEMS
  if (q) {
    list = list.filter(
      (i) =>
        i.nome.toLowerCase().includes(q) ||
        i.descricao.toLowerCase().includes(q) ||
        i.orgao.toLowerCase().includes(q) ||
        i.codigo.includes(q)
    )
  }
  if (filters?.uf) list = list.filter((i) => i.uf === filters.uf)
  if (filters?.modalidade) list = list.filter((i) => i.modalidade.toLowerCase().includes(filters.modalidade!.toLowerCase()))

  return list.map((i) => ({
    id: i.id,
    numero: i.id,
    objeto: `${i.nome} - ${i.descricao}`.substring(0, 300),
    orgao: i.orgao,
    unidade: i.orgao,
    cnpj: i.orgaoCnpj,
    modalidade: i.modalidade,
    esfera: i.municipio,
    uf: i.uf,
    municipio: i.municipio,
    situacao: 'Aberta',
    dataAbertura: i.data,
    dataEncerramento: i.data,
    valor: i.valor,
    link: '#',
    score: 0,
  }))
}

async function fetchWithTimeout(url: string, ms = 8000): Promise<Response> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } })
  } finally {
    clearTimeout(t)
  }
}

/**
 * Busca de oportunidades resiliente: tenta o proxy real do PNCP (direto, com
 * CORS) e, em caso de falha, retorna dados locais estruturados para a API real.
 */
export async function searchOpportunitiesResilient(
  query: string,
  page: number = 1,
  filters?: { uf?: string; modalidade?: string }
): Promise<{ items: Opportunity[]; totalPages: number }> {
  const params = new URLSearchParams({ q: query, tipos_documento: 'edital', pagina: String(page) })

  try {
    const resp = await fetchWithTimeout(`${PNCP_BASE}/search/?${params}`)
    if (!resp.ok) throw new Error(`pncp ${resp.status}`)
    const data = await resp.json()
    let raw = data.items || data.data || []
    if (filters?.uf) raw = raw.filter((i: PNCPItem) => i.uf === filters.uf)
    if (filters?.modalidade)
      raw = raw.filter((i: PNCPItem) =>
        (i.modalidade_licitacao_nome || '').toLowerCase().includes(filters.modalidade!.toLowerCase())
      )
    if (raw.length === 0) throw new Error('no items')
    return { items: mapItems(raw), totalPages: 1 }
  } catch {
    return { items: mockOpportunities(query, filters), totalPages: 1 }
  }
}
