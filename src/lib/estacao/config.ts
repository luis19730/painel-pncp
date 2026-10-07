// ============================================================================
// Configuração central da ESTAÇÃO DE TRABALHO.
//
// LIMITE_GRATIS: quantos itens ATIVOS o plano gratuito pode manter. Fácil de
// alterar em um único lugar. Sem integração de pagamento (apenas aviso).
// ============================================================================

export const LIMITE_GRATIS = 10

export const ETAPAS = [
  { id: 'em_analise', label: 'Em análise', cor: 'slate' },
  { id: 'preparando_proposta', label: 'Preparando proposta', cor: 'blue' },
  { id: 'proposta_enviada', label: 'Proposta enviada', cor: 'violet' },
  { id: 'aguardando_resultado', label: 'Aguardando resultado', cor: 'amber' },
  { id: 'ganha', label: 'Ganha', cor: 'emerald' },
  { id: 'perdida', label: 'Perdida', cor: 'rose' },
] as const

/** Etapa "arquivada" (não aparece no kanban; acessível por filtro). */
export const ETAPA_DESCARTADA = 'descartada' as const

export type EtapaId =
  | (typeof ETAPAS)[number]['id']
  | 'descartada'

/** Etapas consideradas ATIVAS (contam para o limite do plano gratuito). */
export const ETAPAS_ATIVAS: EtapaId[] = [
  'em_analise',
  'preparando_proposta',
  'proposta_enviada',
  'aguardando_resultado',
]

export const TIPOS_PRAZO = [
  { id: 'abertura_sessao', label: 'Abertura da sessão' },
  { id: 'limite_esclarecimentos', label: 'Limite para esclarecimentos' },
  { id: 'limite_impugnacao', label: 'Limite para impugnação' },
  { id: 'envio_proposta', label: 'Envio da proposta' },
  { id: 'outro', label: 'Outro' },
] as const

export type PrazoTipo = (typeof TIPOS_PRAZO)[number]['id']

export function labelEtapa(id: string): string {
  if (id === 'descartada') return 'Descartada'
  return ETAPAS.find((e) => e.id === id)?.label || id
}
