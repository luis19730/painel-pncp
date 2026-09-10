'use client'

import { useState } from 'react'
import { CheckCircle2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Confianca } from '@/lib/precos-inteligentes/derivados'

export default function ConfidenceBadge({ confianca }: { confianca: Confianca }) {
  const [aberto, setAberto] = useState(false)

  return (
    <section className="card p-5">
      <div className="flex items-center gap-3">
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center text-xl', confianca.fundo)}>
          {confianca.emoji}
        </div>
        <div className="flex-1">
          <p className={cn('text-base font-semibold', confianca.cor)}>
            <CheckCircle2 className="inline w-4 h-4 mr-1 -mt-0.5" />
            {confianca.rotulo}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{confianca.descricao}</p>
        </div>
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          className="text-slate-400 hover:text-primary shrink-0"
          aria-label="Explicar confiabilidade"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      {/* Barra de confiança */}
      <div className="mt-4 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', confianca.barra)}
          style={{ width: confianca.nivel === 'alta' ? '88%' : confianca.nivel === 'moderada' ? '55%' : '25%' }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        <span>Baixa</span>
        <span>Moderada</span>
        <span>Alta</span>
      </div>

      {aberto && (
        <div className="mt-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 p-4 text-sm text-slate-600 dark:text-slate-300">
          Atribuímos a confiabilidade combinando duas coisas: <strong>quantidade de registros</strong> encontrados e a <strong>dispersão</strong> dos preços (quão próximos estão uns dos outros).
          Quanto mais dados e menos variação, maior a confiança de que o valor de referência reflete o mercado.
          {confianca.nivel === 'alta' && ' No seu resultado, a combinação é boa — pode usar com segurança como referência.'}
          {confianca.nivel === 'moderada' && ' O resultado é útil, mas vale confirmar complementando com mais fontes ou cotações diretas.'}
          {confianca.nivel === 'baixa' && ' O resultado é apenas indicativo — busque complementar as fontes antes de fechar o orçamento.'}
        </div>
      )}
    </section>
  )
}