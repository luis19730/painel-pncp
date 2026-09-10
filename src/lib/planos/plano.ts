// ============================================================================
// Planos e trial (lógica pura, sem dependência do Supabase).
//
// Todo usuário começa em `free` com um trial de TRIAL_DAYS dias contados do
// cadastro. Após o fim do trial, cai para `free` (limites de PLAN_LIMITS.free).
// ============================================================================

export type PlanoNome = 'free' | 'pro' | 'business'
export type PlanoOrigem = 'trial' | 'manual' | 'asaas'

/** Periodicidade contratada (periodicidades ASAAS com desconto progressivo). */
export type CicloAssinatura = 'mensal' | 'trimestral' | 'semestral' | 'anual'

export type StatusPagamento =
  | 'none'
  | 'trial'
  | 'active'
  | 'payment_pending'
  | 'overdue'
  | 'canceled'
  | 'blocked'

export type MetodoPagamento = 'none' | 'credit_card' | 'pix'

/** Dias de teste grátis concedidos no cadastro. */
export const TRIAL_DAYS = 15

export interface PlanoRecord {
  user_id: string
  plano: PlanoNome
  origem: PlanoOrigem
  trial_inicio: string | null
  trial_fim: string | null
  updated_at: string | null
  created_at: string | null
  bloqueado?: boolean
  /** Colunas ASAAS (aditivas na tabela user_planos). */
  asaas_customer_id?: string | null
  asaas_subscription_id?: string | null
  status_pagamento?: StatusPagamento | null
  payment_method?: MetodoPagamento | null
  ciclo?: CicloAssinatura | null
  next_due_date?: string | null
  last_payment_at?: string | null
  canceled_at?: string | null
}

export type StatusTrial = 'em_teste' | 'expirado' | 'sem_trial'

export interface PlanoInfo {
  plano: PlanoNome
  origem: PlanoOrigem
  trial_inicio: string | null
  trial_fim: string | null
  /** Ragume lógico: em_teste (dentro do prazo) | expirado | sem_trial. */
  statusTrial: StatusTrial
  /** Data final do trial computada a partir do cadastro (mesmo sem coluna). */
  trialFimCalculado: string | null
  emTrial: boolean
  /** Bloqueado manualmente pelo admin (flag user_planos.bloqueado). */
  bloqueado: boolean
  /** Dias restantes de trial (>=0). Inteiro ceil. */
  diasRestantes: number | null
  /** Status da assinatura ASAAS (persistido em user_planos.status_pagamento). */
  statusPagamento: StatusPagamento
  paymentMethod: MetodoPagamento
  /** Periodicidade contratada (mensal/trimestral/semestral/anual). */
  cicloAssinatura: CicloAssinatura
  asaasCustomerId: string | null
  asaasSubscriptionId: string | null
  nextDueDate: string | null
  lastPaymentAt: string | null
  canceledAt: string | null
  /**
   * Acesso permitido às rotas protegidas:
   *  - NÃO se estiver bloqueado manualmente;
   *  - SIM se tiver plano pago (pro/business) — inclusive via ASAAS ativo;
   *  - SIM se ainda estiver em trial;
   *  - SIM se a assinatura ASAAS estiver ativa (status_pagamento === 'active');
   *  - NÃO caso contrário (trial expirado, inadimplente ou cancelado sem plano).
   */
  acessoPermitido: boolean
}

/** Monta o registro inicial de um novo usuário (free + trial de 15 dias). */
export function buildTrialRecord(userId: string, agora = new Date()): PlanoRecord {
  const inicio = toIso(agora)
  const fim = toIso(new Date(agora.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000))
  return {
    user_id: userId,
    plano: 'free',
    origem: 'trial',
    trial_inicio: inicio,
    trial_fim: fim,
    updated_at: inicio,
    created_at: inicio,
  }
}

/** Calcula o status de trial a partir do registro + horário atual. */
export function computePlanoInfo(
  record: Pick<
    PlanoRecord,
    | 'plano'
    | 'origem'
    | 'trial_inicio'
    | 'trial_fim'
    | 'bloqueado'
    | 'status_pagamento'
    | 'payment_method'
    | 'ciclo'
    | 'asaas_customer_id'
    | 'asaas_subscription_id'
    | 'next_due_date'
    | 'last_payment_at'
    | 'canceled_at'
  > | null,
  agora = new Date()
): PlanoInfo {
  if (!record) {
    return {
      plano: 'free',
      origem: 'trial',
      trial_inicio: null,
      trial_fim: null,
      statusTrial: 'em_teste',
      trialFimCalculado: null,
      emTrial: false,
      bloqueado: false,
      diasRestantes: null,
      statusPagamento: 'none',
      paymentMethod: 'none',
      cicloAssinatura: 'mensal',
      asaasCustomerId: null,
      asaasSubscriptionId: null,
      nextDueDate: null,
      lastPaymentAt: null,
      canceledAt: null,
      acessoPermitido: false,
    }
  }

  const fimStr = record.trial_fim || record.trial_inicio
  const fim = fimStr ? new Date(fimStr) : null
  const emTrial = record.origem === 'trial' && !!fim && fim.getTime() > agora.getTime()

  let statusTrial: StatusTrial = 'sem_trial'
  if (record.origem === 'trial') {
    statusTrial = fim && fim.getTime() > agora.getTime() ? 'em_teste' : 'expirado'
  }

  const bloqueado = !!record.bloqueado
  const asaasAtivo = record.status_pagamento === 'active'

  // REGRA CENTRAL DE ACESSO (única fonte de verdade):
  //
  //   ACESSO PERMITIDO se:
  //     - NÃO bloqueado; E
  //     - (trial ainda válido no tempo) OU (pagamento confirmado 'active').
  //
  // O trial é SEMPRE limitado no tempo, independente da origem:
  //   - cadastro (origem 'trial') → trial_fim = cadastro + 15 dias;
  //   - checkout ASAAS (origem 'asaas') → status 'trial' mas igualmente
  //     limitado pelo trial_fim.
  // `status_pagamento === 'trial'` NÃO concede acesso indefinido: se o
  // trial_fim já passou, o acesso cai (a menos que haja pagamento 'active').
  const trialValido = !!fim && fim.getTime() > agora.getTime()
  const acessoPermitido = !bloqueado && (trialValido || asaasAtivo)

  const diasRestantes =
    fim && fim.getTime() > agora.getTime()
      ? Math.max(0, Math.ceil((fim.getTime() - agora.getTime()) / (24 * 60 * 60 * 1000)))
      : null

  return {
    plano: record.plano,
    origem: record.origem,
    trial_inicio: record.trial_inicio,
    trial_fim: record.trial_fim,
    statusTrial,
    trialFimCalculado: fimStr,
    emTrial,
    bloqueado,
    diasRestantes,
    statusPagamento: record.status_pagamento || 'none',
    paymentMethod: record.payment_method || 'none',
    cicloAssinatura: record.ciclo || 'mensal',
    asaasCustomerId: record.asaas_customer_id || null,
    asaasSubscriptionId: record.asaas_subscription_id || null,
    nextDueDate: record.next_due_date || null,
    lastPaymentAt: record.last_payment_at || null,
    canceledAt: record.canceled_at || null,
    acessoPermitido,
  }
}

function toIso(d: Date): string {
  return d.toISOString()
}

/** Data ISO de término do trial a partir do instante atual (calculada no servidor). */
export function trialEndIso(agora = new Date()): string {
  return new Date(agora.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString()
}

/** Número de MESES de calendário de cada ciclo de assinatura. */
const MESES_POR_CICLO: Record<CicloAssinatura, number> = {
  mensal: 1,
  trimestral: 3,
  semestral: 6,
  anual: 12,
}

/**
 * Soma MESES de calendário (não dias fixos como 30/90/180/365). Preserva o dia
 * do mês quando possível e trata o limite de dias do mês de destino.
 *
 * Ex.: 31/01 + 1 mês → 28/02 (ou 29 em bissexto); 30/01 + 1 mês → 28/02.
 * Isso respeita a periodicidade REAL contratada (mensal/trimestral/semestral/anual).
 */
export function addMesDeCalendario(base: Date, meses: number): Date {
  const d = new Date(base.getTime())
  const diaOriginal = d.getDate()
  d.setMonth(d.getMonth() + meses)
  // Se o mês de destino for mais curto, recua para o último dia válido.
  if (d.getDate() !== diaOriginal) {
    d.setDate(0)
  }
  return d
}

/** Próxima data de cobrança a partir de uma âncora + o ciclo contratado. */
export function proximaCobrancaIso(anchorIso: string, ciclo: CicloAssinatura): string {
  const base = new Date(anchorIso)
  if (Number.isNaN(base.getTime())) return anchorIso
  return addMesDeCalendario(base, MESES_POR_CICLO[ciclo] || 1).toISOString()
}

/**
 * Calcula a PRÓXIMA COBRANÇA (e os dias até ela) de forma CORRETA:
 *
 *   - TRIAL:        próxima cobrança = fim do trial (primeira cobrança real).
 *                   NUNCA soma +30 dias em cima do trial.
 *   - ACTIVE:       próxima cobrança = último pagamento + ciclo em MESES de
 *                   calendário (1/3/6/12), não dias fixos.
 *   - PENDING/OVERDUE: usa next_due_date do ASAAS quando disponível; caso
 *                   contrário, âncora de pagamento + ciclo.
 *
 * Retorna { proximaCobranca: string|null, diasParaCobranca: number|null }.
 */
export function proximaCobrancaInfo(
  info: {
    statusPagamento: StatusPagamento
    cicloAssinatura: CicloAssinatura
    trialFimCalculado: string | null
    trial_fim: string | null
    trial_inicio: string | null
    lastPaymentAt: string | null
    nextDueDate: string | null
  },
  agora = new Date()
): { proximaCobranca: string | null; diasParaCobranca: number | null } {
  const STATUS_SEM_COBRANCA: StatusPagamento[] = ['none', 'canceled', 'blocked']
  if (STATUS_SEM_COBRANCA.includes(info.statusPagamento)) {
    return { proximaCobranca: null, diasParaCobranca: null }
  }

  let prox: string | null = null

  if (info.statusPagamento === 'trial') {
    // Durante o trial, a próxima cobrança É o fim do trial (primeira cobrança).
    prox = info.trialFimCalculado || info.trial_fim || info.trial_inicio
  } else if (info.statusPagamento === 'active') {
    const anchor = info.lastPaymentAt || info.trial_fim
    if (anchor) prox = proximaCobrancaIso(anchor, info.cicloAssinatura)
  } else {
    // payment_pending / overdue
    const anchor = info.nextDueDate || info.lastPaymentAt || info.trial_fim
    if (anchor) {
      // Se tem vencimento explícito do ASAAS, usa ele; senão projeta pelo ciclo.
      prox = info.nextDueDate || (info.lastPaymentAt ? proximaCobrancaIso(info.lastPaymentAt, info.cicloAssinatura) : null)
    }
  }

  if (!prox) return { proximaCobranca: null, diasParaCobranca: null }

  const base = new Date(prox)
  if (Number.isNaN(base.getTime())) return { proximaCobranca: null, diasParaCobranca: null }

  const dias = Math.max(0, Math.ceil((base.getTime() - agora.getTime()) / (24 * 60 * 60 * 1000)))
  return { proximaCobranca: base.toISOString(), diasParaCobranca: dias }
}
