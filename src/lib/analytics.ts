// ============================================================================
// Tracker de analytics do cliente (métricas reais de uso/engajamento/conversão)
//
// Coleta eventos de forma leve, não intrusiva e envia ao endpoint
// `/api/analytics/track`, que persiste no Supabase (tabela analytics_events).
//
// Identificação de visitante:
//   - `client_id` gerado uma vez e guardado em localStorage. Permite contar
//     visitantes únicos e montar "sessões" por dia.
//   - `session_start` marca o início da sessão para calcular duração.
//
// Nunca bloqueia a UI: todos os envios são fire-and-forget (best-effort).
// ============================================================================

const CLIENT_ID_KEY = 'pncp_analytics_client_id'
const SESSION_KEY = 'pncp_analytics_session'

export interface AnalyticsEvent {
  event: 'pageview' | 'search' | 'view_opportunity' | 'signup' | 'login' | 'conversion'
  page?: string
  path?: string
  props?: Record<string, unknown>
}

function getClientId(): string {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY)
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`
      localStorage.setItem(CLIENT_ID_KEY, id)
    }
    return id
  } catch {
    return `anon-${Date.now()}`
  }
}

function sessionId(): string {
  try {
    let s = localStorage.getItem(SESSION_KEY)
    if (!s) {
      s = getClientId() + '-' + Date.now()
      localStorage.setItem(SESSION_KEY, s)
    }
    return s
  } catch {
    return 'session'
  }
}

/** Envia um evento de forma silenciosa (fire-and-forget). */
export function track(event: AnalyticsEvent): void {
  if (typeof window === 'undefined') return
  try {
    const body = {
      ...event,
      client_id: getClientId(),
      session_id: sessionId(),
      user_agent: navigator.userAgent || '',
      referrer: document.referrer || '',
      path: event.path || window.location.pathname,
    }
    const data = new Blob([JSON.stringify(body)], { type: 'application/json' })
    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon('/api/analytics/track', data)
    } else {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        keepalive: true,
      }).catch(() => {})
    }
  } catch {
    /* analytics nunca deve quebrar a UI */
  }
}

// Deduplicação de pageview por (client, path) dentro da mesma sessão de 30min.
const _pvCache = new Map<string, number>()
function shouldTrackPageview(path: string): boolean {
  const now = Date.now()
  const last = _pvCache.get(path) || 0
  // Conta nova visualização da MESMA página apenas se passaram 30 min.
  if (now - last < 30 * 60 * 1000) return false
  _pvCache.set(path, now)
  return true
}

/** Registra uma visualização de página (1 por rota/sessão curta). */
export function trackPageview(pathname: string, pageLabel?: string): void {
  if (typeof window === 'undefined') return
  if (!shouldTrackPageview(pathname)) return
  track({ event: 'pageview', page: pageLabel || pageLabelFromPath(pathname), path: pathname })
}

function pageLabelFromPath(pathname: string): string {
  const seg = pathname.split('/').filter(Boolean)
  if (seg.length === 0) return 'home'
  if (seg[0] === 'oportunidades') return 'oportunidade'
  return seg[0]
}
