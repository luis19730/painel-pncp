import { ITEMS, type ItemRecord } from '@/lib/market-data'
import { getOpportunityStatus } from '@/lib/utils'

export interface ModalityFilters {
  periodo?: number
  modalidade?: string
  uf?: string
  municipio?: string
  orgao?: string
  situacao?: string
  valorMin?: number | null
  valorMax?: number | null
}

export type Situacao = 'Aberta' | 'Encerrada'

export function situacaoOf(data: string): Situacao {
  return getOpportunityStatus(data) === 'aberta' ? 'Aberta' : 'Encerrada'
}

export function applyFilters(items: ItemRecord[], f: ModalityFilters): ItemRecord[] {
  let list = items
  if (f.periodo && f.periodo > 0) {
    const cutoff = Date.now() - f.periodo * 86400000
    list = list.filter((i) => new Date(i.data).getTime() >= cutoff)
  }
  if (f.modalidade) list = list.filter((i) => i.modalidade === f.modalidade)
  if (f.uf) list = list.filter((i) => i.uf === f.uf)
  if (f.municipio) list = list.filter((i) => i.municipio === f.municipio)
  if (f.orgao) list = list.filter((i) => i.orgao === f.orgao)
  if (f.situacao) list = list.filter((i) => situacaoOf(i.data) === f.situacao)
  if (f.valorMin != null && f.valorMin > 0) list = list.filter((i) => i.valor >= f.valorMin!)
  if (f.valorMax != null && f.valorMax > 0) list = list.filter((i) => i.valor <= f.valorMax!)
  return list
}

export function mediana(values: number[]): number {
  if (values.length === 0) return 0
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

export interface ModalityStats {
  modalidade: string
  qtd: number
  valorTotal: number
  media: number
  mediana: number
  abertas: number
  encerradas: number
}

const MODALIDADE_ORDER = [
  'Pregão Eletrônico',
  'Pregão Presencial',
  'Concorrência',
  'Tomada de Preços',
  'Dispensa de Licitação',
  'Inexigibilidade',
  'Concurso',
  'Leilão',
  'Diálogo Competitivo',
]

export function buildModalityStats(items: ItemRecord[]): ModalityStats[] {
  const groups = new Map<string, ItemRecord[]>()
  for (const it of items) {
    const key = it.modalidade || 'Outros'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(it)
  }
  const list: ModalityStats[] = []
  for (const [modalidade, arr] of groups) {
    const vals = arr.map((i) => i.valor)
    const abertas = arr.filter((i) => situacaoOf(i.data) === 'Aberta').length
    list.push({
      modalidade,
      qtd: arr.length,
      valorTotal: vals.reduce((a, b) => a + b, 0),
      media: vals.reduce((a, b) => a + b, 0) / (vals.length || 1),
      mediana: mediana(vals),
      abertas,
      encerradas: arr.length - abertas,
    })
  }
  return list.sort((a, b) => {
    const ai = MODALIDADE_ORDER.indexOf(a.modalidade)
    const bi = MODALIDADE_ORDER.indexOf(b.modalidade)
    if (ai === -1 && bi === -1) return b.qtd - a.qtd
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}

export function uniqueSorted(items: ItemRecord[], key: (i: ItemRecord) => string): string[] {
  const set = new Set<string>()
  for (const it of items) {
    const v = key(it)
    if (v) set.add(v)
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

export function topBy(items: ItemRecord[], key: (i: ItemRecord) => string, n = 8): Array<{ label: string; qtd: number }> {
  const map = new Map<string, number>()
  for (const it of items) {
    const k = key(it) || 'Outros'
    map.set(k, (map.get(k) || 0) + 1)
  }
  return Array.from(map.entries())
    .map(([label, qtd]) => ({ label, qtd }))
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, n)
}

export function monthlyEvolution(items: ItemRecord[]): Array<{ mes: string; qtd: number; valor: number }> {
  const map = new Map<string, { qtd: number; valor: number }>()
  for (const it of items) {
    const d = new Date(it.data)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const cur = map.get(key) || { qtd: 0, valor: 0 }
    cur.qtd++
    cur.valor += it.valor
    map.set(key, cur)
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, v]) => {
      const d = new Date(key + '-01')
      return {
        mes: d.toLocaleString('pt-BR', { month: 'short' }),
        qtd: v.qtd,
        valor: v.valor,
      }
    })
}

export const ALL_ITEMS: ItemRecord[] = ITEMS
