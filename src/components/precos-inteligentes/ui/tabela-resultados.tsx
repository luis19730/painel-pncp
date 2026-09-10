'use client'

import { ArrowUpDown, ArrowUp, ArrowDown, Eye, Download } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { fmtBRL, type PrecoRecord } from '@/lib/precos-inteligentes'
import { rotuloFonte } from '@/lib/precos-inteligentes/derivados'
import Button from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export type SortCfg = { chave: string; dir: 1 | -1 } | null

const COLUNAS: { chave: string; rotulo: string; alinhar: 'left' | 'right' | 'center' }[] = [
  { chave: 'fornecedor', rotulo: 'Produto / Fornecedor', alinhar: 'left' },
  { chave: 'uf', rotulo: 'UF', alinhar: 'center' },
  { chave: 'municipio', rotulo: 'Município', alinhar: 'left' },
  { chave: 'data', rotulo: 'Data', alinhar: 'center' },
  { chave: 'quantidade', rotulo: 'Quantidade', alinhar: 'right' },
  { chave: 'valor', rotulo: 'Preço unitário', alinhar: 'right' },
  { chave: 'modalidade', rotulo: 'Modalidade', alinhar: 'center' },
]

const OCULTABEIS = ['municipio', 'quantidade', 'modalidade']

export default function ResultsTable({
  records,
  precosIndices,
  precos,
  outlierSet,
  sort,
  onSortToggable,
  selecionados,
  onToggleSelecao,
  onCopiar,
  colunasOcultas,
  onToggleColuna,
}: {
  records: PrecoRecord[]
  precosIndices: number[]
  precos: PrecoRecord[]
  outlierSet: Set<number> | null
  sort: SortCfg
  onSortToggable: (chave: string) => void
  selecionados: Set<number>
  onToggleSelecao: (i: number) => void
  onCopiar: (records: { origem: string; valor: number }[]) => void
  colunasOcultas: Set<string>
  onToggleColuna: (chave: string) => void
}) {
  const todosSelecionados = precosIndices.length > 0 && precosIndices.every((i) => selecionados.has(i))
  const limited = colunasOcultas.size > 0
  const [menuColunas, setMenuColunas] = useState(false)

  return (
    <section className="card p-0 overflow-hidden">
      {/* cabeçalho da tabela */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Registros encontrados</h2>
          <p className="text-xs text-slate-400">{precosIndices.length} registro(s) — clique para selecionar e comparar</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => onCopiar(records.map((p, idx2) => ({ origem: p.orgao || '', valor: p.valor })))}>
            <Download className="w-4 h-4" /> Exportar CSV
          </Button>
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setMenuColunas((m) => !m)}>Colunas</Button>
            {menuColunas && (
              <div className="absolute right-0 top-full mt-1 z-30 w-48 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-2">
                {OCULTABEIS.map((c) => {
                  const visivel = !colunasOcultas.has(c)
                  return (
                    <label key={c} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                      <input type="checkbox" checked={visivel} onChange={() => onToggleColuna(c)} className="accent-blue-600" />
                      {COLUNAS.find((x) => x.chave === c)?.rotulo}
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 sticky top-0 z-10">
              <th className="px-3 py-2.5">
                <input
                  type="checkbox"
                  className="accent-blue-600"
                  checked={todosSelecionados}
                  onChange={() => {
                    precosIndices.forEach((i) => onToggleSelecao(i))
                  }}
                  aria-label="Selecionar todos"
                />
              </th>
              {COLUNAS.map((col) => {
                if (colunasOcultas.has(col.chave)) return null
                const ativo = sort?.chave === col.chave
                const direcao = ativo ? sort!.dir : null
                return (
                  <th
                    key={col.chave}
                    onClick={() => onSortToggable(col.chave)}
                    className={cn(
                      'px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300 cursor-pointer select-none hover:text-primary',
                      col.alinhar === 'right' ? 'text-right' : col.alinhar === 'center' ? 'text-center' : 'text-left'
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.rotulo}
                      {direcao === 1 ? <ArrowDown className="w-3 h-3" /> : direcao === -1 ? <ArrowUp className="w-3 h-3" /> : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                    </span>
                  </th>
                )
              })}
              <th className="px-3 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-300">Situação / ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
            {records.length === 0 && (
              <tr>
                <td colSpan={COLUNAS.length + 2} className="px-4 py-8 text-center text-sm text-slate-400">
                  Nenhum registro corresponde aos filtros atuais.
                </td>
              </tr>
            )}
            {records.map((p, idx) => {
              const indiceReal = precosIndices[idx]
              const ehOutlier = !!outlierSet && outlierSet.has(indiceReal)
              const selecionado = selecionados.has(indiceReal)
              return (
                <tr
                  key={idx}
                  onClick={() => onToggleSelecao(indiceReal)}
                  className={cn(
                    'cursor-pointer transition-colors',
                    selecionado ? 'bg-blue-50/70 dark:bg-blue-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40',
                    ehOutlier ? 'opacity-60' : ''
                  )}
                >
                  <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="accent-blue-600" checked={selecionado} onChange={() => onToggleSelecao(indiceReal)} aria-label="Selecionar registro" />
                  </td>
                  <td className="px-3 py-2.5 text-left">
                    <div className="font-medium text-slate-800 dark:text-slate-100">{p.fornecedor || p.orgao || '—'}</div>
                    {p.fornecedor && p.orgao && <div className="text-xs text-slate-400">{p.orgao}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-center"><span className="font-mono text-xs">{p.uf || '—'}</span></td>
                  {!colunasOcultas.has('municipio') && <td className="px-3 py-2.5 text-left text-slate-600 dark:text-slate-300">{p.municipio || '—'}</td>}
                  <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300">{p.data || '—'}</td>
                  {!colunasOcultas.has('quantidade') && <td className="px-3 py-2.5 text-right text-slate-600 dark:text-slate-300">{p.quantidade || '—'}</td>}
                  <td className="px-3 py-2.5 text-right font-semibold text-slate-900 dark:text-white">{fmtBRL(p.valor)}</td>
                  {!colunasOcultas.has('modalidade') && (
                    <td className="px-3 py-2.5 text-center">
                      <span className="text-xs">{p.modalidade || '—'}</span>
                    </td>
                  )}
                  <td className="px-3 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1.5 justify-end">
                      {ehOutlier ? <Badge variant="danger">fora da curva</Badge> : selecionado ? <Badge variant="success">selecionado</Badge> : <Badge variant="accent">ativo</Badge>}
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {limited && <p className="px-4 py-2 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40">Algumas colunas ocultas. Use "Colunas" para reexibir.</p>}
    </section>
  )
}

export function detalhesPreco(p: PrecoRecord) {
  return [
    ['Produto / Serviço', p.orgao],
    ['Fornecedor', p.fornecedor],
    ['Órgão', p.orgao],
    ['Município', p.municipio],
    ['Estado (UF)', p.uf],
    ['Data', p.data],
    ['Quantidade', p.quantidade],
    ['Preço unitário', fmtBRL(p.valor)],
    ['Modalidade', p.modalidade],
    ['Fonte', rotuloFonte(p.fonte)],
  ].filter((x) => x[1] != null && x[1] !== '') as [string, string][]
}