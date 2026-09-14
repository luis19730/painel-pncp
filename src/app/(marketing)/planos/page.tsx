'use client'

import { useEffect, useState } from 'react'
import { Check, Sparkles, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import PlanCtaLink from '@/components/marketing/plan-cta-link'
import { track } from '@/lib/analytics'
import { CICLOS, PLANOS, precoCiclo, precoMensalEquivalente, formatReais } from '@/lib/asaas/types'
import type { CicloId } from '@/lib/asaas/types'

const FEATURES: Record<string, string[]> = {
  pro: [
    'Buscas avançadas ilimitadas',
    'Radar personalizado',
    'Alertas (até 20)',
    'Score de oportunidade',
    'Histórico de preços',
    'Favoritos ilimitados',
    'Análise de concorrentes',
    'Auxílio na Montagem de Processo',
    'Suporte por e-mail',
  ],
  empresa: [
    'Múltiplas empresas',
    'Tudo do plano Pro ilimitado',
    'IA para análise de editais',
    'Relatórios exportáveis',
    'Alertas ilimitados',
    'Gerenciamento de equipe',
    'Suporte prioritário',
    'Auxílio na Montagem de Processo',
    'Integração via API',
  ],
}

export default function PlanosPage() {
  const [ciclo, setCiclo] = useState<CicloId>('mensal')

  // Evento de funil: visualização da página de planos (PLAN_VIEW).
  useEffect(() => {
    track({ event: 'plan_view', page: 'planos' })
  }, [])

  return (
    <div className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <p className="text-sm font-bold text-primary dark:text-primary uppercase tracking-wider mb-3">Planos e preços</p>
          <h1 className="text-4xl md:text-5xl font-extrabold font-display text-slate-900 dark:text-white mb-4">
            Escolha o plano ideal para sua empresa
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            Teste grátis por 15 dias. Depois escolha o plano ideal para sua empresa.
          </p>
        </div>

        {/* Seletor de periodicidade */}
        <div className="flex flex-wrap justify-center gap-2 mb-14">
          {CICLOS.map((c) => {
            const ativo = ciclo === c.id
            return (
              <button
                key={c.id}
                onClick={() => setCiclo(c.id)}
                className={cn(
                  'rounded-xl px-5 py-2.5 text-sm font-semibold border transition-all',
                  ativo
                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary/40'
                )}
              >
                {c.label}
                {c.descontoPct > 0 && (
                  <span className={cn('ml-1.5 text-xs font-bold', ativo ? 'text-white/90' : 'text-primary')}>
                    -{c.descontoPct}%
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
          {PLANOS.map((plan) => {
            const total = precoCiclo(plan.id, ciclo)
            const mensalEq = precoMensalEquivalente(plan.id, ciclo)
            const cic = CICLOS.find((c) => c.id === ciclo)!
            const highlighted = plan.id === 'pro'
            const Icon = plan.id === 'empresa' ? Building2 : Sparkles
            const href = `/checkout?plano=${plan.id}&ciclo=${ciclo}&metodo=pix`
            return (
              <div
                key={plan.id}
                className={cn(
                  'relative bg-white dark:bg-slate-900 rounded-3xl border p-7 md:p-8 flex flex-col transition-all duration-200',
                  highlighted
                    ? 'border-transparent shadow-2xl shadow-primary/20 ring-2 ring-primary lg:-translate-y-3'
                    : 'border-slate-200 dark:border-slate-700 hover:shadow-lg'
                )}
              >
                {highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold shadow-lg">
                    MAIS POPULAR
                  </div>
                )}

                <div
                  className={cn(
                    'w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-5',
                    highlighted ? 'from-primary to-secondary' : 'from-violet-500 to-accent'
                  )}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>

                <h3 className="text-2xl font-extrabold font-display text-slate-900 dark:text-white mb-1">{plan.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{plan.descricao}</p>

                <span className="inline-flex items-center gap-1 self-start px-2.5 py-1 mb-4 rounded-full bg-primary/10 dark:bg-primary/15 text-primary dark:text-primary text-xs font-bold">
                  15 dias grátis
                </span>

                <div className="mb-1">
                  <span className="text-4xl font-extrabold font-display text-slate-900 dark:text-white">
                    {formatReais(total)}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 ml-1">
                    / {cic.label.toLowerCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Equivale a {formatReais(mensalEq)}/mês
                </p>
                {cic.descontoPct > 0 && (
                  <p className="text-xs font-bold text-success mb-4">Economize {cic.descontoPct}%</p>
                )}
                {cic.descontoPct === 0 && <div className="h-5 mb-4" />}

                <ul className="space-y-3 mb-8 flex-1">
                  {FEATURES[plan.id].map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                      <span className="w-5 h-5 shrink-0 rounded-full bg-success-soft dark:bg-emerald-500/10 flex items-center justify-center mt-0.5">
                        <Check className="w-3 h-3 text-success" />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <PlanCtaLink href={href} plano={plan.name} highlighted={highlighted}>
                  Assinar {plan.name}
                </PlanCtaLink>
              </div>
            )
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Todos os planos incluem teste grátis de 15 dias. A primeira cobrança ocorre somente após o término do período de teste.
          </p>
        </div>
      </div>
    </div>
  )
}
