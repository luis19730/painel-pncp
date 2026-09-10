// ============================================================================
// Serviço de E-MAIL (Brevo/Sendinblue — principal, com fallback opcional para
// Resend). Integração REAL.
//
// NUNCA envia "falso". Retorna { ok:false, notConfigured:true, erro:<motivo> }
// quando nenhum provedor está configurado, e o motivo REAL do erro em qualquer
// falha. O frontend usa esse retorno para exibir o motivo — jamais "enviado"
// sem envio.
//
// Provedores (em ordem de prioridade):
//   1. Brevo  — BREVO_API_KEY + BREVO_FROM_EMAIL (+ BREVO_FROM_NAME)
//   2. Resend — RESEND_API_KEY + RESEND_FROM_EMAIL (fallback)
// ============================================================================

export interface SendEmailResult {
  ok: boolean
  notConfigured: boolean
  erro?: string
}

export const BREVO_URL = 'https://api.brevo.com/v3/smtp/email'
export const RESEND_URL = 'https://api.resend.com/emails'

export type EmailProvider = 'brevo' | 'resend'

function has(val: string | undefined): boolean {
  return !!val && !val.includes('placeholder')
}

/** Quais provedores estão configurados (para diagnóstico claro). */
export function emailConfigProblems(): string[] {
  const problems: string[] = []
  const brevoKey = process.env.BREVO_API_KEY || ''
  const brevoFrom = process.env.BREVO_FROM_EMAIL || ''
  if (has(brevoKey) && has(brevoFrom)) return []

  const resendKey = process.env.RESEND_API_KEY || ''
  const resendFrom = process.env.RESEND_FROM_EMAIL || ''
  if (has(resendKey) && has(resendFrom)) return []

  if (!has(brevoKey)) problems.push('BREVO_API_KEY')
  if (!has(brevoFrom) || !String(brevoFrom).includes('@')) problems.push('BREVO_FROM_EMAIL')
  if (!has(resendKey)) problems.push('RESEND_API_KEY')
  if (!has(resendFrom) || !String(resendFrom).includes('@')) problems.push('RESEND_FROM_EMAIL')
  return problems
}

export function emailConfigured(): boolean {
  return emailConfigProblems().length === 0
}

function providerAtivo(): EmailProvider | null {
  const brevoKey = process.env.BREVO_API_KEY || ''
  const brevoFrom = process.env.BREVO_FROM_EMAIL || ''
  if (has(brevoKey) && has(brevoFrom)) return 'brevo'
  const resendKey = process.env.RESEND_API_KEY || ''
  const resendFrom = process.env.RESEND_FROM_EMAIL || ''
  if (has(resendKey) && has(resendFrom)) return 'resend'
  return null
}

async function enviarBrevo(input: {
  to: string[]
  subject: string
  html: string
  text?: string
}): Promise<{ ok: boolean; erro?: string }> {
  const apiKey = process.env.BREVO_API_KEY
  const fromEmail = process.env.BREVO_FROM_EMAIL
  const fromName = process.env.BREVO_FROM_NAME || 'Painel PNCP'
  try {
    const resp = await fetch(BREVO_URL, {
      method: 'POST',
      headers: {
        'api-key': apiKey as string,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        to: input.to.map((e) => ({ email: e })),
        subject: input.subject,
        htmlContent: input.html,
        ...(input.text ? { textContent: input.text } : {}),
      }),
    })
    const body = await resp.json().catch(() => null)
    if (!resp.ok) {
      const msg = (body && (body.message || JSON.stringify(body))) || `HTTP ${resp.status}`
      console.error('[email] Brevo falha no envio:', msg)
      return { ok: false, erro: `Brevo: ${msg}` }
    }
    return { ok: true }
  } catch (e) {
    const msg = (e as Error)?.message || 'desconhecido'
    console.error('[email] Brevo erro de rede:', msg)
    return { ok: false, erro: `Brevo: erro de rede: ${msg}` }
  }
}

async function enviarResend(input: {
  to: string[]
  subject: string
  html: string
  text?: string
}): Promise<{ ok: boolean; erro?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  try {
    const resp = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        ...(input.text ? { text: input.text } : {}),
      }),
    })
    const body = await resp.json().catch(() => null)
    if (!resp.ok) {
      const msg = (body && (body.message || JSON.stringify(body))) || `HTTP ${resp.status}`
      console.error('[email] Resend falha no envio:', msg)
      return { ok: false, erro: `Resend: ${msg}` }
    }
    return { ok: true }
  } catch (e) {
    const msg = (e as Error)?.message || 'desconhecido'
    console.error('[email] Resend erro de rede:', msg)
    return { ok: false, erro: `Resend: erro de rede: ${msg}` }
  }
}

export async function sendEmail(input: {
  to: string | string[]
  subject: string
  html: string
  text?: string
}): Promise<SendEmailResult> {
  const to = Array.isArray(input.to) ? input.to : [input.to]

  const configProblems = emailConfigProblems()
  if (configProblems.length > 0) {
    console.error('[email] Nenhum provedor configurado. Falta(s):', configProblems.join(', '))
    return {
      ok: false,
      notConfigured: true,
      erro: `E-mail não configurado: defina ${configProblems.join(', ')} para habilitar o envio real.`,
    }
  }

  const provider = providerAtivo()

  try {
    if (provider === 'brevo') {
      console.log(`[email] Enviando para ${to.join(', ')} via Brevo...`)
      const r = await enviarBrevo({ to, subject: input.subject, html: input.html, text: input.text })
      if (r.ok) {
        console.log(`[email] Enviado com sucesso via Brevo para ${to.join(', ')}`)
        return { ok: true, notConfigured: false }
      }
      // Provedor principal falhou de verdade: reportar em vez de mascarar com o
      // fallback (que pode nem estar configurado).
      return { ok: false, notConfigured: false, erro: r.erro }
    }

    console.log(`[email] Enviando para ${to.join(', ')} via Resend...`)
    const r = await enviarResend({ to, subject: input.subject, html: input.html, text: input.text })
    if (r.ok) {
      console.log(`[email] Enviado com sucesso via Resend para ${to.join(', ')}`)
      return { ok: true, notConfigured: false }
    }
    return { ok: false, notConfigured: false, erro: r.erro }
  } catch (e) {
    console.error('[email] Erro de rede:', (e as Error)?.message)
    return {
      ok: false,
      notConfigured: false,
      erro: `E-mail: erro de rede: ${(e as Error)?.message || 'desconhecido'}`,
    }
  }
}
