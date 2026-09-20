import { NextResponse } from 'next/server'
import { runImmediate, runScheduledBatch } from '@/lib/alerts/processor'
import { isConfigured } from '@/lib/alerts/is-configured'
import { autorizarCron } from '@/lib/cron/auth'

/**
 * GET /api/cron/alertas
 *
 * Endpoint de disparo externo (cron) para o processamento dos ALERTAS.
 *
 * Motivo: o Vinext (Cloudflare Workers) NÃO suporta handler nativo `scheduled`
 * (o entry que ele gera só exporta `fetch`; o `worker/index.ts` com `scheduled`
 * não é usado no deploy Vinext). Então o processamento que ficava no `scheduled`
 * é exposto aqui via HTTP, protegido por um secret (`CRON_SECRET`), e um cron
 * EXTERNO chama este endpoint a cada minuto.
 *
 * Autorização: o header `x-cron-secret` (ou a query `?token=`) deve ser igual a
 * `process.env.CRON_SECRET`. Nunca há envio sem credencial real (quem decide
 * isso é o processor + isConfigured).
 */
export async function GET(req: Request) {
  const auth = autorizarCron(req)
  if (!auth.ok) return auth.response

  if (!isConfigured()) {
    return NextResponse.json(
      { ok: false, erro: 'SUPABASE_SERVICE_ROLE_KEY não configurada — processamento adiado.' },
      { status: 503 }
    )
  }

  const result: { imediato: number; programado: number } = { imediato: 0, programado: 0 }
  try {
    const r1 = await runImmediate()
    result.imediato = r1.executados.length
  } catch (e) {
    return NextResponse.json(
      { ok: false, erro: (e as Error)?.message || 'erro no envio imediato', result },
      { status: 500 }
    )
  }
  try {
    const r2 = await runScheduledBatch()
    result.programado = r2.executados.length
  } catch (e) {
    return NextResponse.json(
      { ok: false, erro: (e as Error)?.message || 'erro no lote programado', result },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, result })
}
