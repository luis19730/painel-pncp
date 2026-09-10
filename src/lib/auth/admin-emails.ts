// ============================================================================
// Lista de e-mails com acesso administrativo pleno ao sistema (bypass da regra
// de trial/pagamento). Centralizada para o middleware e as rotas de API.
//
// Fonte: variável ADMIN_EMAILS (lista separada por vírgula). Fallback mínimo
// caso a variável não esteja definida (só o e-mail do fundador).
// ============================================================================

const FALLBACK_ADMIN_EMAILS = ['luis19730@gmail.com']

function adminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS
  if (!raw || !raw.trim()) return FALLBACK_ADMIN_EMAILS
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

/** true se o e-mail é de um administrador (acesso pleno, ignora trial/pagamento). */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const normalized = email.trim().toLowerCase()
  return adminEmails().includes(normalized)
}
