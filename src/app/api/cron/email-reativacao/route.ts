import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/alerts/db'
import { autorizarCron } from '@/lib/cron/auth'
import { sendEmail } from '@/lib/alerts/notifications/email'
import { siteBaseUrl } from '@/lib/auth/site-url'
import { marcarEmailReativacaoEnviado } from '@/lib/planos/db'
import { selecionarAlvosReativacao } from '@/lib/planos/reativacao'
import { EMAIL_REATIVACAO_ASSUNTO, emailReativacaoEmailHtml, emailReativacaoEmailText } from '@/lib/planos/trial-email'
import { registrarEvento } from '@/lib/analytics-server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/email-reativacao
 *
 * Campanha de reativação (cron ~1x/dia): envia o e-mail "Seu teste terminou —
 * continue por R$ 19,90/mês" para usuários free com trial expirado, e-mail
 * válido e sem assinatura ativa. Mesmo padrão dos demais crons (Vinext /
 * Cloudflare sem `scheduled`): endpoint HTTP protegido pelo secret CRON_SECRET,
 * chamado por um agendador externo (GitHub Actions).
 *
 * Autorização: header `x-cron-secret` (ou `?token=`) === CRON_SECRET.
 * Idempotência: grava `email_reactivation_sent` + `email_reactivation_sent_at`
 * SOMENTE após o envio ter sucesso; a marcação guarda `is false` na cláusula,
 * então execuções concorrentes não duplicam.
 *
 * Query opcional: `?dryRun=1` — apenas lista os candidatos atuais SEM enviar
 * nada e SEM gravar registros (útil para validar a seleção antes de confiar
 * no disparo).
 */
export async function GET(req: Request) {
  const auth = autorizarCron(req)
  if (!auth.ok) return auth.response

  const url = new URL(req.url)
  const dryRun = url.searchParams.get('dryRun') === '1'

  let client
  try {
    client = createServiceClient()
  } catch {
    return NextResponse.json(
      { ok: false, erro: 'SUPABASE_SERVICE_ROLE_KEY não configurada.' },
      { status: 503 }
    )
  }

  let alvos
  try {
    alvos = await selecionarAlvosReativacao(client)
  } catch {
    return NextResponse.json({ ok: false, erro: 'Não foi possível listar os usuários.' }, { status: 500 })
  }

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      candidatos: alvos.length,
      alvos: alvos.map((a) => ({ user_id: a.user_id, email: a.email })),
      instrucao: 'Modo simulação: nada foi enviado nem gravado.',
    })
  }

  const base = siteBaseUrl(req)

  let enviados = 0
  let falhas = 0

  for (const alvo of alvos) {
    const result = await sendEmail({
      to: alvo.email,
      subject: EMAIL_REATIVACAO_ASSUNTO,
      html: emailReativacaoEmailHtml(base),
      text: emailReativacaoEmailText(base),
    })

    if (result.ok) {
      await marcarEmailReativacaoEnviado(client, alvo.user_id).catch(() => {})
      await registrarEvento(client, { event: 'email_reactivation', user_id: alvo.user_id, page: 'trial' })
      enviados++
    } else {
      falhas++
      console.error('[email-reativacao] falha ao enviar e-mail para', alvo.email, result.erro)
    }
  }

  return NextResponse.json({ ok: true, candidatos: alvos.length, enviados, falhas })
}