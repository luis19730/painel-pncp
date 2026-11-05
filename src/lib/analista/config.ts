// ============================================================================
// Padrões e normalização do ANALISTA DE LICITAÇÕES.
// ============================================================================

import type { Aliquotas, ConfigAnalista, EntradaAnalise, ItemEntrada, TabelaFrete } from './types.ts'

export const REGIMES = [
  { id: 'simples', label: 'Simples Nacional' },
  { id: 'presumido', label: 'Lucro Presumido' },
  { id: 'real', label: 'Lucro Real' },
  { id: 'mei', label: 'MEI' },
] as const

export const DEFAULT_ALIQUOTAS: Aliquotas = {
  icms: 0,
  iss: 0,
  pis: 0.65,
  cofins: 3,
  irpj: 0,
  csll: 0,
  simples: 6,
  stDifal: 0,
}

export const DEFAULT_TABELA_FRETE: TabelaFrete = {
  porKg: 1.2,
  porM3: 180,
  minimo: 80,
  faixas: [
    { ateKm: 100, porKg: 0.8, porM3: 120, minimo: 50 },
    { ateKm: 300, porKg: 1.1, porM3: 160, minimo: 70 },
    { ateKm: 700, porKg: 1.4, porM3: 210, minimo: 90 },
    { ateKm: 1500, porKg: 1.8, porM3: 260, minimo: 120 },
    { ateKm: 3000, porKg: 2.2, porM3: 320, minimo: 160 },
  ],
  porUf: {},
}

export const DEFAULT_CONFIG: ConfigAnalista = {
  margemMinima: 15,
  regime: 'simples',
  aliquotas: DEFAULT_ALIQUOTAS,
  custoCapital: 1.5,
  fatorCubagem: 300,
  riscoPct: 3,
  despesasPct: 2,
  freteMaxPct: 15,
  prazoMaxDias: 60,
  tabelaFrete: DEFAULT_TABELA_FRETE,
}

function num(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

/** Junta o que veio do banco com os padrões (tolerante a jsonb incompleto). */
export function normalizarConfig(raw: unknown): ConfigAnalista {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const al = (r.aliquotas && typeof r.aliquotas === 'object' ? r.aliquotas : {}) as Record<string, unknown>
  const tf = (r.tabela_frete ?? r.tabelaFrete ?? {}) as Record<string, unknown>
  const faixas = Array.isArray(tf.faixas) ? tf.faixas : DEFAULT_TABELA_FRETE.faixas
  const porUf = (tf.porUf && typeof tf.porUf === 'object' ? tf.porUf : {}) as Record<
    string,
    { porKg: number; porM3: number; minimo: number }
  >

  return {
    margemMinima: num(r.margem_minima ?? r.margemMinima, DEFAULT_CONFIG.margemMinima),
    regime: ['simples', 'presumido', 'real', 'mei'].includes(String(r.regime))
      ? (r.regime as ConfigAnalista['regime'])
      : DEFAULT_CONFIG.regime,
    aliquotas: {
      icms: num(al.icms, DEFAULT_ALIQUOTAS.icms),
      iss: num(al.iss, DEFAULT_ALIQUOTAS.iss),
      pis: num(al.pis, DEFAULT_ALIQUOTAS.pis),
      cofins: num(al.cofins, DEFAULT_ALIQUOTAS.cofins),
      irpj: num(al.irpj, DEFAULT_ALIQUOTAS.irpj),
      csll: num(al.csll, DEFAULT_ALIQUOTAS.csll),
      simples: num(al.simples, DEFAULT_ALIQUOTAS.simples),
      stDifal: num(al.stDifal, DEFAULT_ALIQUOTAS.stDifal),
    },
    custoCapital: num(r.custo_capital ?? r.custoCapital, DEFAULT_CONFIG.custoCapital),
    fatorCubagem: num(r.fator_cubagem ?? r.fatorCubagem, DEFAULT_CONFIG.fatorCubagem),
    riscoPct: num(r.risco_pct ?? r.riscoPct, DEFAULT_CONFIG.riscoPct),
    despesasPct: num(r.despesas_pct ?? r.despesasPct, DEFAULT_CONFIG.despesasPct),
    freteMaxPct: num(r.frete_max_pct ?? r.freteMaxPct, DEFAULT_CONFIG.freteMaxPct),
    prazoMaxDias: num(r.prazo_max_dias ?? r.prazoMaxDias, DEFAULT_CONFIG.prazoMaxDias),
    tabelaFrete: {
      porKg: num(tf.porKg, DEFAULT_TABELA_FRETE.porKg),
      porM3: num(tf.porM3, DEFAULT_TABELA_FRETE.porM3),
      minimo: num(tf.minimo, DEFAULT_TABELA_FRETE.minimo),
      faixas: faixas.map((f: Record<string, unknown>) => ({
        ateKm: num(f?.ateKm, 0),
        porKg: num(f?.porKg, 0),
        porM3: num(f?.porM3, 0),
        minimo: num(f?.minimo, 0),
      })),
      porUf,
    },
  }
}

/** Converte a config do formato do app para o formato da tabela. */
export function configParaBanco(c: ConfigAnalista) {
  return {
    margem_minima: c.margemMinima,
    regime: c.regime,
    aliquotas: c.aliquotas,
    custo_capital: c.custoCapital,
    fator_cubagem: c.fatorCubagem,
    risco_pct: c.riscoPct,
    despesas_pct: c.despesasPct,
    frete_max_pct: c.freteMaxPct,
    prazo_max_dias: Math.trunc(c.prazoMaxDias),
    tabela_frete: c.tabelaFrete,
  }
}

export function novoItem(): ItemEntrada {
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `item-${Date.now()}-${Math.random()}`,
    descricao: '',
    unidade: 'UN',
    quantidade: 1,
    valorReferencia: 0,
    custoUnitario: 0,
    fornecedor: '',
    pesoKg: 0,
    volumeM3: 0,
  }
}

/** Entrada inicial de uma análise (com 1 item em branco). */
export function entradaInicial(config: ConfigAnalista, edital?: Partial<EntradaAnalise['edital']>): EntradaAnalise {
  return {
    edital: {
      numero: '',
      orgao: '',
      uf: '',
      municipio: '',
      modalidade: '',
      objeto: '',
      valorReferencia: 0,
      dataSessao: '',
      prazoProposta: '',
      prazoEntrega: '',
      link: '',
      ...edital,
    },
    itens: [novoItem()],
    frete: {
      modo: 'tabela',
      valorManual: 0,
      valorCotado: 0,
      origemUf: '',
      origemCidade: '',
      destinoUf: edital?.uf || '',
      destinoCidade: edital?.municipio || '',
      distanciaKm: 0,
      tipo: 'CIF',
      seguroPct: 0.3,
      pedagio: 0,
    },
    custos: {
      embalagem: 0,
      armazenagem: 0,
      instalacao: 0,
      treinamento: 0,
      certidoes: 0,
      comissaoPct: 0,
      despesasPct: config.despesasPct,
      garantiaPct: 0,
      riscoPct: config.riscoPct,
    },
    financeiro: {
      prazoPagamentoDias: 30,
      custoCapitalMes: config.custoCapital,
    },
    regime: config.regime,
    aliquotas: { ...config.aliquotas },
    margemMinima: config.margemMinima,
    descontoLancePct: 0,
    valorOfertadoManual: null,
    outrosCustos: [],
  }
}

/**
 * Reconstrói uma entrada vinda do banco (jsonb), preenchendo campos ausentes
 * com os padrões atuais. Tolerante a versões antigas do formato.
 */
export function normalizarEntrada(raw: unknown, config: ConfigAnalista): EntradaAnalise {
  const base = entradaInicial(config)
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<EntradaAnalise>
  const regimes = ['simples', 'presumido', 'real', 'mei']

  return {
    edital: { ...base.edital, ...(r.edital && typeof r.edital === 'object' ? r.edital : {}) },
    itens:
      Array.isArray(r.itens) && r.itens.length
        ? r.itens.map((i) => ({
            ...novoItem(),
            ...i,
            id: i?.id || novoItem().id,
            descricao: String(i?.descricao ?? ''),
            unidade: String(i?.unidade ?? 'UN'),
            quantidade: num(i?.quantidade, 0),
            valorReferencia: num(i?.valorReferencia, 0),
            custoUnitario: num(i?.custoUnitario, 0),
            pesoKg: num(i?.pesoKg, 0),
            volumeM3: num(i?.volumeM3, 0),
          }))
        : base.itens,
    frete: { ...base.frete, ...(r.frete && typeof r.frete === 'object' ? r.frete : {}) },
    custos: { ...base.custos, ...(r.custos && typeof r.custos === 'object' ? r.custos : {}) },
    financeiro: { ...base.financeiro, ...(r.financeiro && typeof r.financeiro === 'object' ? r.financeiro : {}) },
    regime: regimes.includes(String(r.regime)) ? (r.regime as ConfigAnalista['regime']) : base.regime,
    aliquotas: { ...base.aliquotas, ...(r.aliquotas && typeof r.aliquotas === 'object' ? r.aliquotas : {}) },
    margemMinima: num(r.margemMinima, base.margemMinima),
    descontoLancePct: Math.max(0, Math.min(60, num(r.descontoLancePct, 0))),
    valorOfertadoManual:
      r.valorOfertadoManual == null || num(r.valorOfertadoManual, 0) <= 0 ? null : num(r.valorOfertadoManual, 0),
    outrosCustos: Array.isArray(r.outrosCustos)
      ? r.outrosCustos.map((o) => ({ nome: String(o?.nome ?? '').slice(0, 120), valor: num(o?.valor, 0) }))
      : [],
  }
}
