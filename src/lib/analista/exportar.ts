'use client'

// ============================================================================
// Exportação da análise: CSV (Excel-compatível), XLSX (xlsx já instalado) e
// PDF de uma página via janela de impressão do navegador.
// ============================================================================

import type { ConfigAnalista, EntradaAnalise, ResultadoAnalise, VereditoCalculado } from './types'
import { calcularSensibilidade } from './calc'
import { formatCurrency, formatDate } from '@/lib/utils'

export interface DadosExportacao {
  entrada: EntradaAnalise
  resultado: ResultadoAnalise
  veredito: VereditoCalculado
  config: ConfigAnalista
  titulo?: string
}

function pct(v: number | null | undefined): string {
  return `${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}

function nomeBase(dados: DadosExportacao): string {
  const titulo = (dados.titulo || dados.entrada.edital.objeto || dados.entrada.edital.numero || 'analise')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .toLowerCase()
  const data = new Date().toISOString().slice(0, 10)
  return `${titulo || 'analise'}-${data}`
}

function baixar(nome: string, conteudo: BlobPart, tipo: string) {
  const blob = new Blob([conteudo], { type: tipo })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

// ---------------------------------------------------------------------------
// CSV / Excel
// ---------------------------------------------------------------------------
function linhasResumo(dados: DadosExportacao): string[][] {
  const { entrada, resultado: r, veredito } = dados
  const e = entrada.edital
  return [
    ['ANALISTA DE LICITAÇÕES — RESUMO DA ANÁLISE'],
    ['Título', dados.titulo || e.objeto || '-'],
    ['Número PNCP', e.numero || '-'],
    ['Órgão', e.orgao || '-'],
    ['UF / Município', [e.uf, e.municipio].filter(Boolean).join(' / ') || '-'],
    ['Modalidade', e.modalidade || '-'],
    ['Data da sessão', e.dataSessao ? formatDate(e.dataSessao) : '-'],
    ['Prazo de proposta', e.prazoProposta ? formatDate(e.prazoProposta) : '-'],
    [],
    ['VEREDITO', veredito.titulo, `Pontuação: ${veredito.score}/100`],
    ['Margem mínima desejada', pct(entrada.margemMinima)],
    [],
    ['CUSTOS', 'VALOR (R$)'],
    ['Produtos', r.custoProdutos.toFixed(2)],
    ['Frete', r.frete.toFixed(2)],
    ['Seguro de carga', r.seguro.toFixed(2)],
    ['Pedágio / adicionais', r.pedagio.toFixed(2)],
    ['Custo direto', r.custoDireto.toFixed(2)],
    ['Custo financeiro', r.custoFinanceiro.toFixed(2)],
    ['Impostos', r.impostos.toFixed(2)],
    ['Comissão', r.comissao.toFixed(2)],
    ['Despesas administrativas', r.despesasAdmin.toFixed(2)],
    ['Garantia', r.garantia.toFixed(2)],
    ['Risco / contingência', r.risco.toFixed(2)],
    ['Outros custos', r.outrosTotal.toFixed(2)],
    ['CUSTO TOTAL', r.custoTotal.toFixed(2)],
    [],
    ['RESULTADO', 'VALOR'],
    ['Valor de referência', r.valorReferenciaTotal.toFixed(2)],
    ['Receita bruta (lance)', r.receitaBruta.toFixed(2)],
    ['Receita líquida', r.receitaLiquida.toFixed(2)],
    ['Lucro bruto', r.lucroBruto.toFixed(2)],
    ['Lucro líquido', r.lucroLiquido.toFixed(2)],
    ['Margem bruta', pct(r.margemBrutaPct)],
    ['Margem líquida', pct(r.margemLiquidaPct)],
    ['Markup', pct(r.markupPct)],
    ['Ponto de equilíbrio', r.pontoEquilibrio != null ? r.pontoEquilibrio.toFixed(2) : '-'],
    ['Preço mínimo p/ margem desejada', r.precoMinimoMargem != null ? r.precoMinimoMargem.toFixed(2) : '-'],
    ['Desconto máximo viável', r.descontoMaximoPct != null ? pct(r.descontoMaximoPct) : '-'],
    ['ROI', pct(r.roiPct)],
    [],
    ['ITENS', 'UNIDADE', 'QUANTIDADE', 'VALOR REF. UNIT.', 'CUSTO UNIT.', 'PESO UNIT. (KG)', 'VOLUME UNIT. (M³)'],
    ...entrada.itens.map((i) => [
      i.descricao || 'Item',
      i.unidade || 'UN',
      String(i.quantidade),
      i.valorReferencia.toFixed(2),
      i.custoUnitario.toFixed(2),
      String(i.pesoKg),
      String(i.volumeM3),
    ]),
    [],
    ['ALERTAS E MOTIVOS'],
    ...veredito.motivos.map((m) => [m]),
    ...veredito.alertas.map((a) => [a]),
    [],
    ['Aviso: os valores são estimativas baseadas nos dados informados; confirme tributos e fretes antes de ofertar.'],
  ]
}

function csvCampo(v: string): string {
  const s = String(v ?? '')
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function exportarCsv(dados: DadosExportacao) {
  const linhas = linhasResumo(dados)
  const csv = '\uFEFF' + linhas.map((l) => l.map(csvCampo).join(';')).join('\r\n')
  baixar(`${nomeBase(dados)}.csv`, csv, 'text/csv;charset=utf-8')
}

export async function exportarXlsx(dados: DadosExportacao) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  const resumo = XLSX.utils.aoa_to_sheet(linhasResumo(dados))
  resumo['!cols'] = [{ wch: 34 }, { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, resumo, 'Resumo')

  const itens = XLSX.utils.aoa_to_sheet([
    ['Descrição', 'Unidade', 'Quantidade', 'Valor de referência', 'Custo unitário', 'Peso (kg)', 'Volume (m³)', 'Fornecedor'],
    ...dados.entrada.itens.map((i) => [
      i.descricao,
      i.unidade,
      i.quantidade,
      i.valorReferencia,
      i.custoUnitario,
      i.pesoKg,
      i.volumeM3,
      i.fornecedor || '',
    ]),
  ])
  itens['!cols'] = [{ wch: 42 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 24 }]
  XLSX.utils.book_append_sheet(wb, itens, 'Itens')

  const sens = calcularSensibilidade(dados.entrada, dados.config)
  const sensSheet = XLSX.utils.aoa_to_sheet([
    ['Sensibilidade ao frete', 'Margem líquida', 'Lucro líquido'],
    ...sens.frete.map((s) => [`${s.variacaoPct > 0 ? '+' : ''}${s.variacaoPct}%`, s.margemLiquidaPct / 100, s.lucroLiquido]),
    [],
    ['Sensibilidade ao custo do produto', 'Margem líquida', 'Lucro líquido'],
    ...sens.custo.map((s) => [`${s.variacaoPct > 0 ? '+' : ''}${s.variacaoPct}%`, s.margemLiquidaPct / 100, s.lucroLiquido]),
    [],
    ['Simulação de lances', 'Valor ofertado', 'Margem líquida', 'Lucro líquido'],
    ...sens.desconto.map((s) => [`${s.descontoPct}% de desconto`, s.valorOfertado, s.margemLiquidaPct / 100, s.lucroLiquido]),
  ])
  sensSheet['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, sensSheet, 'Sensibilidade')

  XLSX.writeFile(wb, `${nomeBase(dados)}.xlsx`)
}

// ---------------------------------------------------------------------------
// PDF (janela de impressão — uma página)
// ---------------------------------------------------------------------------
function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function exportarPdf(dados: DadosExportacao) {
  const { entrada, resultado: r, veredito } = dados
  const e = entrada.edital
  const cor = veredito.nivel === 'verde' ? '#059669' : veredito.nivel === 'amarelo' ? '#d97706' : '#dc2626'
  const fundo = veredito.nivel === 'verde' ? '#ecfdf5' : veredito.nivel === 'amarelo' ? '#fffbeb' : '#fef2f2'

  const linhasCusto: Array<[string, number]> = [
    ['Produtos', r.custoProdutos],
    ['Frete', r.frete],
    ['Seguro de carga', r.seguro],
    ['Pedágio / adicionais', r.pedagio],
    ['Custo financeiro', r.custoFinanceiro],
    ['Impostos', r.impostos],
    ['Comissão', r.comissao],
    ['Despesas administrativas', r.despesasAdmin],
    ['Garantia', r.garantia],
    ['Risco / contingência', r.risco],
    ['Outros custos', r.outrosTotal],
  ]

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" />
<title>Análise de viabilidade — ${esc(e.numero || 'licitação')}</title>
<style>
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; font-size: 9.5px; line-height: 1.35; margin: 0; }
  h1 { font-size: 15px; margin: 0 0 2px; }
  h2 { font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #475569; margin: 8px 0 3px; }
  .topo { display: flex; justify-content: space-between; gap: 12px; border-bottom: 2px solid #2563eb; padding-bottom: 6px; }
  .marca { font-weight: 700; color: #2563eb; font-size: 10px; }
  .sub { color: #64748b; font-size: 9px; }
  .veredito { background: ${fundo}; border: 1px solid ${cor}; border-radius: 6px; padding: 6px 8px; margin-top: 6px; }
  .veredito strong { color: ${cor}; font-size: 12px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  table { width: 100%; border-collapse: collapse; }
  td, th { padding: 2px 4px; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: top; }
  th { color: #475569; font-weight: 600; }
  .num { text-align: right; white-space: nowrap; }
  .destaque { background: #f8fafc; font-weight: 700; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; margin-top: 5px; }
  .kpi { border: 1px solid #e2e8f0; border-radius: 5px; padding: 4px 6px; }
  .kpi span { display: block; color: #64748b; font-size: 8px; text-transform: uppercase; }
  .kpi strong { font-size: 11px; }
  ul { margin: 2px 0 0 14px; padding: 0; }
  li { margin: 1px 0; }
  .rodape { margin-top: 8px; border-top: 1px solid #e2e8f0; padding-top: 4px; color: #64748b; font-size: 8px; }
</style></head>
<body>
  <div class="topo">
    <div>
      <div class="marca">PAINEL PNCP · ANALISTA DE LICITAÇÕES</div>
      <h1>${esc(dados.titulo || e.objeto || 'Análise de viabilidade')}</h1>
      <div class="sub">${esc(e.numero || '')} · ${esc(e.orgao || '')} · ${esc([e.uf, e.municipio].filter(Boolean).join(' / '))}</div>
    </div>
    <div class="sub" style="text-align:right">Emitido em ${esc(new Date().toLocaleString('pt-BR'))}<br/>${esc(e.modalidade || '')}</div>
  </div>

  <div class="veredito">
    <strong>${esc(veredito.titulo)}</strong> — pontuação ${veredito.score}/100 · margem líquida ${pct(r.margemLiquidaPct)} (meta ${pct(entrada.margemMinima)})
    ${veredito.motivos.length ? `<ul>${veredito.motivos.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}
  </div>

  <div class="kpis">
    <div class="kpi"><span>Receita bruta</span><strong>${esc(formatCurrency(r.receitaBruta))}</strong></div>
    <div class="kpi"><span>Custo total</span><strong>${esc(formatCurrency(r.custoTotal))}</strong></div>
    <div class="kpi"><span>Lucro líquido</span><strong>${esc(formatCurrency(r.lucroLiquido))}</strong></div>
    <div class="kpi"><span>Margem líquida</span><strong>${pct(r.margemLiquidaPct)}</strong></div>
    <div class="kpi"><span>Markup</span><strong>${pct(r.markupPct)}</strong></div>
    <div class="kpi"><span>Ponto de equilíbrio</span><strong>${r.pontoEquilibrio != null ? esc(formatCurrency(r.pontoEquilibrio)) : '-'}</strong></div>
    <div class="kpi"><span>Preço mínimo (meta)</span><strong>${r.precoMinimoMargem != null ? esc(formatCurrency(r.precoMinimoMargem)) : '-'}</strong></div>
    <div class="kpi"><span>Desconto máximo</span><strong>${r.descontoMaximoPct != null ? pct(r.descontoMaximoPct) : '-'}</strong></div>
  </div>

  <div class="grid">
    <div>
      <h2>Custos</h2>
      <table>
        ${linhasCusto.map(([nome, valor]) => `<tr><td>${esc(nome)}</td><td class="num">${esc(formatCurrency(valor))}</td></tr>`).join('')}
        <tr class="destaque"><td>Custo total</td><td class="num">${esc(formatCurrency(r.custoTotal))}</td></tr>
      </table>
    </div>
    <div>
      <h2>Resultado</h2>
      <table>
        <tr><td>Valor de referência</td><td class="num">${esc(formatCurrency(r.valorReferenciaTotal))}</td></tr>
        <tr><td>Receita bruta</td><td class="num">${esc(formatCurrency(r.receitaBruta))}</td></tr>
        <tr><td>Receita líquida</td><td class="num">${esc(formatCurrency(r.receitaLiquida))}</td></tr>
        <tr><td>Lucro bruto</td><td class="num">${esc(formatCurrency(r.lucroBruto))}</td></tr>
        <tr class="destaque"><td>Lucro líquido</td><td class="num">${esc(formatCurrency(r.lucroLiquido))}</td></tr>
        <tr><td>Margem bruta</td><td class="num">${pct(r.margemBrutaPct)}</td></tr>
        <tr><td>ROI</td><td class="num">${pct(r.roiPct)}</td></tr>
        <tr><td>Capital de giro</td><td class="num">${esc(formatCurrency(r.capitalGiro))}</td></tr>
      </table>
      <h2>Itens (${entrada.itens.length})</h2>
      <table>
        <tr><th>Item</th><th class="num">Qtd</th><th class="num">Custo unit.</th></tr>
        ${entrada.itens.slice(0, 10).map((i) => `<tr><td>${esc(i.descricao || 'Item')}</td><td class="num">${esc(i.quantidade)}</td><td class="num">${esc(formatCurrency(i.custoUnitario))}</td></tr>`).join('')}
      </table>
    </div>
  </div>

  ${veredito.alertas.length ? `<h2>Alertas</h2><ul>${veredito.alertas.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}

  <div class="rodape">
    Datas: sessão ${esc(e.dataSessao ? formatDate(e.dataSessao) : '-')} · proposta ${esc(e.prazoProposta ? formatDate(e.prazoProposta) : '-')} · entrega ${esc(e.prazoEntrega ? formatDate(e.prazoEntrega) : '-')}.<br/>
    Os valores são estimativas baseadas nos dados informados; confirme tributos e fretes antes de ofertar.
  </div>
</body></html>`

  const win = window.open('', '_blank', 'width=920,height=760')
  if (!win) {
    window.alert('Libere pop-ups para exportar o PDF.')
    return
  }
  win.document.open()
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => {
    win.print()
  }, 350)
}
