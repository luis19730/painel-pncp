// ============================================================================
// Tipos normalizados do CALENDÁRIO REAL DE OPORTUNIDADES do PNCP.
//
// Fonte pública oficial: GET /consulta/v1/contratacoes/proposta (PNCP).
//   - Consulta contratações que estão RECEBENDO PROPOSTAS, com encerramento até
//     `dataFinal`. Retorna dados REAIS com as datas de abertura e encerramento
//     da sessão/propostas (dataAberturaProposta / dataEncerramentoProposta).
//
// Nenhum campo é inventado. Quando o PNCP não fornecer valor/data/link, o campo
// fica vazio/null e a UI exibe "não informado" — nunca um dado fictício.
// ============================================================================

/** Evento de calendário — representa UMA contratação real do PNCP. */
export interface CalendarioEvento {
  id: string // número de controle PNCP (identificador único real)
  numero: string // número da compra/contratação
  objeto: string // objeto real da contratação
  orgao: string // razão social do órgão/entidade
  orgaoCnpj: string
  unidade: string
  uf: string
  municipio: string
  codigoIbge: string
  esfera: string
  modalidade: string
  situacao: string
  valor: number | null // valor estimado (ou homologado quando disponível)
  dataPublicacao: string | null
  dataAbertura: string | null // dataAberturaProposta
  dataEncerramento: string | null // dataEncerramentoProposta (data do evento)
  link: string // link oficial no PNCP (nunca inventado)
  linkOrigem: string | null // linkSistemaOrigem / linkProcessoEletronico
}

/** Agrupamento de eventos por data (chave yyyy-MM-dd no fuso de Brasília). */
export interface DiaCalendario {
  data: string // yyyy-MM-dd (Brasília)
  eventos: CalendarioEvento[]
}

/** Facetas (valores reais presentes nos dados carregados) para os filtros. */
export interface Facetas {
  modalidades: string[]
  municipios: string[]
  situacoes: string[]
}

export interface ResultadoCalendario {
  ok: boolean
  fonte: 'live' | 'erro'
  consultadoEm: string // ISO da última atualização efetiva
  eventos: CalendarioEvento[]
  totalDisponivel: number // total de registros reais informado pelo PNCP
  paginasLidas: number
  facetas: Facetas
  mensagem: string | null
  erro?: string
}
