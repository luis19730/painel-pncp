import { NextResponse } from 'next/server'
import { authorizeAdmin } from '@/lib/admin/auth'
import { sendEmail } from '@/lib/alerts/notifications/email'
import { siteBaseUrl } from '@/lib/auth/site-url'
import { EMAIL_REATIVACAO_ASSUNTO, emailReativacaoEmailHtml, emailReativacaoEmailText } from '@/lib/planos/trial-email'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * POST /api/admin/trial/test-email-reativacao
 *
 * Envia um e-mail de TESTE com o MESMO conteúdo da campanha de reativação
 * (o que o cron /api/cron/email-reativacao envia), para validar o
 * provedor/entrega antes de confiar no disparo diário. Protegido pela senha
 * de administrador. NÃO grava marcador de idempotência (é só teste).
 *
 * Body: { email }
 */
export async function POST(req: Request) {
  const auth = await authorizeAdmin(req)
  if (!auth.ok) return auth.response

  let body: { email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido.' }, { status: 400 })
  }
  const email = String(body?.email ?? '').trim().toLowerCase()
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, erro: 'Informe um e-mail válido.' }, { status: 400 })
  }

  const siteUrl = siteBaseUrl(req)
  const result = await sendEmail({
    to: email,
    subject: EMAIL_REATIVACAO_ASSUNTO,
    html: emailReativacaoEmailHtml(siteUrl),
    text: emailReativacaoEmailText(siteUrl),
  })

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, erro: result.erro || 'Não foi possível enviar o e-mail de teste.' },
      { status: result.notConfigured ? 502 : 500 }
    )
  }

  return NextResponse.json({ ok: true, email, tipo: 'email_reativacao' })
}