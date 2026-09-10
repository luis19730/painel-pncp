// ============================================================================
// Tabela oficial de Modalidades de Contratação do PNCP.
// Fonte: Manual de Integração PNCP (tabela de domínio "ModalidadeContratacaoPNCP").
// Estes códigos são exigidos pelo endpoint /v1/contratacoes/publicacao da API
// de consulta do PNCP (codigoModalidadeContratacao, inteiro).
// Nenhum código/valor aqui é inventado — refletem a tabela oficial publicada.
// ============================================================================

export interface ModalidadePNCP {
  codigo: number
  nome: string
}

// Códigos oficiais da tabela de domínio do PNCP.
export const MODALIDADES_PNCP: ModalidadePNCP[] = [
  { codigo: 1, nome: 'Leilão - Eletrônico' },
  { codigo: 2, nome: 'Diálogo Competitivo' },
  { codigo: 3, nome: 'Concurso' },
  { codigo: 4, nome: 'Concorrência - Eletrônica' },
  { codigo: 5, nome: 'Concorrência - Presencial' },
  { codigo: 6, nome: 'Pregão Eletrônico' },
  { codigo: 7, nome: 'Pregão Presencial' },
  { codigo: 8, nome: 'Dispensa' },
  { codigo: 9, nome: 'Inexigibilidade' },
  { codigo: 12, nome: 'Credenciamento' },
  { codigo: 13, nome: 'Leilão - Presencial' },
  { codigo: 14, nome: 'Inaplicabilidade da Licitação' },
  { codigo: 15, nome: 'Chamada Pública' },
  { codigo: 16, nome: 'Concorrência - Eletrônica Internacional' },
  { codigo: 17, nome: 'Concorrência - Presencial Internacional' },
  { codigo: 18, nome: 'Pregão - Eletrônico Internacional' },
  { codigo: 19, nome: 'Pregão - Presencial Internacional' },
]

export function nomeModalidade(codigo: number | string | null | undefined): string {
  if (codigo == null || codigo === '') return 'Não informada'
  const n = Number(codigo)
  const m = MODALIDADES_PNCP.find((x) => x.codigo === n)
  return m ? m.nome : 'Código ' + codigo
}

export function codigoModalidade(nome: string | null | undefined): number | null {
  if (!nome) return null
  const n = nome.toLowerCase()
  const m = MODALIDADES_PNCP.find((x) => x.nome.toLowerCase() === n || x.nome.toLowerCase().includes(n))
  return m ? m.codigo : null
}
