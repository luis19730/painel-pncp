// ============================================================================
// Tipos normalizados do módulo de Concorrentes.
// Todos representam DADOS REAIS obtidos das APIs públicas do PNCP
// (consulta/v1/contratos e consulta/v1/contratacoes). Nenhum campo é inventado.
// ============================================================================

export type FonteRegistro = 'contrato' | 'contratacao'

// Registro normalizado de um contrato (carrega fornecedor) ou de uma contratação.
export interface RegistroPNCP {
  fonte: FonteRegistro
  id: string // número de controle PNCP
  numero: string // número do contrato/empenho ou da contratação
  objeto: string
  orgao: string
  orgaoCnpj: string
  unidade: string
  uf: string
  municipio: string
  codigoIbge: string
  esfera: string
  poder: string
  modalidade: string
  // Fornecedor (presente apenas em contratos — a API de contratos é a única
  // fonte pública que expõe o fornecedor; contratações não trazem vencedor).
  fornecedor: string | null
  fornecedorCnpj: string | null
  valor: number | null
  dataPublicacao: string
  dataAssinatura: string | null
  situacao: string
  link: string
}

export interface FornecedorPerfil {
  cnpj: string
  razaoSocial: string
  registros: number // participações identificadas nos registros consultados
  vitorias: number // contratos com esse fornecedor = vitória identificada
  valorTotal: number
  ticketMedio: number
  orgaos: number
  municipios: number
  ufs: number
  itens: number
  modalidades: Record<string, number>
  ufList: string[]
  municipioList: string[]
  orgaoList: string[]
  porAno: Record<string, { registros: number; valor: number }>
  porModalidade: Record<string, { registros: number; vitorias: number; valor: number }>
  porOrgao: Record<string, { registros: number; valor: number; uf: string; municipio: string; ultima: string }>
  porUf: Record<string, { registros: number; vitorias: number; valor: number }>
  porItem: Record<string, { registros: number; vitorias: number; valorTotal: number; media: number; menor: number; maior: number }>
  competividade: { pontuacao: number; fatores: string[]; registros: number } | null
  ultimaOcorrencia: string
}

export interface AnalisePreco {
  menor: number
  maior: number
  media: number
  mediana: number
  precoConcorrente: number
  diferencaPct: number
  registros: number
}

export interface ResultadoConsulta {
  fonte: 'live' | 'local' | 'erro'
  consultadoEm: string
  periodo: { inicio: string; fim: string }
  filtros: Record<string, unknown>
  registros: RegistroPNCP[]
  registrosAnalisados: number
  totalDisponivel: number
  paginasRestantes: number
  pagina: number
  totalPaginas: number
  parcial: boolean
  mensagem: string | null
}
