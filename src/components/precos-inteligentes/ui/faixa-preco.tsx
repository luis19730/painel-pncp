'use client'

import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FaixaPreco } from '@/lib/precos-inteligentes/derivados'
import { fmtBRL } from '@/lib/precos-inteligentes'

export default function PriceRange({ faixa }: { faixa: FaixaPreco }) {
  const [aberto, setAberto] = useState(false)

  return (
    <section className="card p-5">
      <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Faixa de preço identificada</h2>
      <p className="text-xs text-slate-400 mb-4">Principais preços encontrados na sua pesquisa.</p>

      {/* Faixa principal */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <span className="text-xl md:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{fmtBRL(faixa.inicio)}</span>
          <span className="text-xs text-slate-400">até</span>
          <span className="text-xl md:text-2xl font-bold text-red-600 dark:text-red-400">{fmtBRL(faixa.fim)}</span>
        </div>

        {/* Barra de distribuição */}
        <div className="mt-4 flex items-center gap-1 h-3">
          {faixa.qtdPonto.length > 0 && (
            faixa.qtdPonto.map((q, i) => {
              const max = Math.max(...faixa.qtdPonto, 1)
              const h = Math.max(12, Math.round((q / max) * 100))
              return <div key={i} style={{ height: `${h}%` }} className={cn('flex-1 rounded-sm transition-all', q > 0 ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700')} />
            })
          )}
        </div>

        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
          <span>{fmtBRL(faixa.inicio)}</span>
          <span className="hidden sm:inline text-xs">{fmtBRL(faixa.mediana ?? 0)} (mediana)</span>
          <span>{fmtBRL(faixa.fim)}</span>
        </div>
      </div>

      {/* Passos */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {faixa.passos.map((p) => (
          <div key={p.label} className="rounded-lg border border-slate-100 dark:border-slate-800 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{p.label}</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{p.valor}</div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-slate-400">Faixa calculada com base nos preços encontrados.</p>

      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
      >
        <HelpCircle className="w-3.5 h-3.5" /> Como calculamos?
      </button>
      {aberto && (
        <div className="mt-3 rounded-lg bg-primary-soft dark:bg-blue-500/10 p-4 text-sm text-slate-600 dark:text-slate-300 space-y-2">
          <p><strong>Preço de referência:</strong> usamos a <strong>mediana</strong> (valor central), que resiste melhor a preços muito baixos ou muito altos.</p>
          <p><strong>Descarte de valores atípicos:</strong> aplicamos o método do intervalo interquartil (IQR) para remover outliers antes de calcular a referência.</p>
          <p><strong>Confiabilidade:</strong> quanto mais registros e menor a variação entre eles, maior a confiança no resultado.</p>
          <p className="text-xs text-slate-400">Fundamento: Lei 14.133/2021, Art. 23 e IN SEGES/ME nº 65/2021.</p>
        </div>
      )}
    </section>
  )
}