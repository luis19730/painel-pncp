// ============================================================================
// Camada de acesso aos dados REAIS do PNCP para o módulo de Concorrentes.
//
// Fontes públicas oficiais utilizadas (https://pncp.gov.br/api/consulta):
//   - GET /v1/contratos            -> contratos firmados (ÚNICA fonte pública que
//                                      expõe o fornecedor: nomeRazaoSocialFornecedor
//                                      e niFornecedor). Filtra por data/cnpjOrgao.
//   - GET /v1/contratacoes/publicacao -> avisos/contratações publicadas por
//                                      modalidade + UF + município + período.
//                                      (não traz fornecedor no nível de lista).
//
// Nenhum dado é inventado. Registros de contrato carregam fornecedor; registros
// de contratação não carregam (o PNCP não expõe vencedor na listagem pública).
// Quando não houver fornecedor, a UI mostra "não identificado / dados
// insuficientes" — nunca um valor fictício.
// ============================================================================

import type {
  RegistroPNCP,
  FonteRegistro,
  ResultadoConsulta,
} from './types'

const PNCP_BASE = process.env.NEXT_PUBLIC_PNCP_BASE || 'https://pncp.gov.br/api'
const CONSULTA_BASE = `${PNCP_BASE}/consulta`
const PNCP_PROXY = process.env.NEXT_PUBLIC_PNCP_PROXY || 'https://pncp-proxy.luis19730.workers.dev'

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
  'Referer': 'https://pncp.gov.br/',
}

const MAX_RETRIES = 3
const BASE_DELAY_MS = 600
const TIMEOUT_MS = 15000

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

async function fetchJson(url: string): Promise<unknown | null> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) await sleep(BASE_DELAY_MS * 2 ** attempt)
    let resp: Response | null = null
    try {
      resp = await fetch(url, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(TIMEOUT_MS) })
    } catch {
      continue
    }
    if (!resp || !resp.ok) {
      if (resp && (resp.status === 429 || resp.status >= 500)) {
        // espera maior em rate-limit / erro do servidor
        await sleep(BASE_DELAY_MS * 4 * (attempt + 1))
        continue
      }
      continue
    }
    try {
      return await resp.json()
    } catch {
      continue
    }
  }
  return null
}

// Tenta direto no PNCP e depois no proxy (mesma seleção usada nas outras páginas).
async function fetchConsulta(path: string, params: URLSearchParams): Promise<unknown | null> {
  const direct = `${CONSULTA_BASE}${path}?${params.toString()}`
  const proxy = `${PNCP_PROXY.replace(/\/$/, '')}${path}?${params.toString()}`
  let data = await fetchJson(direct)
  if (!data) data = await fetchJson(proxy)
  return data
}

function str(v: unknown): string {
  return v == null ? '' : String(v).trim()
}

function num(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function esferaNome(esferaId: unknown): string {
  const s = str(esferaId).toUpperCase()
  if (s === 'F') return 'Federal'
  if (s === 'E') return 'Estadual'
  if (s === 'M') return 'Municipal'
  return s ? 'Esfera ' + s : ''
}

function poderNome(poderId: unknown): string {
  const s = str(poderId).toUpperCase()
  if (s === 'E') return 'Executivo'
  if (s === 'L') return 'Legislativo'
  if (s === 'J') return 'Judiciário'
  return s ? 'Poder ' + s : ''
}

// ---- Normalização de CONTRATO (fonte com fornecedor) ----
export interface ContratoRaw {
  numeroControlePNCP?: string
  numeroContratoEmpenho?: string
  objetoContrato?: string
  valorGlobal?: number | string
  valorInicial?: number | string
  nomeRazaoSocialFornecedor?: string
  niFornecedor?: string
  dataPublicacaoPncp?: string
  dataAssinatura?: string
  dataVigenciaInicio?: string
  dataVigenciaFim?: string
  numeroControlePncpCompra?: string
  urlCipi?: string
  orgaoEntidade?: { cnpj?: string; razaoSocial?: string; esferaId?: string; poderId?: string }
  unidadeOrgao?: { nomeUnidade?: string; ufSigla?: string; municipioNome?: string; codigoIbge?: string }
}

export function normalizarContrato(raw: ContratoRaw): RegistroPNCP | null {
  const id = str(raw.numeroControlePNCP)
  if (!id) return null
  return {
    fonte: 'contrato',
    id,
    numero: str(raw.numeroContratoEmpenho) || str(raw.numeroControlePncpCompra) || id,
    objeto: str(raw.objetoContrato),
    orgao: str(raw.orgaoEntidade?.razaoSocial),
    orgaoCnpj: str(raw.orgaoEntidade?.cnpj),
    unidade: str(raw.unidadeOrgao?.nomeUnidade),
    uf: str(raw.unidadeOrgao?.ufSigla).toUpperCase(),
    municipio: str(raw.unidadeOrgao?.municipioNome),
    codigoIbge: str(raw.unidadeOrgao?.codigoIbge),
    esfera: esferaNome(raw.orgaoEntidade?.esferaId),
    poder: poderNome(raw.orgaoEntidade?.poderId),
    modalidade: 'Contrato',
    fornecedor: str(raw.nomeRazaoSocialFornecedor) || null,
    fornecedorCnpj: str(raw.niFornecedor) || null,
    valor: num(raw.valorGlobal) ?? num(raw.valorInicial),
    dataPublicacao: str(raw.dataPublicacaoPncp),
    dataAssinatura: str(raw.dataAssinatura) || null,
    situacao: 'Contrato firmado',
    link: str(raw.urlCipi),
  }
}

// ---- Normalização de CONTRATAÇÃO (publicação; sem fornecedor) ----
export interface ContratacaoRaw {
  numeroControlePNCP?: string
  numeroCompra?: string
  objetoCompra?: string
  valorTotalHomologado?: number | string
  valorTotalEstimado?: number | string
  modalidadeNome?: string
  situacaoCompraNome?: string
  dataPublicacaoPncp?: string
  dataAberturaProposta?: string
  linkSistemaOrigem?: string
  linkProcessoEletronico?: string
  orgaoEntidade?: { cnpj?: string; razaoSocial?: string; esferaId?: string; poderId?: string }
  unidadeOrgao?: { nomeUnidade?: string; ufSigla?: string; municipioNome?: string; codigoIbge?: string }
}

export function normalizarContratacao(raw: ContratacaoRaw): RegistroPNCP | null {
  const id = str(raw.numeroControlePNCP)
  if (!id) return null
  return {
    fonte: 'contratacao',
    id,
    numero: str(raw.numeroCompra) || id,
    objeto: str(raw.objetoCompra),
    orgao: str(raw.orgaoEntidade?.razaoSocial),
    orgaoCnpj: str(raw.orgaoEntidade?.cnpj),
    unidade: str(raw.unidadeOrgao?.nomeUnidade),
    uf: str(raw.unidadeOrgao?.ufSigla).toUpperCase(),
    municipio: str(raw.unidadeOrgao?.municipioNome),
    codigoIbge: str(raw.unidadeOrgao?.codigoIbge),
    esfera: esferaNome(raw.orgaoEntidade?.esferaId),
    poder: poderNome(raw.orgaoEntidade?.poderId),
    modalidade: str(raw.modalidadeNome),
    fornecedor: null, // PNCP não expõe vencedor na listagem pública de contratações
    fornecedorCnpj: null,
    valor: num(raw.valorTotalHomologado) ?? num(raw.valorTotalEstimado),
    dataPublicacao: str(raw.dataPublicacaoPncp),
    dataAssinatura: null,
    situacao: str(raw.situacaoCompraNome),
    link: str(raw.linkSistemaOrigem) || str(raw.linkProcessoEletronico),
  }
}

// ---- Consulta ----

function fmtData(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${dd}`
}

export interface ConsultaContractOptions {
  inicio: string // yyyyMMdd
  fim: string
  cnpjOrgao?: string
  pagina?: number
  tamanho?: number
}

export async function buscarContratos(
  opts: ConsultaContractOptions
): Promise<{ registros: RegistroPNCP[]; total: number; pagina: number; totalPaginas: number; paginasRestantes: number } | null> {
  const params = new URLSearchParams({
    dataInicial: opts.inicio,
    dataFinal: opts.fim,
    pagina: String(opts.pagina || 1),
    tamanhoPagina: String(Math.min(Math.max(opts.tamanho || 50, 10), 500)),
  })
  if (opts.cnpjOrgao) params.set('cnpjOrgao', opts.cnpjOrgao)

  const data = await fetchConsulta('/v1/contratos', params) as {
    data?: ContratoRaw[]
    totalRegistros?: number
    totalPaginas?: number
    numeroPagina?: number
    paginasRestantes?: number
    empty?: boolean
  } | null

  if (!data) return null
  const raw = Array.isArray(data.data) ? data.data : []
  const registros: RegistroPNCP[] = []
  const vistos = new Set<string>()
  for (const r of raw) {
    const norm = normalizarContrato(r)
    if (!norm || vistos.has(norm.id)) continue
    vistos.add(norm.id)
    registros.push(norm)
  }
  return {
    registros,
    total: Number(data.totalRegistros) || registros.length,
    pagina: Number(data.numeroPagina) || (opts.pagina || 1),
    totalPaginas: Number(data.totalPaginas) || 1,
    paginasRestantes: Number(data.paginasRestantes) || 0,
  }
}

export interface ConsultaContratacaoOptions {
  inicio: string
  fim: string
  codigoModalidade: number
  uf?: string
  codigoMunicipioIbge?: string
  pagina?: number
  tamanho?: number
}

export async function buscarContratacoes(
  opts: ConsultaContratacaoOptions
): Promise<{ registros: RegistroPNCP[]; total: number; pagina: number; totalPaginas: number; paginasRestantes: number } | null> {
  const params = new URLSearchParams({
    dataInicial: opts.inicio,
    dataFinal: opts.fim,
    codigoModalidadeContratacao: String(opts.codigoModalidade),
    pagina: String(opts.pagina || 1),
    tamanhoPagina: String(Math.min(Math.max(opts.tamanho || 50, 10), 50)),
  })
  if (opts.uf) params.set('uf', opts.uf)
  if (opts.codigoMunicipioIbge) params.set('codigoMunicipioIbge', opts.codigoMunicipioIbge)

  const data = await fetchConsulta('/v1/contratacoes/publicacao', params) as {
    data?: ContratacaoRaw[]
    totalRegistros?: number
    totalPaginas?: number
    numeroPagina?: number
    paginasRestantes?: number
    empty?: boolean
  } | null

  if (!data) return null
  const raw = Array.isArray(data.data) ? data.data : []
  const registros: RegistroPNCP[] = []
  const vistos = new Set<string>()
  for (const r of raw) {
    const norm = normalizarContratacao(r)
    if (!norm || vistos.has(norm.id)) continue
    vistos.add(norm.id)
    registros.push(norm)
  }
  return {
    registros,
    total: Number(data.totalRegistros) || registros.length,
    pagina: Number(data.numeroPagina) || (opts.pagina || 1),
    totalPaginas: Number(data.totalPaginas) || 1,
    paginasRestantes: Number(data.paginasRestantes) || 0,
  }
}

// ---- Cache simples em memória de curto prazo (evita bater repetidamente) ----
const cache = new Map<string, { ts: number; val: unknown }>()
const CACHE_TTL = 8 * 60 * 1000

async function cachable<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.val as T
  const val = await fn()
  cache.set(key, { ts: Date.now(), val })
  return val
}

export { cachable, fmtData }
