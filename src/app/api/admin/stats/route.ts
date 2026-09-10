import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/alerts/db'
import { authorizeAdmin } from '@/lib/admin/auth'

export const dynamic = 'force-dynamic'

function timezoneToday(): Date {
  // "hoje" em Brasília = everything from 00:00 America/Sao_Paulo até agora.
  const now = new Date()
  const local = new Date(now.getTime() - 3 * 60 * 60 * 1000) // UTC-3
  const day = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate())
  )
  day.setUTCHours(0, 0, 0, 0)
  return day
}

/**
 * GET /api/admin/stats
 * Retorna métricas reais de uso, engajamento e conversões.
 *
 * Proteção:
 *   - Exige usuário autenticado (sessão Supabase).
 *   - Exige o cabeçalho `x-admin-password` igual à senha de administrador.
 *   - Leitura via SERVICE_ROLE (RLS impede leitura pública na tabela).
 */
export async function GET(req: Request) {
  const auth = await authorizeAdmin(req)
  if (!auth.ok) return auth.response

  let client
  try {
    client = createServiceClient()
  } catch {
    return NextResponse.json({ ok: false, erro: 'Banco de dados não configurado.' }, { status: 503 })
  }

  const now = new Date()
  const todayStart = timezoneToday()
  const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Contagens totais (por tipo de evento)
  const totalByEvent: Record<string, number> = {}
  for (const ev of ['pageview', 'search', 'view_opportunity', 'signup', 'login', 'conversion']) {
    const { count } = await client
      .from('analytics_events')
      .select('id', { count: 'exact', head: true })
      .eq('event', ev)
    totalByEvent[ev] = count || 0
  }

  const { count: todayTotal } = await client
    .from('analytics_events')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', todayStart.toISOString())
  const { count: searchesToday } = await client
    .from('analytics_events')
    .select('id', { count: 'exact', head: true })
    .eq('event', 'search')
    .gte('created_at', todayStart.toISOString())
  const { count: signupsToday } = await client
    .from('analytics_events')
    .select('id', { count: 'exact', head: true })
    .eq('event', 'signup')
    .gte('created_at', todayStart.toISOString())

  // Eventos dos últimos 30 dias (para visitantes únicos + top páginas + atividade recente)
  const { data: recent, error: recentErr } = await client
    .from('analytics_events')
    .select('id,event,path,page,client_id,created_at,user_id')
    .gte('created_at', since30.toISOString())
    .order('created_at', { ascending: false })
    .limit(5000)
  if (recentErr) {
    return NextResponse.json({ ok: false, erro: 'Falha ao ler métricas.' }, { status: 500 })
  }

  const events = recent || []
  const visitors30 = new Set<string>()
  const pages = new Map<string, number>()
  for (const e of events) {
    if (e.client_id) visitors30.add(e.client_id)
    if (e.event === 'pageview') {
      const key = e.path || e.page || '(rota)'
      pages.set(key, (pages.get(key) || 0) + 1)
    }
  }

  const topPages = [...pages.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, views]) => ({ path, views }))

  const lastActivity = events.slice(0, 15).map((e) => ({
    event: e.event,
    path: e.path,
    created_at: e.created_at,
    user_id: e.user_id,
  }))

  return NextResponse.json({
    ok: true,
    agora: now.toISOString(),
    resumo: {
      total_visualizacoes: totalByEvent.pageview || 0,
      visitantes_unicos_30d: visitors30.size,
      buscas: totalByEvent.search || 0,
      views_oportunidade: totalByEvent.view_opportunity || 0,
      cadastros: totalByEvent.signup || 0,
      logins: totalByEvent.login || 0,
      conversoes: totalByEvent.conversion || 0,
    },
    hoje: {
      eventos: todayTotal || 0,
      buscas: searchesToday || 0,
      cadastros: signupsToday || 0,
      inicio: todayStart.toISOString(),
    },
    top_paginas: topPages,
    atividade_recente: lastActivity,
  })
}
