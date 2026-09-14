import { NextResponse } from 'next/server'
import { authorizeAdmin } from '@/lib/admin/auth'
import { sendEmail } from '@/lib/alerts/notifications/email'
import { siteBaseUrl } from '@/lib/auth/site-url'
import { trialLembreteAssunto, trialLembreteEmailHtml, trialLembreteEmailText } from '@/lib/planos/trial-email'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MARCOS = [7, 6, 4, 3, 2, 1, -2, -3, -6]

/**
 * POST /api/admin/trial/test-email-expirando
 *
 * Envia um e-mail de TESTE com o MESMO conteúdo de um marco da sequência de
 * lembretes de trial (o que o cron /api/cron/trial-expirando envia), para
 * validar o provedor/entrega antes de confiar no cron diário. Protegido pela
 * senha de administrador. NÃO grava marcador de idempotência (é só teste).
 *
 * Body: { email, dias? }  — `dias` default 7; aceita 7,6,4,3,2,1,-2,-3,-6.
 */
export async function POST(req: Request) {
  const auth = await authorizeAdmin(req)
  if (!auth.ok) return auth.response

  let body: { email?: string; dias?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido.' }, { status: 400 })
  }
  const email = String(body?.email ?? '').trim().toLowerCase()
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, erro: 'Informe um e-mail válido.' }, { status: 400 })
  }
  const dias = MARCOS.includes(Number(body?.dias)) ? Number(body?.dias) : 7

  const assinaturaLink = `${siteBaseUrl(req)}/minha-assinatura`
  const nome = email.split('@')[0]
  const result = await sendEmail({
    to: email,
    subject: trialLembreteAssunto(dias),
    html: trialLembreteEmailHtml(dias, nome, assinaturaLink),
    text: trialLembreteEmailText(dias, nome, assinaturaLink),
  })

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, erro: result.erro || 'Não foi possível enviar o e-mail de teste.' },
      { status: result.notConfigured ? 502 : 500 }
    )
  }

  return NextResponse.json({ ok: true, email, tipo: 'trial_lembrete', dias })
}
