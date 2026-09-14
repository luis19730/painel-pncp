// ============================================================================
// LEAD SCORE (0 a 100) e classificação comercial do lead.
//
// Regra (conforme especificação do Painel de Conversão):
//   +5  Login / acessou dashboard
//   +10 Realizou busca / usou pesquisa de preços / análise de edital /
//       gerou relatório / retornou em outro dia / usou várias funcionalidades
//   +15 Acessou /planos
//   +20 Iniciou checkout
//   +20 Pagamento confirmado (conversão)
//   Teto: 100
//
// Classificação: QUENTE 70–100 · MORNO 40–69 · FRIO 1–39 · INATIVO 0.
// ============================================================================

export type LeadClassificacao = 'quente' | 'morno' | 'frio' | 'inativo'

export interface LeadSinais {
  login: number
  dashboard: number
  search: number
  priceSearch: number
  analysis: number
  report: number
  /** Dias distintos com atividade (retorno em outro dia). */
  diasDistintos: number
  /** Nº de funcionalidades distintas usadas. */
  funcionalidades: number
  planView: number
  checkoutStarted: number
  pagou: boolean
}

export interface LeadScore {
  score: number
  classificacao: LeadClassificacao
  motivos: string[]
}

export const LEAD_CLASSIFICACAO_META: Record<
  LeadClassificacao,
  { label: string; emoji: string; cor: string }
> = {
  quente: { label: 'Quente', emoji: '🔥', cor: 'text-rose-600' },
  morno: { label: 'Morno', emoji: '🟠', cor: 'text-amber-600' },
  frio: { label: 'Frio', emoji: '🔵', cor: 'text-sky-600' },
  inativo: { label: 'Inativo', emoji: '⚪', cor: 'text-slate-400' },
}

export function classificarLead(score: number): LeadClassificacao {
  if (score >= 70) return 'quente'
  if (score >= 40) return 'morno'
  if (score >= 1) return 'frio'
  return 'inativo'
}

export function calcularLeadScore(s: LeadSinais): LeadScore {
  let score = 0
  const motivos: string[] = []

  if (s.login > 0 || s.dashboard > 0) {
    score += 5
    motivos.push('Login / dashboard (+5)')
  }

  if (s.search > 0 || s.priceSearch > 0 || s.analysis > 0 || s.report > 0) {
    score += 10
    motivos.push('Usou busca / pesquisa de preços / análise / relatório (+10)')
  }

  if (s.diasDistintos >= 2) {
    score += 10
    motivos.push('Retornou em outro dia (+10)')
  }

  if (s.funcionalidades >= 3) {
    score += 10
    motivos.push('Utilizou várias funcionalidades (+10)')
  }

  if (s.planView > 0) {
    score += 15
    motivos.push('Acessou /planos (+15)')
  }

  if (s.checkoutStarted > 0) {
    score += 20
    motivos.push('Iniciou checkout (+20)')
  }

  if (s.pagou) {
    score += 20
    motivos.push('Pagamento confirmado (+20)')
  }

  score = Math.min(100, score)
  return { score, classificacao: classificarLead(score), motivos }
}
