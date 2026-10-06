import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/alerts/db'
import { authorizeAdmin } from '@/lib/admin/auth'
import { processAsaasEvent } from '@/lib/asaas/events'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/asaas/reprocessar[?event_id=evt_...]
 *
 * Reprocessa eventos de PAGAMENTO já recebidos (`PAYMENT_CONFIRMED` /
 * `PAYMENT_RECEIVED`) com a lógica ATUAL do webhook. Serve para:
 *   - corrigir pagamentos que chegaram antes de um vínculo existir (ex.: um
 *     usuário cuja assinatura não estava registrada no momento do evento);
 *   - religar/renovar acesso, plano e prazo sem esperar um novo webhook.
 *
 * Sem `event_id`, processa os últimos 200 pagamentos confirmados/recebidos.
 * Só o admin (header x-admin-password) pode chamar.
 */
export async function POST(req: Request) {
  const auth = await authorizeAdmin(req)
  if (!auth.ok) return auth.response

  let client
  try {
    client = createServiceClient()
  } catch {
    return NextResponse.json({ ok: false, erro: 'Banco de dados não configurado.' }, { status: 503 })
  }

  const url = new URL(req.url)
  const eventId = url.searchParams.get('event_id')

  let q = client
    .from('asaas_webhook_events')
    .select('event_id,event_type,payload')
    .in('event_type', ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'])
    .order('created_at', { ascending: false })
    .limit(200)
  if (eventId) {
    q = client.from('asaas_webhook_events').select('event_id,event_type,payload').eq('event_id', eventId)
  }

  const { data, error } = await q
  if (error) {
    return NextResponse.json({ ok: false, erro: 'Falha ao ler os eventos.' }, { status: 500 })
  }

  const resultados: Array<{ event_id: string; detail?: string }> = []
  for (const e of data || []) {
    try {
      const r = await processAsaasEvent(client as never, e.payload as never)
      resultados.push({ event_id: e.event_id, detail: r.detail })
    } catch (err) {
      resultados.push({ event_id: e.event_id, detail: `erro: ${(err as Error)?.message || 'desconhecido'}` })
    }
  }

  return NextResponse.json({ ok: true, reprocessados: resultados.length, resultados })
}
