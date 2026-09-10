// ============================================================================
// Planos de cobrança (preço REAL definido no backend — o usuário NÃO pode
// alterar via navegador). Antes só existia o PRO mensal; agora há PRO e EMPRESA,
// cada um com 4 periodicidades e desconto progressivo.
//
// Preços em CENTAVOS (inteiros) para evitar erro de ponto flutuante.
// ============================================================================

// ---------------------------------------------------------------------------
// Periodicidades disponíveis (desconto progressivo sobre o valor mensal).
// `asaasCycle` é o ciclo nativo do ASAAS; `dias` define a renovação/expiração.
// ---------------------------------------------------------------------------
export const CICLOS = [
  { id: 'mensal',     label: 'Mensal',     asaasCycle: 'MONTHLY',    dias: 30,  descontoPct: 0  },
  { id: 'trimestral', label: 'Trimestral', asaasCycle: 'QUARTERLY',  dias: 90,  descontoPct: 10 },
  { id: 'semestral',  label: 'Semestral',  asaasCycle: 'SEMIANNUAL', dias: 180, descontoPct: 15 },
  { id: 'anual',      label: 'Anual',      asaasCycle: 'YEARLY',     dias: 365, descontoPct: 25 },
] as const

export type CicloId = (typeof CICLOS)[number]['id']
export type AsaasCycle = (typeof CICLOS)[number]['asaasCycle']

/** Base mensal de cada plano (em centavos). `empresa` == 'business' no banco. */
const PRECO_MENSAL: Record<PlanoId, number> = {
  pro: 3990,      // R$ 39,90
  empresa: 12990, // R$ 129,90
}

export type PlanoId = 'pro' | 'empresa'

/** Converte o id de plano (checkout) para o valor da coluna user_planos.plano. */
export function planoIdParaDb(planoId: PlanoId): 'pro' | 'business' {
  return planoId === 'empresa' ? 'business' : 'pro'
}

export function cicloById(cicloId: string) {
  return CICLOS.find((c) => c.id === cicloId) || null
}

/** Desconto percentual de um ciclo (0–0.25). */
export function descontoCiclo(cicloId: CicloId): number {
  return (cicloById(cicloId)?.descontoPct || 0) / 100
}

/** Meses cobrados por ciclo (arredondado: anual = 365/30 → 12 meses). */
function mesesDoCiclo(cic: (typeof CICLOS)[number]): number {
  return Math.round(cic.dias / 30)
}

/** Valor TOTAL do ciclo em centavos: base mensal × meses do ciclo, com desconto. */
export function precoCiclo(plano: PlanoId, cicloId: CicloId): number {
  const base = PRECO_MENSAL[plano]
  const cic = cicloById(cicloId)
  if (!cic) return base
  const bruto = Math.round(base * mesesDoCiclo(cic))
  const desconto = Math.round(bruto * descontoCiclo(cicloId))
  return bruto - desconto
}

/** Equivalente por mês (centavos) dado o valor total do ciclo. */
export function precoMensalEquivalente(plano: PlanoId, cicloId: CicloId): number {
  const cic = cicloById(cicloId)
  if (!cic) return PRECO_MENSAL[plano]
  return Math.round(precoCiclo(plano, cicloId) / mesesDoCiclo(cic))
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
    descricao: 'Para empresas que querem encontrar mais oportunidades.',
  },
  {
    id: 'empresa',
    name: 'EMPRESA',
    baseMensal: PRECO_MENSAL.empresa,
    descricao: 'Para equipes que gerenciam múltiplas empresas.',
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
