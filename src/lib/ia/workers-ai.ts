// ============================================================================
// Cliente do Workers AI (Cloudflare) — integração NATIVA via binding `AI`.
//
// O binding `env.AI` é exposto em globalThis pelo worker/index.ts (exposeAI),
// porque as rotas de API do Next/Vinext não recebem `env` diretamente. Este
// módulo lê esse binding e chama `run(model, inputs)`.
//
// Modelo padrão: @cf/meta/llama-3.1-8b-instruct-fast — a variante `-fast` do
// Llama 3.1 8B segue ATIVA no catálogo (o `@cf/meta/llama-3.1-8b-instruct`
// base foi deprecado em 30/05/2026). Você pode trocar por outro modelo ativo,
// ex.: @cf/meta/llama-3.3-70b-instruct-fp8-fast (maior qualidade, mais caro),
// sem mudar a interface — só a string do modelo.
// ============================================================================

import { getWorkerAI } from './ai-global'

export const DEFAULT_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast'

/** Modelo do fallback Gemini — leve/barato e disponível para contas novas. */
export const GEMINI_FALLBACK_MODEL = 'gemini-3.5-flash-lite'

export interface WorkersAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface WorkersAIRunInput {
  messages: WorkersAIMessage[]
  max_tokens?: number
  temperature?: number
  top_p?: number
}

interface WorkersAIRunOutput {
  response?: string
  result?: string
}

export async function aiConfigured(): Promise<boolean> {
  return (await getWorkerAI()) != null
}

/**
 * Roda uma chat completion no Workers AI. Registra o motivo REAL de falha
 * (nunca retorna sucesso falso). `error` é definido quando algo falha.
 */
export async function runChatCompletion(
  model: string,
  messages: WorkersAIMessage[],
  opts: { maxTokens?: number; temperature?: number } = {}
): Promise<{ ok: boolean; text?: string; error?: string }> {
  const ai = await getWorkerAI()
  if (ai == null) {
    return {
      ok: false,
      error:
        'Workers AI não configurado. Adicione a binding `ai` no wrangler.jsonc e faça deploy.',
    }
  }

  const input: WorkersAIRunInput = {
    messages,
    max_tokens: opts.maxTokens ?? 2048,
    temperature: opts.temperature ?? 0.3,
  }

  try {
    const runner = ai as unknown as {
      run(model: string, input: WorkersAIRunInput): Promise<WorkersAIRunOutput>
    }
    const output = await runner.run(model, input)
    const text = output?.response ?? output?.result ?? ''
    if (!text.trim()) {
      return { ok: false, error: 'Workers AI retornou uma resposta vazia.' }
    }
    return { ok: true, text }
  } catch (e) {
    return {
      ok: false,
      error: `Workers AI: ${(e as Error)?.message || 'erro desconhecido'}`,
    }
  }
}

/**
 * Fallback para o Gemini (Google Generative Language API) quando o Workers AI
 * não estiver disponível/configurado. Requer GEMINI_API_KEY no worker.
 */
export async function runGeminiFallback(
  systemPrompt: string,
  userText: string
): Promise<{ ok: boolean; text?: string; error?: string }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey.includes('placeholder')) {
    return {
      ok: false,
      error:
        'Fallback do Gemini não configurado: defina GEMINI_API_KEY no worker para ativá-lo.',
    }
  }
  // Modelo leve e barato, disponível para contas novas. Os modelos legados
  // (gemini-1.5-flash / 2.5-flash) não estão mais disponíveis para novos usuários.
  const model = GEMINI_FALLBACK_MODEL
  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userText }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
        }),
      }
    )
    const body = await resp.json().catch(() => null)
    if (!resp.ok) {
      return {
        ok: false,
        error: `Gemini: ${(body as { error?: { message?: string } })?.error?.message || `HTTP ${resp.status}`}`,
      }
    }
    const text = (body as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
      ?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      return { ok: false, error: 'Gemini retornou uma resposta vazia.' }
    }
    return { ok: true, text }
  } catch (e) {
    return {
      ok: false,
      error: `Gemini: erro de rede: ${(e as Error)?.message || 'desconhecido'}`,
    }
  }
}
