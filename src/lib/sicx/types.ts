// ============================================================================
// Tipos do módulo SICX (página /credenciamento-sicx e ferramentas da Parte 7).
// ============================================================================

export interface SicxStatus {
  id: string
  titulo: string
  descricao: string | null
  fonte_label: string | null
  fonte_url: string | null
  atualizado_em: string
}

export interface SicxNorma {
  id: string
  titulo: string
  tipo: string
  orgao: string | null
  data_publicacao: string | null
  url: string | null
  verificado_em: string | null
  status_link: 'verificado' | 'a_verificar' | 'em_revisao'
  destaque: boolean
  ordem: number
}

export type Esfera = 'federal' | 'estadual' | 'municipal' | 'autarquia' | 'entidade'
export type TipoAlmoxarifado =
  | 'almoxarifado_virtual'
  | 'catalogo_eletronico'
  | 'marketplace_publico'
  | 'compras_expressas'
export type SituacaoAlmoxarifado = 'ativo' | 'em_implantacao' | 'a_verificar' | 'em_revisao'

export interface SicxAlmoxarifado {
  id: string
  nome: string
  orgao: string | null
  esfera: Esfera | string
  uf: string | null
  tipo: TipoAlmoxarifado | string
  situacao: SituacaoAlmoxarifado | string
  descricao: string | null
  como_participar: string | null
  url_site: string | null
  url_norma: string | null
  url_edital: string | null
  verificado_em: string | null
  status_link: 'verificado' | 'a_verificar' | 'em_revisao'
  ordem: number
  criado_em?: string | null
}

export interface SicxConteudo {
  status: SicxStatus | null
  normas: SicxNorma[]
  almoxarifados: SicxAlmoxarifado[]
  fonte: 'banco' | 'estatico'
}

export interface SicxChecklistItem {
  key: string
  titulo: string
  descricao: string
  grupo: string
  temValidade?: boolean
  link?: { label: string; url: string }
}

export interface SicxChecklistSalvo {
  item_key: string
  feito: boolean
  validade: string | null
}

export interface SicxFiltrosMercado {
  uf?: string
  municipio?: string
  orgao?: string
  esfera?: string
  periodo?: string
  precoMin?: number
  precoMax?: number
}

export interface SicxOferta {
  id: string
  categoria: string
  descricao: string
  unidade: string | null
  preco: number
  estoque: number | null
  prazo_dias: number | null
  frete_por_uf: Record<string, number>
  condicoes: Record<string, unknown>
  custo_unitario: number | null
  margem_pct: number | null
  indice_competitividade: number | null
  created_at: string
  updated_at: string
}

export interface SicxContratacao {
  id: string
  coluna_id: string | null
  ordem: number
  orgao: string | null
  item: string
  quantidade: number | null
  valor: number | null
  datas: {
    pedido?: string | null
    prazo_entrega?: string | null
    pagamento_previsto?: string | null
    pago_em?: string | null
  }
  anexos: Array<{ label: string; url: string }>
  checklist: Array<{ item: string; feito: boolean }>
  margem_prevista: number | null
  margem_realizada: number | null
  motivo_problema: string | null
  created_at: string
  updated_at: string
}

export interface SicxColuna {
  id: string
  nome: string
  ordem: number
  cor: string
}
