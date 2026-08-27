import type { PNCPSearchResponse, PNCPItem, Opportunity } from '@/types'

const PNCP_PROXY = process.env.NEXT_PUBLIC_PNCP_PROXY || 'https://pncp-proxy.luis19730.workers.dev'
const CACHE_TTL = 120000
const searchCache = new Map<string, { data: PNCPSearchResponse; ts: number }>()

function cacheKey(q: string, page: number): string {
  return `${q}|${page}`
}

async function fetchPNCP(path: string, params: string): Promise<PNCPSearchResponse> {
  const url = `${PNCP_PROXY}${path}?${params}`
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
  if (filters?.uf) params.set('uf', filters.uf)
  if (filters?.modalidade) params.set('modalidade', filters.modalidade)

  return fetchPNCP('/search/', params.toString())
}

export async function getOpportunityById(id: string): Promise<PNCPItem | null> {
  const params = new URLSearchParams({ numero_controle_pncp: id })
  try {
    const data = await fetchPNCP('/consulta/v1/contratacoes', params.toString())
    const items = data.items || data.data || []
    return items[0] || null
  } catch {
    return null
  }
}

export function mapItem(item: PNCPItem): Opportunity {
  const cnpj = item.orgao_cnpj || ''
  const ano = item.ano || ''
  const seq = item.numero_sequencial || ''
  const link = item.item_url
    ? `https://pncp.gov.br/app${item.item_url}`
    : cnpj && ano && seq
    ? `https://pncp.gov.br/app/compras/${cnpj}/${ano}/${seq}`
    : '#'

  return {
    id: item.numero_controle_pncp || '',
    numero: item.numero || item.numero_controle_pncp || '',
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
    link,
    score: 0,
  }
}

export function mapItems(items: PNCPItem[]): Opportunity[] {
  return items.map(mapItem)
}
