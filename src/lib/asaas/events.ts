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
import { getPlano, atualizarStatusAssinatura, ativarAssinaturaPorPagamento } from '@/lib/planos/db'
import type { MetodoPagamento, CicloAssinatura, PlanoNome } from '@/lib/planos/plano'
import { proximaCobrancaIso } from '@/lib/planos/plano'
import { linkPorValor } from '@/lib/asaas/links'
import { getAsaasCustomer } from '@/lib/asaas/client'
import { registrarEvento } from '@/lib/analytics-server'
import { adminEmailList } from '@/lib/auth/admin-emails'
import { sendEmail } from '@/lib/alerts/notifications/email'

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
 * Interpreta o `payment.externalReference` gravado no checkout/assinatura:
 *   user:<uuid>:<plano>:<ciclo>   →  ex.: user:143fcf89-…:pro:mensal
 * É o vínculo MAIS confiável entre o pagamento e o usuário/plano (o ASAAS
 * devolve esse campo em todo evento de pagamento).
 */
export function parseExternalReference(ref?: string | null): {
  userId?: string
  plano?: PlanoNome
  ciclo?: CicloAssinatura
} {
  if (!ref || typeof ref !== 'string') return {}
  const m = ref.match(/user:([0-9a-fA-F-]{36})(?::([A-Za-z_]+))?(?::([a-z]+))?/)
  if (!m) return {}
  const planoRaw = (m[2] || '').toLowerCase()
  const cicloRaw = (m[3] || '').toLowerCase()
  const plano: PlanoNome | undefined =
    planoRaw === 'empresa' || planoRaw === 'business'
      ? 'business'
      : planoRaw === 'pro'
        ? 'pro'
        : undefined
  const ciclo: CicloAssinatura | undefined = (
    ['mensal', 'trimestral', 'semestral', 'anual'] as const
  ).includes(cicloRaw as CicloAssinatura)
    ? (cicloRaw as CicloAssinatura)
    : undefined
  return { userId: m[1], plano, ciclo }
}

/**
 * Avisa o administrador (ADMIN_EMAILS — inclui luis19730@gmail.com) que houve
 * um pagamento. Best-effort: nunca lança e nunca bloqueia o webhook.
 */
async function notificarAdminPagamento(input: {
  evento: string
  valor?: number | string | null
  plano?: string | null
  ciclo?: string | null
  metodo?: string | null
  userId?: string | null
  emailComprador?: string | null
  customerId?: string | null
  subscriptionId?: string | null
  vinculado: boolean
}): Promise<void> {
  try {
    const to = adminEmailList()
    if (to.length === 0) return
    const valor =
      input.valor != null ? `R$ ${Number(input.valor).toFixed(2).replace('.', ',')}` : '—'
    const assunto = input.vinculado
      ? `Pagamento recebido: ${valor} — ${input.plano ?? 'plano'} (${input.ciclo ?? '—'})`
      : `Pagamento SEM vinculo: ${valor} — associar manualmente`
    const linhas: Array<[string, string]> = [
      ['Evento', input.evento],
      ['Valor', valor],
      ['Plano', input.plano ?? '—'],
      ['Ciclo', input.ciclo ?? '—'],
      ['Metodo', input.metodo ?? '—'],
      ['Usuario (id)', input.userId ?? '—'],
      ['E-mail do comprador', input.emailComprador ?? '—'],
      ['Customer ASAAS', input.customerId ?? '—'],
      ['Assinatura ASAAS', input.subscriptionId ?? '—'],
      ['Acesso liberado', input.vinculado ? 'SIM' : 'NAO (vincular manualmente)'],
    ]
    const html = `<h2>${assunto}</h2><table cellpadding="6" border="0">${linhas
      .map(([k, v]) => `<tr><td><b>${k}</b></td><td>${v}</td></tr>`)
      .join('')}</table>`
    const text = linhas.map(([k, v]) => `${k}: ${v}`).join('\n')
    const r = await sendEmail({ to, subject: assunto, html, text })
    if (!r.ok) console.error('[asaas-webhook] falha ao notificar admin:', r.erro)
  } catch (e) {
    console.error('[asaas-webhook] erro ao notificar admin:', (e as Error)?.message)
  }
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
  const customerIdStr = typeof refs.customerId === 'string' ? refs.customerId : null
  const subscriptionIdStr = typeof refs.subscriptionId === 'string' ? refs.subscriptionId : null

  const nowIso = new Date().toISOString()
  const nextDueDate = subscription?.nextDueDate || payment?.dueDate || null

  // ---- Resolve o usuário (ordem de confiabilidade) ----
  //   1) payment.externalReference = "user:<uuid>:<plano>:<ciclo>" (checkout);
  //   2) ids ASAAS já gravados em user_planos (subscription/customer);
  //   3) e-mail do comprador (Link de Pagamento).
  const xref = parseExternalReference(payment?.externalReference)
  let rec = xref.userId ? await getPlano(client, xref.userId) : null
  if (!rec) rec = await findByAsaasRef(client, refs)
  let emailComprador: string | null = null
  if (!rec) {
    emailComprador = await emailDoPagamento(payload)
    rec = await findByEmail(client, emailComprador)
  }
  const resolvidoUserId = xref.userId || ((rec?.user_id as string | undefined) ?? undefined)

  const valorCents = Math.round(Number(payment?.value ?? 0) * 100) || 0
  const link = linkPorValor(valorCents)

  // ---- PAGAMENTO CONFIRMADO/RECEBIDO → LIBERA/RENOVA O ACESSO ----
  if (paymentStatus === 'CONFIRMED' || paymentStatus === 'RECEIVED') {
    const planoFinal: PlanoNome =
      xref.plano ||
      (rec?.plano && rec.plano !== 'free' ? (rec.plano as PlanoNome) : undefined) ||
      (link ? (link.plano === 'empresa' ? 'business' : 'pro') : undefined) ||
      'pro'
    const cicloFinal: CicloAssinatura =
      xref.ciclo ||
      ((rec?.ciclo as CicloAssinatura | undefined) ?? undefined) ||
      (link ? (link.ciclo as CicloAssinatura) : undefined) ||
      'mensal'
    // Período de uso = data do pagamento + ciclo em MESES de calendário.
    const proxima = proximaCobrancaIso(nowIso, cicloFinal)

    if (resolvidoUserId) {
      await ativarAssinaturaPorPagamento(client, resolvidoUserId, {
        plano: planoFinal,
        ciclo: cicloFinal,
        paymentMethod,
        lastPaymentAt: nowIso,
        proxima,
        asaasCustomerId: customerIdStr,
        asaasSubscriptionId: subscriptionIdStr,
      })
      await registrarEvento(client, {
        event: 'payment_confirmed',
        user_id: resolvidoUserId,
        page: 'checkout',
        props: {
          valor: payment?.value ?? null,
          plano: planoFinal,
          ciclo: cicloFinal,
          billingType: payment?.billingType ?? null,
        },
      })
      await notificarAdminPagamento({
        evento: event,
        valor: payment?.value ?? null,
        plano: planoFinal,
        ciclo: cicloFinal,
        metodo: paymentMethod,
        userId: resolvidoUserId,
        emailComprador,
        customerId: customerIdStr,
        subscriptionId: subscriptionIdStr,
        vinculado: true,
      })
      return { handled: true, detail: 'pago_liberado' }
    }

    // Pagamento confirmado sem vínculo: avisa o admin para associar manualmente.
    await notificarAdminPagamento({
      evento: event,
      valor: payment?.value ?? null,
      plano: link?.plano ?? null,
      ciclo: link?.ciclo ?? null,
      metodo: paymentMethod,
      userId: null,
      emailComprador,
      customerId: customerIdStr,
      subscriptionId: subscriptionIdStr,
      vinculado: false,
    })
    return { handled: true, detail: 'pago_sem_vinculo' }
  }

  if (!rec) {
    // Evento sem assinatura mapeada: consumido (idempotência), sem alteração.
    return { handled: true, detail: 'sem_assinatura_mapeada' }
  }
  const userId = rec.user_id as string

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
