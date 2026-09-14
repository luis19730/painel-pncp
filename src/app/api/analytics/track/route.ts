import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/alerts/db'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_EVENTS = new Set([
  'pageview',
  'search',
  'view_opportunity',
  'signup',
  'login',
  'conversion',
  'plan_view',
  'checkout_started',
  'trial_started',
  'trial_expired',
  'payment_confirmed',
])

/**
 * POST /api/analytics/track
 * Persiste um evento de analytics (fire-and-forget a partir do cliente).
 *
 * Segurança: escrita via SERVICE_ROLE na tabela `analytics_events`, que tem
 * RLS com INSERT liberado a todos (para permitir tracking de visitantes
 * anônimos), mas SELECT/UPDATE/DELETE restritos ao service_role.
 *
 * Se a credencial não estiver configurada, retorna 503 sem quebrar a UI.
 */
export async function POST(req: Request) {
  if (req.method !== 'POST') {
    return NextResponse.json({ ok: false, erro: 'Método não permitido.' }, { status: 405 })
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido.' }, { status: 400 })
  }

  const event = String(body.event || '').trim()
  if (!ALLOWED_EVENTS.has(event)) {
    return NextResponse.json({ ok: false, erro: 'Evento inválido.' }, { status: 400 })
  }

  // user_id (apenas se houver sessão autenticada no servidor)
  let userId: string | null = null
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    if (data?.user) userId = data.user.id
  } catch {
    userId = null
  }

  let client
  try {
    client = createServiceClient()
  } catch {
    return NextResponse.json({ ok: false, erro: 'Analytics não configurado.' }, { status: 503 })
  }

  const row = {
    event,
    page: typeof body.page === 'string' && body.page ? String(body.page) : null,
    path: typeof body.path === 'string' && body.path ? String(body.path).slice(0, 500) : null,
    client_id: typeof body.client_id === 'string' && body.client_id ? String(body.client_id).slice(0, 200) : null,
    user_id: userId,
    props: body.props && typeof body.props === 'object' ? (body.props as object) : null,
  }

  const { error } = await client.from('analytics_events').insert(row)
  if (error) {
    return NextResponse.json({ ok: false, erro: 'Falha ao registrar.' }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
