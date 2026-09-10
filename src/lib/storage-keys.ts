// ============================================================================
// Chaves de localStorage usadas por Favoritos, Alertas e Radar.
// Fonte ÚNICA das chaves — Evita divergência entre o Dashboard (contadores) e
// as páginas Favoritos/Alertas (que gravam os dados).
// ============================================================================

export const GENERIC_FAVORITE_KEY = 'favoritos'
export const GENERIC_ALERT_KEY = 'alertas'
export const GENERIC_RADAR_KEY = 'meuRadar'

/** Chave de favoritos. Atualmente genérica (compartilhada no navegador). */
export function favoriteKey(_userId?: string | null): string {
  return GENERIC_FAVORITE_KEY
}

/** Chave de alertas: por-usuário quando autenticado, genérica caso contrário. */
export function alertKey(userId?: string | null): string {
  return userId ? `alertas:${userId}` : GENERIC_ALERT_KEY
}

/** Chave do radar: por-usuário quando autenticado, genérica caso contrário. */
export function radarKey(userId?: string | null): string {
  return userId ? `meuRadar:${userId}` : GENERIC_RADAR_KEY
}
