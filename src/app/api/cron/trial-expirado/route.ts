import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/alerts/db'
import { listAllUsers } from '@/lib/supabase/admin'
import { listPlanosTrialExpirado, marcarTrialEmailEnviado } from '@/lib/planos/db'
import { computePlanoInfo } from '@/lib/planos/plano'
import { sendEmail } from '@/lib/alerts/notifications/email'
import { siteBaseUrl } from '@/lib/auth/site-url'
import { trialExpiradoEmailHtml, trialExpiradoEmailText } from '@/lib/planos/trial-email'
import { registrarEvento } from '@/lib/analytics-server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/trial-expirado
 *
 * Endpoint de disparo externo (cron DIÁRIO) que envia o e-mail de "período de
 * teste encerrado" para os usuários cujo trial expirou e que não possuem um
 * plano ativo.
 *
 * Motivo (mesmo padrão do /api/cron/alertas): o Vinext/Cloudflare Workers não
 * suporta handler nativo `scheduled`, então o processamento é exposto via HTTP
 * protegido pelo secret `CRON_SECRET`, chamado por um cron externo (ex.: diário
 * às 09:00).
 *
 * Autorização: header `x-cron-secret` (ou query `?token=`) === `CRON_SECRET`.
 * Idempotência: usa a coluna `trial_email_enviado_em` para nunca enviar duas
 * vezes para o mesmo usuário.
 */
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET
  if (!expected || expected.includes('placeholder')) {
    return NextResponse.json({ ok: false, erro: 'CRON_SECRET não configurado.' }, { status: 503 })
  }

  const url = new URL(req.url)
  const token = req.headers.get('x-cron-secret') || url.searchParams.get('token') || ''
  if (token !== expected) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado.' }, { status: 401 })
  }

  let client
  try {
    client = createServiceClient()
  } catch {
    return NextResponse.json(
      { ok: false, erro: 'SUPABASE_SERVICE_ROLE_KEY não configurada.' },
      { status: 503 }
    )
  }

  const [registros, usersRes] = await Promise.all([
    listPlanosTrialExpirado(client).catch(() => [] as never[]),
    listAllUsers(client).then((r) => ({ users: r.users, error: r.error })),
  ])
  if (usersRes.error) {
    return NextResponse.json({ ok: false, erro: 'Não foi possível listar os usuários.' }, { status: 500 })
  }

  const emailPorUser = new Map<string, string>()
  for (const u of usersRes.users) {
    if (u.id && u.email) emailPorUser.set(u.id, u.email)
  }

  // Só notifica quem estava em trial, sem plano pago e sem assinatura ASAAS ativa.
  const alvos = registros.filter((r) => {
    const info = computePlanoInfo(r)
    if (info.origem !== 'trial') return false
    if (info.bloqueado) return false
    if (info.plano === 'pro' || info.plano === 'business') return false
    if (info.statusPagamento === 'active' || info.statusPagamento === 'trial') return false
    return true
  })

  const base = siteBaseUrl(req)
  const planoLink = `${base}/planos`

  let enviados = 0
  let falhas = 0

  for (const r of alvos) {
    const email = emailPorUser.get(r.user_id)
    if (!email) continue

    const result = await sendEmail({
      to: email,
      subject: 'Seu período de teste terminou — Painel PNCP',
      html: trialExpiradoEmailHtml(planoLink),
      text: trialExpiradoEmailText(planoLink),
    })

    if (result.ok) {
      await marcarTrialEmailEnviado(client, r.user_id).catch(() => {})
      await registrarEvento(client, { event: 'trial_expired', user_id: r.user_id, page: 'trial' })
      enviados++
    } else {
      falhas++
      console.error('[trial-expirado] falha ao enviar e-mail para', email, result.erro)
    }
  }

  return NextResponse.json({ ok: true, alvos: alvos.length, enviados, falhas })
}
