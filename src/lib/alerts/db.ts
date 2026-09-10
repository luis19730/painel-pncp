// ============================================================================
// Camada de persistência dos ALERTAS.
//
// Todas as funções recebem um cliente Supabase como parâmetro, para que a MESMA
// lógica sirva a dois contextos:
//   - UI (/alertas): cliente anônimo do browser -> RLS isola por auth.uid().
//   - Processador agendado (worker): cliente SERVICE_ROLE -> ignora RLS,
//     usado apenas fora do navegador (NUNCA exposto no frontend).
// ============================================================================

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AlertRecord,
  Canal,
  ChannelRecord,
  DeliveryRecord,
  ModoEnvio,
  Frequencia,
  ScheduleRecord,
  StatusEnvio,
} from './types'

type AnyClient = SupabaseClient<any, 'public', any>

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

/**
 * Cria o cliente com a chave SERVICE_ROLE (back-end / worker somente).
 * Lança erro se a chave não estiver configurada — NÃO existe envio/escrita
 * "falso" sem credenciais reais.
 */
export function createServiceClient(): SupabaseClient<any, 'public', any> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key || key === 'placeholder-service-role-key' || key.includes('placeholder')) {
    throw new Error(
      'ALERTAS: SUPABASE_SERVICE_ROLE_KEY não configurada. Defina a chave real do serviço (secret do worker) para o processamento agendado funcionar.'
    )
  }
  if (typeof window !== 'undefined') {
    throw new Error('ALERTAS: service role key não pode ser usada no frontend.')
  }
  return createSupabaseClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

if (typeof globalThis !== 'undefined') {
  ;(globalThis as any).__ALERT_SERVICE_ROLE_REQUIRED__ = true
}

// ============================================================================
// ALERTS
// ============================================================================

export async function listAlerts(
  client: AnyClient,
  userId: string
): Promise<AlertRecord[]> {
  const { data, error } = await client
    .from('alerts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as AlertRecord[]
}

export async function getAlert(
  client: AnyClient,
  alertId: string
): Promise<AlertRecord | null> {
  const { data, error } = await client
    .from('alerts')
    .select('*')
    .eq('id', alertId)
    .maybeSingle()
  if (error) throw error
  return (data as AlertRecord) || null
}

export async function insertAlert(
  client: AnyClient,
  userId: string,
  input: {
    nome: string
    keyword: string | null
    modalidade: string | null
    uf: string | null
    municipio: string | null
    orgao: string | null
    valor_min: number | null
    valor_max: number | null
    data_inicial: string | null
    data_final: string | null
    ativo: boolean
  }
): Promise<AlertRecord> {
  const { data, error } = await client
    .from('alerts')
    .insert({ user_id: userId, ...input })
    .select()
    .single()
  if (error) throw error
  return data as AlertRecord
}

export async function updateAlert(
  client: AnyClient,
  alertId: string,
  input: Partial<
    AlertRecord['nome'] extends never ? never : AlertRecord
  > & {
    nome?: string
    keyword?: string | null
    modalidade?: string | null
    uf?: string | null
    municipio?: string | null
    orgao?: string | null
    valor_min?: number | null
    valor_max?: number | null
    data_inicial?: string | null
    data_final?: string | null
    ativo?: boolean
  }
): Promise<void> {
  const { error } = await client.from('alerts').update(input).eq('id', alertId)
  if (error) throw error
}

export async function deleteAlert(client: AnyClient, alertId: string): Promise<void> {
  // on delete cascade remove channels/schedules/deliveries.
  const { error } = await client.from('alerts').delete().eq('id', alertId)
  if (error) throw error
}

export async function setAlertActive(
  client: AnyClient,
  alertId: string,
  ativo: boolean
): Promise<void> {
  const { error } = await client.from('alerts').update({ ativo }).eq('id', alertId)
  if (error) throw error
}

// ============================================================================
// CANAIS
// ============================================================================

export async function listChannels(
  client: AnyClient,
  alertId: string
): Promise<ChannelRecord[]> {
  const { data, error } = await client
    .from('alert_channels')
    .select('*')
    .eq('alert_id', alertId)
  if (error) throw error
  return (data || []) as ChannelRecord[]
}

/** Substitui os canais de um alerta pelos informados (destino + ativo). */
export async function replaceChannels(
  client: AnyClient,
  userId: string,
  alertId: string,
  channels: { canal: Canal; destino: string; ativo: boolean }[]
): Promise<void> {
  const { error: delErr } = await client
    .from('alert_channels')
    .delete()
    .eq('alert_id', alertId)
  if (delErr) throw delErr

  if (channels.length === 0) return
  const { error } = await client
    .from('alert_channels')
    .insert(
      channels.map((c) => ({
        alert_id: alertId,
        user_id: userId,
        canal: c.canal,
        destino: c.destino,
        ativo: c.ativo,
      }))
    )
  if (error) throw error
}

// ============================================================================
// AGENDAMENTO
// ============================================================================

export async function getSchedule(
  client: AnyClient,
  alertId: string
): Promise<ScheduleRecord | null> {
  const { data, error } = await client
    .from('alert_schedules')
    .select('*')
    .eq('alert_id', alertId)
    .maybeSingle()
  if (error) throw error
  return (data as ScheduleRecord) || null
}

export async function upsertSchedule(
  client: AnyClient,
  userId: string,
  alertId: string,
  s: {
    modo: ModoEnvio
    frequencia: Frequencia
    horario: string | null
    dias_semana: number[] | null
  }
): Promise<void> {
  const existing = await getSchedule(client, alertId)
  const body = {
    user_id: userId,
    alert_id: alertId,
    modo: s.modo,
    frequencia: s.frequencia,
    horario: s.horario,
    dias_semana: s.dias_semana,
    fuso: 'America/Sao_Paulo',
  }
  if (existing) {
    const { error } = await client
      .from('alert_schedules')
      .update(body)
      .eq('alert_id', alertId)
    if (error) throw error
  } else {
    const { error } = await client.from('alert_schedules').insert(body)
    if (error) throw error
  }
}

// ============================================================================
// HISTÓRICO DE ENVIO (deliveries)
// ============================================================================

export async function listDeliveries(
  client: AnyClient,
  userId: string,
  alertId?: string,
  limit = 30
): Promise<DeliveryRecord[]> {
  let q = client
    .from('alert_deliveries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (alertId) q = q.eq('alert_id', alertId)
  const { data, error } = await q
  if (error) throw error
  return (data || []) as DeliveryRecord[]
}

/**
 * Registra um envio AGENDADO (ainda não enviado) se ainda não existir para a
 * chave (alert_id, oportunidade_id, canal). Retorna o registro criado ou o
 * existente — e um flag `alreadySent` para evitar duplicidade.
 */
export async function tryReserveDelivery(
  client: AnyClient,
  userId: string,
  alertId: string,
  canal: Canal,
  oportunidadeId: string,
  oportunidadeObj: string | null,
  dataAgendada: string | null
): Promise<{ created: boolean; delivery: DeliveryRecord | null }> {
  try {
    const { data, error } = await client
      .from('alert_deliveries')
      .insert({
        user_id: userId,
        alert_id: alertId,
        canal,
        oportunidade_id: oportunidadeId,
        oportunidade_obj: oportunidadeObj,
        status: 'agendado',
        data_agendada: dataAgendada,
      })
      .select()
      .single()
    if (error) {
      // Duplicata (unique constraint) -> já agendado/enviado antes.
      return { created: false, delivery: null }
    }
    return { created: true, delivery: data as DeliveryRecord }
  } catch {
    return { created: false, delivery: null }
  }
}

/** Marca um delivery como enviado (somente se ainda não estava enviado). */
export async function markDeliverySent(
  client: AnyClient,
  deliveryId: string
): Promise<void> {
  await client
    .from('alert_deliveries')
    .update({ status: 'enviado', data_envio: new Date().toISOString() })
    .eq('id', deliveryId)
}

/** Marca um delivery como falhou, registrando o motivo real. */
export async function markDeliveryFailed(
  client: AnyClient,
  deliveryId: string,
  erro: string
): Promise<void> {
  await client
    .from('alert_deliveries')
    .update({ status: 'falhou', erro: erro.slice(0, 400) })
    .eq('id', deliveryId)
}

/** Busca deliveries ainda não enviados de um alerta (para envio programado). */
export async function pendingDeliveries(
  client: AnyClient,
  alertId: string
): Promise<{ delivery: DeliveryRecord; alert: AlertRecord }[]> {
  const { data, error } = await client
    .from('alert_deliveries')
    .select('*, alerts(*)')
    .eq('alert_id', alertId)
    .eq('status', 'agendado')
  if (error) throw error
  return (data || []).map((d: any) => ({
    delivery: d as DeliveryRecord,
    alert: (d.alerts || {}) as AlertRecord,
  }))
}

/** Retorna true se já existir um envio para a chave alerta+oportunidade+canal. */
export async function alreadyDelivered(
  client: AnyClient,
  alertId: string,
  oportunidadeId: string,
  canal: Canal
): Promise<boolean> {
  const { data, error } = await client
    .from('alert_deliveries')
    .select('id')
    .eq('alert_id', alertId)
    .eq('oportunidade_id', oportunidadeId)
    .eq('canal', canal)
    .maybeSingle()
  if (error) return false
  return !!data
}

/** Obtém o e-mail cadastrado do usuário (para sugerir como destino padrão). */
export async function getUserEmailByServiceRole(userId: string): Promise<string | null> {
  const client = createServiceClient()
  const { data, error } = await client.auth.admin.getUserById(userId)
  if (error || !data.user) return null
  return data.user.email ?? null
}

export type { StatusEnvio }
