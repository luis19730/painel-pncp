'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PrecoRecord } from '@/lib/precos-inteligentes'
import { fmtBRL } from '@/lib/precos-inteligentes'

const LINHAS: [string, (p: PrecoRecord) => string][] = [
  ['Produto / Fornecedor', (p) => p.fornecedor || '—'],
  ['Órgão', (p) => p.orgao || '—'],
  ['Município', (p) => p.municipio || '—'],
  ['Estado (UF)', (p) => p.uf || '—'],
  ['Modalidade', (p) => p.modalidade || '—'],
  ['Data', (p) => p.data || '—'],
  ['Quantidade', (p) => String(p.quantidade ?? '—')],
  ['Preço unitário', (p) => fmtBRL(p.valor)],
]

export default function ComparisonPanel({
  selecionados,
  precos,
  precosIndices,
  onFechar,
}: {
  selecionados: Set<number>
  precos: PrecoRecord[]
  precosIndices: number[]
  onFechar: () => void
}) {
  const registros = precosIndices.filter((i) => selecionados.has(i)).map((idx2) => ({ idx: idx2, p: precos[idx2] }))
  const valores = registros.map((r) => r.p.valor).sort((a, b) => a - b)
  const menor = valores[0]
  const maior = valores[valores.length - 1]
  const mediana = valores[Math.floor(valores.length / 2)]

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Comparação de registros</h2>
          <p className="text-xs text-slate-400">Destaques: menor, mediano e maior preço selecionados.</p>
        </div>
        <button type="button" onClick={onFechar} className="text-slate-400 hover:text-red-600" aria-label="Fechar comparação">
          <X className="w-4 h-4" />
        </button>
      </div>

      {registros.length === 0 ? (
        <p className="text-sm text-slate-400">Selecione ao menos 2 registros na tabela para comparar.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                <th className="px-3 py-2 text-left">Atributo</th>
                {registros.map((r) => {
                  const ehMenor = r.p.valor === menor
                  const ehMaior = r.p.valor === maior
                  const ehMed = r.p.valor === mediana && !ehMenor && !ehMaior
                  const qtdMed = valores.filter((v) => v === mediana).length
                  const estilo = ehMenor ? ' text-emerald-600' : ehMaior ? ' text-red-600' : ehMed && qtdMed === 1 ? ' text-blue-600' : ''
                  return <th key={r.idx} className={cn('px-3 py-2 text-right text-xs', estilo)}>{r.p.orgao || 'Registro ' + (r.idx + 1)}</th>
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {LINHAS.map(([rotulo, fn]) => (
                <tr key={rotulo}>
                  <td className="px-3 py-2 text-slate-500 font-medium">{rotulo}</td>
                  {registros.map((r) => {
                    const ehMenor = r.p.valor === menor
                    const ehMaior = r.p.valor === maior
                    const ehMed = r.p.valor === mediana && !ehMenor && !ehMaior
                    const qtdMed = valores.filter((v) => v === mediana).length
                    const estilo = ehMenor ? ' text-emerald-700 font-bold' : ehMaior ? ' text-red-600 font-bold' : ehMed && qtdMed === 1 ? ' text-blue-600 font-semibold' : ''
                    return <td key={r.idx} className={cn('px-3 py-2 text-right', estilo)}>{fn(r.p)}</td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {registros.length > 1 && (
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1" /> Menor preço</span>
          <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 mr-1" /> Preço mediano</span>
          <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 mr-1" /> Maior preço</span>
        </div>
      )}
    </section>
  )
}