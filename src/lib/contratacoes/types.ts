// ============================================================================
// Tipos do módulo de Contratações (SINAPI + Montagem Inteligente de Processos)
// ============================================================================

export type TipoObjeto =
  | 'Material de consumo'
  | 'Material permanente'
  | 'Serviço'
  | 'Serviço continuado'
  | 'Obra'
  | 'Serviço de engenharia'
  | 'Tecnologia da Informação'
  | 'Locação'
  | 'Equipamento'
  | 'Solução especializada'
  | 'Outros'

export type DocStatus = 'completo' | 'elaboracao' | 'pendente' | 'nao_aplicavel'

export interface ProcessoInstrucao {
  id: string
  user_id: string
  numero: string | null
  unidade: string | null
  setor: string | null
  responsavel: string | null
  objeto: string | null
  descricao: string | null
  finalidade: string | null
  justificativa: string | null
  quantidade: number | null
  unidade_medida: string | null
  valor_estimado: number | null
  prazo: string | null
  tipo_objeto: string | null
  nd: string | null
  dfd: unknown | null
  etp: unknown | null
  tr: unknown | null
  riscos: unknown | null
  bdi: unknown | null
  status: string
  percentual: number
  created_at: string
  updated_at: string
}

export interface ProcessoItem {
  id: string
  processo_id: string
  user_id: string
  posicao: number
  codigo: string | null
  descricao: string
  unidade: string | null
  quantidade: number
  unitario: number
  total: number
  fonte: string | null
  competencia: string | null
  tipo: string
}

export interface ProcessoPreco {
  id: string
  processo_id: string
  user_id: string
  fonte: string | null
  fornecedor: string | null
  cnpj: string | null
  data: string | null
  descricao: string | null
  unidade: string | null
  quantidade: number
  preco_unit: number
  preco_total: number
  link: string | null
  obs: string | null
}

export interface ProcessoRisco {
  id: string
  processo_id: string
  user_id: string
  risco: string
  probabilidade: string | null
  impacto: string | null
  consequencia: string | null
  tratamento: string | null
  responsavel: string | null
  nivel: string | null
}

export interface ProcessoDocumento {
  id: string
  processo_id: string
  user_id: string
  nome: string
  status: DocStatus
  obrigatorio: boolean
  justificativa: string | null
  responsavel: string | null
  data: string | null
  arquivo: string | null
  obs: string | null
}

export interface SinapiCabecalho {
  id: string
  user_id: string
  nome_arquivo: string
  competencia: string | null
  uf: string | null
  deson_base: string | null
  fonte: string
  total_itens: number
  criado_em: string
}

export interface SinapiItem {
  id: string
  cabecalho_id: string
  user_id: string
  codigo: string | null
  descricao: string
  unidade: string | null
  tipo: string | null
  custo_nao_deson: number | null
  custo_deson: number | null
}

// Regras parametrizáveis de enquadramento/checklist (frontend; legislação muda)
export interface EnquadramentoRegra {
  tipoObjeto: string
  valores: string  // limite (ex.: '100000') para sugerir modalidade, vazio = sem limite
  modalidadesSugeridas: string[]
}
