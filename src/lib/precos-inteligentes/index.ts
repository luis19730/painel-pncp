import { formatCurrency } from '@/lib/utils'

export const API_BASE_URL = 'https://painel-precos-licitacoes.luis19730.workers.dev'

export const FONTE_LABEL: Record<string, string> = {
  pncp: 'PNCP',
  painel_precos: 'Painel de Preços',
  ata_registro: 'Ata de registro',
  pesquisa_direta: 'Pesquisa direta',
  compras_gov_pesquisa_preco: 'Compras.gov.br (API oficial)',
  manual: 'Cotação manual',
}

export type PrecoRecord = {
  fonte: string
  orgao?: string
  uf?: string
  data?: string
  fornecedor?: string
  municipio?: string
  modalidade?: string
  unidade?: string
  quantidade?: string | number
  valor: number
}

export type ItemCatalogo = {
  codigo_item: string | number
  descricao_item: string
  nome_grupo?: string
  nome_pdm?: string
}

export type MercadoInfo = {
  medianaMercado: number | null
  totalRegistros: number | null
  itens?: number
}

export type OrcamentoItem = {
  adicionadoEm: string
  codigo: string
  descricao: string
  unidade: string
  quantidade: number
  media: number
  mediana: number
  desvio: number
  cv: number
  n: number
  fontesValidas: number
  fontesDistintas: number
  limiteSobrepreco: number
  tetoSobrepreco: number
  temSobrepreco: boolean
  qtdSobrepreco: number
  referenciaMercado: number | null
  mercadoItens: number | null
  fontes: (PrecoRecord & { descartado: boolean })[]
}

export function fmtBRL(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return formatCurrency(v)
}

export function esc(s: unknown): string {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c
  })
}

export function quartil(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base])
  }
  return sorted[base]
}

export type CalculoStats = {
  n: number
  media: number
  mediana: number
  desvio: number
  cv: number
  outlierSet: Set<number>
  limites: { inferior: number; superior: number } | null
}

export function calcStats(precos: { valor: number }[]): CalculoStats | null {
  const valores = precos.map((p) => p.valor).filter((v) => Number.isFinite(v) && v > 0)
  if (valores.length < 2) return null

  const sorted = [...valores].sort((a, b) => a - b)
  const q1 = quartil(sorted, 0.25)
  const q3 = quartil(sorted, 0.75)
  const iqr = q3 - q1
  const low = q1 - 1.5 * iqr
  const high = q3 + 1.5 * iqr

  const outlierSet = new Set<number>()
  const validos: number[] = []
  precos.forEach((p, i) => {
    if (p.valor < low || p.valor > high) outlierSet.add(i)
    else validos.push(p.valor)
  })

  const n = validos.length
  const media = validos.reduce((a, b) => a + b, 0) / n
  const sortedValidos = [...validos].sort((a, b) => a - b)
  const mediana = quartil(sortedValidos, 0.5)
  const variancia = n > 1 ? validos.reduce((a, b) => a + Math.pow(b - media, 2), 0) / (n - 1) : 0
  const desvio = Math.sqrt(variancia)
  const cv = media ? (desvio / media) * 100 : 0

  return { n, media, mediana, desvio, cv, outlierSet, limites: { inferior: low, superior: high } }
}

export function countOutliers(valores: { valor: number }[]): number {
  const vs = valores.map((p) => p.valor).filter((v) => Number.isFinite(v) && v > 0)
  if (vs.length < 4) return 0
  const sorted = [...vs].sort((a, b) => a - b)
  const q1 = quartil(sorted, 0.25)
  const q3 = quartil(sorted, 0.75)
  const iqr = q3 - q1
  const low = q1 - 1.5 * iqr
  const high = q3 + 1.5 * iqr
  return vs.filter((v) => v < low || v > high).length
}