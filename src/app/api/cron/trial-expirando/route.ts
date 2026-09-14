import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/alerts/db'
import { listAllUsers } from '@/lib/supabase/admin'
import { listPlanos } from '@/lib/planos/db'
import { computePlanoInfo } from '@/lib/planos/plano'
import { sendEmail } from '@/lib/alerts/notifications/email'
import { siteBaseUrl } from '@/lib/auth/site-url'
import { trialLembreteAssunto, trialLembreteEmailHtml, trialLembreteEmailText } from '@/lib/planos/trial-email'
import { registrarEvento } from '@/lib/analytics-server'
import { resolverIgnorados } from '@/lib/admin/publico'

export const dynamic = 'force-dynamic'

const DIA_MS = 24 * 60 * 60 * 1000

/**
 * Marcos da sequência de lembretes de trial (em dias):
 *   > 0  → faltam N dias
 *   <= 0 → expirou há |N| dias
 * O cron roda 1x/dia; cada marco é enviado no dia em que `dias` coincide,
 * uma única vez por usuário, e para de enviar quando a assinatura é
 * confirmada (plano pago ou status_pagamento 'active').
 */
export const MARCOS_TRIAL = [7, 6, 4, 3, 2, 1, -2, -3, -6]

/** Dias restantes (positivo) ou dias desde a expiração (negativo). */
function diasAte(fimIso: string, agora: Date): number {
  const diff = new Date(fimIso).getTime() - agora.getTime()
  return diff >= 0 ? Math.ceil(diff / DIA_MS) : -Math.ceil(-diff / DIA_MS)
}

/**
 * GET /api/cron/trial-expirando
 *
 * Cron DIÁRIO da sequência de lembretes de trial: envia e-mail nos marcos
 * 7, 6, 4, 3, 2, 1 (antes de expirar) e -2, -3, -6 (depois), para quem está em
 * trial e NÃO tem assinatura ativa. Para ao confirmar a assinatura.
 *
 * Mesmo padrão dos demais crons (Vinext/Cloudflare sem `scheduled`): endpoint
 * HTTP protegido por CRON_SECRET, chamado por cron externo (GitHub Action).
 *
 * Idempotência: grava um evento `trial_reminder` em analytics_events com o
 * marco em `props.mark`; se já existir (user+mark), não reenvia.
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
      nomePorUser.set(u.id, u.email.split('@')[0])
    }
  }

  const agora = new Date()

  // Candidatos: em trial (ou expirados), não bloqueados, sem assinatura ativa,
  // e cuja data de fim cai exatamente em um dos marcos.
  const candidatos = planos
    .map((r) => {
      if (!r.user_id || ignorados.userIds.has(r.user_id)) return null
      const info = computePlanoInfo(r, agora)
      if (info.bloqueado) return null
      // Assinatura ativa/confirmada → para de enviar lembretes.
      if (info.plano === 'pro' || info.plano === 'business') return null
      if (info.statusPagamento === 'active') return null
      const fim = info.trialFimCalculado
      if (!fim) return null
      const dias = diasAte(fim, agora)
      if (!MARCOS_TRIAL.includes(dias)) return null
      return { user_id: r.user_id, dias }
    })
    .filter((c): c is { user_id: string; dias: number } => c !== null)

  if (candidatos.length === 0) {
    return NextResponse.json({ ok: true, marcos: MARCOS_TRIAL, candidatos: 0, enviados: 0, pulados: 0, falhas: 0 })
  }

  // Idempotência: quem já recebeu cada marco (evento trial_reminder + props.mark).
  const ids = Array.from(new Set(candidatos.map((c) => c.user_id)))
  const jaEnviados = new Set<string>()
  const { data: marcas } = await client
    .from('analytics_events')
    .select('user_id, props')
    .eq('event', 'trial_reminder')
    .in('user_id', ids)
  for (const m of marcas || []) {
    const mark = (m.props as Record<string, unknown> | null)?.mark
    if (m.user_id && mark != null) jaEnviados.add(`${m.user_id}|${mark}`)
  }

  const base = siteBaseUrl(req)
  const assinaturaLink = `${base}/minha-assinatura`

  let enviados = 0
  let pulados = 0
  let falhas = 0
  const enviadosPorMarco: Record<string, number> = {}

  for (const c of candidatos) {
    if (jaEnviados.has(`${c.user_id}|${c.dias}`)) {
      pulados++
      continue
    }
    const email = emailPorUser.get(c.user_id)
    if (!email) {
      pulados++
      continue
    }
    const nome = nomePorUser.get(c.user_id) || ''
    const result = await sendEmail({
      to: email,
      subject: trialLembreteAssunto(c.dias),
      html: trialLembreteEmailHtml(c.dias, nome, assinaturaLink),
      text: trialLembreteEmailText(c.dias, nome, assinaturaLink),
    })
    if (result.ok) {
      await registrarEvento(client, {
        event: 'trial_reminder',
        user_id: c.user_id,
        page: 'trial',
        props: { mark: c.dias },
      })
      enviados++
      enviadosPorMarco[String(c.dias)] = (enviadosPorMarco[String(c.dias)] || 0) + 1
    } else {
      falhas++
      console.error('[trial-expirando] falha ao enviar marco', c.dias, 'para', email, result.erro)
    }
  }

  return NextResponse.json({
    ok: true,
    marcos: MARCOS_TRIAL,
    candidatos: candidatos.length,
    enviados,
    pulados,
    falhas,
    enviados_por_marco: enviadosPorMarco,
  })
}
