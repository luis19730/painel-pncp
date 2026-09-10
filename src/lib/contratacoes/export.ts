// ============================================================================
// Exportações do módulo de Contratações (client-side).
//
// - Excel (.xlsx): via SheetJS (xlsx) — pesquisa de preços, mapa comparativo,
//   planilha orçamentária, itens SINAPI, memória de cálculo.
// - Word (.doc): documento HTML com MIME word — DFD, ETP, TR, análise de riscos.
// - PDF: via impressão do navegador (window.print()) em layout dedicado, já que
//   o runtime (Workers) não gera PDF server-side sem biblioteca adicional.
// ============================================================================

import * as XLSX from 'xlsx'
import type { ProcessoItem, ProcessoPreco, ProcessoInstrucao } from './types'

export function baixarBlob(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 3000)
}

export function exportarExcelPlanilhaOrcamento(itens: ProcessoItem[], nome = 'planilha-orcamentaria.xlsx') {
  const ws = XLSX.utils.json_to_sheet(
    itens.map((it, i) => ({
      Item: i + 1,
      Código: it.codigo || '',
      Descrição: it.descricao,
      Unidade: it.unidade || '',
      Quantidade: it.quantidade,
      Unitário: it.unitario,
      Total: it.total,
      Fonte: it.fonte || '',
      Competência: it.competencia || '',
    }))
  )
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Orçamento')
  XLSX.writeFile(wb, nome)
}

export function exportarExcelPesquisaPrecos(precos: ProcessoPreco[], nome = 'pesquisa-de-precos.xlsx') {
  const ws = XLSX.utils.json_to_sheet(
    precos.map((p, i) => ({
      Amostra: i + 1,
      Fonte: p.fonte || '',
      Fornecedor: p.fornecedor || '',
      CNPJ: p.cnpj || '',
      Data: p.data || '',
      Descrição: p.descricao || '',
      Unidade: p.unidade || '',
      Quantidade: p.quantidade,
      'Preço unitário': p.preco_unit,
      'Preço total': p.preco_total,
      Link: p.link || '',
      Observação: p.obs || '',
    }))
  )
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Pesquisa')
  XLSX.writeFile(wb, nome)
}

export function exportarExcelSINAPI(
  itens: Array<{ codigo: string; descricao: string; unidade: string; tipo: string; custo: number | null }>,
  nome = 'sinapi.xlsx'
) {
  const ws = XLSX.utils.json_to_sheet(
    itens.map((it) => ({
      Código: it.codigo,
      Descrição: it.descricao,
      Unidade: it.unidade,
      Tipo: it.tipo,
      'Custo unitário': it.custo,
    }))
  )
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'SINAPI')
  XLSX.writeFile(wb, nome)
}

export function exportarMemoriaCalculo(precos: ProcessoPreco[], nome = 'memoria-de-calculo.xlsx') {
  const ws = XLSX.utils.json_to_sheet(
    precos.map((p, i) => ({
      Amostra: i + 1,
      Descrição: p.descricao || '',
      'Preço unitário': p.preco_unit,
    }))
  )
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Memória')
  XLSX.writeFile(wb, nome)
}

export function exportarWord(titulo: string, secoes: Array<{ titulo: string; corpo: string }>, nome: string) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(titulo)}</title></head><body>
  <h1 style="font-family:Arial;font-size:20px">${escapeHtml(titulo)}</h1>
  ${secoes
    .map(
      (s) =>
        `<h2 style="font-family:Arial;font-size:14px">${escapeHtml(s.titulo)}</h2><p style="font-family:Arial;font-size:12px">${escapeHtml(
          s.corpo
        ).replace(/\n/g, '<br/>')}</p>`
    )
    .join('')}
  </body></html>`
  baixarBlob(new Blob([html], { type: 'application/msword' }), `${nome || 'documento'}.doc`)
}

export function escapeHtml(s: string): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function brl(n: number | null | undefined): string {
  if (n == null) return ''
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Abre uma janela com o processo consolidado em HTML para imprimir / salvar PDF. */
export function abrirImpressaoProcesso(p: ProcessoInstrucao | null, titulo: string, corpoHtml: string) {
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(
    titulo
  )}</title><style>
    body{font-family:Arial;font-size:13px;color:#111;padding:32px}
    h1{font-size:20px;border-bottom:2px solid #333;padding-bottom:8px}
    h2{font-size:16px;margin-top:22px;color:#1f3864}
    table{border-collapse:collapse;width:100%;margin-top:8px}
    th,td{border:1px solid #999;padding:6px 8px;font-size:12px}
    th{background:#eee;text-align:left}
    .meta{font-size:12px;color:#444;margin-top:12px}
    @media print{body{padding:12mm}}
  </style></head><body>
  <h1>${escapeHtml(titulo)}</h1>
  ${p ? `<div class="meta">Processo: ${escapeHtml(p.numero || '-')} • Objeto: ${escapeHtml(p.objeto || '-')} • ND: ${escapeHtml(p.nd || '-')} • Data: ${new Date().toLocaleDateString('pt-BR')}</div>` : ''}
  ${corpoHtml}
  <script>window.onload=function(){ setTimeout(function(){window.print()}, 400) }</script>
  </body></html>`)
  win.document.close()
}
