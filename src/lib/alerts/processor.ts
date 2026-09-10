// ============================================================================
// Processador dos ALERTAS — rodado no backend (worker), NÃO no navegador.
//
//   runImmediate()        -> envia IMEDIATAMENTE (modo 'imediato')
//   runScheduledBatch()   -> envia o lote programado (modo 'programado')
//   sendTest()            -> teste pontual de um canal (usado pela UI/API)
//
// Regras implementadas:
//   - nunca envia sem credencial real (provedor ausente -> erro real);
//   - deduplicação por (alerta, oportunidade, canal) via unique + reserva;
//   - registra histórico; "enviado" só se o provedor retornar sucesso.
// ============================================================================

import {
  createServiceClient,
  listChannels,
  getSchedule,
  tryReserveDelivery,
  markDeliverySent,
  markDeliveryFailed,
  pendingDeliveries,
} from './db'
import { matchAlert } from './matching'
import { sendEmail } from './notifications/email'
import { sendTelegram } from './notifications/telegram'
import { buildEmailHtml, buildEmailText, buildTelegramText } from './notifications/content'
import type { AlertOpportunity } from './notifications/content'
import type { AlertRecord, Canal, ChannelRecord, ScheduleRecord } from './types'
import { isDueNow } from './scheduling'

export interface ProcessResult {
  alerta: string
  canal: Canal
  destino: string
  oportunidade: string
  status: 'enviado' | 'agendado' | 'falhou' | 'ignorado'
  erro?: string
  notConfigured?: boolean
}

export interface RunReport {
  total: number
  executados: ProcessResult[]
}

async function client() {
  return createServiceClient()
}

/** Envia de fato uma notificação por um canal. Retorna { ok, notConfigured, erro }. */
async function deliverNow(input: {
  alertNome: string
  canal: Canal
  destino: string
  opp: AlertOpportunity
}): Promise<{ ok: boolean; notConfigured: boolean; erro?: string }> {
  if (input.canal === 'email') {
    return sendEmail({
      to: input.destino,
      subject: `🚨 Nova oportunidade: ${input.opp.objeto.slice(0, 60)}`,
      html: buildEmailHtml(input.opp, input.alertNome),
      text: buildEmailText(input.opp, input.alertNome),
    })
  }
  return sendTelegram({ destino: input.destino, text: buildTelegramText(input.opp) })
}

async function activeChannels(alertId: string): Promise<ChannelRecord[]> {
  const c = await client()
  const channels = await listChannels(c, alertId)
  return channels.filter((ch) => ch.ativo && !!ch.destino)
}

function isImmediateMode(schedule: ScheduleRecord | null): boolean {
  if (!schedule) return true
  if (schedule.modo === 'imediato' || schedule.frequencia === 'imediato') return true
  return false
}

/**
 * Pipeline para UM alerta ativo.
 * 1-2) identifica oportunidades compatíveis
 * 3-4) deduplica e reserva (alert, opp, canal)
 * 5-7) envia (imediato) ou agenda (programado) e registra o resultado.
 */
export async function processAlert(
  alert: AlertRecord,
  immediateOverride?: boolean
): Promise<ProcessResult[]> {
  const c = await client()
  const channels = await activeChannels(alert.id)
  if (channels.length === 0) return []

  const schedule = await getSchedule(c, alert.id).catch(() => null)
  const immediate = immediateOverride ?? isImmediateMode(schedule)

  const { opps } = await matchAlert(alert)
  if (opps.length === 0) return []

  const results: ProcessResult[] = []
  for (const opp of opps) {
    for (const ch of channels) {
      const destino = ch.destino || ''
      if (!destino) continue

      // Dedupe: reserva cria um registro único para (alert, opp, canal).
      const dataAgendada = immediate ? null : new Date().toISOString()
      const { created, delivery } = await tryReserveDelivery(
        c,
        alert.user_id,
        alert.id,
        ch.canal,
        opp.id,
        opp.objeto,
        dataAgendada
      )

      if (!created || !delivery) {
        results.push({
          alerta: alert.nome,
          canal: ch.canal,
          destino,
          oportunidade: opp.id,
          status: 'ignorado',
        })
        continue
      }

      if (!immediate) {
        results.push({
          alerta: alert.nome,
          canal: ch.canal,
          destino,
          oportunidade: opp.id,
          status: 'agendado',
        })
        continue
      }

      const r = await deliverNow({ alertNome: alert.nome, canal: ch.canal, destino, opp })
      if (r.ok) {
        await markDeliverySent(c, delivery.id)
        results.push({
          alerta: alert.nome,
          canal: ch.canal,
          destino,
          oportunidade: opp.id,
          status: 'enviado',
        })
      } else {
        await markDeliveryFailed(c, delivery.id, r.erro || 'falha desconhecida')
        results.push({
          alerta: alert.nome,
          canal: ch.canal,
          destino,
          oportunidade: opp.id,
          status: 'falhou',
          erro: r.erro,
          notConfigured: r.notConfigured,
        })
      }
    }
  }
  return results
}

async function allActiveAlerts(): Promise<AlertRecord[]> {
  const c = await client()
  const { data } = await c.from('alerts').select('*').eq('ativo', true)
  return (data || []) as AlertRecord[]
}

/** Processa (envio imediato) apenas os alertas ATIVOS de UM usuário,
 *  usado pela rota autenticada de disparo manual (não cruza usuários). */
export async function processUserImmediate(userId: string): Promise<RunReport> {
  const c = await client()
  const { data } = await c.from('alerts').select('*').eq('user_id', userId).eq('ativo', true)
  const alerts = (data || []) as AlertRecord[]
  const executados: ProcessResult[] = []
  for (const alert of alerts) {
    const schedule = await getSchedule(c, alert.id).catch(() => null)
    if (!isImmediateMode(schedule)) continue
    const r = await processAlert(alert, true)
    executados.push(...r)
  }
  return { total: executados.length, executados }
}

/**
 * Envia imediatamente todos os alertas ativos em modo imediato.
 * Chamado a cada tick do cron (e por disparo manual da API).
 */
export async function runImmediate(): Promise<RunReport> {
  const alerts = await allActiveAlerts()
  const executados: ProcessResult[] = []
  for (const alert of alerts) {
    const c = await client()
    const schedule = await getSchedule(c, alert.id).catch(() => null)
    if (!isImmediateMode(schedule)) continue
    const r = await processAlert(alert, true)
    executados.push(...r)
  }
  return { total: executados.length, executados }
}

/**
 * Envia o lote de entregas PROGRAMADAS que estiver no horário (Brasília).
 */
export async function runScheduledBatch(): Promise<RunReport> {
  const c = await client()
  const alerts = await allActiveAlerts()
  const executados: ProcessResult[] = []

  for (const alert of alerts) {
    const schedule = await getSchedule(c, alert.id).catch(() => null)
    if (!schedule || schedule.modo !== 'programado') continue
    if (schedule.frequencia === 'imediato') continue

    const due = isDueNow({
      horario: schedule.horario || '',
      frequencia: schedule.frequencia === 'semanal' ? 'semanal' : 'diario',
      diasSemana: schedule.dias_semana,
      ultimaExecucao: schedule.ultima_execucao,
    })
    if (!due || !due.due) continue

    // marcar execução (evita reenvio no mesmo horário/dia)
    await c.from('alert_schedules').update({ ultima_execucao: new Date().toISOString() }).eq('id', schedule.id)

    const pend = await pendingDeliveries(c, alert.id)
    for (const { delivery } of pend) {
      const destino = await destinationFor(alert.id, delivery.canal)
      if (!destino) {
        await markDeliveryFailed(c, delivery.id, 'Canal sem destino configurado')
        continue
      }
      const opp: AlertOpportunity = {
        id: delivery.oportunidade_id,
        objeto: delivery.oportunidade_obj || delivery.oportunidade_id,
        orgao: '',
        modalidade: '',
        valor: 0,
        uf: '',
        municipio: '',
        dataAbertura: null,
        dataEncerramento: null,
        score: 0,
        link: '#',
      }
      const r = await deliverNow({ alertNome: alert.nome, canal: delivery.canal, destino, opp })
      if (r.ok) {
        await markDeliverySent(c, delivery.id)
        executados.push({
          alerta: alert.nome,
          canal: delivery.canal,
          destino,
          oportunidade: delivery.oportunidade_id,
          status: 'enviado',
        })
      } else {
        await markDeliveryFailed(c, delivery.id, r.erro || 'falha desconhecida')
        executados.push({
          alerta: alert.nome,
          canal: delivery.canal,
          destino,
          oportunidade: delivery.oportunidade_id,
          status: 'falhou',
          erro: r.erro,
          notConfigured: r.notConfigured,
        })
      }
    }
  }
  return { total: executados.length, executados }
}

async function destinationFor(alertId: string, canal: Canal): Promise<string> {
  const c = await client()
  const channels = await listChannels(c, alertId)
  const ch = channels.find((x) => x.canal === canal && x.ativo)
  return ch?.destino || ''
}

/**
 * Teste real de envio de um canal (botão "Enviar teste").
 * Usa um conteúdo de exemplo, mas o envio é REAL via provedor.
 */
export async function sendTest(input: {
  canal: Canal
  destino: string
  nomeAlerta: string
}): Promise<{ ok: boolean; notConfigured: boolean; erro?: string }> {
  const opp: AlertOpportunity = {
    id: 'teste',
    objeto: 'Esta é uma mensagem de teste do Painel PNCP.',
    orgao: 'Painel PNCP',
    modalidade: '—',
    valor: 0,
    uf: 'BR',
    municipio: '',
    dataAbertura: new Date().toISOString(),
    dataEncerramento: null,
    score: 0,
    link: '',
  }
  if (input.canal === 'email') {
    return sendEmail({ to: input.destino, subject: `🧪 Teste de alerta — ${input.nomeAlerta}`, html: buildEmailHtml(opp, input.nomeAlerta), text: buildEmailText(opp, input.nomeAlerta) })
  }
  return sendTelegram({ destino: input.destino, text: `🧪 Teste de alerta — ${input.nomeAlerta}\n\n${buildTelegramText(opp)}` })
}
