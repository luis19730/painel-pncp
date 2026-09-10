// ============================================================================
// Modalidades de contratação (tabela de domínio oficial do PNCP — Manual de
// Integração PNCP, seção 5.2 "Modalidade de Contratação", Lei 14.133/2021).
//
// Estes códigos são a referência oficial usada pelo parâmetro
// `codigoModalidadeContratacao` da API de consulta do PNCP. São a estrutura
// normativa da contratação pública brasileira — não são dados fictícios.
// ============================================================================

export interface ModalidadePNCP {
  codigo: number
  nome: string
}

export const MODALIDADES_PNCP: ModalidadePNCP[] = [
  { codigo: 1, nome: 'Leilão - Eletrônico' },
  { codigo: 2, nome: 'Diálogo Competitivo' },
  { codigo: 3, nome: 'Concurso' },
  { codigo: 4, nome: 'Concorrência - Eletrônica' },
  { codigo: 5, nome: 'Concorrência - Presencial' },
  { codigo: 6, nome: 'Pregão - Eletrônico' },
  { codigo: 7, nome: 'Pregão - Presencial' },
  { codigo: 8, nome: 'Dispensa de Licitação' },
  { codigo: 9, nome: 'Inexigibilidade' },
  { codigo: 10, nome: 'Manifestação de Interesse' },
  { codigo: 11, nome: 'Pré-qualificação' },
  { codigo: 12, nome: 'Credenciamento' },
  { codigo: 13, nome: 'Leilão - Presencial' },
]

/** Retorna o nome oficial (normalizado) de um código de modalidade. */
export function nomeModalidade(codigo: number | string | null | undefined): string {
  const c = Number(codigo)
  const m = MODALIDADES_PNCP.find((x) => x.codigo === c)
  return m ? m.nome : ''
}
