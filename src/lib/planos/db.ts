// ============================================================================
// Camada de persistência dos PLANOS (tabela user_planos).
//
// Todas as funções recebem um cliente Supabase como parâmetro, permitindo dois
// contextos:
//   - Admin / cadastro (servidor): cliente SERVICE_ROLE (ignora RLS).
//   - UI do usuário (futuro): cliente do browser -> RLS isola por auth.uid().
// ============================================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import type { MetodoPagamento, PlanoNome, PlanoRecord, StatusPagamento, CicloAssinatura } from './plano'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, 'public', any>

/** Cria ou mantém o registro de trial de um usuário (idempotente). */
export async function upsertPlanoTrial(client: AnyClient, userId: string, record: PlanoRecord): Promise<void> {
  const { error } = await client.from('user_planos').upsert(
    {
      user_id: userId,
      plano: record.plano,
      origem: record.origem,
      trial_inicio: record.trial_inicio,
      trial_fim: record.trial_fim,
      updated_at: record.updated_at,
    },
    { onConflict: 'user_id' }
  )
  if (error) throw error
}

/** Busca o plano de um usuário específico. */
export async function getPlano(client: AnyClient, userId: string): Promise<PlanoRecord | null> {
  const { data, error } = await client
    .from('user_planos')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return (data as PlanoRecord) || null
}

/** Lista todos os planos (uso do admin via SERVICE_ROLE). */
export async function listPlanos(client: AnyClient): Promise<PlanoRecord[]> {
  const { data, error } = await client
    .from('user_planos')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as PlanoRecord[]
}

/** Promove/altera o plano de um usuário manualmente (admin). */
export async function setPlanoManual(client: AnyClient, userId: string, plano: PlanoNome): Promise<void> {
  const { error } = await client
    .from('user_planos')
    .upsert(
      {
        user_id: userId,
        plano,
        origem: 'manual',
        bloqueado: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
  if (error) throw error
}

/** Define/remove o bloqueio manual de acesso de um usuário (admin). */
export async function setBloqueio(client: AnyClient, userId: string, bloqueado: boolean): Promise<void> {
  const { error } = await client
    .from('user_planos')
    .update({ bloqueado, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
  if (error) throw error
}

/** Define manualmente a data de fim do trial de um usuário (admin). */
export async function setTrialFim(
  client: AnyClient,
  userId: string,
  trialFim: string | null
): Promise<void> {
  const now = new Date().toISOString()
  const { error } = await client
    .from('user_planos')
    .upsert(
      {
        user_id: userId,
        // O trial manual precisa voltar a ser `trial` (e plano free), senão o
        // registro antigo com origem 'manual'/'asaas' impede o trial de valer.
        // Também ZERA o status de pagamento e as referências ASAAS: um trial
        // manual não pode herdar um status 'trial'/'active' antigo que manteria
        // o acesso liberado mesmo com a nova data expirada.
        origem: 'trial',
        plano: 'free',
        trial_inicio: now,
        trial_fim: trialFim,
        bloqueado: false,
        status_pagamento: null,
        payment_method: null,
        asaas_subscription_id: null,
        asaas_customer_id: null,
        next_due_date: null,
        last_payment_at: null,
        canceled_at: null,
        updated_at: now,
      },
      { onConflict: 'user_id' }
    )
  if (error) throw error
}

/**
 * Lista os registros cujo trial já expirou (até o fim do dia corrente) e que
 * ainda NÃO receberam o e-mail de expiração. Usado pelo cron diário.
 */
export async function listPlanosTrialExpirado(client: AnyClient): Promise<PlanoRecord[]> {
  const agora = new Date()
  const fimDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1).toISOString()
  const { data, error } = await client
    .from('user_planos')
    .select('*')
    .lt('trial_fim', fimDia)
    .is('trial_email_enviado_em', null)
  if (error) throw error
  return (data || []) as PlanoRecord[]
}

/** Marca que o e-mail de expiração do trial já foi enviado para o usuário. */
export async function marcarTrialEmailEnviado(client: AnyClient, userId: string): Promise<void> {
  const { error } = await client
    .from('user_planos')
    .update({ trial_email_enviado_em: new Date().toISOString() })
    .eq('user_id', userId)
  if (error) throw error
}

/**
 * TRIAL RETROATIVO — concede um trial de 15 dias a todos os usuários SEM
 * registro em user_planos (legados, criados antes da feature de trial).
 *
 * Âncora: data de criação do usuário (auth.users.created_at) OU, se
 * indisponível, o instante atual. O usuário ganha os mesmos 15 dias contados
 * da criação (como se tivesse feito o cadastro normalmente).
 *
 * Idempotente: só cria registro para quem ainda não tem. Não toca em quem já
 * possui plano (pro/business) nem assinatura ASAAS.
 *
 * Carregamentos já prorrompidos (created_at > 15 dias atrás): o trial sai como
 * 'expirado' imediatamente — comportamento correto (não "ressuscita" acesso).
 */
export async function backfillTrialLegados(
  client: AnyClient,
  usuariosLegados: { id: string; created_at: string | null }[]
): Promise<{ criados: number; ignorados: number }> {
  const planos = await listPlanos(client)
  const comRegistro = new Set(planos.map((p) => p.user_id))

  let criados = 0
  let ignorados = 0
  for (const u of usuariosLegados) {
    if (comRegistro.has(u.id)) {
      ignorados++
      continue
    }
    const dataCadastro = u.created_at ? new Date(u.created_at) : new Date()
    const inicio = dataCadastro.toISOString()
    const fim = new Date(dataCadastro.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString()

    const { error } = await client.from('user_planos').upsert(
      {
        user_id: u.id,
        plano: 'free',
        origem: 'trial',
        trial_inicio: inicio,
        trial_fim: fim,
        updated_at: new Date().toISOString(),
        created_at: inicio,
      },
      { onConflict: 'user_id' }
    )
    if (error) {
      ignorados++
    } else {
      criados++
    }
  }

  return { criados, ignorados }
}

// ============================================================================
// ASAAS
// ============================================================================

/** Grava o id do cliente ASAAS no registro do usuário (idempotente). */
export async function saveAsaasCustomerId(
  client: AnyClient,
  userId: string,
  customerId: string
): Promise<void> {
  const { error } = await client.from('user_planos').upsert(
    {
      user_id: userId,
      asaas_customer_id: customerId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )
  if (error) throw error
}

/**
 * Inicia a assinatura (15 dias grátis) a partir do checkout. Cria o registro
 * `origem = 'asaas'`, plano pro e status 'trial'. NÃO cobra nada agora.
 */
export async function iniciarAssinaturaTrial(
  client: AnyClient,
  userId: string,
  input: {
    plano: PlanoNome
    asaasCustomerId: string
    asaasSubscriptionId: string
    paymentMethod: MetodoPagamento
    ciclo: CicloAssinatura
    trialInicio: string
    trialFim: string
  }
): Promise<void> {
  const { error } = await client.from('user_planos').upsert(
    {
      user_id: userId,
      plano: input.plano,
      origem: 'asaas',
      trial_inicio: input.trialInicio,
      trial_fim: input.trialFim,
      asaas_customer_id: input.asaasCustomerId,
      asaas_subscription_id: input.asaasSubscriptionId,
      status_pagamento: 'trial',
      payment_method: input.paymentMethod,
      ciclo: input.ciclo,
      next_due_date: null,
      last_payment_at: null,
      canceled_at: null,
      bloqueado: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )
  if (error) throw error
}

/** Atualiza o status da assinatura ASAAS (sem alterar plano/origem). */
export async function atualizarStatusAssinatura(
  client: AnyClient,
  userId: string,
  input: {
    status?: StatusPagamento
    paymentMethod?: MetodoPagamento
    nextDueDate?: string | null
    lastPaymentAt?: string | null
    asaasSubscriptionId?: string
    /**
     * Fim do período de uso (linha temporal que rege o acesso). Ao receber um
     * pagamento, o app o estende a partir da data do pagamento + o ciclo
     * contratado (ex.: 39,90 mensal → +1 mês de uso).
     */
    trialFim?: string | null
  }
): Promise<void> {
  const patch: Record<string, unknown> = {
    status_pagamento: input.status,
    payment_method: input.paymentMethod !== undefined ? input.paymentMethod : undefined,
    next_due_date: input.nextDueDate !== undefined ? input.nextDueDate : undefined,
    last_payment_at: input.lastPaymentAt !== undefined ? input.lastPaymentAt : undefined,
    asaas_subscription_id: input.asaasSubscriptionId,
    trial_fim: input.trialFim !== undefined ? input.trialFim : undefined,
    updated_at: new Date().toISOString(),
  }
  // Remove chaves indefinidas para não sobrescrever com null desnecessariamente.
  Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k])

  const { error } = await client
    .from('user_planos')
    .update(patch)
    .eq('user_id', userId)
  if (error) throw error
}

/** Cancela a assinatura no banco (registra data e impede acesso). */
export async function cancelarAssinatura(
  client: AnyClient,
  userId: string
): Promise<void> {
  const { error } = await client
    .from('user_planos')
    .update({
      status_pagamento: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
  if (error) throw error
}

/** Registra um evento de webhook (idempotência: retorna false se já existe). */
export async function registrarWebhookEvent(
  client: AnyClient,
  input: { event_id: string; event_type: string; payload: Record<string, unknown> }
): Promise<{ ok: boolean; created: boolean }> {
  // Tenta inserir; o unique index em event_id impede duplicata (idempotência).
  const { error } = await client.from('asaas_webhook_events').insert({
    event_id: input.event_id,
    event_type: input.event_type,
    payload: input.payload,
    processed: false,
  })
  if (error) return { ok: false, created: false }
  return { ok: true, created: true }
}

/** Marca um evento de webhook como processado. */
export async function marcarWebhookProcessado(
  client: AnyClient,
  eventId: string
): Promise<void> {
  await client
    .from('asaas_webhook_events')
    .update({ processed: true, processed_at: new Date().toISOString() })
    .eq('event_id', eventId)
}

/** Lista assinaturas para o painel admin (filtro opcional por status). */
export async function listAssinaturas(
  client: AnyClient,
  status?: StatusPagamento
): Promise<PlanoRecord[]> {
  let q = client.from('user_planos').select('*')
  if (status) q = q.eq('status_pagamento', status)
  q.order('created_at', { ascending: false })
  const { data, error } = await q
  if (error) throw error
  return (data || []) as PlanoRecord[]
}
