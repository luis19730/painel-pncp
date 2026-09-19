'use client'

import { useState } from 'react'
import { Search, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ItemCatalogo } from '@/lib/precos-inteligentes'

const EXEMPLOS = ['Notebook', 'Ar-condicionado 12.000 BTUs', 'Serviço de limpeza', 'Material de escritório', 'Veículo']

export default function SearchHero({
  tipoItem,
  onTipoChange,
  termo,
  onTermo,
  sugestoes,
  suggestOpen,
  suggestIndex,
  onSelectSugestao,
  onEnterSugestao,
  onKeyNav,
  buscando,
  onBuscar,
  onInfo,
}: {
  tipoItem: 'material' | 'servico'
  onTipoChange: (t: 'material' | 'servico') => void
  termo: string
  onTermo: (t: string) => void
  sugestoes: ItemCatalogo[]
  suggestOpen: boolean
  suggestIndex: number
  onSelectSugestao: (i: number) => void
  onEnterSugestao: (i: number) => void
  onKeyNav: (dir: 1 | -1) => void
  buscando: boolean
  onBuscar: () => void
  onInfo: () => void
}) {
  const [focando, setFocando] = useState(false)

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-blue-50 via-white to-white dark:from-slate-900 dark:to-slate-900 p-6 md:p-10">
      <div className="max-w-2xl">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary dark:bg-primary/15 dark:text-blue-300 px-3 py-1 text-xs font-bold uppercase tracking-wider mb-4">
          <Sparkles className="w-3.5 h-3.5" /> Pesquisa de Preços Inteligente
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold font-display text-slate-900 dark:text-white mb-3">
          O que você está procurando?
        </h1>
        <p className="text-base md:text-lg text-slate-500 dark:text-slate-400 mb-5">
          Pesquise produtos ou serviços e descubra os preços praticados em contratações públicas — em poucos minutos e sem treinamento.
        </p>

        {/* Alternância material/serviço */}
        <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 mb-4 text-sm font-medium">
          <button
            type="button"
            onClick={() => onTipoChange('material')}
            className={cn('rounded-lg px-4 py-1.5 transition-all', tipoItem === 'material' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700')}
          >
            Material
          </button>
          <button
            type="button"
            onClick={() => onTipoChange('servico')}
            className={cn('rounded-lg px-4 py-1.5 transition-all', tipoItem === 'servico' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700')}
          >
            Serviço
          </button>
        </div>

        {/* Campo de busca grande */}
        <div className="relative" onFocus={() => setFocando(true)} onBlur={() => setFocando(false)}>
          <div className={cn(
            'flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 border-2 transition-all overflow-visible',
            focando ? 'border-primary shadow-lg shadow-primary/10' : 'border-slate-200 dark:border-slate-700'
          )}>
            <Search className="w-5 h-5 text-slate-400 ml-4 shrink-0" />
            <input
              autoFocus
              type="text"
              value={termo}
              onChange={(e) => onTermo(e.target.value)}
              onKeyDown={(e) => {
                if (!suggestOpen) return
                if (e.key === 'ArrowDown') { e.preventDefault(); onKeyNav(1) }
                else if (e.key === 'ArrowUp') { e.preventDefault(); onKeyNav(-1) }
                else if (e.key === 'Enter' && suggestIndex >= 0) { e.preventDefault(); onEnterSugestao(suggestIndex) }
                else if (e.key === 'Enter') { e.preventDefault(); onBuscar() }
                else if (e.key === 'Escape') { setFocando(false) }
              }}
              onKeyPress={(e) => { if (e.key === 'Enter' && suggestIndex < 0) { e.preventDefault(); onBuscar() } }}
              placeholder="Digite um produto ou serviço..."
              className="flex-1 py-3.5 text-base bg-transparent outline-none placeholder:text-slate-400"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={onBuscar}
              disabled={buscando}
              className={cn(
                'mr-2 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all',
                'hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60'
              )}
            >
              <Search className="w-4 h-4" /> {buscando ? 'Pesquisando...' : 'Pesquisar preços'}
            </button>
          </div>

          {/* Sugestões */}
          {suggestOpen && sugestoes.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 z-30 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
              <ul className="max-h-64 overflow-auto">
                {sugestoes.map((it, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); onSelectSugestao(i) }}
                      className={cn(
                        'w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left',
                        i === suggestIndex ? 'bg-primary-soft dark:bg-blue-500/10 text-primary dark:text-blue-200' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                      )}
                    >
                      <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{it.descricao_item}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Exemplos */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400">Experimente:</span>
          {EXEMPLOS.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => onTermo(ex)}
              className="text-xs rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 text-slate-500 dark:text-slate-400 hover:border-primary hover:text-primary transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>

        <p className="mt-4 text-xs text-slate-400">
          <button type="button" onClick={onInfo} className="underline decoration-dotted hover:text-primary">Como funciona?</button> · Preços oficiais do Compras.gov.br.
        </p>
      </div>
    </section>
  )
}