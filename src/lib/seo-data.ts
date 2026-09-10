import { ITEMS } from '@/lib/market-data'

/**
 * Campos no formato esperado pelas páginas SEO (names do PNCP).
 */
export interface SeoLicitacaoItem {
  numeroControlePNCP: string
  objetoCompra: string
  modalidadeNome: string
  dataPublicacaoPncp: string
  uf: string
  municipioNome: string
  orgaoNome: string
  valor_global?: number
  description?: string
  orgao_nome?: string
}

const PNCP_BASE = process.env.NEXT_PUBLIC_PNCP_BASE || 'https://pncp.gov.br/api'

function toSeoItem(i: (typeof ITEMS)[number]): SeoLicitacaoItem {
  return {
    numeroControlePNCP: i.id,
    objetoCompra: `${i.nome} - ${i.descricao}`.substring(0, 300),
    modalidadeNome: i.modalidade,
    dataPublicacaoPncp: i.data,
    uf: i.uf,
    municipioNome: i.municipio,
    orgaoNome: i.orgao,
    valor_global: i.valor,
    description: i.nome,
    orgao_nome: i.orgao,
  }
}

function toSeoFromApi(item: any): SeoLicitacaoItem {
  return {
    numeroControlePNCP: item.numero_controle_pncp || '',
    objetoCompra: (item.description || item.objeto_compra || item.title || '').trim(),
    modalidadeNome: item.modalidade_licitacao_nome || '',
    dataPublicacaoPncp: item.data_publicacao_pncp || '',
    uf: item.uf || '',
    municipioNome: item.municipio_nome || '',
    orgaoNome: item.orgao_nome || '',
    valor_global: item.valor_global,
    description: item.description || '',
    orgao_nome: item.orgao_nome || '',
  }
}

function mockSeo(query: string, uf?: string, municipio?: string): SeoLicitacaoItem[] {
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
  if (uf) list = list.filter((i) => i.uf === uf)
  if (municipio) list = list.filter((i) => i.municipio.toLowerCase().includes(municipio.toLowerCase()))
  return list.map(toSeoItem)
}

/**
 * Busca resiliente para páginas SEO (server-side). Tenta o proxy real do PNCP
 * e, em caso de falha, retorna dados locais estruturados para a API real.
 */
export async function fetchSeoLicitacoes(
  opts: { q?: string; uf?: string; municipio?: string } = {}
): Promise<SeoLicitacaoItem[]> {
  const params = new URLSearchParams({ q: opts.q || 'licitacao', tipos_documento: 'edital', pagina: '1' })

  try {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(`${PNCP_BASE}/search/?${params}`, {
      next: { revalidate: 120 },
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Sec-Ch-Ua': '"Chromium";v="125", "Not.A/Brand";v="24"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Referer': 'https://pncp.gov.br/',
      },
    })
    clearTimeout(t)
    if (!res.ok) throw new Error(`pncp ${res.status}`)
    const data = await res.json()
    const raw: any[] = data.items || data.data || []
    let items: SeoLicitacaoItem[] = raw.map(toSeoFromApi)
    if (opts.uf) items = items.filter((i) => (i.uf || '').toUpperCase() === opts.uf!.toUpperCase())
    if (opts.municipio)
      items = items.filter((i) =>
        (i.municipioNome || '').toLowerCase().includes(opts.municipio!.toLowerCase())
      )
    if (items.length === 0) throw new Error('no items')
    return items
  } catch {
    return mockSeo(opts.q || 'licitacao', opts.uf, opts.municipio)
  }
}
