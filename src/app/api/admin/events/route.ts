import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/alerts/db'
import { authorizeAdmin } from '@/lib/admin/auth'
import { parsePeriodo } from '@/lib/admin/periodo'

export const dynamic = 'force-dynamic'

const EVENTOS = ['pageview', 'search', 'view_opportunity', 'signup', 'login', 'conversion'] as const

/**
 * GET /api/admin/events?evento=pageview&periodo=30d
 * Lista detalhada dos eventos reais no período (padrão: todos, 30d).
 * `evento` aceita um dos tipos; omitido retorna todos.
 */
export async function GET(req: Request) {
  const auth = await authorizeAdmin(req)
  if (!auth.ok) return auth.response

  const url = new URL(req.url)
  const parsed = parsePeriodo(url)
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, erro: parsed.erro }, { status: 400 })
  }
  const { periodo } = parsed

  const evento = url.searchParams.get('evento') || 'todos'
  if (evento !== 'todos' && !EVENTOS.includes(evento as (typeof EVENTOS)[number])) {
    return NextResponse.json({ ok: false, erro: 'Evento inválido.' }, { status: 400 })
  }

  let client
  try {
    client = createServiceClient()
  } catch {
    return NextResponse.json({ ok: false, erro: 'Banco de dados não configurado.' }, { status: 503 })
  }

  let query = client.from('analytics_events').select('*')
  if (evento !== 'todos') query = query.eq('event', evento as string)
  query = query.gte('created_at', periodo.inicio)
  if (periodo.fim) query = query.lt('created_at', periodo.fim)
  query = query.order('created_at', { ascending: false }).limit(500)

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ ok: false, erro: 'Falha ao ler eventos.' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    agora: new Date().toISOString(),
    periodo,
    evento,
    total: (data || []).length,
    itens: data || [],
  })
}