'use client'

import { ExternalLink, ShieldCheck } from 'lucide-react'
import type { PrecoRecord } from '@/lib/precos-inteligentes'
import Modal from './modal'
import { detalhesPreco } from './tabela-resultados'

export default function RecordDrawer({ registro, onFechar }: { registro: PrecoRecord | null; onFechar: () => void }) {
  if (!registro) return null
  const linhas = detalhesPreco(registro)

  return (
    <Modal aberto={!!registro} onFechar={onFechar} titulo="Detalhes do registro">
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {linhas.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">{k}</dt>
            <dd className="text-sm text-slate-800 dark:text-slate-200">{v}</dd>
          </div>
        ))}
      </dl>

      {/* Origem dos dados */}
      <div className="mt-5 rounded-lg bg-slate-50 dark:bg-slate-800/60 p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Origem oficial dos dados</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Valor coletado do Módulo Pesquisa de Preço do Compras.gov.br (base pública de contratações do Governo Federal) —
            não é um valor digitado manualmente.
          </p>
        </div>
      </div>

      <button
        type="button"
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
        onClick={() => window.open('https://www.gov.br/compras/pt-br', '_blank', 'noopener')}
      >
        Ver contratação original <ExternalLink className="w-4 h-4" />
      </button>
    </Modal>
  )
}