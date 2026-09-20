import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/alerts/db'
import { autorizarCron } from '@/lib/cron/auth'
import { siteBaseUrl } from '@/lib/auth/site-url'
import { enviarLoteContatos } from '@/lib/contatos/outreach'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/enviar-contatos?limite=20&dry=1
 *
 * Cron DIÁRIO de outreach: envia o e-mail de apresentação do Painel PNCP para
 * os contatos extraídos dos editais, 1x por contato (idempotente via
 * `outreach_enviado_em`), em lote controlado (default 20, máx 50) com pausa
 * entre envios. Protegido por CRON_SECRET.
 *
 * `dry=1` simula sem enviar nem gravar.
 */
export async function GET(req: Request) {
  const auth = autorizarCron(req)
  if (!auth.ok) return auth.response

  let client
  try {
    client = createServiceClient()
  } catch {
    return NextResponse.json({ ok: false, erro: 'SUPABASE_SERVICE_ROLE_KEY não configurada.' }, { status: 503 })
  }

  const url = new URL(req.url)
  const limite = Number(url.searchParams.get('limite') || process.env.OUTREACH_LOTE || 20) || 20
  const dryRun = url.searchParams.get('dry') === '1'
  const resultado = await enviarLoteContatos(client, limite, { siteUrl: siteBaseUrl(req), dryRun })
  return NextResponse.json({ ok: true, ...resultado })
}
