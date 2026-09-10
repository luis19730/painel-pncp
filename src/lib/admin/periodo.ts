// ============================================================================
// Período de tempo compartilhado das métricas do painel admin.
//
// Unifica o parsing do query param `periodo` dos endpoints /api/admin/* e os
// cortes de dia em fuso Brasília (UTC-3). NUNCA inventa dados: os valores são
// sempre limites de tempo que as queries reais usam como filtro.
// ============================================================================

export interface PeriodoCtx {
  /** Rótulo legível do período (ex.: "últimos 30 dias"). */
  label: string
  /** Início inclusivo (intervalo fecha no fim) em ISO. */
  inicio: string
  /** Fim EXCLUSIVO (null = até agora). */
  fim: string | null
}

export type PeriodoId =
  | 'hoje'
  | 'ontem'
  | '7d'
  | '30d'
  | '90d'
  | 'mes'
  | 'mes_anterior'
  | 'personalizado'

const PERIODOS: Record<PeriodoId, string> = {
  hoje: 'Hoje',
  ontem: 'Ontem',
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias',
  mes: 'Mês atual',
  mes_anterior: 'Mês anterior',
  personalizado: 'Período personalizado',
}

/** Meia-noite de hoje em Brasília (UTC-3), como instante UTC. */
export function inicioDoDiaUTC3(agora = new Date()): Date {
  const local = new Date(agora.getTime() - 3 * 60 * 60 * 1000)
  const day = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate())
  )
  day.setUTCHours(0, 0, 0, 0)
  return day
}

/** Primeiro dia do mês corrente em Brasília (UTC-3). */
export function inicioDoMesUTC3(agora = new Date()): Date {
  const local = new Date(agora.getTime() - 3 * 60 * 60 * 1000)
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1))
}

/** Converte "YYYY-MM-DD" em meia-noite local (UTC-3). */
function dataLocalIsoToUtc(isoDate: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  // 03:00Z == 00:00 em UTC-3 (fuso sem DST no código do projeto).
  return new Date(Date.UTC(y, mo - 1, d, 3, 0, 0))
}

/** Arredonda uma data arbitrária para o começo do dia (UTC-3). */
function arredondarParaDia(d: Date): Date {
  const local = new Date(d.getTime() - 3 * 60 * 60 * 1000)
  return new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), 3, 0, 0)
  )
}

/**
 * Interpreta o query param `periodo` (e `inicio`/`fim` no caso personalizado).
 * Retorna { ok: true, periodo } ou { ok: false, erro }.
 */
export function parsePeriodo(
  url: URL
): { ok: true; periodo: PeriodoCtx; periodoId: PeriodoId } | { ok: false; erro: string } {
  const key = (url.searchParams.get('periodo') || '30d') as PeriodoId
  const agora = new Date()

  if (key === 'personalizado') {
    const iniRaw = url.searchParams.get('inicio') || ''
    const fimRaw = url.searchParams.get('fim') || ''
    if (!iniRaw) {
      return { ok: false, erro: 'Informe inicio (YYYY-MM-DD) para período personalizado.' }
    }
    const inicio = fimRaw ? arredondarParaDia(new Date(iniRaw)) : dataLocalIsoToUtc(iniRaw)
    if (!inicio || Number.isNaN(inicio.getTime())) {
      return { ok: false, erro: 'Data inicio inválida. Use YYYY-MM-DD.' }
    }
    let fim: Date | null = null
    if (fimRaw) {
      fim = arredondarParaDia(new Date(fimRaw))
      if (Number.isNaN(fim.getTime())) {
        return { ok: false, erro: 'Data fim inválida. Use YYYY-MM-DD.' }
      }
      // fim é inclusivo no dia → intervalo exclusivo termina no dia seguinte.
      fim = new Date(fim.getTime() + 24 * 60 * 60 * 1000)
      if (fim.getTime() <= inicio.getTime()) {
        return { ok: false, erro: 'O fim deve ser posterior ao início.' }
      }
    }
    return {
      ok: true,
      periodoId: key,
      periodo: { label: PERIODOS[key], inicio: inicio.toISOString(), fim: fim ? fim.toISOString() : null },
    }
  }

  if (!(key in PERIODOS)) {
    return { ok: false, erro: 'Período inválido.' }
  }

  const hoje = inicioDoDiaUTC3(agora)

  let inicio: Date
  let fim: Date | null = null
  switch (key) {
    case 'hoje':
      inicio = hoje
      break
    case 'ontem':
      inicio = new Date(hoje.getTime() - 24 * 60 * 60 * 1000)
      fim = hoje
      break
    case '7d':
      inicio = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case '90d':
      inicio = new Date(agora.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    case 'mes':
      inicio = inicioDoMesUTC3(agora)
      break
    case 'mes_anterior': {
      const local = new Date(agora.getTime() - 3 * 60 * 60 * 1000)
      const primeiro = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - 1, 1))
      const atual = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1))
      inicio = primeiro
      fim = atual
      break
    }
    default:
      inicio = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
  }

  return {
    ok: true,
    periodoId: key,
    periodo: { label: PERIODOS[key], inicio: inicio.toISOString(), fim: fim ? fim.toISOString() : null },
  }
}