import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/alerts/db'
import { authorizeAdmin } from '@/lib/admin/auth'
import { parsePeriodo, inicioDoDiaUTC3 } from '@/lib/admin/periodo'

export const dynamic = 'force-dynamic'

const EVENTOS = ['pageview', 'search', 'view_opportunity', 'signup', 'login', 'conversion'] as const
type Evento = (typeof EVENTOS)[number]

/**
 * GET /api/admin/metrics?periodo=30d
 * Métricas reais de uso no período (padrão 30d):
 * contagens por evento, visitantes únicos, top páginas, série diária e "hoje".
 *
 * Proteção: senha de administrador (authorizeAdmin) + leitura via SERVICE_ROLE.
 */
export async function GET(req: Request) {
  const auth = await authorizeAdmin(req)
  if (!auth.ok) return auth.response

  const url = new URL(req.url)
  const parsed = parsePeriodo(url)
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, erro: parsed.erro }, { status: 400 })
  }
  const { periodo, periodoId } = parsed

  let client
  try {
    client = createServiceClient()
  } catch {
    return NextResponse.json({ ok: false, erro: 'Banco de dados não configurado.' }, { status: 503 })
  }

  const agora = new Date()
  const fimQuery = periodo.fim || agora.toISOString()

  // Contagens exatas por evento dentro do período.
  const contagens: Record<Evento, number> = {
    pageview: 0,
    search: 0,
    view_opportunity: 0,
    signup: 0,
    login: 0,
    conversion: 0,
  }
  for (const ev of EVENTOS) {
    let query = client
      .from('analytics_events')
      .select('id', { count: 'exact', head: true })
      .eq('event', ev)
      .gte('created_at', periodo.inicio)
    if (periodo.fim) query = query.lt('created_at', periodo.fim)
    const { count } = await query
    contagens[ev] = count || 0
  }

  // Hoje (UTC-3) — cortes reais do dia corrente.
  const hojeInicio = inicioDoDiaUTC3(agora)
  const { count: eventosHoje } = await client
    .from('analytics_events')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', hojeInicio.toISOString())
  const { count: buscasHoje } = await client
    .from('analytics_events')
    .select('id', { count: 'exact', head: true })
    .eq('event', 'search')
    .gte('created_at', hojeInicio.toISOString())
  const { count: cadastrosHoje } = await client
    .from('analytics_events')
    .select('id', { count: 'exact', head: true })
    .eq('event', 'signup')
    .gte('created_at', hojeInicio.toISOString())

  // Visitantes únicos + top páginas dentro do período.
  const { data: rows, error: rowsErr } = await client
    .from('analytics_events')
    .select('id,event,path,page,client_id,created_at')
    .gte('created_at', periodo.inicio)
    .lt('created_at', fimQuery)
    .order('created_at', { ascending: false })
    .limit(10000)
  if (rowsErr) {
    return NextResponse.json({ ok: false, erro: 'Falha ao ler métricas.' }, { status: 500 })
  }

  const visitantes = new Set<string>()
  const pages = new Map<string, number>()
  for (const e of rows || []) {
    if (e.client_id) visitantes.add(e.client_id)
    if (e.event === 'pageview') {
      const key = e.path || e.page || '(rota)'
      pages.set(key, (pages.get(key) || 0) + 1)
    }
  }
  const topPaginas = [...pages.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, views]) => ({ path, views }))

  // Série diária (últimos 14 dias, tempo UTC-3) para gráfico de barras.
  const since14 = new Date(agora.getTime() - 14 * 24 * 60 * 60 * 1000)
  const { data: serie, error: serieErr } = await client
    .from('analytics_events')
    .select('id,event,created_at')
    .gte('created_at', since14.toISOString())
    .limit(10000)
  if (serieErr) {
    return NextResponse.json({ ok: false, erro: 'Falha ao ler série diária.' }, { status: 500 })
  }

  const porDia = new Map<string, { dia: string; eventos: number; [k: string]: string | number }>()
  for (const e of serie || []) {
    const d = new Date(e.created_at)
    const local = new Date(d.getTime() - 3 * 60 * 60 * 1000)
    const key = `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}-${String(local.getUTCDate()).padStart(2, '0')}`
    let rec = porDia.get(key)
    if (!rec) {
      rec = { dia: key, eventos: 0 }
      for (const ev of EVENTOS) rec[ev] = 0
      porDia.set(key, rec)
    }
    rec.eventos += 1
    const ev = e.event as Evento
    if (rec[ev] !== undefined) rec[ev] = (rec[ev] as number) + 1
  }
  const serieDiaria = [...porDia.values()].sort((a, b) => String(a.dia).localeCompare(String(b.dia)))

  return NextResponse.json({
    ok: true,
    agora: agora.toISOString(),
    periodo,
    periodoId,
    metricas: {
      total_eventos: EVENTOS.reduce((acc, ev) => acc + contagens[ev], 0),
      ...contagens,
      visitantes_unicos: visitantes.size,
    },
    hoje: {
      eventos: eventosHoje || 0,
      buscas: buscasHoje || 0,
      cadastros: cadastrosHoje || 0,
      inicio: hojeInicio.toISOString(),
    },
    top_paginas: topPaginas,
    serie_diaria: serieDiaria,
  })
}