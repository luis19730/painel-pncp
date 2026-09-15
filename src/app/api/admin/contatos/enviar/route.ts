import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/alerts/db'
import { authorizeAdmin } from '@/lib/admin/auth'
import { siteBaseUrl } from '@/lib/auth/site-url'
import { enviarLoteContatos } from '@/lib/contatos/outreach'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/contatos/enviar?limite=20&dry=1&para=email@x.com
 *
 * Disparo MANUAL (admin) do outreach para os contatos extraídos.
 * RESTRITO ao admin (`x-admin-password`). Limite máximo 50 por chamada.
 *   - `para=<email>`: envia APENAS um teste para esse endereço (não altera a base).
 *   - `dry=1`: simula o lote sem enviar/gravar.
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
  const pedido = Number(url.searchParams.get('limite') || 20) || 20
  const limite = Math.min(50, Math.max(1, pedido))
  const dryRun = url.searchParams.get('dry') === '1'
  const paraEmail = (url.searchParams.get('para') || '').trim()

  const resultado = await enviarLoteContatos(client, limite, {
    siteUrl: siteBaseUrl(req),
    dryRun,
    paraEmail: paraEmail || undefined,
  })
  return NextResponse.json({ ok: true, ...resultado })
}
