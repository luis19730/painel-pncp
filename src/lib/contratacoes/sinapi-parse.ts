// ============================================================================
// Parser da planilha SINAPI (client-side).
//
// Lê o arquivo .xlsx oficial da Caixa carregado pelo usuário usando `xlsx`
// (SheetJS) e retorna os itens normalizados. Nenhum valor é inventado: os
// números vêm exatamente das células da planilha. O usuário confirma UF e
// competência no upload (metadata da base) — não adivinhamos.
//
// A planilha oficial tem colunas que variam conforme o arquivo (sintético /
// manual de composições / versão). Por isso fazemos DETECÇÃO AUTOMÁTICA dos
// cabeçalhos e permitimos correção manual (binder de colunas) na UI.
// ============================================================================

import * as XLSX from 'xlsx'

export interface SinapiRawItem {
  codigo: string
  descricao: string
  unidade: string
  tipo: 'insumo' | 'mao_de_obra' | 'equipamento' | 'composicao' | 'outros'
  custo_nao_deson: number | null
  custo_deson: number | null
  origem: string | null
}

export interface ColumnMap {
  codigo: string | null
  descricao: string | null
  unidade: string | null
  custoNaodeson: string | null
  custoDeson: string | null
  tipo: string
}

export interface SinapiParseResult {
  ok: boolean
  sheetNames: string[]
  colunasDisponiveis: string[]
  totalLinhas: number
  preview: SinapiRawItem[]
  error?: string
}

// Palavras-chave para detecção automática de colunas (normalizadas).
function norm(s: string): string {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function contains(hay: string, needles: string[]): boolean {
  const h = norm(hay)
  return needles.some((n) => h.includes(n))
}

// Palavras que indicam tipo de linha (4ª coluna da planilha SINAPI).
const TIPO_RULES: Array<{ label: string; needles: string[]; tipo: SinapiRawItem['tipo'] }> = [
  { label: 'Mão de obra', needles: ['mao de obra', 'cha', 'encargo', 'cbo'], tipo: 'mao_de_obra' },
  { label: 'Equipamento', needles: ['equipamento', 'chp'], tipo: 'equipamento' },
  { label: 'Insumo', needles: ['insumo', 'chi'], tipo: 'insumo' },
  { label: 'Composição', needles: ['composicao', 'chc', 'sintetic'], tipo: 'composicao' },
]

export function detectTipoCell(raw: string): SinapiRawItem['tipo'] {
  const s = norm(raw)
  if (!s) return 'outros'
  for (const rule of TIPO_RULES) {
    if (rule.needles.some((n) => s.includes(n))) return rule.tipo
  }
  return 'outros'
}

/** Converte célula (número ou string com vírgula) para número. */
function toNumber(v: unknown): number | null {
  if (v == null || v === '') return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const s = String(v).trim()
  if (!s) return null
  // Formato BR: "1.234,56" -> 1234.56 ; também aceita ponto decimal.
  const cleaned = s.replace(/\./g, '').replace(',', '.')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

/** Lê o arquivo xlsx e devolve um workbook. */
export function readWorkbook(arrayBuffer: ArrayBuffer): XLSX.WorkBook {
  const wb = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' })
  return wb
}

/** Detecta automaticamente o mapa de colunas a partir da primeira linha útil. */
export function detectColumns(headers: string[], rows: unknown[][]): ColumnMap | null {
  // Caixa SINAPI padrão (planilhas de composições/insumos):
  // 0: CÓDIGO, 1: DESCRIÇÃO, 2: UNIDADE, 3: [mão de obra|equipamento|insumo|composição], 4+: preços
  let tipoIdx = -1
  if (rows.length > 0) {
    const firstRow = rows[0] || []
    for (let i = 0; i < firstRow.length; i++) {
      const t = detectTipoCell(String(firstRow[i]))
      if (t !== 'outros' && ['mao_de_obra', 'equipamento', 'insumo', 'composicao'].includes(t)) {
        tipoIdx = i
        break
      }
    }
  }

  // Se existe a coluna de tipo, usa o layout clássico SINAPI.
  if (tipoIdx >= 0) {
    const idx = tipoIdx
    return {
      codigo: headers[0] != null ? String(headers[0]) : null,
      descricao: headers[1] != null ? String(headers[1]) : null,
      unidade: headers[2] != null ? String(headers[2]) : null,
      // Preço não desonerado tipicamente uma coluna após o tipo; desonerado depois.
      custoNaodeson: headers[idx + 1] != null ? String(headers[idx + 1]) : null,
      custoDeson: headers[idx + 2] != null ? String(headers[idx + 2]) : null,
      tipo: String(headers[idx]),
    }
  }

  // Fallback: busca por cabeçalhos nomeados.
  const findIdx = (needles: string[]) => {
    const i = headers.findIndex((h) => h != null && contains(String(h), needles))
    return i >= 0 ? String(headers[i]) : null
  }
  const codigo = findIdx(['codigo', 'código', 'cod'])
  const descricao = findIdx(['descricao', 'descrição']) || findIdx(['nome', 'material', 'servico'])
  const unidade = findIdx(['unidade', 'und', 'und.'])
  const naodeson = findIdx(['nao desoner', 'não desoner', 'sem desoner', 'sem deson', 'preco'])
  const deson = findIdx(['desoner', 'com deson', 'custo total desoner', 'menos desoner'])
  if (!descricao) return null

  return {
    codigo: codigo,
    descricao,
    unidade,
    custoNaodeson: naodeson,
    custoDeson: deson,
    tipo: tipoIdx >= 0 ? String(headers[tipoIdx]) : '',
  }
}

export function parseSheet(
  worksheet: XLSX.WorkSheet,
  _map?: ColumnMap | null,
  limitPreview = 20
): { headerNames: string[]; preview: SinapiRawItem[]; rawRows: unknown[][] } {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, blankrows: false, defval: '' })
  // Encontra a linha de cabeçalho (primeira linha com descrição reconhecível).
  let headerIdx = 0
  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const row = rows[r]
    const joined = row.map((c) => norm(String(c))).join(' ')
    if (joined.includes('descric') || joined.includes('descri')) {
      headerIdx = r
      break
    }
  }
  const headerNames = (rows[headerIdx] || []).map((c) => String(c))
  const data = rows.slice(headerIdx + 1).filter((row) => {
    const desc = String(row[1] || '').trim()
    const cod = String(row[0] || '').trim()
    return (desc && !norm(desc).includes('descric')) || norm(cod) !== ''
  })

  const preview = data.slice(0, limitPreview).map((row) => ({
    codigo: String(row[0] || '').trim(),
    descricao: String(row[1] || '').trim(),
    unidade: String(row[2] || '').trim(),
    tipo: row[3] != null ? detectTipoCell(String(row[3])) : 'outros',
    custo_nao_deson: toNumber(row[4]),
    custo_deson: toNumber(row[5]),
    origem: null,
  }))

  return { headerNames, preview, rawRows: data }
}
