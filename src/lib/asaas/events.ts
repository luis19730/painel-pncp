// ============================================================================
// Processamento dos eventos do Webhook ASAAS.
//
// Recebe o payload de um evento e atualiza o banco (referências Tecnicas).
// As transições obedecem aos status definidos no spec:
//   TRIAL → ACTIVE → PAYMENT_PENDING → OVERDUE → CANCELED → BLOCKED
//
// O acesso nunca é liberado sem confirmação real vinda do ASAAS.
// ============================================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import { getPlano } from '@/lib/planos/db'
import { atualizarStatusAssinatura } from '@/lib/planos/db'
import { setPlanoManual } from '@/lib/planos/db'
import type { MetodoPagamento, StatusPagamento, CicloAssinatura, PlanoNome } from '@/lib/planos/plano'
import { proximaCobrancaIso } from '@/lib/planos/plano'
import { cicloById } from '@/lib/asaas/types'
import { linkPorValor } from '@/lib/asaas/links'
import { getAsaasCustomer } from '@/lib/asaas/client'
import { registrarEvento } from '@/lib/analytics-server'

type AnyClient = SupabaseClient<any, 'public', any>

interface AsaasEventPayload {
  event?: string
  payment?: any
  subscription?: any
  [key: string]: unknown
}

/**
 * Localiza o user_id associado a um id da assinatura ASAAS (ou customer).
 * Retorna o registro user_planos correspondente, se houver.
 */
async function findByAsaasRef(
  client: AnyClient,
  refs: { subscriptionId?: string | null; customerId?: string | null }
) {
  const { subscriptionId, customerId } = refs
  if (subscriptionId) {
    const { data } = await client
      .from('user_planos')
      .select('*')
      .eq('asaas_subscription_id', subscriptionId)
      .maybeSingle()
    if (data) return data
  }
  if (customerId) {
    const { data } = await client
      .from('user_planos')
      .select('*')
      .eq('asaas_customer_id', customerId)
      .maybeSingle()
    if (data) return data
  }
  return null
}

/**
 * Localiza o registro do usuário pelo E-MAIL do comprador (fluxo de Link de
 * Pagamento ASAAS). O link cria um customer próprio; o vínculo com o app é o
 * e-mail igual ao cadastro do Painel PNCP.
 *
 * Usa a Admin API (`auth.admin.listUsers()`), NÃO `client.from('auth.users')`:
 * a tabela `auth.users` não está exposta ao PostgREST deste projeto, então um
 * `.from('auth.users').select('id')` falha sempre (PGRST125) e o fluxo de link
 * nunca encontrava o usuário.
 */
async function findByEmail(client: AnyClient, email?: string | null) {
  if (!email) return null
  const norm = String(email).trim().toLowerCase()
  if (!norm) return null

  let user: { id: string } | null = null
  let page = 1
  const perPage = 1000
  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage })
    if (error) break
    user = data.users.find((u) => String(u.email || '').trim().toLowerCase() === norm) || null
    if (user || data.users.length < perPage) break
    page++
  }
  if (!user?.id) return null

  const { data } = await client
    .from('user_planos')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()
  return data || null
}

/** Recupera o e-mail do comprador do pagamento, quando disponível. */
async function emailDoPagamento(payload: AsaasEventPayload): Promise<string | null> {
  const customer: any = payload.payment?.customer
  if (customer && typeof customer === 'object' && customer.email) {
    return customer.email
  }
  const customerId =
    (typeof customer === 'string' && customer) ||
    (typeof payload.payment?.customer === 'string' && payload.payment.customer)
  if (customerId) {
    const c = await getAsaasCustomer(customerId)
    return c?.email || null
  }
  return null
}

/**
 * Processa um evento. Retorna { handled: true } quando o evento foi reconhecido
 * e o banco atualizado, ou { handled: false } para eventos ignorados/desconhecidos.
 */
export async function processAsaasEvent(
  client: AnyClient,
  payload: AsaasEventPayload
): Promise<{ handled: boolean; detail?: string }> {
  const event = payload.event || ''
  const payment = payload.payment || null
  const subscription = payload.subscription || null

  const paymentStatus: string | undefined = payment?.status
  const billingType: string | undefined = payment?.billingType || subscription?.billingType
  const paymentMethod: MetodoPagamento =
    billingType === 'PIX' ? 'pix' : billingType === 'CREDIT_CARD' ? 'credit_card' : 'none'

  const refs = {
    subscriptionId: subscription?.id || payment?.subscription || null,
    customerId: payment?.customer || subscription?.customer || null,
  }
  let rec = await findByAsaasRef(client, refs)

  // Fluxo de Link de Pagamento ASAAS: não existe subscription/asaas ref no app.
  // O vínculo é feito pelo E-MAIL do comprador (igual ao cadastro do Painel).
  // Ignoramos um customerId que seja apenas um id de string cru quando o payload
  // não o associa a nada: só tentamos o fallback por e-mail em pagamentos pagos.
  const isLinkPayment = !rec && !subscription && !!refs.customerId

  if (!rec) {
    const email = await emailDoPagamento(payload)
    rec = await findByEmail(client, email)
    if (isLinkPayment && rec && (paymentStatus === 'CONFIRMED' || paymentStatus === 'RECEIVED')) {
      const userId = rec.user_id as string
      // Resolve plano × periodicidade pelo VALOR pago (cada link tem valor único).
      let valorCents = Math.round(Number(payment?.value || 0) * 100)
      if (Number.isNaN(valorCents) || valorCents <= 0) {
        // tenta a partir de payment.value como string "39.90"
        const v = parseFloat(String(payment?.value || ''))
        valorCents = Number.isNaN(v) ? 0 : Math.round(v * 100)
      }
      const link = linkPorValor(valorCents)
      if (link) {
        const planoDb: PlanoNome = link.plano === 'empresa' ? 'business' : 'pro'
        const cic = cicloById(link.ciclo)
        const cicloDb: CicloAssinatura = (cic?.id as CicloAssinatura) || 'mensal'
        const lastPaymentAt = new Date().toISOString()
        const proxima = proximaCobrancaIso(lastPaymentAt, cicloDb)
        // Atualiza o plano (pro/business) e ativa a assinatura via link.
        await setPlanoManual(client, userId, planoDb)
        await atualizarStatusAssinatura(client, userId, {
          status: 'active',
          paymentMethod: payment?.billingType === 'PIX' ? 'pix' : 'credit_card',
          nextDueDate: proxima,
          lastPaymentAt,
          // Período de uso (fim do acesso) conta a partir da data do pagamento.
          trialFim: proxima,
        })
        // Persiste ciclo e customer id do link para futuras renovações.
        await client.from('user_planos').update({
          ciclo: link.ciclo,
          asaas_customer_id: typeof refs.customerId === 'string' ? refs.customerId : (refs.customerId as any)?.id || undefined,
          updated_at: new Date().toISOString(),
        }).eq('user_id', userId)

        await registrarEvento(client, {
          event: 'payment_confirmed',
          user_id: userId,
          page: 'checkout',
          props: { valor: payment?.value ?? null, origem: 'link' },
        })
        return { handled: true, detail: 'link_pago' }
      }
      return { handled: true, detail: 'link_pago_sem_mapeamento_de_plano' }
    }
  }

  if (!rec) {
    // Evento sem assinatura mapeada: ainda assim consumido (idempotência),
    // mas não há banco a alterar.
    return { handled: true, detail: 'sem_assinatura_mapeada' }
  }
  const userId = rec.user_id as string

  const nowIso = new Date().toISOString()
  const nextDueDate = subscription?.nextDueDate || payment?.dueDate || null

  // ---- Pagamento confirmado/recebido → ASSINATURA ATIVA ----
  if (paymentStatus === 'CONFIRMED' || paymentStatus === 'RECEIVED') {
    const lastPaymentAt = nowIso
    // Próxima renovação = pagamento + ciclo em MESES de calendário (1/3/6/12),
    // NÃO dias fixos (30/90/180/365). Ex.: 31/01 + 1 mês → 28/02.
    const cicloId = (rec?.ciclo || 'mensal') as CicloAssinatura
    const proxima = proximaCobrancaIso(lastPaymentAt, cicloId)
    await atualizarStatusAssinatura(client, userId, {
      status: 'active',
      paymentMethod,
      nextDueDate: proxima,
      lastPaymentAt,
      // Período de uso (fim do acesso) conta a partir da data do pagamento:
      // pagou R$ 39,90 (mensal) → +1 mês de uso, e assim por diante.
      trialFim: proxima,
    })
    await registrarEvento(client, {
      event: 'payment_confirmed',
      user_id: userId,
      page: 'checkout',
      props: { valor: payment?.value ?? null, billingType: payment?.billingType ?? null },
    })
    return { handled: true, detail: 'pago' }
  }

  // ---- Pagamento criado (ainda pendente) automaticamente ----
  if (paymentStatus === 'PENDING' || paymentStatus === 'CREATED') {
    // Mantém trial se ainda estiver dentro; caso contrário marca pendente.
    const plano = await getPlano(client, userId)
    const emTrial =
      !!plano?.trial_fim && new Date(plano.trial_fim).getTime() > Date.now()
    await atualizarStatusAssinatura(client, userId, {
      status: emTrial ? 'trial' : 'payment_pending',
      paymentMethod,
      nextDueDate,
    })
    return { handled: true, detail: 'pendente' }
  }

  // ---- Pagamento vencido → INADIMPLENTE ----
  if (paymentStatus === 'OVERDUE') {
    await atualizarStatusAssinatura(client, userId, {
      status: 'overdue',
      paymentMethod,
      nextDueDate,
    })
    return { handled: true, detail: 'inadimplente' }
  }

  // ---- Reembolso / chargeback ----
  if (paymentStatus === 'REFUNDED' || paymentStatus === 'CHARGEBACK_REQUESTED') {
    await atualizarStatusAssinatura(client, userId, {
      status: 'overdue',
      paymentMethod,
      nextDueDate,
    })
    return { handled: true, detail: 'reembolsado' }
  }
  if (paymentStatus === 'CHARGEBACK_DISPUTE') {
    await atualizarStatusAssinatura(client, userId, {
      status: 'overdue',
      paymentMethod,
      nextDueDate,
    })
    return { handled: true, detail: 'chargeback' }
  }

  // ---- Eventos de assinatura ----
  switch (event) {
    case 'SUBSCRIPTION_CREATED':
      await atualizarStatusAssinatura(client, userId, {
        status: 'trial',
        paymentMethod,
        nextDueDate,
      })
      return { handled: true, detail: 'criada' }
    case 'SUBSCRIPTION_UPDATED':
      await atualizarStatusAssinatura(client, userId, {
        paymentMethod,
        nextDueDate,
      })
      return { handled: true, detail: 'atualizada' }
    case 'SUBSCRIPTION_DELETED':
      await atualizarStatusAssinatura(client, userId, {
        status: 'canceled',
        paymentMethod,
      })
      return { handled: true, detail: 'cancelada' }
    default:
      // Evento não mapeado: consumido mas sem efeito (pode exigir ação manual).
      return { handled: false, detail: 'evento_nao_mapeado' }
  }
}
