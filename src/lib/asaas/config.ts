// ============================================================================
// Configuração do ASAAS (sandbox/produção) — centralizada por ambiente.
//
// A API Key NUNCA é embarcada no código/frontend. Ela vem de um Secret do
// Cloudflare Worker (`ASAAS_API_KEY`) injetado em `process.env` em runtime.
// ============================================================================

export const ASAAS_API_PROD = 'https://api.asaas.com/v3'
export const ASAAS_API_SANDBOX = 'https://api-sandbox.asaas.com/v3'

export type AsaasEnvironment = 'sandbox' | 'production'

/** Resolve o ambiente configurado (padrão: sandbox enquanto não escolhido). */
export function asaasEnvironment(): AsaasEnvironment {
  const env = (process.env.ASAAS_ENVIRONMENT || 'sandbox').toLowerCase()
  return env === 'production' ? 'production' : 'sandbox'
}

/** URL base da API ASAAS conforme o ambiente. */
export function asaasBaseUrl(): string {
  return asaasEnvironment() === 'production' ? ASAAS_API_PROD : ASAAS_API_SANDBOX
}

/** API Key real do worker (secret). Nunca exposta. */
export function asaasApiKey(): string | null {
  const key = process.env.ASAAS_API_KEY
  if (!key || key.includes('placeholder')) return null
  return key
}

/** Token independente do Webhook (secret próprio, NÃO é a API Key). */
export function asaasWebhookToken(): string | null {
  const token = process.env.ASAAS_WEBHOOK_TOKEN
  if (!token || token.includes('placeholder')) return null
  return token
}

/** true quando a chave de API está configurada (integração real). */
export function asaasConfigured(): boolean {
  return !!asaasApiKey()
}
