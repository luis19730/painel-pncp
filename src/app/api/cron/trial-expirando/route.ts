import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/alerts/db'
import { listAllUsers } from '@/lib/supabase/admin'
import { listPlanos } from '@/lib/planos/db'
import { computePlanoInfo } from '@/lib/planos/plano'
import { sendEmail } from '@/lib/alerts/notifications/email'
import { siteBaseUrl } from '@/lib/auth/site-url'
import { trialExpirando7dEmailHtml, trialExpirando7dEmailText } from '@/lib/planos/trial-email'
import { registrarEvento } from '@/lib/analytics-server'
import { resolverIgnorados } from '@/lib/admin/publico'

export const dynamic = 'force-dynamic'

const DIA_MS = 24 * 60 * 60 * 1000

/**
 * GET /api/cron/trial-expirando
 *
 * Cron DIÁRIO: envia o aviso "seu trial expira em 7 dias" para quem está em
 * trial, sem assinatura ativa e com exatamente 7 dias restantes.
 *
 * Mesmo padrão do /api/cron/trial-expirado (Vinext/Cloudflare não tem handler
 * `scheduled`): endpoint HTTP protegido por CRON_SECRET, chamado por cron
 * externo (GitHub Action diária).
 *
 * Idempotência: grava um evento `trial_email_7d` em analytics_events por
 * usuário; se já existir, não reenvia (sem coluna/migration nova).
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
    return NextResponse.json({ ok: false, erro: 'SUPABASE_SERVICE_ROLE_KEY não configurada.' }, { status: 503 })
  }

  const ignorados = await resolverIgnorados(client)
  const [planos, usersRes] = await Promise.all([
    listPlanos(client).catch(() => [] as never[]),
    listAllUsers(client).then((r) => ({ users: r.users, error: r.error })),
  ])
  if (usersRes.error) {
    return NextResponse.json({ ok: false, erro: 'Não foi possível listar os usuários.' }, { status: 500 })
  }

  const nomePorUser = new Map<string, string>()
  const emailPorUser = new Map<string, string>()
  for (const u of usersRes.users) {
    if (!u.id) continue
    if (u.email) {
      emailPorUser.set(u.id, u.email)
      // Nome amigável: parte local do e-mail (o tipo retornado não expõe user_metadata).
      nomePorUser.set(u.id, u.email.split('@')[0])
    }
  }

  const agora = new Date()
  const alvos = planos.filter((r) => {
    if (!r.user_id || ignorados.userIds.has(r.user_id)) return false
    const info = computePlanoInfo(r, agora)
    if (info.origem !== 'trial') return false
    if (info.bloqueado) return false
    if (info.plano === 'pro' || info.plano === 'business') return false
    if (info.statusPagamento === 'active' || info.statusPagamento === 'trial') return false
    return info.diasRestantes === 7
  })

  if (alvos.length === 0) {
    return NextResponse.json({ ok: true, alvos: 0, enviados: 0, pulados: 0, falhas: 0 })
  }

  // Idempotência: descobre quem já recebeu o aviso (evento trial_email_7d).
  const ids = alvos.map((a) => a.user_id)
  const jaEnviados = new Set<string>()
  const { data: marcas } = await client
    .from('analytics_events')
    .select('user_id')
    .eq('event', 'trial_email_7d')
    .in('user_id', ids)
  for (const m of marcas || []) {
    if (m.user_id) jaEnviados.add(m.user_id)
  }

  const base = siteBaseUrl(req)
  const assinaturaLink = `${base}/minha-assinatura`

  let enviados = 0
  let pulados = 0
  let falhas = 0

  for (const r of alvos) {
    const userId = r.user_id
    if (jaEnviados.has(userId)) {
      pulados++
      continue
    }
    const email = emailPorUser.get(userId)
    if (!email) {
      pulados++
      continue
    }
    const nome = nomePorUser.get(userId) || ''
    const result = await sendEmail({
      to: email,
      subject: '⏰ Seu período de teste no Painel PNCP expira em 7 dias — Não perca o acesso às suas licitações!',
      html: trialExpirando7dEmailHtml(nome, assinaturaLink),
      text: trialExpirando7dEmailText(nome, assinaturaLink),
    })
    if (result.ok) {
      await registrarEvento(client, { event: 'trial_email_7d', user_id: userId, page: 'trial' })
      enviados++
    } else {
      falhas++
      console.error('[trial-expirando] falha ao enviar e-mail para', email, result.erro)
    }
  }

  return NextResponse.json({ ok: true, alvos: alvos.length, enviados, pulados, falhas })
}
