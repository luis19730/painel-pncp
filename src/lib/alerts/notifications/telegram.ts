// ============================================================================
// Serviço de TELEGRAM (Telegram Bot API — sendMessage).
//
// Integração REAL. NUNCA envia "falso". Se o TELEGRAM_BOT_TOKEN não estiver
// configurado no worker, retorna { ok: false, notConfigured: true,
// erro: <motivo> }.
//
// O destinatário (destino) é um CHAT ID numérico (ex.: 123456789, ou negativo
// para grupos/canais) ou um @username público (ex.: @meubot_jornalista). O
// bot só consegue enviar para chats com os quais ele já teve contato
// (usuário iniciou conversa ou foi adicionado a um grupo) — senão a Telegram
// API retorna 403 "bot can't initiate conversation with a user".
// ============================================================================

export interface SendTelegramResult {
  ok: boolean
  notConfigured: boolean
  erro?: string
}

const TELEGRAM_API = 'https://api.telegram.org'

export function telegramConfigProblems(): string[] {
  const missing: string[] = []
  const token = process.env.TELEGRAM_BOT_TOKEN || ''
  if (!token || token.includes('placeholder')) missing.push('TELEGRAM_BOT_TOKEN')
  return missing
}

export function telegramConfigured(): boolean {
  return telegramConfigProblems().length === 0
}

/**
 * Valida o destino: chat ID numérico (inclui negativos de grupos) ou username.
 * Retorna true se já estiver em um formato que a Telegram API aceita como
 * `chat_id` em /sendMessage.
 */
export function isValidTelegramDestino(destino: string): boolean {
  if (!destino) return false
  const t = destino.trim()
  if (/^-?\d{6,12}$/.test(t)) return true // chat_id numérico
  if (/^@?[a-zA-Z0-9_]{5,32}$/.test(t)) return true // @username
  return false
}

/**
 * Envia mensagem via Telegram Bot API.
 * `destino`: chat_id numérico ou @username.
 */
export async function sendTelegram(input: {
  destino: string
  text: string
}): Promise<SendTelegramResult> {
  if (!telegramConfigured()) {
    const missing = telegramConfigProblems().join(', ')
    console.error('[telegram] Bot não configurado. Falta(s):', missing)
    return {
      ok: false,
      notConfigured: true,
      erro: `Telegram não configurado: defina ${missing} (secret do worker) para habilitar o envio real.`,
    }
  }

  const token = process.env.TELEGRAM_BOT_TOKEN!
  const destino = input.destino.trim()

  // chat_id: username recebe "@" na frente; numérico é enviado como está.
  let chatId = destino
  if (/^[a-zA-Z0-9_]{5,32}$/.test(destino) && !/^-?\d+$/.test(destino)) {
    chatId = '@' + destino
  }

  if (!isValidTelegramDestino(destino)) {
    return {
      ok: false,
      notConfigured: false,
      erro: 'Destino do Telegram inválido (use um chat_id, ex.: 123456789, ou @username).',
    }
  }

  const url = `${TELEGRAM_API}/bot${token}/sendMessage`
  try {
    console.log(`[telegram] Enviando para ${chatId} via Telegram Bot API...`)
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: input.text,
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
      }),
    })
    const data: unknown = await resp.json().catch(() => null)

    if (!resp.ok) {
      const d = data as { description?: string } | null
      let msg = d?.description || `HTTP ${resp.status}`
      if (resp.status === 403 || /can't initiate conversation|bot was blocked|chat not found/i.test(msg)) {
        msg =
          'O bot não consegue iniciar conversa com este destinatário: ' +
          'peça para a pessoa abrir o bot e enviar /start antes (ou adicione o bot ao grupo/canal). Resposta: ' +
          msg
      }
      console.error('[telegram] Falha no envio:', msg)
      return { ok: false, notConfigured: false, erro: msg }
    }

    console.log(`[telegram] Enviado com sucesso para ${chatId}`)
    return { ok: true, notConfigured: false }
  } catch (e) {
    console.error('[telegram] Erro de rede:', (e as Error)?.message)
    return {
      ok: false,
      notConfigured: false,
      erro: `Telegram: erro de rede: ${(e as Error)?.message || 'desconhecido'}`,
    }
  }
}
