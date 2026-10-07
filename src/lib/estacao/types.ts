import type { EtapaId, PrazoTipo } from './config'

export interface WorkspaceItem {
  id: string
  user_id: string
  numero_controle_pncp: string
  orgao: string | null
  cnpj_orgao: string | null
  uf: string | null
  municipio: string | null
  objeto: string | null
  modalidade: string | null
  valor_estimado: number | null
  data_abertura: string | null
  data_encerramento_proposta: string | null
  link_pncp: string | null
  etapa: EtapaId
  ordem: number
  criado_em: string
  atualizado_em: string
}

export interface WorkspaceNota {
  id: string
  item_id: string
  user_id: string
  texto: string
  criado_em: string
  atualizado_em: string
}

export interface WorkspacePrazo {
  id: string
  item_id: string
  user_id: string
  tipo: PrazoTipo
  data_hora: string
  titulo: string | null
  concluido: boolean
  alerta_enviado: boolean
  criado_em: string
  atualizado_em: string
}

export interface WorkspaceChecklistItem {
  id: string
  item_id: string
  user_id: string
  descricao: string
  concluido: boolean
  ordem: number
  criado_em: string
  atualizado_em: string
}

/** Próximo prazo pendente (menor data_hora futura) de um item. */
export interface ProximoPrazo {
  data_hora: string
  tipo: PrazoTipo
  titulo: string | null
}
