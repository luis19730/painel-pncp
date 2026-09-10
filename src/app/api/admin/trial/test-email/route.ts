import { NextResponse } from 'next/server'
import { authorizeAdmin } from '@/lib/admin/auth'
import { sendEmail } from '@/lib/alerts/notifications/email'
import { siteBaseUrl } from '@/lib/auth/site-url'
import { trialExpiradoEmailHtml, trialExpiradoEmailText } from '@/lib/planos/trial-email'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * POST /api/admin/trial/test-email
 *
 * Envia um e-mail de teste (mesmo conteúdo do "período de teste terminou") para
 * validar a configuração do provedor (Brevo/Resend) antes de confiar no cron
 * diário. Protegido pela senha de administrador.
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

  const planoLink = `${siteBaseUrl(req)}/planos`
  const result = await sendEmail({
    to: email,
    subject: 'Seu período de teste terminou — Painel PNCP',
    html: trialExpiradoEmailHtml(planoLink),
    text: trialExpiradoEmailText(planoLink),
  })

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, erro: result.erro || 'Não foi possível enviar o e-mail de teste.' },
      { status: result.notConfigured ? 502 : 500 }
    )
  }

  return NextResponse.json({ ok: true, email })
}
