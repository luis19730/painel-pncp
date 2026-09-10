// ============================================================================
// Camada de acesso aos dados REAIS do PNCP para o Calendário de Oportunidades.
//
// Fonte pública oficial (https://pncp.gov.br/api/consulta):
//   - GET /v1/contratacoes/proposta -> contratações em RECEBIMENTO DE PROPOSTAS
//     com encerramento até `dataFinal`. Filtra por UF (uf) e modalidade
//     (codigoModalidadeContratacao, opcional). Retorna, por contratação:
//       numeroControlePNCP, numeroCompra, objetoCompra,
//       orgaoEntidade.{cnpj,razaoSocial}, unidadeOrgao.{ufSigla,municipioNome,codigoIbge},
//       modalidadeNome, situacaoCompraNome, valorTotalEstimado/Homologado,
//       dataAberturaProposta, dataEncerramentoProposta, linkSistemaOrigem etc.
//
// Nenhum dado é inventado. A data-chave do evento é a `dataEncerramentoProposta`
// (prazo real de encerramento do recebimento de propostas/sessão). Se ausente,
// usa `dataAberturaProposta`, e por fim `dataPublicacaoPncp`.
// ============================================================================

import { buildPncpEditalUrl } from '@/lib/pncp'
import type { CalendarioEvento } from './types'

const PNCP_BASE = process.env.NEXT_PUBLIC_PNCP_BASE || 'https://pncp.gov.br/api'
const CONSULTA_BASE = `${PNCP_BASE}/consulta`
const PNCP_PROXY = process.env.NEXT_PUBLIC_PNCP_PROXY || 'https://pncp-proxy.luis19730.workers.dev'

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
  Referer: 'https://pncp.gov.br/',
}

const MAX_RETRIES = 2
const BASE_DELAY_MS = 600
const TIMEOUT_MS = 20000

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// ---------------------------------------------------------------------------
// Tipos crus retornados pelo PNCP
// ---------------------------------------------------------------------------

export interface PropostaRaw {
  numeroControlePNCP?: string
  numeroCompra?: string
  anoCompra?: number | string
  sequencialCompra?: number | string
  objetoCompra?: string
  modalidadeNome?: string
  situacaoCompraNome?: string
  valorTotalEstimado?: number | string
  valorTotalHomologado?: number | string
  dataPublicacaoPncp?: string
  dataAberturaProposta?: string | null
  dataEncerramentoProposta?: string | null
  linkSistemaOrigem?: string | null
  linkProcessoEletronico?: string | null
  orgaoEntidade?: { cnpj?: string; razaoSocial?: string; esferaId?: string }
  unidadeOrgao?: {
    nomeUnidade?: string
    ufSigla?: string
    municipioNome?: string
    codigoIbge?: string
  }
}

function str(v: unknown): string {
  return v == null ? '' : String(v).trim()
}

function num(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) ? n : null
}

/** Data (assume que o PNCP fornece horário local de Brasília, sem offset). */
function dataReal(v: unknown): string | null {
  const s = str(v)
  if (!s) return null
  // A data vem como "AAAA-MM-DDTHH:MM:SS" no horário local (Brasília).
  // NÃO converter para UTC (deslocaria o dia). Tomamos o componente de data
  // como está, preservando o dia em Brasília.
  return s.slice(0, 10) || null
}

function esferaNome(esferaId: unknown): string {
  const s = str(esferaId).toUpperCase()
  if (s === 'F') return 'Federal'
  if (s === 'E') return 'Estadual'
  if (s === 'M') return 'Municipal'
  return s ? 'Esfera ' + s : ''
}

function linkOrigemReal(r: PropostaRaw): string | null {
  const s = str(r.linkSistemaOrigem)
  if (s) return s
  const p = str(r.linkProcessoEletronico)
  return p || null
}

/** Normaliza uma contratação real do PNCP em um evento de calendário. */
export function normalizarProposta(raw: PropostaRaw): CalendarioEvento | null {
  const id = str(raw.numeroControlePNCP)
  if (!id) return null

  const dataAbertura = dataReal(raw.dataAberturaProposta)
  const dataEncerramento = dataReal(raw.dataEncerramentoProposta)
  const dataPublicacao = dataReal(raw.dataPublicacaoPncp)

  return {
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
    modalidade: str(raw.modalidadeNome),
    situacao: str(raw.situacaoCompraNome),
    valor: num(raw.valorTotalEstimado) ?? num(raw.valorTotalHomologado),
    dataPublicacao,
    dataAbertura,
    dataEncerramento,
    link: buildPncpEditalUrl({ id }),
    linkOrigem: linkOrigemReal(raw),
  }
}

// ---------------------------------------------------------------------------
// Consulta com retry + fallback direto/proxy
// ---------------------------------------------------------------------------

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

interface PropostaPagina {
  data?: PropostaRaw[]
  totalRegistros?: number
}

async function fetchProposta(params: URLSearchParams): Promise<PropostaPagina | null> {
  const direct = `${CONSULTA_BASE}/v1/contratacoes/proposta?${params.toString()}`
  const proxy = `${PNCP_PROXY.replace(/\/$/, '')}/consulta/v1/contratacoes/proposta?${params.toString()}`
  let data = (await fetchJson(direct)) as PropostaPagina | null
  if (!data) data = (await fetchJson(proxy)) as PropostaPagina | null
  return data
}

export interface ConsultaCalendarioOptions {
  dataFinal: string // yyyyMMdd
  uf?: string
  modalidade?: number
  pagina?: number
  tamanho?: number
}

/**
 * Consulta uma página real de contratações recebendo propostas no PNCP.
 * Deduplica por número de controle dentro da página.
 */
export async function buscarPropostas(
  opts: ConsultaCalendarioOptions
): Promise<{ eventos: CalendarioEvento[]; total: number } | null> {
  const params = new URLSearchParams({
    dataFinal: opts.dataFinal,
    pagina: String(opts.pagina || 1),
    tamanhoPagina: String(Math.min(Math.max(opts.tamanho || 50, 10), 50)),
  })
  if (opts.uf) params.set('uf', opts.uf.toUpperCase())
  if (opts.modalidade) params.set('codigoModalidadeContratacao', String(opts.modalidade))

  const data = await fetchProposta(params)
  if (!data) return null
  const raw = Array.isArray(data.data) ? data.data : []
  const eventos: CalendarioEvento[] = []
  const vistos = new Set<string>()
  for (const r of raw) {
    const e = normalizarProposta(r)
    if (!e || vistos.has(e.id)) continue
    vistos.add(e.id)
    eventos.push(e)
  }
  return {
    eventos,
    total: Number(data.totalRegistros) || eventos.length,
  }
}
