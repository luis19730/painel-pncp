import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/alerts/db'
import { asaasWebhookToken } from '@/lib/asaas/config'
import { registrarWebhookEvent, marcarWebhookProcessado } from '@/lib/planos/db'
import { processAsaasEvent } from '@/lib/asaas/events'

export const dynamic = 'force-dynamic'

/** Forma mínima do payload de evento do ASAAS (demais campos seguem desconhecidos). */
interface WebhookPayload {
  event?: string
  id?: string
  eventId?: string
  payment?: { status?: string; value?: number | string } | null
  subscription?: unknown
  [key: string]: unknown
}

/**
 * POST /api/asaas/webhook
 *
 * Recebe os Webhooks do ASAAS, valida o header `asaas-access-token`, garante
 * idempotência (tabela asaas_webhook_events) e atualiza o banco.
 *
 * ANTIPENALIZAÇÃO: o ASAAS bloqueia/penaliza endpoints que respondem com
 * status não-2xx para as notificações. Por isso ESTA rota responde SEMPRE 200
 * — inclusive quando o token está ausente/incorreto, quando o corpo está
 * malformado ou quando o banco está indisponível. Nesses casos o evento é
 * apenas IGNORADO (ou registrado como rejeitado); nada é processado sem um
 * token válido, então a segurança não depende do status HTTP.
 *
 * Autorização: header `asaas-access-token` (canônico do ASAAS; também aceita
 * `x-asaas-token` / `x-webhook-token`) === process.env.ASAAS_WEBHOOK_TOKEN.
 * NUNCA usa a API Key como token do webhook.
 */
export async function POST(req: Request) {
  // Token esperado (secret em produção). Ausente ⇒ nada é processado.
  const expected = asaasWebhookToken()
  const token =
    req.headers.get('asaas-access-token') ||
    req.headers.get('x-asaas-token') ||
    req.headers.get('x-webhook-token') ||
    ''
  const autorizado = !!expected && token === expected

  let payload: WebhookPayload
  try {
    payload = (await req.json()) as WebhookPayload
  } catch {
    // Corpo malformado: consumido, nunca devolve 4xx ao ASAAS.
    return NextResponse.json({ ok: false, motivo: 'corpo_invalido' })
  }

  const event = String(payload?.event || 'unknown')
  const eventId = String(payload?.id || payload?.eventId || '').trim()
  if (!eventId) {
    // Sem id não há como garantir idempotência — consumido sem processar.
    return NextResponse.json({ ok: false, motivo: 'sem_id' })
  }

  let client
  try {
    client = createServiceClient()
  } catch {
    return NextResponse.json({ ok: false, motivo: 'bd_indisponivel' })
  }

  if (!autorizado) {
    // Token ausente/incorreto: NÃO processa, mas responde 200 (evita
    // penalização). Registra a rejeição com event_id prefixado para não
    // conflitar com um reenvio legítimo do mesmo evento após alinhar o token
    // (o id original fica livre para registrar e processar normalmente).
    console.warn(
      `[asaas-webhook] rejeitado por token: event=${event} id=${eventId} (token esperado=${expected ? 'configurado' : 'ausente'})`
    )
    if (eventId.startsWith('evt_')) {
      await registrarWebhookEvent(client, {
        event_id: `rejeitado:${eventId}`,
        event_type: 'REJEITADO',
        payload,
      })
    }
    return NextResponse.json({ ok: true, rejeitado: true, motivo: 'token' })
  }

  // Idempotência: se o evento já foi registrado, não processa de novo.
  const reg = await registrarWebhookEvent(client, {
    event_id: eventId,
    event_type: event,
    payload,
  })
  if (!reg.created) {
    // Já processado (ou duplicado) — responde 200 para não gerar retries.
    return NextResponse.json({ ok: true, duplicado: true })
  }

  try {
    const result = await processAsaasEvent(client, payload)
    await marcarWebhookProcessado(client, eventId)
    return NextResponse.json({ ok: true, handled: result.handled, detail: result.detail })
  } catch (e) {
    // Erro interno ao processar: responde 200 mesmo assim (não penaliza o
    // ASAAS) e deixa o evento com processed=false para aparecer no health
    // ("webhooks não processados") e ser resolvido manualmente.
    console.error(`[asaas-webhook] falha ao processar: id=${eventId} event=${event}`, (e as Error)?.message)
    return NextResponse.json({ ok: false, erro: (e as Error)?.message || 'Erro ao processar evento.' })
  }
}