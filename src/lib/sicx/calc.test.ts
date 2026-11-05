import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  calcularMargemOferta,
  certidoesEmAlerta,
  indiceCompetitividade,
  inferirCategoria,
  mediana,
  moeda,
  parseNumeroBR,
  prazoInfo,
  progressoChecklist,
  resumoMercado,
  round2,
} from './calc.ts'

test('round2 arredonda centavos sem erro de ponto flutuante', () => {
  assert.equal(round2(1.005), 1.01)
  assert.equal(round2(2.675), 2.68)
  assert.equal(round2(10.999), 11)
  assert.equal(round2(Number.NaN), 0)
})

test('parseNumeroBR aceita formatos pt-BR e en', () => {
  assert.equal(parseNumeroBR('R$ 1.234,56'), 1234.56)
  assert.equal(parseNumeroBR('1234,56'), 1234.56)
  assert.equal(parseNumeroBR('1234.56'), 1234.56)
  assert.equal(parseNumeroBR(''), 0)
  assert.equal(parseNumeroBR('abc'), 0)
})

test('mediana trata quantidade par e ímpar', () => {
  assert.equal(mediana([10, 20, 30]), 20)
  assert.equal(mediana([10, 20, 30, 40]), 25)
  assert.equal(mediana([]), 0)
})

test('resumoMercado calcula faixa e órgãos que mais compram', () => {
  const r = resumoMercado([
    { valor: 10, orgao: 'Órgão A' },
    { valor: 20, orgao: 'Órgão A' },
    { valor: 30, orgao: 'Órgão B' },
    { valor: 0, orgao: 'Órgão B' },
  ])
  assert.equal(r.quantidade, 3)
  assert.equal(r.minimo, 10)
  assert.equal(r.mediana, 20)
  assert.equal(r.maximo, 30)
  assert.equal(r.orgaos[0].nome, 'Órgão A')
  assert.equal(r.orgaos[0].quantidade, 2)
})

test('calcularMargemOferta desconta frete, imposto e despesa', () => {
  const r = calcularMargemOferta({ preco: 100, custoUnitario: 50, frete: 10, impostoPct: 10, despesaPct: 5 })
  assert.equal(r.receita, 100)
  assert.equal(r.custoTotal, 75)
  assert.equal(r.lucro, 25)
  assert.equal(r.margemPct, 25)
  assert.equal(r.markupPct, 41.67)
})

test('calcularMargemOferta não divide por zero', () => {
  const r = calcularMargemOferta({ preco: 0, custoUnitario: 10 })
  assert.equal(r.margemPct, 0)
  assert.equal(r.markupPct, -100)
  assert.equal(r.lucro, -10)
})

test('índice de competitividade fica entre 0 e 100', () => {
  const r = indiceCompetitividade({
    preco: 100,
    precoMinimo: 90,
    precoMediana: 120,
    precoMaximo: 180,
    prazoDias: 5,
    descricao: 'Caneta esferográfica azul, ponta média, corpo transparente, caixa com 50 unidades',
    unidade: 'cx',
    categoria: 'papelaria',
    regularidadeInformada: true,
  })
  assert.ok(r.total >= 0 && r.total <= 100)
  assert.equal(r.criterios.length, 4)
  assert.equal(Math.round(r.criterios.reduce((s, c) => s + c.pontos, 0)), r.total)
})

test('índice premia preço abaixo do mínimo e penaliza acima do máximo', () => {
  const barato = indiceCompetitividade({
    preco: 50, precoMinimo: 90, precoMediana: 120, precoMaximo: 180,
    prazoDias: 5, descricao: 'Descrição completa de teste com mais de oitenta caracteres para pontuar bem no critério.',
    unidade: 'un', categoria: 'papelaria', regularidadeInformada: true,
  })
  const caro = indiceCompetitividade({
    preco: 300, precoMinimo: 90, precoMediana: 120, precoMaximo: 180,
    prazoDias: 5, descricao: 'Descrição completa de teste com mais de oitenta caracteres para pontuar bem no critério.',
    unidade: 'un', categoria: 'papelaria', regularidadeInformada: true,
  })
  assert.ok(barato.total > caro.total)
})

test('progressoChecklist calcula percentual', () => {
  const itens = [{ key: 'a' }, { key: 'b' }, { key: 'c' }, { key: 'd' }]
  const r = progressoChecklist(itens, [
    { item_key: 'a', feito: true },
    { item_key: 'b', feito: false },
    { item_key: 'c', feito: true },
  ])
  assert.deepEqual(r, { feitos: 2, total: 4, pct: 50 })
  assert.deepEqual(progressoChecklist([], []), { feitos: 0, total: 0, pct: 0 })
})

test('certidoesEmAlerta aponta vencidas e próximas', () => {
  const ref = new Date('2026-11-05T12:00:00')
  const r = certidoesEmAlerta(
    [
      { item_key: 'a', validade: '2026-11-01', feito: false },
      { item_key: 'b', validade: '2026-11-20', feito: false },
      { item_key: 'c', validade: '2027-01-10', feito: false },
    ],
    30,
    ref
  )
  assert.equal(r.length, 2)
  assert.equal(r[0].item_key, 'a')
  assert.equal(r[0].vencida, true)
  assert.equal(r[1].item_key, 'b')
  assert.equal(r[1].dias, 15)
})

test('prazoInfo classifica vencido, urgente e ok', () => {
  const ref = new Date('2026-11-05T12:00:00')
  assert.equal(prazoInfo('2026-11-01', ref).status, 'vencido')
  assert.equal(prazoInfo('2026-11-06', ref).status, 'urgente')
  assert.equal(prazoInfo('2026-11-20', ref).status, 'ok')
  assert.equal(prazoInfo(null, ref).status, 'sem-prazo')
})

test('inferirCategoria reconhece termos comuns', () => {
  assert.equal(inferirCategoria('Caneta esferográfica azul'), 'papelaria')
  assert.equal(inferirCategoria('Cimento CP II 50kg'), 'construcao')
  assert.equal(inferirCategoria('Notebook 8GB'), 'informatica')
  assert.equal(inferirCategoria('Produto sem pista'), 'outros')
})

test('moeda formata em reais', () => {
  const texto = moeda(1234.5).replace(/\u00a0/g, ' ')
  assert.ok(texto.includes('1.234,50'))
  assert.ok(texto.includes('R$'))
})
