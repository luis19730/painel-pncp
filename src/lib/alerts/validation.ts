// ============================================================================
// Validação de e-mail e destino do Telegram (chat_id numérico ou @username)
// ============================================================================

export function isValidEmail(email: string): boolean {
  if (!email) return false
  const v = email.trim().toLowerCase()
  // Regex conservador mas robusto para e-mail.
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
  if (!re.test(v)) return false
  // Não aceitar domínios obviamente inválidos.
  const domain = v.split('@')[1]
  if (!domain || domain.includes('..') || domain.startsWith('.') || domain.endsWith('.')) return false
  return true
}

/**
 * Valida e NORMALIZA um destino do Telegram. Aceita duas formas:
 *   - Chat ID numérico:  123456789  (ou -123456789 para grupos/canais)
 *   - @username público: @meubot_jornalista  (remove o @, guarda como username)
 * Retorna a string normalizada (id numérico ou username sem @), ou null se
 * inválido. Um destinatário válido independe do número de telefone.
 */
export function normalizeTelegram(input: string): string | null {
  if (!input) return null
  const v = input.trim()
  if (!v) return null

  // @username (usuário público) — 5 a 32 caracteres, letras/números/_ .
  const uname = /^@([a-zA-Z0-9_]{5,32})$/.exec(v)
  if (uname) return uname[1]

  // Chat ID numérico: pelomenos 1 dígito, sinal opcional (~9-12 dígitos).
  const id = /^[-]?\d{6,12}$/.exec(v)
  if (id) return id[0]

  return null
}

export interface NotificationContacts {
  email: string
  telegram: string // chat_id (numérico) ou username (sem @)
}

/** Valida os contatos informados; retorna { ok, email, telegram, errors } */
export function validateContacts(email: string, telegram: string): {
  ok: boolean
  emailValid: boolean
  telegramValid: boolean
  telegramDestino: string | null
} {
  const emailValid = isValidEmail(email)
  const telegramDestino = telegram.trim() ? normalizeTelegram(telegram) : null
  const telegramValid = telegram.trim() ? telegramDestino !== null : false
  const ok =
    // é válido apenas se houver ao menos um canal preenchido e ele for válido
    !!email.trim() || !!telegram.trim()
      ? (email.trim() ? emailValid : true) && (telegram.trim() ? telegramValid : true)
      : false
  return { ok, emailValid, telegramValid, telegramDestino }
}
