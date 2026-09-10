import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/alerts/db'
import { authorizeAdmin } from '@/lib/admin/auth'

export const dynamic = 'force-dynamic'

const EVENT_MAP: Record<string, string | null> = {
  pageviews: 'pageview',
  visitantes: null, // especial: agrupa por client_id
  buscas: 'search',
  oportunidades: 'view_opportunity',
  cadastros: 'signup',
  logins: 'login',
  conversoes: 'conversion',
  hoje: null, // especial: todos os eventos do dia
}

type TipoFiltro = keyof typeof EVENT_MAP

function timezoneToday(): Date {
  const now = new Date()
  const local = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  const day = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate())
  )
  day.setUTCHours(0, 0, 0, 0)
  return day
}

/**
 * GET /api/admin/analytics?tipo=...
 * Lista detalhada dos eventos cadastrados, filtrada por tipo de card da aba
 * "Métricas". Protegida pela senha de administrador (authorizeAdmin).
 *
 *  tipo=pageviews    -> todas as pageviews (rota, data/hora, client_id)
 *  tipo=visitantes   -> client_id distintos nos últimos 30 dias
 *  tipo=buscas       -> eventos de busca
 *  tipo=oportunidades-> eventos de view_opportunity
 *  tipo=cadastros    -> eventos de signup
 *  tipo=logins       -> eventos de login
 *  tipo=conversoes   -> eventos de conversion
 *  tipo=hoje         -> todos os eventos de hoje
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

  const url = new URL(req.url)
  const tipo = (url.searchParams.get('tipo') || 'pageviews') as TipoFiltro
  if (!(tipo in EVENT_MAP)) {
    return NextResponse.json({ ok: false, erro: 'Tipo inválido.' }, { status: 400 })
  }

  const agora = new Date()
  const since30 = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000)

  let query = client.from('analytics_events').select('*')

  if (tipo === 'hoje') {
    query = query.gte('created_at', timezoneToday().toISOString())
  } else if (tipo === 'visitantes') {
    query = query.gte('created_at', since30.toISOString())
  } else {
    query = query.eq('event', EVENT_MAP[tipo] as string)
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(500)

  if (error) {
    return NextResponse.json({ ok: false, erro: 'Falha ao ler eventos.' }, { status: 500 })
  }

  const rows = data || []

  let items: any[]
  if (tipo === 'visitantes') {
    const map = new Map<string, { client_id: string; ultimo: string; total: number; path: string | null }>()
    for (const r of rows) {
      if (!r.client_id) continue
      const prev = map.get(r.client_id)
      if (!prev) {
        map.set(r.client_id, { client_id: r.client_id, ultimo: r.created_at, total: 1, path: r.path })
      } else {
        prev.total += 1
        if ((r.created_at || '').localeCompare(prev.ultimo) > 0) {
          prev.ultimo = r.created_at
          prev.path = r.path
        }
      }
    }
    items = [...map.values()].sort((a, b) => (b.ultimo || '').localeCompare(a.ultimo || ''))
  } else {
    items = rows
  }

  return NextResponse.json({ ok: true, tipo, agora: agora.toISOString(), itens: items })
}
