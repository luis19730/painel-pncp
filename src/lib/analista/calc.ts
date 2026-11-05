// ============================================================================
// CÁLCULOS DO ANALISTA DE LICITAÇÕES — funções PURAS e testáveis.
//
// Nenhuma dependência de React, Supabase ou browser. Arredondamento em
// centavos (round2), divisão por zero protegida e valores vazios tratados
// como 0. Testes em calc.test.ts (node --test).
// ============================================================================

import type {
  Aliquotas,
  ConfigAnalista,
  EntradaAnalise,
  FreteCalculado,
  ImpostosCalculados,
  ItemEntrada,
  ResultadoAnalise,
  Sensibilidade,
  SimulacaoLance,
  TabelaFrete,
  TotaisItens,
  VereditoCalculado,
} from './types.ts'

/** Converte qualquer valor em número finito (vazio/NaN -> 0). */
export function numero(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  if (typeof v === 'string') {
    const s = v.trim()
    if (!s) return 0
    // Aceita "1.234,56" e "1234.56".
    const normalizado = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s
    const n = Number(normalizado)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

/** Arredonda para centavos (evita 0.1 + 0.2 = 0.30000000000000004). */
export function round2(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.round((v + Number.EPSILON) * 100) / 100
}

/** Percentual seguro (0 quando o total é 0/negativo). */
export function pct(parte: number, total: number): number {
  if (!Number.isFinite(parte) || !Number.isFinite(total) || total <= 0) return 0
  return round2((parte / total) * 100)
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

function brl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function pctTxt(n: number): string {
  return `${n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}

// ---------------------------------------------------------------------------
// Itens
// ---------------------------------------------------------------------------
export function calcularTotaisItens(itens: ItemEntrada[]): TotaisItens {
  let custoProdutos = 0
  let valorReferenciaTotal = 0
  let pesoTotal = 0
  let volumeTotal = 0
  let quantidadeTotal = 0

  for (const item of itens || []) {
    const qtd = Math.max(0, numero(item.quantidade))
    const custo = Math.max(0, numero(item.custoUnitario))
    const ref = Math.max(0, numero(item.valorReferencia))
    custoProdutos += qtd * custo
    valorReferenciaTotal += qtd * ref
    pesoTotal += qtd * Math.max(0, numero(item.pesoKg))
    volumeTotal += qtd * Math.max(0, numero(item.volumeM3))
    quantidadeTotal += qtd
  }

  return {
    custoProdutos: round2(custoProdutos),
    valorReferenciaTotal: round2(valorReferenciaTotal),
    pesoTotal: round2(pesoTotal),
    volumeTotal: round2(volumeTotal),
    pesoCubado: 0, // preenchido pelo chamador com o fator de cubagem
    pesoTaxavel: 0,
    quantidadeTotal: round2(quantidadeTotal),
  }
}

/** Peso cubado = volume (m³) × fator de cubagem (kg/m³). */
export function calcularPesoCubado(volumeM3: number, fatorCubagem: number): number {
  return round2(Math.max(0, numero(volumeM3)) * Math.max(0, numero(fatorCubagem)))
}

// ---------------------------------------------------------------------------
// Frete
// ---------------------------------------------------------------------------
export function escolherTarifaFrete(
  tabela: TabelaFrete | null | undefined,
  origemUf: string,
  destinoUf: string,
  distanciaKm: number
): { porKg: number; porM3: number; minimo: number; origem: string } {
  const t = tabela || { porKg: 0, porM3: 0, minimo: 0, faixas: [], porUf: {} }
  const chave = `${String(origemUf || '').toUpperCase()}>${String(destinoUf || '').toUpperCase()}`
  const porUf = t.porUf?.[chave]
  if (porUf) {
    return {
      porKg: numero(porUf.porKg),
      porM3: numero(porUf.porM3),
      minimo: numero(porUf.minimo),
      origem: `tabela por UF (${chave})`,
    }
  }

  const faixas = Array.isArray(t.faixas) ? t.faixas : []
  const km = Math.max(0, numero(distanciaKm))
  if (km > 0 && faixas.length > 0) {
    const ordenadas = [...faixas].sort((a, b) => numero(a.ateKm) - numero(b.ateKm))
    const faixa = ordenadas.find((f) => km <= numero(f.ateKm)) || ordenadas[ordenadas.length - 1]
    return {
      porKg: numero(faixa.porKg),
      porM3: numero(faixa.porM3),
      minimo: numero(faixa.minimo),
      origem: `faixa até ${numero(faixa.ateKm)} km`,
    }
  }

  return {
    porKg: numero(t.porKg),
    porM3: numero(t.porM3),
    minimo: numero(t.minimo),
    origem: 'tarifa padrão',
  }
}

export function calcularFrete(
  entrada: EntradaAnalise,
  config: ConfigAnalista,
  totais: TotaisItens
): FreteCalculado {
  const frete = entrada.frete
  const pesoCubado = calcularPesoCubado(totais.volumeTotal, config.fatorCubagem)
  const pesoTaxavel = round2(Math.max(totais.pesoTotal, pesoCubado))

  let freteBase = 0
  let detalhe = ''

  if (frete.modo === 'manual') {
    freteBase = Math.max(0, numero(frete.valorManual))
    detalhe = 'valor informado manualmente'
  } else if (frete.modo === 'cotado') {
    freteBase = Math.max(0, numero(frete.valorCotado))
    detalhe = 'frete cotado'
  } else {
    const tarifa = escolherTarifaFrete(config.tabelaFrete, frete.origemUf, frete.destinoUf, frete.distanciaKm)
    const porPeso = pesoTaxavel * tarifa.porKg
    const porVolume = totais.volumeTotal * tarifa.porM3
    freteBase = Math.max(tarifa.minimo, porPeso, porVolume)
    detalhe = `estimado pela ${tarifa.origem}`
  }

  const seguro = round2(totais.custoProdutos * (Math.max(0, numero(frete.seguroPct)) / 100))
  const pedagio = Math.max(0, numero(frete.pedagio))
  const freteConsiderado = frete.tipo === 'FOB' ? 0 : round2(freteBase)

  return {
    freteBase: round2(freteBase),
    freteConsiderado,
    seguro,
    pedagio: round2(pedagio),
    pesoTaxavel,
    pesoCubado,
    detalhe: frete.tipo === 'FOB' ? `${detalhe} (FOB: não incluído no custo)` : detalhe,
  }
}

// ---------------------------------------------------------------------------
// Impostos
// ---------------------------------------------------------------------------
export function calcularImpostos(
  receita: number,
  regime: string,
  aliquotas: Aliquotas | null | undefined
): ImpostosCalculados {
  const r = Math.max(0, numero(receita))
  const a = aliquotas || ({} as Aliquotas)

  if (regime === 'simples' || regime === 'mei') {
    const efetivoPct = Math.max(0, numero(a.simples))
    const valor = round2(r * (efetivoPct / 100))
    return {
      total: valor,
      efetivoPct: round2(efetivoPct),
      detalhes: [{ nome: regime === 'mei' ? 'MEI (efetiva)' : 'Simples Nacional (efetiva)', pct: efetivoPct, valor }],
    }
  }

  const linhas: Array<{ nome: string; pct: number }> = [
    { nome: 'ICMS', pct: numero(a.icms) },
    { nome: 'ISS', pct: numero(a.iss) },
    { nome: 'PIS', pct: numero(a.pis) },
    { nome: 'COFINS', pct: numero(a.cofins) },
    { nome: 'IRPJ', pct: numero(a.irpj) },
    { nome: 'CSLL', pct: numero(a.csll) },
    { nome: 'ST / DIFAL', pct: numero(a.stDifal) },
  ]

  const efetivoPct = round2(linhas.reduce((s, l) => s + Math.max(0, l.pct), 0))
  const detalhes = linhas
    .filter((l) => l.pct > 0)
    .map((l) => ({ nome: l.nome, pct: l.pct, valor: round2(r * (l.pct / 100)) }))

  return { total: round2(r * (efetivoPct / 100)), efetivoPct, detalhes }
}

// ---------------------------------------------------------------------------
// Resultado completo
// ---------------------------------------------------------------------------
export function calcularResultado(entrada: EntradaAnalise, config: ConfigAnalista): ResultadoAnalise {
  const totaisBase = calcularTotaisItens(entrada.itens)
  const pesoCubado = calcularPesoCubado(totaisBase.volumeTotal, config.fatorCubagem)
  const totais: TotaisItens = {
    ...totaisBase,
    pesoCubado,
    pesoTaxavel: round2(Math.max(totaisBase.pesoTotal, pesoCubado)),
  }

  const frete = calcularFrete(entrada, config, totais)
  const custos = entrada.custos
  const custoProdutos = totais.custoProdutos

  const custoDireto = round2(
    custoProdutos +
      frete.freteConsiderado +
      frete.seguro +
      frete.pedagio +
      Math.max(0, numero(custos.embalagem)) +
      Math.max(0, numero(custos.armazenagem)) +
      Math.max(0, numero(custos.instalacao)) +
      Math.max(0, numero(custos.treinamento))
  )

  const riscoPct = Math.max(0, numero(custos.riscoPct))
  const risco = round2(custoDireto * (riscoPct / 100))
  const outrosTotal = round2(
    (entrada.outrosCustos || []).reduce((s, o) => s + Math.max(0, numero(o.valor)), 0)
  )
  const certidoes = Math.max(0, numero(custos.certidoes))

  const baseCapital = round2(custoDireto + risco + certidoes + outrosTotal)
  const prazo = Math.max(0, numero(entrada.financeiro.prazoPagamentoDias))
  const custoCapitalMes = Math.max(0, numero(entrada.financeiro.custoCapitalMes))
  const fatorCapital = Math.pow(1 + custoCapitalMes / 100, prazo / 30)
  const custoFinanceiro = round2(baseCapital * (fatorCapital - 1))
  const custosFixos = round2(baseCapital + custoFinanceiro)

  const valorReferenciaTotal = round2(
    totais.valorReferenciaTotal > 0 ? totais.valorReferenciaTotal : Math.max(0, numero(entrada.edital.valorReferencia))
  )

  const desconto = clamp(numero(entrada.descontoLancePct), 0, 100)
  const valorManual = entrada.valorOfertadoManual
  const receitaBruta = round2(
    valorManual != null && numero(valorManual) > 0
      ? numero(valorManual)
      : valorReferenciaTotal * (1 - desconto / 100)
  )

  const impostos = calcularImpostos(receitaBruta, entrada.regime || config.regime, entrada.aliquotas || config.aliquotas)
  const comissaoPct = Math.max(0, numero(custos.comissaoPct))
  const despesasPct = Math.max(0, numero(custos.despesasPct))
  const garantiaPct = Math.max(0, numero(custos.garantiaPct))

  const comissao = round2(receitaBruta * (comissaoPct / 100))
  const despesasAdmin = round2(receitaBruta * (despesasPct / 100))
  const garantia = round2(receitaBruta * (garantiaPct / 100))
  const taxaVariavelPct = round2(impostos.efetivoPct + comissaoPct + despesasPct + garantiaPct)

  const custoTotal = round2(custosFixos + impostos.total + comissao + despesasAdmin + garantia)
  const receitaLiquida = round2(receitaBruta - impostos.total)
  const lucroBruto = round2(receitaBruta - custoDireto)
  const lucroLiquido = round2(receitaBruta - custoTotal)

  const margemBrutaPct = pct(lucroBruto, receitaBruta)
  const margemLiquidaPct = pct(lucroLiquido, receitaBruta)
  const markupPct = pct(lucroLiquido, custoTotal)

  const denomEquilibrio = 1 - taxaVariavelPct / 100
  const pontoEquilibrio = denomEquilibrio > 0 ? round2(custosFixos / denomEquilibrio) : null

  const margemMinima = Math.max(0, numero(entrada.margemMinima))
  const denomMinimo = 1 - (taxaVariavelPct + margemMinima) / 100
  const precoMinimoMargem = denomMinimo > 0 ? round2(custosFixos / denomMinimo) : null

  const descontoMaximoPct =
    valorReferenciaTotal > 0 && precoMinimoMargem != null
      ? round2((1 - precoMinimoMargem / valorReferenciaTotal) * 100)
      : null

  const quantidadeTotal = totais.quantidadeTotal
  const rateioUnidade =
    quantidadeTotal > 0
      ? round2(
          (frete.freteConsiderado +
            frete.seguro +
            frete.pedagio +
            Math.max(0, numero(custos.embalagem)) +
            Math.max(0, numero(custos.armazenagem)) +
            Math.max(0, numero(custos.instalacao)) +
            Math.max(0, numero(custos.treinamento))) /
            quantidadeTotal
        )
      : 0

  const itens = (entrada.itens || []).map((item) => {
    const custoUnit = Math.max(0, numero(item.custoUnitario)) + rateioUnidade
    return {
      id: item.id,
      descricao: item.descricao,
      custoTotalUnitario: round2(custoUnit),
      margemUnitaria: round2(Math.max(0, numero(item.valorReferencia)) - custoUnit),
    }
  })

  return {
    receitaBruta,
    valorReferenciaTotal,
    custoProdutos,
    frete: frete.freteConsiderado,
    seguro: frete.seguro,
    pedagio: frete.pedagio,
    custoDireto,
    custoFinanceiro,
    custosFixos,
    impostos: impostos.total,
    impostoEfetivoPct: impostos.efetivoPct,
    comissao,
    despesasAdmin,
    garantia,
    risco,
    outrosTotal,
    custoTotal,
    custoUnitarioMedio: quantidadeTotal > 0 ? round2(custoTotal / quantidadeTotal) : 0,
    receitaLiquida,
    lucroBruto,
    lucroLiquido,
    margemBrutaPct,
    margemLiquidaPct,
    markupPct,
    pontoEquilibrio,
    precoMinimoMargem,
    menorLanceViavel: precoMinimoMargem,
    descontoMaximoPct,
    fretePct: pct(frete.freteConsiderado, receitaBruta),
    roiPct: pct(lucroLiquido, custoTotal),
    capitalGiro: custoTotal,
    taxaVariavelPct,
    itens,
  }
}

// ---------------------------------------------------------------------------
// Veredito automático
// ---------------------------------------------------------------------------
export function calcularVeredito(
  resultado: ResultadoAnalise,
  entrada: EntradaAnalise,
  config: ConfigAnalista
): VereditoCalculado {
  const motivos: string[] = []
  const alertas: string[] = []
  const margemMinima = Math.max(0, numero(entrada.margemMinima))

  if (resultado.receitaBruta <= 0) {
    motivos.push('Informe o valor ofertado (ou o valor de referência e o desconto) para calcular a viabilidade.')
  }

  if (resultado.lucroLiquido <= 0) {
    motivos.push(`Com este preço o resultado é um prejuízo de ${brl(Math.abs(resultado.lucroLiquido))}.`)
  } else if (resultado.margemLiquidaPct < margemMinima) {
    motivos.push(
      `A margem líquida é ${pctTxt(resultado.margemLiquidaPct)}, abaixo da sua meta de ${pctTxt(margemMinima)}.`
    )
  } else {
    motivos.push(`Margem líquida de ${pctTxt(resultado.margemLiquidaPct)} dentro da meta de ${pctTxt(margemMinima)}.`)
  }

  if (resultado.fretePct > config.freteMaxPct) {
    alertas.push(
      `O frete consome ${pctTxt(resultado.fretePct)} da receita (acima do limite de ${pctTxt(config.freteMaxPct)}). Negocie o frete ou evite descontos altos.`
    )
  }
  if (entrada.financeiro.prazoPagamentoDias > config.prazoMaxDias) {
    alertas.push(
      `O órgão paga em ${entrada.financeiro.prazoPagamentoDias} dias (acima de ${config.prazoMaxDias}). O custo do capital já foi considerado.`
    )
  }
  if (entrada.custos.garantiaPct > 0) {
    alertas.push(`Garantia/seguro-garantia de ${pctTxt(entrada.custos.garantiaPct)} do contrato incluída no custo.`)
  }
  if (entrada.custos.riscoPct > 5) {
    alertas.push(`Contingência de ${pctTxt(entrada.custos.riscoPct)} para imprevistos e multas.`)
  }
  if (
    resultado.precoMinimoMargem != null &&
    resultado.valorReferenciaTotal > 0 &&
    resultado.precoMinimoMargem > resultado.valorReferenciaTotal
  ) {
    alertas.push(
      `O preço mínimo para a margem desejada (${brl(resultado.precoMinimoMargem)}) está ACIMA do valor de referência (${brl(resultado.valorReferenciaTotal)}).`
    )
  }
  if (resultado.descontoMaximoPct != null && resultado.descontoMaximoPct < 0) {
    alertas.push('Não existe desconto viável sobre o valor de referência com os custos atuais.')
  }
  const itensNegativos = resultado.itens.filter((i) => i.margemUnitaria <= 0)
  if (itensNegativos.length > 0) {
    alertas.push(
      `Atenção: ${itensNegativos.length} item(ns) com custo unitário igual/acima do valor de referência (${itensNegativos
        .slice(0, 2)
        .map((i) => i.descricao || 'item')
        .join(', ')}).`
    )
  }
  if (entrada.frete.tipo === 'FOB') {
    alertas.push('Frete FOB: o transporte não foi somado ao seu custo. Confirme quem paga o frete no edital.')
  }

  let nivel: VereditoCalculado['nivel'] = 'verde'
  if (resultado.receitaBruta <= 0 || resultado.lucroLiquido <= 0) nivel = 'vermelho'
  else if (
    resultado.margemLiquidaPct < margemMinima ||
    resultado.fretePct > config.freteMaxPct ||
    entrada.financeiro.prazoPagamentoDias > config.prazoMaxDias
  )
    nivel = 'amarelo'

  // Pontuação 0–100 de atratividade.
  let score = 50
  score += clamp((resultado.margemLiquidaPct - margemMinima) * 2, -45, 35)
  score -= Math.max(0, resultado.fretePct - config.freteMaxPct) * 1.2
  score -= Math.max(0, entrada.financeiro.prazoPagamentoDias - config.prazoMaxDias) * 0.25
  score -= Math.max(0, entrada.custos.riscoPct - 3) * 0.8
  if (resultado.lucroLiquido <= 0) score = Math.min(score, 20)
  score = Math.round(clamp(score, 0, 100))

  const titulo =
    nivel === 'verde'
      ? 'VANTAJOSA'
      : nivel === 'amarelo'
        ? 'ATENÇÃO / MARGEM APERTADA'
        : 'NÃO COMPENSA'

  return { nivel, titulo, motivos, alertas, score }
}

// ---------------------------------------------------------------------------
// Simulação de lances
// ---------------------------------------------------------------------------
export function simularLances(entrada: EntradaAnalise, config: ConfigAnalista, passo = 5): SimulacaoLance[] {
  const out: SimulacaoLance[] = []
  const step = Math.max(1, Math.floor(passo))
  for (let d = 0; d <= 60; d += step) {
    const clone: EntradaAnalise = {
      ...entrada,
      valorOfertadoManual: null,
      descontoLancePct: d,
      itens: entrada.itens,
    }
    const r = calcularResultado(clone, config)
    out.push({
      descontoPct: d,
      valorOfertado: r.receitaBruta,
      lucroLiquido: r.lucroLiquido,
      margemLiquidaPct: r.margemLiquidaPct,
    })
  }
  return out
}

// ---------------------------------------------------------------------------
// Sensibilidade
// ---------------------------------------------------------------------------
export function calcularSensibilidade(entrada: EntradaAnalise, config: ConfigAnalista): Sensibilidade {
  const base = calcularResultado(entrada, config)
  const freteVariacoes = [-20, -10, 0, 10, 20]
  const custoVariacoes = [-10, -5, 0, 5, 10]

  const frete = freteVariacoes.map((variacaoPct) => {
    const clone: EntradaAnalise = {
      ...entrada,
      frete: {
        ...entrada.frete,
        modo: 'manual',
        valorManual: round2(base.frete * (1 + variacaoPct / 100)),
      },
    }
    const r = calcularResultado(clone, config)
    return { variacaoPct, margemLiquidaPct: r.margemLiquidaPct, lucroLiquido: r.lucroLiquido }
  })

  const custo = custoVariacoes.map((variacaoPct) => {
    const clone: EntradaAnalise = {
      ...entrada,
      itens: entrada.itens.map((i) => ({
        ...i,
        custoUnitario: round2(Math.max(0, numero(i.custoUnitario)) * (1 + variacaoPct / 100)),
      })),
    }
    const r = calcularResultado(clone, config)
    return { variacaoPct, margemLiquidaPct: r.margemLiquidaPct, lucroLiquido: r.lucroLiquido }
  })

  return { frete, custo, desconto: simularLances(entrada, config) }
}
