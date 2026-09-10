import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/alerts/db'
import {
  createAsaasCustomer,
  findAsaasCustomerByEmail,
  getAsaasCustomer,
  updateAsaasCustomer,
  createAsaasSubscription,
  cancelAsaasSubscription,
  pixInfoDaAssinatura,
  type PixInfo,
} from '@/lib/asaas/client'
import { asaasConfigured } from '@/lib/asaas/config'
import { planById, cicloById, precoCiclo, planoIdParaDb, type PlanoId } from '@/lib/asaas/types'
import type { CicloAssinatura } from '@/lib/planos/plano'
import { saveAsaasCustomerId, iniciarAssinaturaTrial, getPlano } from '@/lib/planos/db'
import { trialEndIso } from '@/lib/planos/plano'

export const dynamic = 'force-dynamic'

interface CheckoutBody {
  planId?: string
  ciclo?: string
  paymentMethod?: 'credit_card' | 'pix'
  // CPF/CNPJ do titular — obrigatório no ASAAS para criar qualquer cobrança
  // (PIX ou cartão). Enviado ao cliente ASAAS; nunca persistido no banco do app.
  cpfCnpj?: string
  // Cartão — enviado temporariamente apenas para o ASAAS (tokenização).
  // NUNCA persiste no banco do app.
  card?: {
    holderName?: string
    number?: string
    expiryMonth?: string
    expiryYear?: string
    ccv?: string
    cpfCnpj?: string
    postalCode?: string
    addressNumber?: string
    addressComplement?: string
    phone?: string
  }
}

/**
 * POST /api/asaas/checkout
 *
 * Autenticado. Cria/reutiliza o cliente ASAAS do usuário e cria a assinatura
 * com 15 dias gratuitos (a primeira cobrança acontece após o trial), na
 * periodicidade e no valor total do ciclo escolhidos (desconto progressivo).
 *
 * Retorna dados para a página de checkout: para PIX, o QR/copia-e-cola do
 * primeiro pagamento; para cartão, confirmação da criação da assinatura.
 */
export async function POST(req: NextRequest) {
  if (!asaasConfigured()) {
    return NextResponse.json(
      { ok: false, erro: 'Pagamento ainda não configurado. Tente novamente em instantes.' },
      { status: 503 }
    )
  }

  // IP real do pagador (o ASAAS recusa IP de servidor; requer o IP do cliente).
  const remoteIp =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    ''

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, erro: 'Não autenticado.' }, { status: 401 })
  }

  let body: CheckoutBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido.' }, { status: 400 })
  }

  const plan = body.planId ? planById(body.planId as PlanoId) : planById('pro')
  if (!plan) {
    return NextResponse.json({ ok: false, erro: 'Plano inválido.' }, { status: 400 })
  }

  const cicloAtual = (body.ciclo || 'mensal') as CicloAssinatura
  const cic = cicloById(cicloAtual)
  if (!cic) {
    return NextResponse.json({ ok: false, erro: 'Periodicidade inválida.' }, { status: 400 })
  }

  const paymentMethod = body.paymentMethod === 'credit_card' ? 'credit_card' : 'pix'
  const name = String(user.user_metadata?.name || '')
  const email = user.email || ''

  // CPF/CNPJ obrigatório no ASAAS para criar qualquer cobrança.
  const cpfCnpj = body.cpfCnpj?.trim() || body.card?.cpfCnpj?.trim() || ''
  if (!cpfCnpj) {
    return NextResponse.json(
      { ok: false, erro: 'Informe seu CPF ou CNPJ para continuar.' },
      { status: 400 }
    )
  }

  let client
  try {
    client = createServiceClient()
  } catch {
    return NextResponse.json({ ok: false, erro: 'Banco de dados não configurado.' }, { status: 503 })
  }

  // ---------- Cliente ASAAS (reutilizar / nunca duplicar) ----------
  const existing = await getPlano(client, user.id)
  let customerId = existing?.asaas_customer_id || null
  // O id salvo pode pertencer a OUTRA conta ASAAS (ex.: id de sandbox gravado
  // durante testes e depois o ambiente trocado para produção). Se o id não
  // existir no ambiente atual, trata como não vinculado e recria.
  if (customerId) {
    const valido = await getAsaasCustomer(customerId)
    if (!valido) customerId = null
  }
  if (!customerId) {
    const found = await findAsaasCustomerByEmail(email)
    if (found) {
      customerId = found.id
      await saveAsaasCustomerId(client, user.id, customerId)
      // Garante CPF/CNPJ no cliente já existente (exigido para cobrar).
      if (cpfCnpj) {
        await updateAsaasCustomer(customerId, cpfCnpj)
      }
    } else {
      const created = await createAsaasCustomer({ name: name || email.split('@')[0], email, cpfCnpj })
      if (!created.ok) {
        return NextResponse.json(
          { ok: false, erro: `Não foi possível criar seu cadastro no pagamento: ${created.error}` },
          { status: 502 }
        )
      }
      customerId = created.customer.id
      await saveAsaasCustomerId(client, user.id, customerId)
    }
  } else if (cpfCnpj) {
    // Cliente já vinculado no banco: garante que tenha CPF/CNPJ para a cobrança.
    await updateAsaasCustomer(customerId, cpfCnpj)
  }

  // Troca de periodicidade/plano DURANTE o trial: se o usuário já possui uma
  // assinatura ainda em teste, cancela a antiga antes de criar a nova (evita
  // duplicidade e cobrança dupla). Depois de pago (active/overdue/etc.), a nova
  // assinatura é criada em separado e o usuário é orientado pelo painel.
  const statusAtual = existing?.status_pagamento
  const subAntiga = existing?.asaas_subscription_id
  if (subAntiga && (statusAtual === 'trial')) {
    await cancelAsaasSubscription(subAntiga).catch(() => {})
  }

  // 15 dias gratuitos — primeira cobrança após o trial.
  const trialFim = trialEndIso()
  // Valor TOTAL do ciclo com desconto progressivo (em reais para o ASAAS).
  const value = precoCiclo(plan.id, cic.id) / 100

  try {
    const subscription = await createAsaasSubscription({
      customer: customerId,
      billingType: paymentMethod === 'credit_card' ? 'CREDIT_CARD' : 'PIX',
      value,
      cycle: cic.asaasCycle,
      firstDueDate: trialFim.slice(0, 10),
      externalReference: `user:${user.id}:${plan.id}:${cic.id}`,
      remoteIp,
      ...(paymentMethod === 'credit_card' && body.card
        ? {
            creditCard: {
              holderName: body.card.holderName || '',
              number: body.card.number || '',
              expiryMonth: body.card.expiryMonth || '',
              expiryYear: body.card.expiryYear || '',
              ccv: body.card.ccv || '',
            },
            creditCardHolderInfo: {
              name: body.card.holderName || name,
              email,
              cpfCnpj,
              postalCode: body.card.postalCode || undefined,
              addressNumber: body.card.addressNumber || undefined,
              addressComplement: body.card.addressComplement || undefined,
              mobilePhone: body.card.phone || undefined,
            },
          }
        : {}),
    })

    if (!subscription.ok) {
      return NextResponse.json(
        { ok: false, erro: `Não foi possível criar a assinatura: ${subscription.error}` },
        { status: 502 }
      )
    }

    // Grava o plano/trial ASAAS no banco (mapeia empresa -> business).
    await iniciarAssinaturaTrial(client, user.id, {
      plano: planoIdParaDb(plan.id),
      asaasCustomerId: customerId,
      asaasSubscriptionId: subscription.subscription.id,
      paymentMethod,
      ciclo: cic.id,
      trialInicio: new Date().toISOString(),
      trialFim,
    })

    // Para PIX: garante QR + copia-e-cola REAIS da primeira cobrança, gerados na hora.
    let pix: PixInfo | null = null
    if (paymentMethod === 'pix') {
      pix = await pixInfoDaAssinatura(subscription.subscription.id)
    }

    return NextResponse.json({
      ok: true,
      subscriptionId: subscription.subscription.id,
      customerId,
      plano: plan.id,
      ciclo: cic.id,
      trialFim,
      value,
      pix,
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, erro: (e as Error)?.message || 'Erro ao processar o pagamento.' },
      { status: 500 }
    )
  }
}
