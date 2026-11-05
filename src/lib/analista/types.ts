// ============================================================================
// Tipos do ANALISTA DE LICITAÇÕES.
// Todos os cálculos são feitos no front em funções puras (ver calc.ts).
// ============================================================================

export type Regime = 'simples' | 'presumido' | 'real' | 'mei'
export type Cenario = 'otimista' | 'realista' | 'pessimista'
export type Veredito = 'verde' | 'amarelo' | 'vermelho'
export type Prioridade = 'baixa' | 'media' | 'alta' | 'urgente'
export type ModoFrete = 'manual' | 'tabela' | 'cotado'
export type TipoFrete = 'CIF' | 'FOB'

export interface ItemEntrada {
  id: string
  descricao: string
  unidade: string
  quantidade: number
  valorReferencia: number
  custoUnitario: number
  fornecedor?: string
  pesoKg: number
  volumeM3: number
}

export interface Aliquotas {
  icms: number
  iss: number
  pis: number
  cofins: number
  irpj: number
  csll: number
  simples: number
  stDifal: number
}

export interface FaixaFrete {
  ateKm: number
  porKg: number
  porM3: number
  minimo: number
}

export interface TabelaFrete {
  porKg: number
  porM3: number
  minimo: number
  faixas: FaixaFrete[]
  porUf: Record<string, { porKg: number; porM3: number; minimo: number }>
}

export interface ConfigAnalista {
  margemMinima: number
  regime: Regime
  aliquotas: Aliquotas
  custoCapital: number
  fatorCubagem: number
  riscoPct: number
  despesasPct: number
  freteMaxPct: number
  prazoMaxDias: number
  tabelaFrete: TabelaFrete
}

export interface EditalEntrada {
  numero: string
  orgao: string
  uf: string
  municipio: string
  modalidade: string
  objeto: string
  valorReferencia: number
  dataSessao: string
  prazoProposta: string
  prazoEntrega: string
  link: string
}

export interface FreteEntrada {
  modo: ModoFrete
  valorManual: number
  valorCotado: number
  origemUf: string
  origemCidade: string
  destinoUf: string
  destinoCidade: string
  distanciaKm: number
  tipo: TipoFrete
  seguroPct: number
  pedagio: number
}

export interface CustosEntrada {
  embalagem: number
  armazenagem: number
  instalacao: number
  treinamento: number
  certidoes: number
  comissaoPct: number
  despesasPct: number
  garantiaPct: number
  riscoPct: number
}

export interface FinanceiroEntrada {
  prazoPagamentoDias: number
  custoCapitalMes: number
}

export interface OutroCusto {
  nome: string
  valor: number
}

export interface EntradaAnalise {
  edital: EditalEntrada
  itens: ItemEntrada[]
  frete: FreteEntrada
  custos: CustosEntrada
  financeiro: FinanceiroEntrada
  regime: Regime
  aliquotas: Aliquotas
  margemMinima: number
  descontoLancePct: number
  valorOfertadoManual: number | null
  outrosCustos: OutroCusto[]
}

export interface TotaisItens {
  custoProdutos: number
  valorReferenciaTotal: number
  pesoTotal: number
  volumeTotal: number
  pesoCubado: number
  pesoTaxavel: number
  quantidadeTotal: number
}

export interface FreteCalculado {
  freteBase: number
  freteConsiderado: number
  seguro: number
  pedagio: number
  pesoTaxavel: number
  pesoCubado: number
  detalhe: string
}

export interface ImpostosCalculados {
  total: number
  efetivoPct: number
  detalhes: Array<{ nome: string; pct: number; valor: number }>
}

export interface ResultadoAnalise {
  receitaBruta: number
  valorReferenciaTotal: number
  custoProdutos: number
  frete: number
  seguro: number
  pedagio: number
  custoDireto: number
  custoFinanceiro: number
  custosFixos: number
  impostos: number
  impostoEfetivoPct: number
  comissao: number
  despesasAdmin: number
  garantia: number
  risco: number
  outrosTotal: number
  custoTotal: number
  custoUnitarioMedio: number
  receitaLiquida: number
  lucroBruto: number
  lucroLiquido: number
  margemBrutaPct: number
  margemLiquidaPct: number
  markupPct: number
  pontoEquilibrio: number | null
  precoMinimoMargem: number | null
  menorLanceViavel: number | null
  descontoMaximoPct: number | null
  fretePct: number
  roiPct: number
  capitalGiro: number
  taxaVariavelPct: number
  itens: Array<{ id: string; descricao: string; custoTotalUnitario: number; margemUnitaria: number }>
}

export interface VereditoCalculado {
  nivel: Veredito
  titulo: string
  motivos: string[]
  alertas: string[]
  score: number
}

export interface SimulacaoLance {
  descontoPct: number
  valorOfertado: number
  lucroLiquido: number
  margemLiquidaPct: number
}

export interface Sensibilidade {
  frete: Array<{ variacaoPct: number; margemLiquidaPct: number; lucroLiquido: number }>
  custo: Array<{ variacaoPct: number; margemLiquidaPct: number; lucroLiquido: number }>
  desconto: SimulacaoLance[]
}

// ---------------------------------------------------------------------------
// Registros persistidos (Supabase)
// ---------------------------------------------------------------------------
export interface AnaliseSalva {
  id: string
  edital_ref: string | null
  titulo: string | null
  cenario: Cenario
  veredito: Veredito | null
  margem_liquida: number | null
  valor_referencia: number | null
  valor_ofertado: number | null
  entradas?: EntradaAnalise
  resultados?: ResultadoAnalise
  historico?: Array<Record<string, unknown>>
  criado_em: string
  atualizado_em: string
}

export interface ColunaKanban {
  id: string
  user_id: string
  nome: string
  ordem: number
  cor: string
  criado_em: string
  atualizado_em: string
}

export interface CartaoKanban {
  id: string
  user_id: string
  coluna_id: string
  ordem: number
  titulo: string
  orgao: string | null
  edital_ref: string | null
  modalidade: string | null
  uf: string | null
  valor_referencia: number | null
  valor_ofertado: number | null
  margem: number | null
  analise_id: string | null
  data_sessao: string | null
  prazo_proposta: string | null
  prazo_entrega: string | null
  responsavel: string | null
  prioridade: Prioridade
  etiquetas: string[]
  link_edital: string | null
  anexos: Array<{ nome: string; url: string }>
  motivo_perda: string | null
  criado_em: string
  atualizado_em: string
  checklist_total?: number
  checklist_feitos?: number
  notas_total?: number
  analista_analises?: {
    id: string
    titulo: string | null
    veredito: Veredito | null
    margem_liquida: number | null
  } | null
}

export interface NotaKanban {
  id: string
  cartao_id: string
  user_id: string
  texto: string
  tipo: 'nota' | 'comentario'
  criado_em: string
}

export interface ChecklistKanban {
  id: string
  cartao_id: string
  user_id: string
  item: string
  feito: boolean
  ordem: number
  criado_em: string
}

export interface HistoricoKanban {
  id: string
  cartao_id: string
  user_id: string
  de_coluna: string | null
  para_coluna: string | null
  criado_em: string
}

