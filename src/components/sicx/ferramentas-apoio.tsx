'use client'

import { useState } from 'react'
import { ChevronDown, Wrench } from 'lucide-react'
import Ferramentas from '@/components/sicx/ferramentas'
import GeradorCredenciamento from '@/components/sicx/credenciamento-gerador'
import Oportunidades from '@/components/sicx/oportunidades'
import type { SicxNorma } from '@/lib/sicx/types'
import { cn } from '@/lib/utils'

/**
 * Ferramentas avançadas do SICX (Parte 7), recolhidas por padrão para manter a
 * página compacta. O conteúdo só monta (e busca dados) quando o usuário abre.
 */
export default function FerramentasApoio({ normas }: { normas: SicxNorma[] }) {
  const [aberto, setAberto] = useState(false)

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="flex w-full items-center justify-between gap-2 p-3.5 text-left"
      >
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <Wrench className="w-4 h-4 text-primary" /> Ferramentas de apoio
          <span className="text-[11px] font-normal text-slate-400">pesquisa de preços, minha oferta, contratações, radar, monitor de CNPJ, minuta</span>
        </span>
        <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform', aberto && 'rotate-180')} />
      </button>

      {aberto && (
        <div className="space-y-6 border-t border-slate-100 dark:border-slate-800 p-4">
          <Ferramentas normas={normas} />
          <GeradorCredenciamento />
          <Oportunidades />
        </div>
      )}
    </section>
  )
}
