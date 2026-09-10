/**
 * Validação compartilhada de e-mails — impede cadastro com e-mails inválidos,
 * de teste, descartáveis ou usados como placeholder.
 *
 * Usado tanto no servidor (API cadastro) quanto no cliente (formulário).
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * E-mails exatos (lowercase) que NÃO podem ser usados para cadastro.
 * Inclui placeholders comuns de formulários e e-mails de teste.
 */
const EMAILS_BLOQUEADOS = new Set([
  'seu@email.com',
  'seu@email.com.br',
  'email@email.com',
  'email@email.com.br',
  'exemplo@email.com',
  'exemplo@email.com.br',
  'nome@email.com',
  'nome@email.com.br',
  'usuario@email.com',
  'usuario@email.com.br',
  'teste@teste.com',
  'teste@teste.com.br',
  'test@test.com',
  'test@test.com.br',
  'admin@admin.com',
  'admin@admin.com.br',
  'user@example.com',
  'user@example.com.br',
  'admin@example.com',
  'admin@example.com.br',
  'example@example.com',
  'test@example.com',
  'info@example.com',
  'contato@contato.com',
  'contato@exemplo.com',
  'mail@mail.com',
  'a@a.com',
  'b@b.com',
  'c@c.com',
  '1@1.com',
  'foo@foo.com',
  'bar@bar.com',
  'test@test.org',
  'test@test.net',
  'test@test.io',
  'demo@demo.com',
  'demo@example.org',
  'fake@fake.com',
  'null@null.com',
  'undefined@undefined.com',
  'foo@bar.com',
  'no@no.com',
  'na@na.com',
  'xxx@xxx.com',
  'aaa@aaa.com',
  'bbb@bbb.com',
])

/**
 * Domínios de e-mail descartáveis / temporários (lowercase).
 * Bônus: rejeita cadastros com provedores de e-mail de uso único.
 */
const DOMINIOS_DESCARTAVEIS = new Set([
  'guerrillamail.com',
  'guerrillamail.de',
  'guerrillamail.net',
  'tempmail.com',
  'throwaway.email',
  'temp-mail.org',
  'temp-mail.io',
  'tmpmail.net',
  'tmpmail.org',
  'mailinator.com',
  'maildrop.cc',
  'trashmail.com',
  'trashmail.net',
  'trashmail.me',
  'yopmail.com',
  'yopmail.fr',
  'throwaway.com',
  'discard.email',
  'dispostable.com',
  'sharklasers.com',
  'guerrillamailblock.com',
  'grr.la',
  'grr.la',
  'discardmail.com',
  'mailcatch.com',
  'tempail.com',
  'tempr.email',
  'tmpmail.net',
  'fakeinbox.com',
  'mohmal.com',
  'getnada.com',
  'emailondeck.com',
  '10minutemail.com',
  '10minutemail.co.uk',
  'mailnesia.com',
  'maildrop.cc',
  'byom.de',
  'meltmail.com',
])

const MAX_EMAIL_LEN = 254

/**
 * Partes locais (antes do @) que caracterizam placeholder, com ou sem dígitos
 * no final: seu@, seu123@, nome@, teste@, email@, exemplo@, usuario@, admin@ —
 * em QUALQUER domínio. Cobre as variações mais comuns usadas para burlar o
 * cadastro ("seu@email.com", "seu@hotmail.com", "teste5@gmail.com", etc.).
 */
const LOCAL_PART_PLACEHOLDER = /^(seu|nome|teste|email|exemplo|usuario|admin)\d*$/

function ehLocalPartPlaceholder(normalizado: string): boolean {
  const localPart = normalizado.split('@')[0] ?? ''
  return LOCAL_PART_PLACEHOLDER.test(localPart)
}

export type ResultadoValidacaoEmail = {
  permitido: boolean
  erro?: string
}

/**
 * Verifica se o e-mail está na lista de bloqueio (placeholder / teste).
 * Usado no cadastro (rejeita) e no meio do caminho (middleware/API) para
 * derrubar o acesso de contas já criadas com esses e-mails.
 */
export function isEmailBloqueado(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false
  const normalizado = email.trim().toLowerCase()
  if (EMAILS_BLOQUEADOS.has(normalizado)) return true
  if (ehLocalPartPlaceholder(normalizado)) return true
  const dominio = normalizado.split('@')[1]
  if (dominio && DOMINIOS_DESCARTAVEIS.has(dominio)) return true
  return false
}

/**
 * Valida se o e-mail pode ser usado para cadastro.
 * Retorna { permitido: true } ou { permitido: false, erro: '...' }.
 */
export function validarEmailCadastro(email: string | null | undefined): ResultadoValidacaoEmail {
  if (!email || typeof email !== 'string') {
    return { permitido: false, erro: 'Informe um e-mail válido.' }
  }

  const normalizado = email.trim().toLowerCase()

  if (!normalizado || normalizado.length > MAX_EMAIL_LEN) {
    return { permitido: false, erro: 'Informe um e-mail válido.' }
  }

  if (!EMAIL_RE.test(normalizado)) {
    return { permitido: false, erro: 'Informe um e-mail válido.' }
  }

  // Bloqueia e-mails de placeholder / teste
  if (EMAILS_BLOQUEADOS.has(normalizado)) {
    return { permitido: false, erro: 'Este e-mail não pode ser utilizado para cadastro. Informe um e-mail corporativo ou pessoal válido.' }
  }

  // Bloqueia placeholders com variações (seu@, nome@, teste@, email@, ... + dígitos)
  if (ehLocalPartPlaceholder(normalizado)) {
    return { permitido: false, erro: 'Este e-mail não pode ser utilizado para cadastro. Informe um e-mail corporativo ou pessoal válido.' }
  }

  // Bloqueia domínios descartáveis
  const dominio = normalizado.split('@')[1]
  if (dominio && DOMINIOS_DESCARTAVEIS.has(dominio)) {
    return { permitido: false, erro: 'E-mails de provedores descartáveis não são aceitos. Utilize um e-mail permanente.' }
  }

  return { permitido: true }
}
