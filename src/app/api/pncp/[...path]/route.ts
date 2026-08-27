import { NextRequest, NextResponse } from 'next/server'

const PNCP_BASE = 'https://pncp.gov.br/api'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const pathStr = path.join('/')
  const searchParams = request.nextUrl.searchParams.toString()
  
  let baseUrl: string
  if (pathStr.startsWith('search')) {
    baseUrl = `${PNCP_BASE}/search/`
  } else if (pathStr.startsWith('consulta')) {
    baseUrl = `${PNCP_BASE}/consulta/v1/contratacoes`
  } else {
    baseUrl = `${PNCP_BASE}/${pathStr}`
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    
    const resp = await fetch(`${baseUrl}${searchParams ? '?' + searchParams : ''}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 PainelPNCP/1.0',
        'Accept': 'application/json',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!resp.ok) {
      return NextResponse.json({ error: true, message: `PNCP ${resp.status}`, items: [], total: 0 }, { status: resp.status })
    }

    const data = await resp.json()
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
      },
    })
  } catch {
    return NextResponse.json({ error: true, message: 'Erro ao consultar PNCP', items: [], total: 0 }, { status: 500 })
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
