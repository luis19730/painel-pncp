// ============================================================================
// Extração da BASE DE FORNECEDORES (vencedores e licitantes) a partir do PNCP.
//
// Para cada contratação:
//   1. lê os ITENS (`/itens`) e seleciona os que têm resultado (`temResultado`);
//   2. para cada item, lê os RESULTADOS (`/itens/{n}/resultados`), que trazem a
//      razão social, CNPJ, porte, natureza jurídica, valores e a ordem de
//      classificação de cada participante/vencedor;
//   3. grava uma linha por (contratação, item, CNPJ, ranking) em
//      `fornecedor_participacoes` e recalcula os agregados em `fornecedores`.
//
// O PNCP NÃO publica e-mail de fornecedor (dado pessoal); esta base guarda os
// dados PÚBLICOS (nome + CNPJ + valores). Nunca inventa e-mail.
//
// Nunca lança: falhas viram `status` em `fornecedor_extracoes`.
// ============================================================================

import type { SupabaseClient } from '@supabase/supabase-js'

type AnyClient = SupabaseClient<any, 'public', any>

const PNCP_BASE = process.env.NEXT_PUBLIC_PNCP_BASE || 'https://pncp.gov.br/api'
const PNCP_PROXY =
  process.env.NEXT_PUBLIC_PNCP_PROXY || 'https://pncp-proxy.luis19730.workers.dev'

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  Accept: 'application/json',
  'Accept-Language': 'pt-BR,pt;q=0.9',
  Referer: 'https://pncp.gov.br/',
}

// Orçamentos para não estourar CPU/tempo do Worker.
const MAX_ITENS_RESULTADO = 15
const MAX_FETCHES_BUSCA = 6
const MAX_PAGINAS = 4
const BUDGET_LOTE_MS = 18_000

export type StatusFornecedor = 'ok' | 'sem_resultado' | 'falha'

export interface EditalAlvo {
  pncp_id: string
  orgao_cnpj: string
  orgao_nome: string
  uf: string
  municipio: string
  numero: string
  data_publicacao: string | null
}

interface ItemPncp {
  numeroItem?: number
  temResultado?: boolean
}

interface ResultadoPncp {
  sequencialResultado?: number
  niFornecedor?: string
  nomeRazaoSocialFornecedor?: string
  porteFornecedorNome?: string
  naturezaJuridicaNome?: string
  tipoPessoa?: string
  valorUnitarioHomologado?: number | string | null
  quantidadeHomologada?: number | string | null
  valorTotalHomologado?: number | string | null
  situacaoCompraItemResultadoNome?: string
  dataResultado?: string | null
}

function parsePncpId(pncpId: string): { cnpj: string; seq: string; ano: string } | null {
  const m = /^(\d{14})-\d+-(\d+)\/(\d{4})$/.exec(String(pncpId || '').trim())
  if (!m) return null
  return { cnpj: m[1], seq: m[2], ano: m[3] }
}

async function getJson(path: string): Promise<unknown | null> {
  const urls = [`${PNCP_BASE}${path}`, `${PNCP_PROXY.replace(/\/$/, '')}${path}`]
  for (const u of urls) {
    try {
      const resp = await fetch(u, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(20000) })
      if (!resp.ok) continue
      return await resp.json()
    } catch {
      /* tenta a próxima fonte */
    }
  }
  return null
}

/** Uma linha de participação pronta para persistir. */
interface ParticipacaoRow {
  cnpj: string
  razao_social: string | null
  porte: string | null
  natureza_juridica: string | null
  tipo_pessoa: string | null
  pncp_id: string
  numero_item: number
  orgao_cnpj: string | null
  orgao_nome: string | null
  uf: string | null
  municipio: string | null
  sequencial_resultado: number | null
  situacao: string | null
  valor_unitario_homologado: number | null
  quantidade_homologada: number | null
  valor_total_homologado: number | null
  data_resultado: string | null
}

function num(v: unknown): number | null {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

async function registrarFornecedorExtracao(
  client: AnyClient,
  alvo: EditalAlvo,
  dados: { status: StatusFornecedor; itensComResultado: number; fornecedores: number; motivo?: string }
): Promise<void> {
  try {
    await client.from('fornecedor_extracoes').upsert(
      {
        pncp_id: alvo.pncp_id,
        orgao_cnpj: alvo.orgao_cnpj || null,
        orgao_nome: alvo.orgao_nome || null,
        uf: alvo.uf || null,
        municipio: alvo.municipio || null,
        numero: alvo.numero || null,
        data_publicacao: alvo.data_publicacao || null,
        itens_com_resultado: dados.itensComResultado,
        fornecedores: dados.fornecedores,
        status: dados.status,
        motivo: dados.motivo ?? null,
        processado_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'pncp_id' }
    )
  } catch {
    /* best-effort */
  }
}

/**
 * Processa UMA contratação: lê itens com resultado, busca os participantes e
 * persiste. Nunca lança.
 */
export async function processarEditalFornecedores(
  client: AnyClient,
  alvo: EditalAlvo
): Promise<{ status: StatusFornecedor; fornecedores: number; itens: number }> {
  try {
    const parsed = parsePncpId(alvo.pncp_id)
    if (!parsed || !alvo.orgao_cnpj) {
      await registrarFornecedorExtracao(client, alvo, { status: 'falha', itensComResultado: 0, fornecedores: 0, motivo: 'sem_identificador' })
      return { status: 'falha', fornecedores: 0, itens: 0 }
    }
    const base = `/pncp/v1/orgaos/${parsed.cnpj}/compras/${parsed.ano}/${Number(parsed.seq)}`

    const itensRaw = await getJson(`${base}/itens`)
    const itens: ItemPncp[] = Array.isArray(itensRaw)
      ? (itensRaw as ItemPncp[])
      : ((itensRaw as { data?: ItemPncp[] })?.data || [])
    const comResultado = itens.filter((i) => i.temResultado && Number(i.numeroItem) > 0).slice(0, MAX_ITENS_RESULTADO)

    if (comResultado.length === 0) {
      await registrarFornecedorExtracao(client, alvo, { status: 'sem_resultado', itensComResultado: 0, fornecedores: 0, motivo: 'sem_item_com_resultado' })
      return { status: 'sem_resultado', fornecedores: 0, itens: 0 }
    }

    const rows: ParticipacaoRow[] = []
    for (const item of comResultado) {
      const n = Number(item.numeroItem)
      const resRaw = await getJson(`${base}/itens/${n}/resultados`)
      const res: ResultadoPncp[] = Array.isArray(resRaw)
        ? (resRaw as ResultadoPncp[])
        : ((resRaw as { data?: ResultadoPncp[] })?.data || [])
      for (const r of res) {
        const cnpj = String(r.niFornecedor || '').replace(/\D/g, '')
        if (!cnpj) continue
        rows.push({
          cnpj,
          razao_social: r.nomeRazaoSocialFornecedor || null,
          porte: r.porteFornecedorNome || null,
          natureza_juridica: r.naturezaJuridicaNome || null,
          tipo_pessoa: r.tipoPessoa || null,
          pncp_id: alvo.pncp_id,
          numero_item: n,
          orgao_cnpj: alvo.orgao_cnpj || null,
          orgao_nome: alvo.orgao_nome || null,
          uf: alvo.uf || null,
          municipio: alvo.municipio || null,
          sequencial_resultado: num(r.sequencialResultado),
          situacao: r.situacaoCompraItemResultadoNome || null,
          valor_unitario_homologado: num(r.valorUnitarioHomologado),
          quantidade_homologada: num(r.quantidadeHomologada),
          valor_total_homologado: num(r.valorTotalHomologado),
          data_resultado: r.dataResultado || null,
        })
      }
    }

    if (rows.length === 0) {
      await registrarFornecedorExtracao(client, alvo, { status: 'sem_resultado', itensComResultado: comResultado.length, fornecedores: 0, motivo: 'sem_participante' })
      return { status: 'sem_resultado', fornecedores: 0, itens: comResultado.length }
    }

    // Insere participações (idempotente por chave única).
    const { error } = await client
      .from('fornecedor_participacoes')
      .upsert(rows, { onConflict: 'pncp_id,numero_item,cnpj,sequencial_resultado', ignoreDuplicates: true })
    if (error) throw error

    // Recalcula os agregados dos CNPJs afetados.
    const cnpjs = Array.from(new Set(rows.map((r) => r.cnpj)))
    try {
      await client.rpc('recalcular_fornecedores', { p_cnpjs: cnpjs })
    } catch {
      /* agregação é best-effort; participações já estão gravadas */
    }

    await registrarFornecedorExtracao(client, alvo, { status: 'ok', itensComResultado: comResultado.length, fornecedores: cnpjs.length })
    return { status: 'ok', fornecedores: cnpjs.length, itens: comResultado.length }
  } catch (e) {
    const motivo = (e as Error)?.message || 'erro_desconhecido'
    await registrarFornecedorExtracao(client, alvo, { status: 'falha', itensComResultado: 0, fornecedores: 0, motivo })
    return { status: 'falha', fornecedores: 0, itens: 0 }
  }
}

// ---------------------------------------------------------------------------
// Candidatos: mesma busca pública do app (várias consultas x páginas),
// priorizando contratações ainda não processadas.
// ---------------------------------------------------------------------------
const CONSULTAS = [
  'licitacao', 'pregao', 'dispensa', 'concorrencia', 'credenciamento',
  'aquisicao', 'contratacao', 'registro de precos', 'obra', 'servico',
]

interface SearchItemRaw {
  numero_controle_pncp?: string
  orgao_cnpj?: string
  orgao_nome?: string
  uf?: string
  municipio_nome?: string
  numero_compra?: string
  data_publicacao_pncp?: string
}

async function fetchSearch(q: string, pagina: number): Promise<SearchItemRaw[]> {
  const params = new URLSearchParams({ q, tipos_documento: 'edital', ordenacao: '-data', pagina: String(pagina) })
  const urls = [`${PNCP_BASE}/search/?${params}`, `${PNCP_PROXY.replace(/\/$/, '')}/search/?${params}`]
  for (const u of urls) {
    try {
      const resp = await fetch(u, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(20000) })
      if (!resp.ok) continue
      const data = await resp.json()
      const arr = Array.isArray(data) ? data : data?.items || data?.data || []
      if (Array.isArray(arr) && arr.length > 0) return arr as SearchItemRaw[]
    } catch {
      /* tenta a próxima fonte */
    }
  }
  return []
}

function itemParaAlvo(it: SearchItemRaw): EditalAlvo | null {
  const id = String(it.numero_controle_pncp || '').trim()
  if (!id || !it.orgao_cnpj) return null
  return {
    pncp_id: id,
    orgao_cnpj: it.orgao_cnpj,
    orgao_nome: it.orgao_nome || '',
    uf: it.uf || '',
    municipio: it.municipio_nome || '',
    numero: String(it.numero_compra || id),
    data_publicacao: it.data_publicacao_pncp || null,
  }
}

async function buscarAlvos(pular: Set<string>, lim: number): Promise<EditalAlvo[]> {
  const pool = Math.max(lim, 12)
  const achados = new Map<string, EditalAlvo>()
  let fetches = 0
  for (const q of CONSULTAS) {
    for (let pagina = 1; pagina <= MAX_PAGINAS; pagina++) {
      if (fetches >= MAX_FETCHES_BUSCA) break
      fetches++
      const items = await fetchSearch(q, pagina)
      if (items.length === 0) break
      for (const it of items) {
        const alvo = itemParaAlvo(it)
        if (!alvo || pular.has(alvo.pncp_id) || achados.has(alvo.pncp_id)) continue
        achados.set(alvo.pncp_id, alvo)
      }
      if (achados.size >= pool) break
    }
    if (achados.size >= pool || fetches >= MAX_FETCHES_BUSCA) break
  }
  return [...achados.values()].slice(0, lim)
}

export interface ResumoFornecedoresLote {
  limite: number
  candidatos: number
  processados: number
  fornecedores: number
  resumo: Record<string, number>
  resultados: Array<{ pncp_id: string; status: StatusFornecedor; fornecedores: number; itens: number }>
}

/**
 * Executa um LOTE: descobre contratações, extrai vencedores/licitantes e
 * atualiza a base. Pula as já resolvidas (ok) e reexamina `sem_resultado`
 * antigas (> 3 dias) — o resultado pode ter sido publicado depois.
 */
export async function executarLoteFornecedores(
  client: AnyClient,
  limite: number
): Promise<ResumoFornecedoresLote> {
  const lim = Math.min(20, Math.max(1, Math.floor(limite) || 1))

  const pular = new Set<string>()
  try {
    const { data } = await client
      .from('fornecedor_extracoes')
      .select('pncp_id,status,processado_em')
      .limit(20000)
    const limiteRetry = Date.now() - 3 * 24 * 60 * 60 * 1000
    for (const r of data || []) {
      const id = String(r.pncp_id || '')
      if (!id) continue
      if (r.status === 'ok') {
        pular.add(id)
      } else if (r.status === 'sem_resultado') {
        const t = r.processado_em ? new Date(r.processado_em).getTime() : 0
        if (t > limiteRetry) pular.add(id)
      }
      // 'falha' -> retenta
    }
  } catch {
    /* segue sem cache */
  }

  const alvos = await buscarAlvos(pular, lim)
  if (alvos.length === 0) {
    return { limite: lim, candidatos: 0, processados: 0, fornecedores: 0, resumo: {}, resultados: [] }
  }

  const resumo: Record<string, number> = { ok: 0, sem_resultado: 0, falha: 0 }
  const resultados: ResumoFornecedoresLote['resultados'] = []
  let totalFornecedores = 0
  const inicio = Date.now()

  for (const alvo of alvos) {
    if (Date.now() - inicio > BUDGET_LOTE_MS) break
    const r = await processarEditalFornecedores(client, alvo)
    resumo[r.status] = (resumo[r.status] || 0) + 1
    totalFornecedores += r.fornecedores
    resultados.push({ pncp_id: alvo.pncp_id, status: r.status, fornecedores: r.fornecedores, itens: r.itens })
    await new Promise((s) => setTimeout(s, 250))
  }

  return {
    limite: lim,
    candidatos: alvos.length,
    processados: resultados.length,
    fornecedores: totalFornecedores,
    resumo,
    resultados,
  }
}
