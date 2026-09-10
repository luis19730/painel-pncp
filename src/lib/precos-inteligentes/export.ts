import * as XLSX from 'xlsx-js-style'
import { unzipSync, zipSync } from 'fflate'
import { FONTE_LABEL, fmtBRL, type OrcamentoItem } from './index'

// Repara mojibake (dupla codificação) de texto, p. ex.:
// "JOÃO PESSOA" lido/homologado como Windows-1252 → "JOÃƒO PESSOA".
const MAPA_CP1252: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
  0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
  0x017e: 0x9e, 0x0178: 0x9f,
}

function repararTexto(s: unknown): string {
  if (typeof s !== 'string' || !s) return s == null ? '' : String(s)
  if (typeof TextDecoder !== 'function') return s
  const bytes: number[] = []
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c <= 0xff) bytes.push(c)
    else if (MAPA_CP1252[c] != null) bytes.push(MAPA_CP1252[c])
    else return s
  }
  try {
    const out = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes))
    return out === s ? s : out
  } catch {
    return s
  }
}

// Remove caracteres de controle ilegais em XML 1.0, normaliza quebras de linha
// e neutraliza tags/entidades HTML vindas de descrições e nomes de fornecedores
// (que quebrariam a estrutura interna do .xlsx). A biblioteca xlsx-js-style já
// escapa <>&"', mas estes resíduos podem corromper o XML ou exibir lixo.
function sanitizarTexto(v: unknown): string {
  if (v == null) return ''
  let s = String(v)
  s = s.replace(/\r\n?/g, '\n')
  s = s.replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|ul|ol)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
  s = s.replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/&apos;/gi, "'")
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, ' ')
  return s
}

function parseData(v: unknown): Date | null {
  if (v == null || v === '') return null
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v
  const s = String(v).trim()
  if (!s) return null
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (br) {
    const d = new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]))
    return isNaN(d.getTime()) ? null : d
  }
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

function excelSerial(d: Date): number {
  const utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.round((utc - Date.UTC(1899, 11, 30)) / 86400000)
}

const COR_TEXTO = '22303A'
const COR_HEADER = '1F3A4D'
const COR_MARINHO = '1F3A4D'
const COR_BORDA = 'B9C4CC'
const COR_ZEBRA = 'F2F6FA'
const COR_TOTAL = 'E8EEF5'
const COR_DESTAQUE_FUNDO = 'FDF0F1'

const bordaFina = {
  top: { style: 'thin', color: { rgb: COR_BORDA } },
  bottom: { style: 'thin', color: { rgb: COR_BORDA } },
  left: { style: 'thin', color: { rgb: COR_BORDA } },
  right: { style: 'thin', color: { rgb: COR_BORDA } },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Cel = any

function txt(v: unknown, o?: { centro?: boolean; bold?: boolean; cor?: string; fundo?: string; wrap?: boolean; sz?: number; italic?: boolean }): Cel {
  return {
    t: 's', v: repararTexto(sanitizarTexto(v)), s: {
      font: { color: { rgb: o?.cor ?? COR_TEXTO }, sz: o?.sz ?? 10, bold: o?.bold ?? false, italic: o?.italic ?? false },
      alignment: { horizontal: o?.centro ? 'center' : 'left', vertical: 'center', wrapText: o?.wrap ?? false },
      border: bordaFina,
      ...(o?.fundo ? { fill: { patternType: 'solid', fgColor: { rgb: o.fundo } } } : {}),
    },
  }
}

function num(v: unknown, fmt: string, o?: { centro?: boolean; bold?: boolean; cor?: string; fundo?: string }): Cel {
  const n = Number(v)
  if (v == null || !Number.isFinite(n)) return txt(v == null ? '' : v, { centro: o?.centro })
  return {
    t: 'n', v: n, z: fmt, s: {
      font: { color: { rgb: o?.cor ?? COR_TEXTO }, sz: 10, bold: o?.bold ?? false },
      alignment: { horizontal: o?.centro ? 'center' : 'right', vertical: 'center' },
      border: bordaFina,
      ...(o?.fundo ? { fill: { patternType: 'solid', fgColor: { rgb: o.fundo } } } : {}),
    },
  }
}

function data(v: unknown, o?: { centro?: boolean; bold?: boolean }): Cel {
  const d = parseData(v)
  if (!d) return txt(v == null ? '' : String(v), { centro: o?.centro ?? true })
  return {
    t: 'n', v: excelSerial(d), z: 'dd/mm/yyyy', s: {
      font: { color: { rgb: COR_TEXTO }, sz: 10, bold: o?.bold ?? false },
      alignment: { horizontal: o?.centro === false ? 'left' : 'center', vertical: 'center' },
      border: bordaFina,
    },
  }
}

function hdr(txtv: string): Cel {
  return {
    t: 's', v: txtv, s: {
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
      fill: { patternType: 'solid', fgColor: { rgb: COR_HEADER } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: bordaFina,
    },
  }
}

function tituloRelatorio(txtv: string): Cel {
  return {
    t: 's', v: txtv, s: {
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 14 },
      fill: { patternType: 'solid', fgColor: { rgb: COR_MARINHO } },
      alignment: { horizontal: 'center', vertical: 'center' },
    },
  }
}

function linhaInfo(label: string, valor: string): Cel {
  return {
    t: 's', v: label + ': ' + valor, s: {
      font: { color: { rgb: COR_TEXTO }, sz: 10 },
      alignment: { horizontal: 'left', vertical: 'center' },
    },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function larguraAuto(aoa: any[][], min: number = 10, max: number = 50): number[] {
  const nCols = Math.max(1, aoa.reduce((a, l) => Math.max(a, l.length), 0))
  const widths: number[] = []
  for (let c = 0; c < nCols; c++) {
    let maxLen = 0
    aoa.forEach((l) => {
      const cel = l[c]
      if (!cel) return
      const v = cel.v
      let tam = v != null ? String(v).length : 0
      if (cel.z && typeof cel.z === 'string' && /(yyyy|dd\/mm|mm\/dd)/i.test(cel.z)) {
        tam = 10
      } else if (cel.t === 'n' && typeof v === 'number') {
        tam = v.toFixed(2).replace('.', ',').length + 6
      } else if (cel.z && typeof cel.z === 'string' && cel.z.indexOf('R$') !== -1) {
        tam += 4
      }
      if (tam > maxLen) maxLen = tam
    })
    widths.push(Math.min(Math.max(Math.ceil(maxLen * 1.05) + 2, min), max))
  }
  return widths
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function zebra(aoa: any[][], fromDataRow: number) {
  for (let r = fromDataRow; r < aoa.length; r++) {
    if ((r - fromDataRow) % 2 === 1) continue
    aoa[r].forEach((cel) => {
      if (cel && cel.s && !cel.s.fill) cel.s.fill = { patternType: 'solid', fgColor: { rgb: COR_ZEBRA } }
    })
  }
}

function escXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => {
    return { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] ?? c
  })
}

type SheetSetup = {
  tableHeaderRow: number // 1-based linha do cabeçalho da tabela (frozen + print titles)
  lastRow: number
  lastCol: number
  colWidths: number[]
  rowHeights: (number | null)[] // índice 0 = linha 1
  planilhaDisplay: string // nome visível p/ defined names
}

function posProcessarXlsx(bytes: Uint8Array, setups: SheetSetup[], relatorioTitulo: string): Uint8Array {
  const files = unzipSync(bytes)
  const sheetKeys = Object.keys(files).filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k))
    .sort((a, b) => {
      const na = parseInt(a.match(/sheet(\d+)/)![1], 10)
      const nb = parseInt(b.match(/sheet(\d+)/)![1], 10)
      return na - nb
    })

  // Nota: a ordem das planilhas em sheet<s> corresponde a book_append_sheet (Orçamento, Memória, Metodologia)
  sheetKeys.forEach((name, i) => {
    const setup = setups[i]
    if (!setup) return
    let xml = new TextDecoder('utf-8').decode(files[name])

    // larguras de coluna (antes de <sheetData>)
    const colsXml = setup.colWidths.map((w, ci) =>
      `<col min="${ci + 1}" max="${ci + 1}" width="${(w + 1).toFixed(2)}" customWidth="1" bestFit="1"/>`
    ).join('')
    xml = xml.replace('<sheetData>', `<cols>${colsXml}</cols><sheetData>`)

    // alturas de linha
    for (let r = 1; r <= setup.lastRow; r++) {
      const h = setup.rowHeights[r - 1]
      if (h == null) continue
      const re = new RegExp(`(<row r="${r}")([^>]*?)(/>|>)`)
      xml = xml.replace(re, (_m, p1, p2, p3) => {
        let attrs = p2
        if (/ht=/.test(attrs)) {
          attrs = attrs.replace(/ht="[^"]*"/, `ht="${h.toFixed(1)}"`).replace(/customHeight="[^"]*"/, 'customHeight="1"')
        } else {
          attrs = (attrs + ` ht="${h.toFixed(1)}" customHeight="1"`).replace(/\s+$/, '')
        }
        return p1 + attrs + p3
      })
    }

    // congela painel (título + cabeçalho)
    const ySplit = setup.tableHeaderRow
    const topLeft = `A${setup.tableHeaderRow + 1}`
    const panesXml = `<pane state="frozen" ySplit="${ySplit}" topLeftCell="${topLeft}" activePane="bottomLeft"/><selection pane="bottomLeft" activeCell="${topLeft}" sqref="${topLeft}"/>`
    xml = xml.replace(/<sheetView\b[^>]*?(\/?)>/, (m, selfClose) => {
      if (selfClose) return m.slice(0, -2) + '>' + panesXml + '</sheetView>'
      return m + panesXml
    })

    // impressão
    const pageSetupXml = `<printOptions horizontalCentered="1" gridLines="0"/>
      <pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
      <pageSetup orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="1" horizontalDpi="300" verticalDpi="300"/>
      <headerFooter><oddHeader>&amp;L&amp;D&amp;C<b>${escXml(relatorioTitulo)}</b>&amp;R</oddHeader><oddFooter>&amp;CPágina &amp;P de &amp;N&amp;D</oddFooter></headerFooter>`
    const trailing = /<(ignoredErrors|rowBreaks|colBreaks|customProperties|cellWatches|smartTags|drawing|legacyDrawing|legacyDrawingHF|picture|oleObjects|controls|webPublishItems|tableParts|extLst)\b/
    const tm = xml.match(trailing)
    if (tm && tm.index != null) {
      xml = xml.slice(0, tm.index) + pageSetupXml + xml.slice(tm.index)
    } else {
      xml = xml.replace('</worksheet>', pageSetupXml + '</worksheet>')
    }

    files[name] = new TextEncoder().encode(xml)
  })

  // defined names (área de impressão + repetir cabeçalho) no workbook
  const wbXml = new TextDecoder('utf-8').decode(files['xl/workbook.xml'])
  let definedNamesXml = `<definedNames>`
  setups.forEach((s, i) => {
    const calc = (nm: string) => `'${nm.replace(/'/g, "''")}'`
    const area = `${calc(s.planilhaDisplay)}!$A$1:$XFD$${s.lastRow}`
    const titles = `${calc(s.planilhaDisplay)}!$${s.tableHeaderRow}:$${s.tableHeaderRow}`
    definedNamesXml += `<definedName name="_xlnm.Print_Area" localSheetId="${i}">${area}</definedName>`
    definedNamesXml += `<definedName name="_xlnm.Print_Titles" localSheetId="${i}">${titles}</definedName>`
  })
  definedNamesXml += `</definedNames>`

  let xmlOut = wbXml
  const definedRegex = /<definedNames>[\s\S]*?<\/definedNames>/
  if (definedRegex.test(xmlOut)) xmlOut = xmlOut.replace(definedRegex, definedNamesXml)
  else xmlOut = xmlOut.replace('</workbook>', definedNamesXml + '</workbook>')
  files['xl/workbook.xml'] = new TextEncoder().encode(xmlOut)

  return zipSync(files, { level: 6 })
}

function baixar(bytes: Uint8Array, nome: string) {
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// ============================================================
// Exportação principal
// ============================================================

export function exportarOrcamentoXlsx(orcamento: OrcamentoItem[]) {
  const wb = XLSX.utils.book_new()
  const FMT_MOEDA = '"R$" #,##0.00'
  const FMT_INT = '#,##0'
  const identificacao = 'PREÇOS INTELIGENTES — RELATÓRIO DE PREÇOS'
  const dataGeracao = new Date().toLocaleDateString('pt-BR')
  const setups: SheetSetup[] = []

  // ================= Aba 1 — Orçamento =================
  const cabOrc = [
    'Item', 'Código', 'Unidade', 'Quantidade', 'Preço de Referência (mediana)', 'Preço Total',
    'Fontes Válidas', 'Fontes Distintas', 'Mín. 3 fontes (Art. 23)', 'Sobrepreço',
    'Ref. Mercado (mediana)', 'Itens no Mercado', 'CV (%)', 'Média', 'Incluído em',
  ]
  const largMinIni = Math.max.apply(null, cabOrc.map((x) => x.length))

  const aoaOrc: Cel[][] = [
    [tituloRelatorio(identificacao)],
    [linhaInfo('Data da geração', dataGeracao)],
    [linhaInfo('Itens no orçamento', String(orcamento.length))],
    cabOrc.map(hdr),
  ]
  orcamento.forEach((item) => {
    const fontesValidas = item.fontes ? item.fontes.filter((f) => !f.descartado) : []
    const fontesDistintas = item.fontesValidas !== undefined ? item.fontesValidas : fontesValidas.length
    const atendeMinimo = fontesDistintas >= 3
    const temSobrepreco = !!item.temSobrepreco
    aoaOrc.push([
      txt(item.descricao, { wrap: true }),
      txt(item.codigo, { centro: true }),
      txt(item.unidade, { centro: true }),
      num(item.quantidade, FMT_INT, { centro: true }),
      num(item.mediana, FMT_MOEDA, { bold: true, fundo: COR_DESTAQUE_FUNDO }),
      num(item.mediana * item.quantidade, FMT_MOEDA, { bold: true }),
      num(fontesDistintas, FMT_INT, { centro: true }),
      num(fontesDistintas, FMT_INT, { centro: true }),
      txt(atendeMinimo ? 'SIM' : 'NÃO', { centro: true, bold: true, cor: atendeMinimo ? '1B5E20' : '7A1F2B' }),
      txt(temSobrepreco ? 'SIM — revisar' : 'NÃO', { centro: true }),
      num(item.referenciaMercado != null ? item.referenciaMercado : null, FMT_MOEDA, { centro: true }),
      num(item.mercadoItens != null ? item.mercadoItens : null, FMT_INT, { centro: true }),
      num(item.cv !== undefined ? item.cv : 0, '0.0"%"', { centro: true }),
      num(item.media != null ? item.media : null, FMT_MOEDA, { centro: true }),
      data(item.adicionadoEm),
    ])
  })
  // linha total
  const totalGeral = orcamento.reduce((s, it) => s + it.mediana * it.quantidade, 0)
  aoaOrc.push(cabOrc.map((_, ci) => {
    if (ci === 5) return num(totalGeral, FMT_MOEDA, { bold: true, fundo: COR_TOTAL })
    if (ci === 0) return txt('TOTAL', { bold: true, fundo: COR_TOTAL })
    return txt('', { centro: true, fundo: COR_TOTAL })
  }))

  const tableHeaderOrc = 4 // 1-based
  zebra(aoaOrc, tableHeaderOrc)
  const lastRowOrc = aoaOrc.length
  const lastColOrc = cabOrc.length
  const wsOrc = XLSX.utils.aoa_to_sheet(aoaOrc)
  wsOrc['!autofilter'] = { ref: `A${tableHeaderOrc}:${XLSX.utils.encode_col(lastColOrc - 1)}${lastRowOrc - 1}` }
  const widthsOrc = larguraAuto(aoaOrc, largMinIni, 46)
  wsOrc['!cols'] = widthsOrc.map((w) => ({ wch: w }))
  wsOrc['!merges'] = [0, 1, 2].map((r) => ({ s: { r, c: 0 }, e: { r, c: lastColOrc - 1 } }))
  const rowHeightsOrc: (number | null)[] = [34, 20, 20, 30]
  for (let r = 4; r < lastRowOrc; r++) rowHeightsOrc[r] = 22
  XLSX.utils.book_append_sheet(wb, wsOrc, 'Orçamento')
  setups.push({ tableHeaderRow: tableHeaderOrc, lastRow: lastRowOrc, lastCol: lastColOrc, colWidths: widthsOrc, rowHeights: rowHeightsOrc, planilhaDisplay: 'Orçamento' })

  // ================= Aba 2 — Memória de Cálculo =================
  const cabMem = [
    'Item', 'Código', 'Fonte', 'Órgão/Fornecedor', 'UF', 'Data', 'Fornecedor', 'Município',
    'Modalidade', 'Unidade', 'Quantidade', 'Valor Coletado', 'Situação',
  ]
  const aoaMem: Cel[][] = [
    [tituloRelatorio(identificacao)],
    [linhaInfo('Data da geração', dataGeracao)],
    [linhaInfo('Itens no orçamento', String(orcamento.length))],
    cabMem.map(hdr),
  ]
  orcamento.forEach((item) => {
    ;(item.fontes || []).forEach((f) => {
      aoaMem.push([
        txt(item.descricao, { wrap: true }),
        txt(item.codigo, { centro: true }),
        txt(FONTE_LABEL[f.fonte] || f.fonte, { centro: true }),
        txt(f.orgao, { wrap: true }),
        txt(f.uf, { centro: true }),
        data(f.data),
        txt(f.fornecedor, { wrap: true }),
        txt(f.municipio, { centro: true }),
        txt(f.modalidade, { centro: true }),
        txt(f.unidade, { centro: true }),
        num(f.quantidade != null ? f.quantidade : null, '#,##0.00', { centro: true }),
        num(f.valor, FMT_MOEDA, { bold: true, fundo: COR_DESTAQUE_FUNDO }),
        txt(f.descartado ? 'Não (outlier)' : 'Sim', { centro: true, bold: !f.descartado }),
      ])
    })
  })
  const tableHeaderMem = 4
  zebra(aoaMem, tableHeaderMem)
  const lastRowMem = aoaMem.length
  const lastColMem = cabMem.length
  const wsMem = XLSX.utils.aoa_to_sheet(aoaMem)
  wsMem['!autofilter'] = { ref: `A${tableHeaderMem}:${XLSX.utils.encode_col(lastColMem - 1)}${lastRowMem}` }
  const widthsMem = larguraAuto(aoaMem, 10, 44)
  wsMem['!cols'] = widthsMem.map((w) => ({ wch: w }))
  wsMem['!merges'] = [0, 1, 2].map((r) => ({ s: { r, c: 0 }, e: { r, c: lastColMem - 1 } }))
  const rowHeightsMem: (number | null)[] = [34, 20, 20, 30]
  for (let r = 4; r < lastRowMem; r++) rowHeightsMem[r] = 22
  XLSX.utils.book_append_sheet(wb, wsMem, 'Memória de Cálculo')
  setups.push({ tableHeaderRow: tableHeaderMem, lastRow: lastRowMem, lastCol: lastColMem, colWidths: widthsMem, rowHeights: rowHeightsMem, planilhaDisplay: 'Memória de Cálculo' })

  // ================= Aba 3 — Metodologia =================
  const metodologia: string[] = [
    'FUNDAMENTAÇÃO LEGAL DA PESQUISA DE PREÇOS',
    '1. Lei nº 14.133/2021, Art. 23 — A pesquisa de preços será materializada em documento que conterá, no mínimo, preferencialmente 3 (três) fontes de referência, tais como: Painel de Preços, contratações similares de outros entes públicos (PNCP), pesquisa direta com fornecedores e atas de registro de preços.',
    '2. IN SEGES/ME nº 65/2021 — Disciplina o procedimento administrativo para a realização de pesquisa de preços. Estabelece o tratamento estatístico: cálculo de média/mediana, descarte de valores atípicos (outliers) e utilização da mediana quando houver grande dispersão dos preços coletados.',
    '',
    'MÉTODO UTILIZADO NESTE ORÇAMENTO',
    '- Preço de referência: MEDIANA das cotações válidas (adotada por robustez frente a valores discrepantes).',
    '- Descarte de outliers: método do intervalo interquartil (IQR). Considerados outliers os valores fora de Q1 - 1,5×IQR e Q3 + 1,5×IQR.',
    '- Coeficiente de variação: mede a dispersão relativa; valores acima de 25% indicam revisão das fontes.',
    '- Conformidade: cada item indica se atende o mínimo de 3 fontes distintas exigido pelo Art. 23.',
    '- Sobrepreço: sinalizados os itens em que alguma fonte válida ultrapassa o TETO = mediana × (1 + limite do gestor).',
    '- Referência de mercado externo: quando disponível, o sistema agrega múltiplas páginas da base oficial e calcula a MEDIANA de mercado (amostra externa).',
    '',
    'RASTREABILIDADE',
    'Cada preço coletado possui origem registrada (fonte, órgão/fornecedor, UF, data e valor). A aba "Memória de Cálculo" documenta individualmente as cotações utilizadas e as descartadas, permitindo auditoria e controle da Administração Pública.',
    '',
    'ATENÇÃO',
    'A conformidade com o mínimo de 3 fontes depende da disponibilidade de dados públicos para o código informado. Itens marcados como "NÃO" devem ter cotações complementares antes de instruir o processo.',
    '',
    'RESUMO DA ANÁLISE POR ITEM',
  ]
  orcamento.forEach((item, idx) => {
    const nFontes = item.fontesValidas !== undefined ? item.fontesValidas : (item.fontes || []).filter((f) => !f.descartado).length
    const cv = item.cv != null ? item.cv.toFixed(1) + '%' : 'n/d'
    const outlierCount = (item.fontes || []).filter((f) => f.descartado).length
    const medianaTxt = item.mediana != null ? fmtBRL(item.mediana) : 'n/d'
    const tetoTxt = item.tetoSobrepreco != null ? fmtBRL(item.tetoSobrepreco) : 'n/d'
    const limitePct = item.limiteSobrepreco != null ? Math.round(item.limiteSobrepreco * 100) : 25
    const mercadoTxt = item.referenciaMercado != null ? ' · Ref. mercado externo: ' + fmtBRL(item.referenciaMercado) : ' · Sem ref. de mercado externo'
    const incluidoTxt = item.adicionadoEm ? ' · Incluído em ' + new Date(item.adicionadoEm).toLocaleDateString('pt-BR') : ''
    metodologia.push('Item ' + (idx + 1) + ' — ' + (item.descricao || item.codigo || 'sem descrição') + ' (' + (item.codigo || 'sem código') + ')')
    metodologia.push('  Preço de referência (mediana): ' + medianaTxt + ' · Fontes válidas: ' + nFontes + ' · CV: ' + cv + ' · Outliers descartados: ' + outlierCount + (item.temSobrepreco ? ' · ⚠ possível sobrepreço' : ''))
    metodologia.push('  Teto de sobrepreço (mediana × ' + limitePct + '%): ' + tetoTxt + mercadoTxt)
    metodologia.push((nFontes >= 3 ? '  ✓ Conforme' : '  ✗ NÃO conforme') + ' — mínimo de 3 fontes (Lei 14.133/2021, Art. 23).' + incluidoTxt)
  })
  metodologia.push('', 'Documento gerado em ' + new Date().toLocaleString('pt-BR') + ' pelo Painel de Preços Inteligente.')

  const aoaMet: Cel[][] = [
    [tituloRelatorio(identificacao)],
    [hdr('Metodologia aplicada')],
  ]
  for (const m of metodologia) aoaMet.push([txt(m, { wrap: true })])
  const tableHeaderMet = 2
  const lastRowMet = aoaMet.length
  const lastColMet = 1
  const wsMet = XLSX.utils.aoa_to_sheet(aoaMet)
  const widthsMet = [95]
  wsMet['!cols'] = widthsMet.map((w) => ({ wch: w }))
  const rowHeightsMet: (number | null)[] = [34, 26]
  for (let r = 2; r < lastRowMet; r++) rowHeightsMet[r] = null
  XLSX.utils.book_append_sheet(wb, wsMet, 'Metodologia')
  setups.push({ tableHeaderRow: tableHeaderMet, lastRow: lastRowMet, lastCol: lastColMet, colWidths: widthsMet, rowHeights: rowHeightsMet, planilhaDisplay: 'Metodologia' })

  // ---- gera bytes e pós-processa com congelamento + impressão ----
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  const bytes = new Uint8Array(buf)
  const final = posProcessarXlsx(bytes, setups, identificacao)
  baixar(final, 'relatorio-pesquisa-de-precos.xlsx')
}