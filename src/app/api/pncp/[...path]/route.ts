import { NextRequest, NextResponse } from 'next/server'

import { requirePaidAccess } from '@/lib/auth/require-access'

const PNCP_BASE = 'https://pncp.gov.br/api'
const PNCP_SEARCH = `${PNCP_BASE}/search/`

const UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA',
  'PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

const MODALITY_KEYWORDS: Record<string, string[]> = {
  pregao: ['Pregão'],
  concorrencia: ['Concorrência'],
  concurso: ['Concurso'],
  leilao: ['Leilão'],
}

const MAPA_PAGE_SIZE = 30
const MAPA_CACHE_TTL = 600000
const MAPA_DEADLINE_MS = 22000
const MAPA_CONCURRENCY = 3
const mapaCache = new Map<string, { body: unknown; ts: number }>()

interface MapsItem {
  id?: string
  numero_controle_pncp?: string
  description?: string
  objeto_compra?: string
  orgao_nome?: string
  unidade_nome?: string
  modalidade_licitacao_nome?: string
  uf?: string
  municipio_nome?: string
  situacao_nome?: string
  data_publicacao_pncp?: string
  data_fim_vigencia?: string
  ano?: string
  numero_sequencial?: string
  valor_global?: string | number | null
  item_url?: string
}

async function fetchSearch(params: URLSearchParams, retries = 2): Promise<MapsItem[]> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 12000)
    try {
      const resp = await fetch(`${PNCP_SEARCH}?${params.toString()}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 PainelPNCP/1.0',
          'Accept': 'application/json',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        },
        signal: controller.signal,
      })
      if (resp.status === 429) {
        clearTimeout(timer)
        await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)))
        continue
      }
      if (!resp.ok) {
        clearTimeout(timer)
        if (attempt === retries - 1) return []
        await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)))
        continue
      }
      const json = (await resp.json()) as { items?: MapsItem[] }
      clearTimeout(timer)
      return json.items || []
    } catch {
      clearTimeout(timer)
      if (attempt === retries - 1) return []
      await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)))
    }
  }
  return []
}

async function runWithConcurrency<T>(
  input: T[],
  limit: number,
  worker: (item: T) => Promise<void>
) {
  let index = 0
  async function next(): Promise<void> {
    while (index < input.length) {
      const current = index++
      const task = worker(input[current])
      await task
    }
  }
  const runners = Array.from({ length: Math.min(limit, input.length) }, () =>
    next().catch(() => {})
  )
  await Promise.all(runners)
}

async function handleMapa(searchParams: URLSearchParams) {
  const rawModalidade = searchParams.get('modalidade') || 'todos'
  const modalidade = MODALITY_KEYWORDS[rawModalidade] ? rawModalidade : 'todos'
  const pagina = Math.max(1, Number(searchParams.get('pagina')) || 1)

  const cacheKey = `${modalidade}|${pagina}`
  const cached = mapaCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < MAPA_CACHE_TTL) return cached.body

  const byNumero = new Map<string, MapsItem>()

  function mergeItems(items: MapsItem[]) {
    for (const item of items) {
      const key = item?.numero_controle_pncp
      if (key && !byNumero.has(key)) byNumero.set(key, item)
    }
  }

  // The national consultation API is slow/unreliable, so the map is built from
  // the fast search endpoint. One query per UF gives full geographic coverage;
  // one query per requested modality guarantees those categories show up.
  const queries: string[] = [...UFS]

  if (modalidade === 'todos') {
    queries.push('Pregão Eletrônico', 'Concorrência', 'Concurso', 'Leilão')
  } else {
    queries.push(...MODALITY_KEYWORDS[modalidade])
  }

  const deadline = new Promise<void>((resolve) =>
    setTimeout(resolve, MAPA_DEADLINE_MS)
  )

  const work = runWithConcurrency(queries, MAPA_CONCURRENCY, async (q) => {
    mergeItems(
      await fetchSearch(
        new URLSearchParams({
          q,
          tipos_documento: 'edital',
          ordenacao: '-data',
          pagina: '1',
          tam_pagina: '30',
        })
      )
    )
  })

  await Promise.race([work, deadline])

  let list: MapsItem[] = [...byNumero.values()]

  if (modalidade !== 'todos') {
    const words = MODALITY_KEYWORDS[modalidade]
    list = list.filter(
      (item) =>
        words &&
        words.some((w) =>
          String(item.modalidade_licitacao_nome || '').toLowerCase().includes(w.toLowerCase())
        )
    )
  }

  const primary = new Map<string, MapsItem>()
  const rest: MapsItem[] = []
  const sorted = [...list].sort((a, b) =>
    String(b.data_publicacao_pncp || '').localeCompare(
      String(a.data_publicacao_pncp || '')
    )
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

  const guard = await requirePaidAccess()
  if (!guard.ok) return guard.response
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
  } else if (pathStr.startsWith('consulta')) {
    // API de consulta de contratações (traz valor, situação e encerramento).
    baseUrl = `${PNCP_BASE}/consulta/v1/contratacoes/publicacao`
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

