// ============================================================================
// Cliente HTTP da API ASAAS (back-end / worker somente).
//
// A API Key NUNCA sai deste módulo servidor e nunca é exposta ao frontend.
// Todos os erros de rede são retornados de forma estruturada — nunca há uma
// cobrança "falsa" nem um status simulado.
// ============================================================================

import { asaasApiKey, asaasBaseUrl } from './config'
import type {
  AsaasCreateCustomerInput,
  AsaasCreateSubscriptionInput,
  AsaasCustomer,
  AsaasPayment,
  AsaasSubscription,
} from './types'

const timeoutMs = 15_000

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const key = asaasApiKey()
  if (!key) {
    return { ok: false, status: 503, error: 'ASAAS_API_KEY não configurada.' }
  }

  const url = asaasBaseUrl() + path
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      method,
      headers: {
        access_token: key,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'Painel-PNCP/1.0 (https://www.painelpncp.com.br)',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })

    const text = await res.text().catch(() => '')
    let parsed: Record<string, unknown> | null = null
    try {
      parsed = text ? JSON.parse(text) : null
    } catch {
      parsed = null
    }

    const mensagem =
      (parsed && (parsed.message as string)) ||
      (parsed && parsed.errors ? JSON.stringify(parsed.errors) : '') ||
      `HTTP ${res.status}`

    if (!res.ok) {
      return { ok: false, status: res.status, error: mensagem }
    }

    return { ok: true, data: parsed as T }
  } catch (e) {
    return { ok: false, status: 0, error: `ASAAS: erro de rede: ${(e as Error)?.message || 'desconhecido'}` }
  } finally {
    clearTimeout(timer)
  }
}

// ---------------------------------------------------------------------------
// CLIENTES
// ---------------------------------------------------------------------------
export async function createAsaasCustomer(
  input: AsaasCreateCustomerInput
): Promise<{ ok: true; customer: AsaasCustomer } | { ok: false; error: string }> {
  const r = await request<AsaasCustomer>('POST', '/customers', {
    name: input.name,
    email: input.email,
    cpfCnpj: input.cpfCnpj || undefined,
    notificationDisabled: true,
  })
  if (!r.ok) return { ok: false, error: r.error }
  return { ok: true, customer: r.data }
}

// Busca um cliente por e-mail (para reutilizar e nunca duplicar).
export async function findAsaasCustomerByEmail(
  email: string
): Promise<AsaasCustomer | null> {
  const r = await request<{ data: AsaasCustomer[] }>(
    'GET',
    `/customers?email=${encodeURIComponent(email)}&limit=5`
  )
  if (!r.ok) return null
  const list = r.data?.data || []
  return list[0] || null
}

// Atualiza o CPF/CNPJ de um cliente existente. Necessário porque o ASAAS exige
// CPF/CNPJ no cliente para criar qualquer cobrança (PIX ou cartão).
export async function updateAsaasCustomer(
  id: string,
  cpfCnpj: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const r = await request<AsaasCustomer>('PUT', `/customers/${encodeURIComponent(id)}`, { cpfCnpj })
  if (!r.ok) return { ok: false, error: r.error }
  return { ok: true }
}

// Busca um cliente pelo id (para o webhook recuperar e-mail/CPF do comprador
// de um Link de Pagamento, quando o payload só trouxer o customer.id).
export async function getAsaasCustomer(id: string): Promise<AsaasCustomer | null> {
  const r = await request<AsaasCustomer>('GET', `/customers/${encodeURIComponent(id)}`)
  if (!r.ok) return null
  return r.data
}

// ---------------------------------------------------------------------------
// ASSINATURAS
// ---------------------------------------------------------------------------
export async function createAsaasSubscription(
  input: AsaasCreateSubscriptionInput
): Promise<{ ok: true; subscription: AsaasSubscription } | { ok: false; error: string }> {
  // ASAAS mais recente recomenda token de cartão (creditCard.token) em vez de
  // enviar os dados crus. Aceitamos `creditCard.token` quando presente; caso
  // contrário enviamos os dados por compatibilidade com contas/versões antigas.
  const payload: Record<string, unknown> = {
    customer: input.customer,
    billingType: input.billingType,
    value: input.value,
    cycle: input.cycle,
    externalReference: input.externalReference || undefined,
  }
  if (input.firstDueDate) payload.nextDueDate = input.firstDueDate

  if (input.billingType === 'CREDIT_CARD') {
    if (input.creditCard) {
      payload.creditCard = {
        ...input.creditCard,
        // O ASAAS exige o ano com 4 dígitos (ex.: "2026").
        expiryYear: input.creditCard.expiryYear.padStart(4, '20'),
      }
    }
    if (input.creditCardHolderInfo) {
      payload.creditCardHolderInfo = input.creditCardHolderInfo
    }
  }

  if (input.remoteIp) payload.remoteIp = input.remoteIp

  const r = await request<AsaasSubscription>('POST', '/subscriptions', payload)
  if (!r.ok) return { ok: false, error: r.error }
  return { ok: true, subscription: r.data }
}

export async function getAsaasSubscription(
  id: string
): Promise<AsaasSubscription | null> {
  const r = await request<AsaasSubscription>('GET', `/subscriptions/${encodeURIComponent(id)}`)
  if (!r.ok) return null
  return r.data
}

export async function updateAsaasSubscription(
  id: string,
  body: Record<string, unknown>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const r = await request<AsaasSubscription>('PUT', `/subscriptions/${encodeURIComponent(id)}`, body)
  if (!r.ok) return { ok: false, error: r.error }
  return { ok: true }
}

export async function cancelAsaasSubscription(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const r = await request<AsaasSubscription>(
    'DELETE',
    `/subscriptions/${encodeURIComponent(id)}`
  )
  if (!r.ok) return { ok: false, error: r.error }
  return { ok: true }
}

// ---------------------------------------------------------------------------
// PAGAMENTOS (da assinatura) + PIX real
// ---------------------------------------------------------------------------
export async function listAsaasPaymentsBySubscription(
  subscriptionId: string,
  limit = 20
): Promise<AsaasPayment[]> {
  const r = await request<{ data: AsaasPayment[] }>(
    'GET',
    `/payments?subscription=${encodeURIComponent(subscriptionId)}&limit=${limit}`
  )
  if (!r.ok) return []
  return r.data?.data || []
}

// Detalhe do pagamento (traz os campos PIX que a listagem pode omitir).
export async function getAsaasPayment(id: string): Promise<AsaasPayment | null> {
  const r = await request<AsaasPayment>('GET', `/payments/${encodeURIComponent(id)}`)
  if (!r.ok) return null
  return r.data
}

export interface PixInfo {
  qrCode?: string
  copiaECola?: string
  status?: string
  expiryDate?: string
}

// Garante QR-code e copia-e-cola REAIS, gerados na hora. Preenche as lacunas
// vindas da listagem com o detalhe do pagamento e, se ainda faltar, solicita a
// geração imediata do QR no ASAAS (POST /payments/{id}/pixQrCode).
async function pixInfoDoPagamento(payment: AsaasPayment): Promise<PixInfo> {
  let qrCode = payment.pixQrCodeUrl || undefined
  let copiaECola = payment.pixCopiaECola || undefined
  let status = payment.status

  const det = await getAsaasPayment(payment.id)
  if (det) {
    qrCode = det.pixQrCodeUrl || qrCode
    copiaECola = det.pixCopiaECola || copiaECola
    status = det.status
  }

  if (!copiaECola || !qrCode) {
    const r = await request<{ encodedImage?: string; payload?: string }>(
      'POST',
      `/payments/${encodeURIComponent(payment.id)}/pixQrCode`
    )
    if (r.ok) {
      const { encodedImage, payload } = r.data || {}
      copiaECola = payload || copiaECola
      if (encodedImage) {
        qrCode = encodedImage.startsWith('data:') ? encodedImage : `data:image/png;base64,${encodedImage}`
      }
    }
  }

  return { qrCode, copiaECola, status, expiryDate: payment.dueDate }
}

/** PIX real (QR + copia-e-cola) da primeira cobrança de uma assinatura. */
export async function pixInfoDaAssinatura(subscriptionId: string): Promise<PixInfo | null> {
  const payments = await listAsaasPaymentsBySubscription(subscriptionId, 5)
  const primeiro = payments.find((p) => p.billingType === 'PIX') || payments[0]
  if (!primeiro) return null
  return pixInfoDoPagamento(primeiro)
}
