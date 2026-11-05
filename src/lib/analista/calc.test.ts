// ============================================================================
// Testes das funções puras do ANALISTA DE LICITAÇÕES.
// Executar: npm run test:analista
// (Node 24 — type stripping nativo, sem biblioteca de testes adicional.)
// ============================================================================

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  numero,
  round2,
  pct,
  calcularTotaisItens,
  calcularPesoCubado,
  escolherTarifaFrete,
  calcularFrete,
  calcularImpostos,
  calcularResultado,
  calcularVeredito,
  simularLances,
} from './calc.ts'
import { DEFAULT_CONFIG, DEFAULT_TABELA_FRETE, entradaInicial } from './config.ts'
import type { EntradaAnalise, ItemEntrada } from './types.ts'

function item(over: Partial<ItemEntrada> = {}): ItemEntrada {
  return {
    id: 'i1',
    descricao: 'Produto',
    unidade: 'UN',
    quantidade: 1,
    valorReferencia: 0,
    custoUnitario: 0,
    pesoKg: 0,
    volumeM3: 0,
    ...over,
  }
}

function entrada(over: Partial<EntradaAnalise> = {}): EntradaAnalise {
  const base = entradaInicial(DEFAULT_CONFIG, { valorReferencia: 1000 })
  return {
    ...base,
    itens: [item({ valorReferencia: 1000, custoUnitario: 500 })],
    frete: {
      ...base.frete,
      modo: 'manual',
      valorManual: 0,
      seguroPct: 0,
      pedagio: 0,
    },
    custos: {
      embalagem: 0,
      armazenagem: 0,
      instalacao: 0,
      treinamento: 0,
      certidoes: 0,
      comissaoPct: 0,
      despesasPct: 0,
      garantiaPct: 0,
      riscoPct: 0,
    },
    financeiro: { prazoPagamentoDias: 0, custoCapitalMes: 0 },
    margemMinima: 15,
    descontoLancePct: 0,
    valorOfertadoManual: null,
    outrosCustos: [],
    ...over,
  }
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
test('numero aceita pt-BR, vazio e inválido', () => {
  assert.equal(numero('1.234,56'), 1234.56)
  assert.equal(numero('1234.56'), 1234.56)
  assert.equal(numero(''), 0)
  assert.equal(numero(null), 0)
  assert.equal(numero('abc'), 0)
  assert.equal(numero(Number.NaN), 0)
})

test('round2 arredonda em centavos', () => {
  assert.equal(round2(0.1 + 0.2), 0.3)
  assert.equal(round2(10.005), 10.01)
  assert.equal(round2(-1.005), -1)
})

test('pct protege divisão por zero', () => {
  assert.equal(pct(10, 0), 0)
  assert.equal(pct(10, -5), 0)
  assert.equal(pct(25, 200), 12.5)
})

// ---------------------------------------------------------------------------
// Itens / cubagem
// ---------------------------------------------------------------------------
test('calcularTotaisItens soma quantidade x valores e pesos', () => {
  const t = calcularTotaisItens([
    item({ quantidade: 2, valorReferencia: 100, custoUnitario: 60, pesoKg: 5, volumeM3: 0.5 }),
    item({ id: 'i2', quantidade: 3, valorReferencia: 50, custoUnitario: 20, pesoKg: 2, volumeM3: 0.2 }),
  ])
  assert.equal(t.custoProdutos, 180) // 120 + 60
  assert.equal(t.valorReferenciaTotal, 350) // 200 + 150
  assert.equal(t.pesoTotal, 16) // 10 + 6
  assert.equal(t.volumeTotal, 1.6) // 1 + 0.6
  assert.equal(t.quantidadeTotal, 5)
})

test('calcularTotaisItens tolera lista vazia e valores vazios', () => {
  const t = calcularTotaisItens([])
  assert.equal(t.custoProdutos, 0)
  assert.equal(t.valorReferenciaTotal, 0)
  assert.equal(t.pesoTotal, 0)
  assert.equal(t.quantidadeTotal, 0)
})

test('calcularPesoCubado usa fator padrão 300 kg/m³', () => {
  assert.equal(calcularPesoCubado(2, 300), 600)
  assert.equal(calcularPesoCubado(0.5, 300), 150)
  assert.equal(calcularPesoCubado(0, 300), 0)
})

// ---------------------------------------------------------------------------
// Frete
// ---------------------------------------------------------------------------
test('escolherTarifaFrete prioriza par de UFs, depois faixa de km, depois padrão', () => {
  const tabela = {
    ...DEFAULT_TABELA_FRETE,
    porUf: { 'SP>RJ': { porKg: 2, porM3: 300, minimo: 100 } },
  }
  const porUf = escolherTarifaFrete(tabela, 'sp', 'rj', 500)
  assert.equal(porUf.porKg, 2)
  assert.equal(porUf.porM3, 300)
  assert.equal(porUf.minimo, 100)

  const porFaixa = escolherTarifaFrete(DEFAULT_TABELA_FRETE, 'SP', 'RJ', 250)
  assert.equal(porFaixa.porKg, 1.1) // faixa até 300 km
  assert.equal(porFaixa.origem, 'faixa até 300 km')

  const padrao = escolherTarifaFrete(DEFAULT_TABELA_FRETE, 'SP', 'RJ', 0)
  assert.equal(padrao.origem, 'tarifa padrão')
  assert.equal(padrao.porKg, DEFAULT_TABELA_FRETE.porKg)
})

test('calcularFrete modo tabela usa o maior entre peso, cubagem e mínimo', () => {
  const e = entrada({
    itens: [item({ quantidade: 10, custoUnitario: 50, valorReferencia: 100, pesoKg: 5, volumeM3: 0.1 })],
    frete: {
      modo: 'tabela',
      valorManual: 0,
      valorCotado: 0,
      origemUf: 'SP',
      origemCidade: '',
      destinoUf: 'RJ',
      destinoCidade: '',
      distanciaKm: 0,
      tipo: 'CIF',
      seguroPct: 0.3,
      pedagio: 20,
    },
  })
  const totais = calcularTotaisItens(e.itens)
  totais.pesoCubado = calcularPesoCubado(totais.volumeTotal, 300) // 300
  totais.pesoTaxavel = Math.max(totais.pesoTotal, totais.pesoCubado) // 300
  const f = calcularFrete(e, DEFAULT_CONFIG, totais)
  // porKg = 300 * 1.2 = 360; porM3 = 1 * 180 = 180; mínimo 80 -> 360
  assert.equal(f.freteBase, 360)
  assert.equal(f.freteConsiderado, 360)
  assert.equal(f.seguro, 1.5) // 0,3% de 500
  assert.equal(f.pedagio, 20)
})

test('calcularFrete FOB não soma o frete ao custo', () => {
  const e = entrada({
    itens: [item({ quantidade: 10, custoUnitario: 50, pesoKg: 5, volumeM3: 0.1 })],
    frete: {
      modo: 'manual',
      valorManual: 400,
      valorCotado: 0,
      origemUf: '',
      origemCidade: '',
      destinoUf: '',
      destinoCidade: '',
      distanciaKm: 0,
      tipo: 'FOB',
      seguroPct: 0,
      pedagio: 0,
    },
  })
  const totais = calcularTotaisItens(e.itens)
  const f = calcularFrete(e, DEFAULT_CONFIG, totais)
  assert.equal(f.freteBase, 400)
  assert.equal(f.freteConsiderado, 0)
})

// ---------------------------------------------------------------------------
// Impostos
// ---------------------------------------------------------------------------
test('calcularImpostos Simples usa alíquota efetiva única', () => {
  const r = calcularImpostos(1000, 'simples', DEFAULT_CONFIG.aliquotas)
  assert.equal(r.efetivoPct, 6)
  assert.equal(r.total, 60)
  assert.equal(r.detalhes.length, 1)
})

test('calcularImpostos Lucro Presumido soma PIS/COFINS e demais', () => {
  const r = calcularImpostos(1000, 'presumido', DEFAULT_CONFIG.aliquotas)
  assert.equal(r.efetivoPct, 3.65) // 0,65 + 3
  assert.equal(r.total, 36.5)
})

test('calcularImpostos protege receita vazia/negativa', () => {
  assert.equal(calcularImpostos(0, 'simples', DEFAULT_CONFIG.aliquotas).total, 0)
  assert.equal(calcularImpostos(-100, 'simples', DEFAULT_CONFIG.aliquotas).total, 0)
})

// ---------------------------------------------------------------------------
// Resultado / margem / preço mínimo
// ---------------------------------------------------------------------------
test('calcularResultado: lucro, margem, markup e equilíbrio', () => {
  const r = calcularResultado(entrada(), DEFAULT_CONFIG)
  assert.equal(r.receitaBruta, 1000)
  assert.equal(r.custoProdutos, 500)
  assert.equal(r.impostos, 60)
  assert.equal(r.custoTotal, 560)
  assert.equal(r.lucroLiquido, 440)
  assert.equal(r.margemLiquidaPct, 44)
  assert.equal(r.markupPct, 78.57) // 440 / 560
  assert.equal(r.pontoEquilibrio, 531.91) // 500 / 0,94
  assert.equal(r.precoMinimoMargem, 632.91) // 500 / 0,79
  assert.equal(r.descontoMaximoPct, 36.71)
  assert.equal(r.roiPct, 78.57)
})

test('calcularResultado: preço mínimo exato para margem desejada', () => {
  const e = entrada({
    itens: [item({ valorReferencia: 1000, custoUnitario: 800 })],
    margemMinima: 20,
    regime: 'mei',
    aliquotas: { ...DEFAULT_CONFIG.aliquotas, simples: 0 },
  })
  const r = calcularResultado(e, DEFAULT_CONFIG)
  assert.equal(r.custoTotal, 800)
  assert.equal(r.precoMinimoMargem, 1000) // 800 / (1 - 0,20)
})

test('calcularResultado: sem receita não gera NaN nem Infinity', () => {
  const e = entrada({
    edital: { ...entradaInicial(DEFAULT_CONFIG).edital, valorReferencia: 0 },
    itens: [item({ valorReferencia: 0, custoUnitario: 100 })],
  })
  const r = calcularResultado(e, DEFAULT_CONFIG)
  assert.equal(r.receitaBruta, 0)
  assert.equal(r.margemLiquidaPct, 0)
  assert.equal(r.pontoEquilibrio, 106.38) // 100 / 0,94
  assert.ok(Number.isFinite(r.lucroLiquido))
  assert.ok(Number.isFinite(r.precoMinimoMargem as number))
})

test('calcularResultado: valor ofertado manual prevalece sobre o desconto', () => {
  const r = calcularResultado(entrada({ valorOfertadoManual: 900, descontoLancePct: 50 }), DEFAULT_CONFIG)
  assert.equal(r.receitaBruta, 900)
})

test('calcularResultado: desconto de 10% reduz a receita', () => {
  const r = calcularResultado(entrada({ descontoLancePct: 10 }), DEFAULT_CONFIG)
  assert.equal(r.receitaBruta, 900)
})

// ---------------------------------------------------------------------------
// Veredito / simulação
// ---------------------------------------------------------------------------
test('calcularVeredito: verde quando margem supera a meta', () => {
  const e = entrada()
  const v = calcularVeredito(calcularResultado(e, DEFAULT_CONFIG), e, DEFAULT_CONFIG)
  assert.equal(v.nivel, 'verde')
  assert.ok(v.score > 50)
})

test('calcularVeredito: vermelho quando há prejuízo', () => {
  const e = entrada({
    itens: [item({ valorReferencia: 1000, custoUnitario: 1200 })],
  })
  const v = calcularVeredito(calcularResultado(e, DEFAULT_CONFIG), e, DEFAULT_CONFIG)
  assert.equal(v.nivel, 'vermelho')
  assert.ok(v.score <= 20)
  assert.ok(v.motivos.some((m) => m.toLowerCase().includes('prejuízo')))
})

test('simularLances cobre 0% a 60% e o lucro cai com o desconto', () => {
  const lances = simularLances(entrada(), DEFAULT_CONFIG, 10)
  assert.equal(lances[0].descontoPct, 0)
  assert.equal(lances[lances.length - 1].descontoPct, 60)
  assert.ok(lances[0].lucroLiquido > lances[lances.length - 1].lucroLiquido)
})
