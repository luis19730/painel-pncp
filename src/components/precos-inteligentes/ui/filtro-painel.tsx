'use client'

import { SlidersHorizontal, X, FilterX } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export type FiltrosAtivos = {
  texto: string
  uf: string
  fonte: string
  modalidade: string
  fornecedor: string
  municipio: string
  min: string
  max: string
}

export const FILTROS_VAZIO: FiltrosAtivos = { texto: '', uf: '', fonte: '', modalidade: '', fornecedor: '', municipio: '', min: '', max: '' }

export default function FiltersPanel({
  filtros,
  onChange,
  ufs,
  fontes,
  modalidades,
  fornecedores,
  municipios,
  count,
}: {
  filtros: FiltrosAtivos
  onChange: (f: FiltrosAtivos) => void
  ufs: string[]
  fontes: string[]
  modalidades: string[]
  fornecedores: string[]
  municipios: string[]
  count: number
}) {
  const [aberto, setAberto] = useState(false)

  const set = (patch: Partial<FiltrosAtivos>) => onChange({ ...filtros, ...patch })
  const limpar = () => onChange(FILTROS_VAZIO)

  // chips de filtros ativos
  const chips: { rotulo: string; campo: keyof FiltrosAtivos; valor: string }[] = []
  const ativos = Object.entries(filtros).filter(([, v]) => v) as [keyof FiltrosAtivos, string][]
  ativos.forEach(([campo, v]) => {
    const rotulos: Record<keyof FiltrosAtivos, string> = {
      texto: 'Busca',
      uf: 'UF',
      fonte: 'Fonte',
      modalidade: 'Modalidade',
      fornecedor: 'Fornecedor',
      municipio: 'Município',
      min: 'Preço mín.',
      max: 'Preço máx.',
    }
    chips.push({ rotulo: rotulos[campo], campo, valor: v })
  })

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-primary transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filtros
          <span className="text-xs font-medium text-slate-400">({ativos.length || '0'})</span>
        </button>
        {ativos.length > 0 && (
          <button type="button" onClick={limpar} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 transition-colors">
            <FilterX className="w-3.5 h-3.5" /> Limpar filtros
          </button>
        )}
      </div>

      {/* chips de filtros ativos */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {chips.map((c) => (
            <Badge key={c.campo} variant="primary">
              {c.rotulo}: {c.valor}
              <button type="button" onClick={() => set({ [c.campo]: '' } as Partial<FiltrosAtivos>)} className="ml-1 hover:text-red-500" aria-label={`Remover filtro ${c.rotulo}`}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {aberto && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Órgão / UASG">
            <input
              className={inputCls}
              type="text"
              placeholder="Filtrar por órgão..."
              value={filtros.texto}
              onChange={(e) => set({ texto: e.target.value })}
            />
          </Field>
          <Field label="Estado (UF)">
            <select className={inputCls} value={filtros.uf} onChange={(e) => set({ uf: e.target.value })}>
              <option value="">Todos</option>
              {ufs.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>
          <Field label="Município">
            <input className={inputCls} type="text" placeholder="Filtrar por município..." list="filtro-mun" value={filtros.municipio} onChange={(e) => set({ municipio: e.target.value })} />
            <datalist id="filtro-mun">
              {municipios.map((m) => <option key={m} value={m} />)}
            </datalist>
          </Field>
          <Field label="Fonte">
            <select className={inputCls} value={filtros.fonte} onChange={(e) => set({ fonte: e.target.value })}>
              <option value="">Todas</option>
              {fontes.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="Modalidade">
            <select className={inputCls} value={filtros.modalidade} onChange={(e) => set({ modalidade: e.target.value })}>
              <option value="">Todas</option>
              {modalidades.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Fornecedor">
            <input className={inputCls} type="text" placeholder="Nome do fornecedor..." list="filtro-forn" value={filtros.fornecedor} onChange={(e) => set({ fornecedor: e.target.value })} />
            <datalist id="filtro-forn">
              {fornecedores.map((f) => <option key={f} value={f} />)}
            </datalist>
          </Field>
          <Field label="Faixa de preço (R$) de">
            <input className={inputCls} type="number" min={0} step={0.01} placeholder="Mínimo" value={filtros.min} onChange={(e) => set({ min: e.target.value })} />
          </Field>
          <Field label="até">
            <input className={inputCls} type="number" min={0} step={0.01} placeholder="Máximo" value={filtros.max} onChange={(e) => set({ max: e.target.value })} />
          </Field>
        </div>
      )}

      <p className={cn('mt-3 text-xs text-slate-400', !aberto && 'hidden')}>
        {count > 0 ? <>{count} registro{count === 1 ? '' : 's'} após aplicar os filtros.</> : 'Nenhum registro corresponde aos filtros atuais.'}
      </p>
    </section>
  )
}

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  )
}