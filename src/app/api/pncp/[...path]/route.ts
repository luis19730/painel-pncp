import { NextRequest, NextResponse } from 'next/server'

const PNCP_BASE = 'https://pncp.gov.br/api'
const PNCP_CONSULTA = 'https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao'

const UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA',
  'PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

// codigoModalidadeContratacao (API de consulta): 1=Leilão El, 3=Concurso, 4=Concorrência El,
// 5=Concorrência Pres, 6=Pregão El, 7=Pregão Pres, 13=Leilão Pres
const MODALITY_CODES: Record<string, number[]> = {
  pregao: [6, 7],
  concorrencia: [4, 5],
  concurso: [3],
  leilao: [1, 13],
}

const MAPA_PAGE_SIZE = 30
const MAPA_CACHE_TTL = 120000
const mapaCache = new Map<string, { body: unknown; ts: number }>()

interface ConsultaUnidade {
  ufSigla?: string
  municipioNome?: string
  nomeUnidade?: string
}

interface ConsultaOrgao {
  razaoSocial?: string
  cnpj?: string
}

interface ConsultaItem {
  numeroControlePNCP?: string
  numeroCompra?: string | number | null
  anoCompra?: string
  sequencialCompra?: string
  objetoCompra?: string
  modalidadeNome?: string
  situacaoCompraNome?: string
  dataPublicacaoPncp?: string
  dataEncerramentoProposta?: string | null
  valorTotalEstimado?: string | number | null
  valorTotalHomologado?: string | number | null
  orgaoEntidade?: ConsultaOrgao
  unidadeOrgao?: ConsultaUnidade
}

interface MapaItem extends ConsultaItem {
  id: string
  numero: string
  numero_controle_pncp: string
  description: string
  objeto_compra: string
  objeto: string
  orgao_nome: string
  orgaoNome: string
  orgao_cnpj: string
  unidade_nome: string
  modalidade_licitacao_nome: string
  modalidade: string
  uf: string
  municipioNome: string
  municipio_nome: string
  situacao_nome: string
  situacao: string
  data_publicacao_pncp: string
  data_fim_vigencia: string
  dataEncerramento: string
  ano: string
  numero_sequencial: string
  valor_global: string | number | null
  valor: number
}

function toYMD(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

async function fetchConsulta(itemsURL: URLSearchParams, retries = 3): Promise<ConsultaItem[]> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    try {
      const resp = await fetch(`${PNCP_CONSULTA}?${itemsURL.toString()}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 PainelPNCP/1.0',
          'Accept': 'application/json',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        },
        signal: controller.signal,
      })
      if (resp.status === 429) {
        clearTimeout(timer)
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
        continue
      }
      if (!resp.ok) {
        clearTimeout(timer)
        return []
      }
      const json = await resp.json()
      clearTimeout(timer)
      return Array.isArray(json.data) ? (json.data as ConsultaItem[]) : []
    } catch {
      clearTimeout(timer)
      if (attempt === retries - 1) return []
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)))
    } finally {
      clearTimeout(timer)
    }
  }
  return []
}

function normalizeMapaItem(raw: ConsultaItem): MapaItem {
  const orgao = raw?.orgaoEntidade || {}
  const unidade = raw?.unidadeOrgao || {}
  const valor = raw?.valorTotalEstimado ?? raw?.valorTotalHomologado ?? null
  return {
    ...raw,
    id: raw?.numeroControlePNCP || '',
    numeroControlePNCP: raw?.numeroControlePNCP || '',
    numero_controle_pncp: raw?.numeroControlePNCP || '',
    numero: String(raw?.numeroCompra || '') || raw?.numeroControlePNCP || '',
    objetoCompra: raw?.objetoCompra || '',
    objeto_compra: raw?.objetoCompra || '',
    description: raw?.objetoCompra || '',
    objeto: String(raw?.objetoCompra || '').substring(0, 300),
    orgaoNome: orgao?.razaoSocial || '',
    orgao_nome: orgao?.razaoSocial || '',
    orgao_cnpj: orgao?.cnpj || '',
    unidade_nome: unidade?.nomeUnidade || '',
    modalidadeNome: raw?.modalidadeNome || '',
    modalidade_licitacao_nome: raw?.modalidadeNome || '',
    modalidade: raw?.modalidadeNome || '',
    uf: String(unidade?.ufSigla || '').toUpperCase(),
    municipioNome: unidade?.municipioNome || '',
    municipio_nome: unidade?.municipioNome || '',
    situacao_nome: raw?.situacaoCompraNome || '',
    situacao: raw?.situacaoCompraNome || '',
    dataPublicacaoPncp: raw?.dataPublicacaoPncp || '',
    data_publicacao_pncp: raw?.dataPublicacaoPncp || '',
    data_fim_vigencia: raw?.dataEncerramentoProposta || '',
    dataEncerramento: raw?.dataEncerramentoProposta || '',
    ano: raw?.anoCompra || '',
    numero_sequencial: raw?.sequencialCompra || '',
    valor_global: valor,
    valor: Number(valor) || 0,
  }
}

async function handleMapa(searchParams: URLSearchParams) {
  const rawModalidade = searchParams.get('modalidade') || 'todos'
  const modalidade = MODALITY_CODES[rawModalidade] ? rawModalidade : 'todos'
  const pagina = Math.max(1, Number(searchParams.get('pagina')) || 1)

  const cacheKey = `${modalidade}|${pagina}`
  const cached = mapaCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < MAPA_CACHE_TTL) return cached.body

  const today = new Date()
  const dataFinal = toYMD(today)
  const dataInicial = toYMD(new Date(today.getTime() - 90 * 24 * 3600 * 1000))
  const dataInicialFill = toYMD(new Date(today.getTime() - 365 * 24 * 3600 * 1000))

  const codes =
    modalidade === 'todos' ? [6, 7, 4, 5, 3, 1, 13] : MODALITY_CODES[modalidade]

  const byNumero = new Map<string, ConsultaItem>()
  const covered = new Set<string>()

  function mergeItems(items: ConsultaItem[]) {
    for (const item of items) {
      const key = item?.numeroControlePNCP
      if (key && !byNumero.has(key)) byNumero.set(key, item)
      const uf = String(item?.unidadeOrgao?.ufSigla || '').toUpperCase()
      if (uf) covered.add(uf)
    }
  }

  // Sequential nationwide sweep per modalidade with spacing so we stay under
  // the PNCP rate limiter (429). Each call is the most recent 90 days.
  for (const code of codes) {
    mergeItems(
      await fetchConsulta(
        new URLSearchParams({
          dataInicial,
          dataFinal,
          codigoModalidadeContratacao: String(code),
          pagina: '1',
          tamanhoPagina: '50',
        })
      )
    )
    await new Promise((resolve) => setTimeout(resolve, 400))
  }

  const missing = UFS.filter((uf) => !covered.has(uf))
  if (missing.length > 0) {
    // For states not covered by the nationwide sweep, drill down per UF across
    // modalidades until we find something. 750ms spacing keeps us under the
    // PNCP rate limiter.
    const fillCodes = codes
    for (const uf of missing) {
      for (const code of fillCodes) {
        const items = await fetchConsulta(
          new URLSearchParams({
            dataInicial: dataInicialFill,
            dataFinal,
            codigoModalidadeContratacao: String(code),
            uf,
            pagina: '1',
            tamanhoPagina: '10',
          })
        )
        mergeItems(items.slice(0, 2))
        if (covered.has(uf)) break
        await new Promise((resolve) => setTimeout(resolve, 750))
      }
    }
  }

  let list: MapaItem[] = [...byNumero.values()].map(normalizeMapaItem)

  const primary = new Map<string, MapaItem>()
  const rest: MapaItem[] = []
  const sorted = [...list].sort((a, b) =>
    String(b.dataPublicacaoPncp || '').localeCompare(String(a.dataPublicacaoPncp || ''))
  )
  for (const item of sorted) {
    if (item.uf && !primary.has(item.uf)) primary.set(item.uf, item)
    else rest.push(item)
  }
  list = [...primary.values(), ...rest]

  const total = list.length
  const totalPages = Math.max(1, Math.ceil(total / MAPA_PAGE_SIZE))
  const start = (pagina - 1) * MAPA_PAGE_SIZE
  const items = list.slice(start, start + MAPA_PAGE_SIZE)

  const body = {
    items,
    total,
    total_pages: totalPages,
    current_page: pagina,
    modalidade,
  }
  mapaCache.set(cacheKey, { body, ts: Date.now() })
  return body
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const pathStr = path.join('/')
  const searchParams = request.nextUrl.searchParams

  if (pathStr === 'mapa') {
    const body = await handleMapa(searchParams)
    return NextResponse.json(body, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
      },
    })
  }

  if (pathStr.startsWith('consulta')) {
    const paramsStr = searchParams.toString()
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      const resp = await fetch(
        `${PNCP_BASE}/consulta/v1/contratacoes${paramsStr ? '?' + paramsStr : ''}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 PainelPNCP/1.0',
            'Accept': 'application/json',
            'Accept-Language': 'pt-BR,pt;q=0.9',
          },
          signal: controller.signal,
        }
      )
      clearTimeout(timeout)

      if (!resp.ok) {
        return NextResponse.json(
          { error: true, message: `PNCP ${resp.status}`, items: [], total: 0 },
          { status: resp.status }
        )
      }

      const data = await resp.json()
      return NextResponse.json(data, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
        },
      })
    } catch {
      return NextResponse.json(
        { error: true, message: 'Erro ao consultar PNCP', items: [], total: 0 },
        { status: 500 }
      )
    }
  }

  let baseUrl: string
  if (pathStr.startsWith('search')) {
    baseUrl = `${PNCP_BASE}/search/`
  } else {
    baseUrl = `${PNCP_BASE}/${pathStr}`
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    const paramsStr = searchParams.toString()

    const resp = await fetch(
      `${baseUrl}${paramsStr ? '?' + paramsStr : ''}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 PainelPNCP/1.0',
          'Accept': 'application/json',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        },
        signal: controller.signal,
      }
    )
    clearTimeout(timeout)

    if (!resp.ok) {
      return NextResponse.json(
        { error: true, message: `PNCP ${resp.status}`, items: [], total: 0 },
        { status: resp.status }
      )
    }

    const data = await resp.json()
    const finalData =
      pathStr.startsWith('search') && Number.isFinite(Number(data.total))
        ? {
            ...data,
            total_pages: Math.max(1, Math.ceil(Number(data.total) / 10)),
          }
        : data

    return NextResponse.json(finalData, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
      },
    })
  } catch {
    return NextResponse.json(
      { error: true, message: 'Erro ao consultar PNCP', items: [], total: 0 },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
