const KEY_PREFIX = 'pncp_resend_cooldown:'

const COOLDOWN_MS = 60_000

/**
 * Cooldown simples no lado do cliente (não substitui limites do servidor).
 * Impede reenvios de e-mail de confirmação em sequência rápida na mesma aba,
 * evitando spam acidental pela interface.
 */
export function cooldownRemaining(key: string): number {
  if (typeof window === 'undefined') return 0
  const t = Number(localStorage.getItem(KEY_PREFIX + key) || 0)
  const left = t - Date.now()
  return left > 0 ? left : 0
}

export function setCooldown(key: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY_PREFIX + key, String(Date.now() + COOLDOWN_MS))
}

export function messageForCooldown(ms: number): string {
  const s = Math.ceil(ms / 1000)
  return `Você já reenviou recentemente. Aguarde ${s} segundo${s === 1 ? '' : 's'} antes de tentar novamente.`
}
