export interface PNCPItem {
  numero_controle_pncp: string
  orgao_cnpj: string
  orgao_nome: string
  unidade_nome: string
  ano: number
  numero_sequencial: number
  description: string
  objeto_compra: string
  modalidade_licitacao_nome: string
  esfera_nome: string
  uf: string
  municipio_nome: string
  situacao_nome: string
  data_publicacao_pncp: string
  data_fim_vigencia: string
  valor_global: number
  item_url: string
  titulo: string
  numero: string
}

export interface PNCPSearchResponse {
  items: PNCPItem[]
  data: PNCPItem[]
  total: number
  paginacao: {
    pagina: number
    totalPaginas: number
    totalRegistros: number
  }
}

export interface Opportunity {
  id: string
  numero: string
  objeto: string
  orgao: string
  unidade: string
  cnpj: string
  modalidade: string
  esfera: string
  uf: string
  municipio: string
  situacao: string
  dataAbertura: string
  dataEncerramento: string
  valor: number
  link: string
  score: number
}

export interface CompanyProfile {
  id: string
  user_id: string
  cnpj: string | null
  razao_social: string | null
  nome_fantasia: string | null
  cnaes: string[]
  segmentos: string[]
  produtos: string[]
  servicos: string[]
  palavras_chave: string[]
  estados: string[]
  municipios: string[]
  valor_minimo: number | null
  valor_maximo: number | null
  modalidades: string[]
}

export interface Favorite {
  id: string
  user_id: string
  pncp_id: string
  status: 'interessante' | 'em_analise' | 'participar' | 'nao_participar' | 'acompanhando' | 'encerrada'
  observacao: string | null
  created_at: string
}

export interface Alert {
  id: string
  user_id: string
  nome: string
  keyword: string | null
  uf: string | null
  cidade: string | null
  categoria: string | null
  modalidade: string | null
  valor_min: number | null
  valor_max: number | null
  score_min: number | null
  ativo: boolean
  created_at: string
}

export interface Subscription {
  id: string
  user_id: string
  plan: 'free' | 'pro' | 'business'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  status: string
  current_period_end: string | null
}

export interface Notification {
  id: string
  user_id: string
  tipo: string
  titulo: string
  mensagem: string | null
  lida: boolean
  link: string | null
  created_at: string
}

export type PlanType = 'free' | 'pro' | 'business'

export const PLAN_LIMITS: Record<PlanType, Record<string, number>> = {
  free: { favoritos: 5, alertas: 3, buscas_dia: 10, radar: false as unknown as number },
  pro: { favoritos: 100, alertas: 20, buscas_dia: -1, radar: 1 },
  business: { favoritos: -1, alertas: -1, buscas_dia: -1, radar: -1 },
}
