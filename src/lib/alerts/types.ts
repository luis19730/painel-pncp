// ============================================================================
// Tipos e constantes da funcionalidade ALERTAS AUTOMÁTICOS (/alertas).
// Isolado em src/lib/alerts para não afetar o restante do sistema.
// ============================================================================

export type Canal = 'email' | 'telegram'
export type ModoEnvio = 'imediato' | 'programado'
export type Frequencia = 'imediato' | 'diario' | 'semanal'
export type StatusEnvio = 'agendado' | 'enviado' | 'falhou'

/** Alerta (linha da tabela public.alerts) */
export interface AlertRecord {
  id: string
  user_id: string
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
  created_at: string
  updated_at: string
}

/** Canal configurado para um alerta (public.alert_channels) */
export interface ChannelRecord {
  id: string
  alert_id: string
  user_id: string
  canal: Canal
  destino: string | null
  ativo: boolean
}

/** Agendamento de um alerta (public.alert_schedules) */
export interface ScheduleRecord {
  id: string
  alert_id: string
  user_id: string
  modo: ModoEnvio
  frequencia: Frequencia
  horario: string | null
  dias_semana: number[] | null
  fuso: string
  ultima_execucao: string | null
}

/** Registro de envio (public.alert_deliveries) */
export interface DeliveryRecord {
  id: string
  alert_id: string
  user_id: string
  canal: Canal
  oportunidade_id: string
  oportunidade_obj: string | null
  status: StatusEnvio
  erro: string | null
  data_agendada: string | null
  data_envio: string | null
  created_at: string
}

/** Modelo combinado usado pela UI (alerta + canais + agendamento). */
export interface ResolvedAlert {
  alert: AlertRecord
  channels: ChannelRecord[]
  schedule: ScheduleRecord | null
  lastDeliveries: DeliveryRecord[]
}

export interface NewAlertInput {
  nome: string
  keyword: string
  modalidade: string
  uf: string
  municipio: string
  orgao: string
  valorMin: string
  valorMax: string
  dataInicial: string
  dataFinal: string
  ativo: boolean
  /** Se o canal E-MAIL será usado (email deve conter o destino). */
  useEmail: boolean
  /** Se o canal TELEGRAM será usado (telegram deve conter o chat_id ou @username). */
  useTelegram: boolean
  email: string
  telegram: string
  modo: ModoEnvio
  frequencia: Frequencia
  horario: string
  diasSemana: number[]
}

export const FREQUENCIA_LABELS: Record<Frequencia, string> = {
  imediato: 'Imediato (assim que encontrar)',
  diario: 'Diário',
  semanal: 'Semanal',
}

export const DIAS_SEMANA = [
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
]

// Ambient variables (server-side secrets) needed by the notification services.
// NUNCA expor estes valores no frontend.
export const ENV_REQUIRED = [
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'TELEGRAM_BOT_TOKEN',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

export const TIMEZONE_LABEL = 'Horário de Brasília'
export const TZ_SECONDS_OFFSET = -3 * 60 // America/Sao_Paulo (sem horário de verão)
