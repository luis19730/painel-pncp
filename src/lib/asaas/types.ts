// ============================================================================
// Planos de cobrança (preço REAL definido no backend — o usuário NÃO pode
// alterar via navegador). Antes só existia o PRO mensal; agora há PRO e EMPRESA,
// cada um com 4 periodicidades e desconto progressivo.
//
// Preços em CENTAVOS (inteiros) para evitar erro de ponto flutuante.
// ============================================================================

export type PlanoId = 'pro' | 'empresa'

// ---------------------------------------------------------------------------
// Periodicidades disponíveis. `asaasCycle` é o ciclo nativo do ASAAS; `dias`
// define a renovação/expiração da assinatura.
// ---------------------------------------------------------------------------
export const CICLOS = [
  { id: 'mensal',     label: 'Mensal',     asaasCycle: 'MONTHLY',    dias: 30  },
  { id: 'trimestral', label: 'Trimestral', asaasCycle: 'QUARTERLY',  dias: 90  },
  { id: 'semestral',  label: 'Semestral',  asaasCycle: 'SEMIANNUAL', dias: 180 },
  { id: 'anual',      label: 'Anual',      asaasCycle: 'YEARLY',     dias: 365 },
] as const

export type CicloId = (typeof CICLOS)[number]['id']
export type AsaasCycle = (typeof CICLOS)[number]['asaasCycle']

/** Preço mensal de cada plano (em centavos). `empresa` == 'business' no banco. */
export const PRECO_MENSAL: Record<PlanoId, number> = {
  pro: 1990,      // R$ 19,90
  empresa: 12990, // R$ 129,90
}

/**
 * Tabela OFICIAL de preços por plano × periodicidade (em centavos).
 *
 * PRO (novos valores aprovados):
 *   mensal      R$ 19,90
 *   trimestral  R$ 59,90
 *   semestral   R$ 109,90
 *   anual       R$ 209,90  ← mais vantajoso: equivale a ~R$ 17,49/mês
 *
 * EMPRESA (não mudou):
 *   mensal R$ 129,90 · trimestral R$ 350,73 · semestral R$ 662,49 ·
 *   anual R$ 1.169,10.
 */
const PRECOS_POR_CICLO: Record<PlanoId, Record<CicloId, number>> = {
  pro: {
    mensal: 1990,
    trimestral: 5990,
    semestral: 10990,
    anual: 20990,
  },
  empresa: {
    mensal: 12990,
    trimestral: 35073,
    semestral: 66249,
    anual: 116910,
  },
}

/** Converte o id de plano (checkout) para o valor da coluna user_planos.plano. */
export function planoIdParaDb(planoId: PlanoId): 'pro' | 'business' {
  return planoId === 'empresa' ? 'business' : 'pro'
}

export function cicloById(cicloId: string) {
  return CICLOS.find((c) => c.id === cicloId) || null
}

/** Meses cobrados por ciclo (arredondado: anual = 365/30 → 12 meses). */
function mesesDoCiclo(cic: (typeof CICLOS)[number]): number {
  return Math.round(cic.dias / 30)
}

/** Valor TOTAL do ciclo em centavos — tabela oficial por plano × periodicidade. */
export function precoCiclo(plano: PlanoId, cicloId: CicloId): number {
  return PRECOS_POR_CICLO[plano]?.[cicloId] ?? PRECO_MENSAL[plano]
}

/** Equivalente por mês (centavos) dado o valor total do ciclo. */
export function precoMensalEquivalente(plano: PlanoId, cicloId: CicloId): number {
  const cic = cicloById(cicloId)
  if (!cic) return PRECO_MENSAL[plano]
  return Math.round(precoCiclo(plano, cicloId) / mesesDoCiclo(cic))
}

/**
 * Desconto REAL do ciclo (%) comparado a pagar o mensal por N meses.
 * Retorna 0 quando não há desconto (ex.: trimestral PRO ≈ 0,33% a mais).
 */
export function descontoRealPct(plano: PlanoId, cicloId: CicloId): number {
  const cic = cicloById(cicloId)
  if (!cic || cic.id === 'mensal') return 0
  const bruto = PRECO_MENSAL[plano] * mesesDoCiclo(cic)
  if (bruto <= 0) return 0
  const pct = Math.round((1 - precoCiclo(plano, cicloId) / bruto) * 100)
  return Math.max(0, pct)
}

export interface PlanoComCiclos {
  id: PlanoId
  name: string
  baseMensal: number
  descricao: string
}

export const PLANOS = [
  {
    id: 'pro',
    name: 'PRO',
    baseMensal: PRECO_MENSAL.pro,
    descricao: 'Monitore licitações, dispensas e oportunidades do Compras.gov e da PNCP, rápido e por pouco.',
  },
  {
    id: 'empresa',
    name: 'EMPRESA',
    baseMensal: PRECO_MENSAL.empresa,
    descricao: 'Para equipes que gerenciam múltiplas empresas com alertas e relatórios ilimitados.',
  },
] as const satisfies readonly PlanoComCiclos[]

export function planById(id: string) {
  return PLANOS.find((p) => p.id === id) || null
}

/** Helper para formatar centavos em R$. */
export function formatReais(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ---------------------------------------------------------------------------
// Tipos da API ASAAS (somente o necessário).
// ---------------------------------------------------------------------------
export type AsaasSubscriptionStatus =
  | 'none'
  | 'trial'
  | 'active'
  | 'payment_pending'
  | 'overdue'
  | 'canceled'
  | 'blocked'

export type AsaasPaymentMethod = 'none' | 'credit_card' | 'pix'

export interface AsaasCustomer {
  id: string
  name: string
  email: string
  cpfCnpj?: string | null
}

export interface AsaasCreateCustomerInput {
  name: string
  email: string
  cpfCnpj?: string
  notificationDisabled?: boolean
}

export interface AsaasSubscription {
  id: string
  customer: string
  status: string
  value: number
  nextDueDate: string
  cycle: string
  billingType: string
  paymentMethod?: string | null
}

export interface AsaasCreateSubscriptionInput {
  customer: string
  billingType: 'CREDIT_CARD' | 'PIX'
  value: number
  cycle: AsaasCycle
  creditCard?: {
    holderName: string
    number: string
    expiryMonth: string
    expiryYear: string
    ccv: string
  }
  creditCardHolderInfo?: {
    name: string
    email: string
    cpfCnpj: string
    postalCode?: string
    addressNumber?: string
    addressComplement?: string
    mobilePhone?: string
  }
  externalReference?: string
  // IP real do dispositivo do pagador — exigido pelo ASAAS para cartão.
  remoteIp?: string
  // `billingDay` ignora o dia do mês: usado junto com `firstDueDate` para
  // respeitar os 15 dias gratuitos (primeira cobrança após o fim do trial).
  firstDueDate?: string
}

export interface AsaasPayment {
  id: string
  subscription?: string | null
  customer: string
  status: string
  value: number
  dueDate: string
  billingType: string
  invoiceUrl?: string
  pixQrCodeUrl?: string | null
  pixCopiaECola?: string | null
}

// Status de pagamento usados nos eventos relevantes do webhook.
export type AsaasPaymentStatus =
  | 'CREATED'
  | 'PENDING'
  | 'CONFIRMED'
  | 'RECEIVED'
  | 'OVERDUE'
  | 'REFUNDED'
  | 'CHARGEBACK_REQUESTED'
  | 'CHARGEBACK_DISPUTE'
  | 'DELETED'
