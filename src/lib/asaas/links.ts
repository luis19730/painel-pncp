// ============================================================================
// Links de pagamento ASAAS (Link de Pagamento) por plano × periodicidade.
//
// Cada combinação PRO/EMPRESA × mensal/trimestral/semestral/anual tem UM link
// público criado no ASAAS pelo dono da conta. O checkout redireciona para o
// link correspondente em vez de criar assinatura via API.
//
// Para adicionar um novo plano/ciclo, basta incluir a linha nesta lista.
// ============================================================================

export interface PlanoLink {
  plano: 'pro' | 'empresa'
  ciclo: 'mensal' | 'trimestral' | 'semestral' | 'anual'
  url: string
  /** Valor total do ciclo em centavos (regra de negócio da tabela). */
  valorCents: number
}

export const LINKS_ASAAS: PlanoLink[] = [
  // PRO
  { plano: 'pro', ciclo: 'mensal', url: 'https://www.asaas.com/c/7el9mwealv7u6mrr', valorCents: 3990 },
  { plano: 'pro', ciclo: 'trimestral', url: 'https://www.asaas.com/c/4iycjzc963pxtuhg', valorCents: 10773 },
  { plano: 'pro', ciclo: 'semestral', url: 'https://www.asaas.com/c/9a7wem00asvrbu42', valorCents: 20349 },
  { plano: 'pro', ciclo: 'anual', url: 'https://www.asaas.com/c/xhzp3ae8dwzx0en7', valorCents: 35910 },
  // EMPRESA
  { plano: 'empresa', ciclo: 'mensal', url: 'https://www.asaas.com/c/8a5q8psrm8yyo0dc', valorCents: 12990 },
  { plano: 'empresa', ciclo: 'trimestral', url: 'https://www.asaas.com/c/mmxcdt1ap178h8l0', valorCents: 35073 },
  { plano: 'empresa', ciclo: 'semestral', url: 'https://www.asaas.com/c/287iaxvd3yxay4tz', valorCents: 66249 },
  { plano: 'empresa', ciclo: 'anual', url: 'https://www.asaas.com/c/c71xf13gjimngs0f', valorCents: 116910 },
]

/** Retorna o link de pagamento ASAAS para plano + periodicidade, ou null. */
export function linkPorPlanoCiclo(plano: string, ciclo: string): PlanoLink | null {
  return (
    LINKS_ASAAS.find(
      (l) => l.plano === plano && l.ciclo === ciclo
    ) || null
  )
}

/**
 * Resolve plano × ciclo a partir do VALOR total pago (centavos). Cada combinação
 * tem valor único, então é o vínculo confiável entre um pagamento de Link de
 * Pagamento ASAAS e o plano/periodicidade correspondentes.
 */
export function linkPorValor(valorCents: number): PlanoLink | null {
  return LINKS_ASAAS.find((l) => l.valorCents === valorCents) || null
}