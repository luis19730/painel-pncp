import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/alerts/db'
import { getPlano } from '@/lib/planos/db'
import { computePlanoInfo } from '@/lib/planos/plano'
import { cancelAsaasSubscription, pixInfoDaAssinatura } from '@/lib/asaas/client'
import { cancelarAssinatura } from '@/lib/planos/db'
import { cicloById, precoCiclo, formatReais, type PlanoId } from '@/lib/asaas/types'
import type { CicloAssinatura, PlanoNome } from '@/lib/planos/plano'

export const dynamic = 'force-dynamic'

/** Mapéia o plano do banco para o id de preço (pro/empresa). */
function planoPagavel(plano: PlanoNome): PlanoId {
  return plano === 'business' ? 'empresa' : 'pro'
}

/**
 * GET /api/asaas/subscription
 * Retorna a assinatura DO PRÓPRIO usuário logado. Nunca expõe dados de outro.
 */
export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, erro: 'Não autenticado.' }, { status: 401 })
  }

  let client
  try {
    client = createServiceClient()
  } catch {
    return NextResponse.json({ ok: false, erro: 'Banco de dados não configurado.' }, { status: 503 })
  }

  const rec = await getPlano(client, user.id)
  const info = computePlanoInfo(rec)

  const cicloAtual = info.cicloAssinatura as CicloAssinatura
  const cic = cicloById(cicloAtual) || cicloById('mensal')!
  const planoId = planoPagavel(info.plano)
  const valorCiclo = precoCiclo(planoId, cic.id)

  // Busca o PIX real (QR + copia-e-cola) se houver assinatura e método PIX.
  let pix: { qrCode?: string; copiaECola?: string; status?: string } | null = null
  if (info.asaasSubscriptionId && info.paymentMethod === 'pix') {
    pix = await pixInfoDaAssinatura(info.asaasSubscriptionId)
  }

  return NextResponse.json({
    ok: true,
    assinatura: {
      plano: info.plano,
      origem: info.origem,
      status: info.statusPagamento,
      paymentMethod: info.paymentMethod,
      ciclo: cic.id,
      cicloLabel: cic.label,
      valorCiclo,
      valorCicloLabel: formatReais(valorCiclo),
      trialInicio: info.trial_inicio,
      trialFim: info.trialFimCalculado,
      diasRestantes: info.diasRestantes,
      nextDueDate: info.nextDueDate,
      lastPaymentAt: info.lastPaymentAt,
      canceledAt: info.canceledAt,
      acessoPermitido: info.acessoPermitido,
      asaasCustomerId: info.asaasCustomerId,
      asaasSubscriptionId: info.asaasSubscriptionId,
      emTrial: info.emTrial,
      pix,
    },
  })
}

/**
 * POST /api/asaas/subscription  (body: { acao: 'cancelar' })
 * Cancela a assinatura do próprio usuário (ASAAS + banco) e impede novas cobranças.
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, erro: 'Não autenticado.' }, { status: 401 })
  }

  let body: { acao?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido.' }, { status: 400 })
  }

  if (body.acao !== 'cancelar') {
    return NextResponse.json({ ok: false, erro: 'Ação inválida.' }, { status: 400 })
  }

  let client
  try {
    client = createServiceClient()
  } catch {
    return NextResponse.json({ ok: false, erro: 'Banco de dados não configurado.' }, { status: 503 })
  }

  const rec = await getPlano(client, user.id)
  const subId = rec?.asaas_subscription_id
  if (subId) {
    const r = await cancelAsaasSubscription(subId)
    if (!r.ok) {
      return NextResponse.json(
        { ok: false, erro: `Não foi possível cancelar no ASAAS: ${r.error}` },
        { status: 502 }
      )
    }
  }

  await cancelarAssinatura(client, user.id)
  return NextResponse.json({ ok: true, status: 'canceled' })
}
