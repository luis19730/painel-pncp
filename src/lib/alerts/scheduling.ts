// ============================================================================
// Fuso horário do agendamento: America/Sao_Paulo (BrT = UTC-3, sem horário de
// verão). NUNCA usa utc() sem conversão.
// ============================================================================

export const BR_TZ_OFFSET_MIN = -180 // -3h

/** Horário atual em America/Sao_Paulo (sem dia/hora de verão, BrT fixo). */
export function nowInBrasilia(): Date {
  return new Date(Date.now() + BR_TZ_OFFSET_MIN * 60 * 1000)
}

export interface BrFields {
  year: number
  month: number
  day: number
  weekday: number // 0=Dom .. 6=Sáb
  hour: number
  minute: number
}

export function brasiliaFields(d: Date = new Date()): BrFields {
  // Converte para o "time" em BrT tratando o Date como se fosse BrT.
  const brt = nowInBrasilia()
  return {
    year: brt.getUTCFullYear(),
    month: brt.getUTCMonth(), // 0-based
    day: brt.getUTCDate(),
    weekday: brt.getUTCDay(),
    hour: brt.getUTCHours(),
    minute: brt.getUTCMinutes(),
  }
}

/** Converte "HH:MM" em minutos desde meia-noite. Retorna null se inválido. */
export function timeToMinutes(hhmm: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm)
  if (!m) return null
  const h = parseInt(m[1], 10)
  const mm = parseInt(m[2], 10)
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null
  return h * 60 + mm
}

/**
 * Decide se o agendamento deve executar AGORA, no horário de Brasília.
 *
 * `frequencia`:
 *   - 'diario': executa na 1ª execução do cron após o horário do dia.
 *   - 'semanal': idem, mas só nos dias marcados em `diasSemana`.
 * Para 'imediato' callers não usam esta função (enviam na hora).
 */
export function isDueNow(input: {
  horario: string
  frequencia: 'diario' | 'semanal'
  diasSemana: number[] | null
  ultimaExecucao: string | null
}): { due: boolean; reason?: string } {
  const target = timeToMinutes(input.horario)
  if (target === null)
    return { due: false, reason: `horário inválido: ${input.horario}` }

  const now = brasiliaFields()
  const nowMin = now.hour * 60 + now.minute

  // Só executa a janela no minuto exato (cron roda a cada N minutos).
  if (nowMin !== target) return { due: false }

  // Frequência semanal: respeitar dias da semana.
  if (input.frequencia === 'semanal') {
    const days = input.diasSemana && input.diasSemana.length ? input.diasSemana : [1, 2, 3, 4, 5]
    if (!days.includes(now.weekday))
      return { due: false, reason: `hoje (${now.weekday}) não está marcado` }
  }

  // Evitar reenvio no mesmo dia (controle de duplicidade por execução).
  if (input.ultimaExecucao) {
    const last = new Date(input.ultimaExecucao)
    const lastBrt = nowInBrasilia()
    if (lastBrt.getUTCDate() === now.day && lastBrt.getUTCFullYear() === now.year) {
      const lastMin = last.getUTCHours() * 60 + last.getUTCMinutes()
      if (nowMin >= lastMin) {
        return { due: false, reason: 'já executado neste horário/dia' }
      }
    }
  }

  return { due: true }
}
