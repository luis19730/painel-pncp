import { NextRequest, NextResponse } from 'next/server'

import { requirePaidAccess } from '@/lib/auth/require-access'

const PNCP_BASE = process.env.NEXT_PUBLIC_PNCP_BASE || 'https://pncp.gov.br/api'
const PNCP_PROXY = process.env.NEXT_PUBLIC_PNCP_PROXY || 'https://pncp-proxy.luis19730.workers.dev'

interface SearchResult {
  items?: any[]
  data?: any[]
  total?: number
}

async function tryFetch(url: string, timeoutMs = 8000): Promise<SearchResult | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Sec-Ch-Ua': '"Chromium";v="125", "Not.A/Brand";v="24"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Referer': 'https://pncp.gov.br/',
      },
      signal: controller.signal,
    })
    if (!resp.ok) return null
    const data = await resp.json()
    if (!data || typeof data !== 'object') return null
    return data
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const guard = await requirePaidAccess()
  if (!guard.ok) return guard.response

  const { path } = await params
  const pathStr = path.join('/')
  const searchParams = request.nextUrl.searchParams

  const uf = searchParams.get('uf')
  const municipio = searchParams.get('municipio')
  const modalidade = searchParams.get('modalidade')

  const clean = new URLSearchParams(searchParams)
  clean.delete('uf')
  clean.delete('municipio')
  clean.delete('modalidade')
  const cleanQuery = clean.toString()

  let baseUrl: string
  if (pathStr.startsWith('search')) {
    baseUrl = `${PNCP_BASE}/search/`
  } else if (pathStr.startsWith('consulta')) {
    baseUrl = `${PNCP_BASE}${pathStr.replace(/^consulta/, '/consulta')}`
  } else {
    baseUrl = `${PNCP_BASE}/${pathStr}`
  }

  let data: SearchResult | null = await tryFetch(`${baseUrl}${cleanQuery ? '?' + cleanQuery : ''}`)

  if (!data) {
    const proxyUrl = `${PNCP_PROXY}/${pathStr}${searchParams.toString() ? '?' + searchParams.toString() : ''}`
    data = await tryFetch(proxyUrl)
  }

  if (!data) {
    return NextResponse.json({ error: true, message: 'PNCP indisponível', items: [], total: 0 }, { status: 502 })
  }

  const items = data.items || data.data || []
  let filtered: any[] = [...items]
  if (uf) filtered = filtered.filter((i: any) => (i.uf || '').toUpperCase() === uf.toUpperCase())
  if (municipio)
    filtered = filtered.filter((i: any) =>
      (i.municipio_nome || i.municipioNome || '').toLowerCase().includes(municipio.toLowerCase())
    )
  if (modalidade)
    filtered = filtered.filter((i: any) =>
      (i.modalidade_licitacao_nome || i.modalidadeNome || '').toLowerCase().includes(modalidade.toLowerCase())
    )

  return NextResponse.json(
    { ...data, items: filtered, total: filtered.length },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
      },
    }
  )
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
