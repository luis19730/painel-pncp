'use client'

import { useEffect, useState } from 'react'
import { Check, Sparkles, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import PlanCtaLink from '@/components/marketing/plan-cta-link'
import { Section, SectionHead } from '@/components/marketing/section'
import { track } from '@/lib/analytics'
import {
  CICLOS,
  PLANOS,
  precoCiclo,
  precoMensalEquivalente,
  descontoRealPct,
  formatReais,
} from '@/lib/asaas/types'
import type { CicloId } from '@/lib/asaas/types'

const FEATURES: Record<string, string[]> = {
  pro: [
    'Monitoramento de oportunidades, dispensas e licitações do Compras.gov e da PNCP',
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
    'Monitoramento de oportunidades, dispensas e licitações do Compras.gov e da PNCP',
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
  // O ANUAL é o mais vantajoso (menor custo mensal efetivo): já vem selecionado.
  const [ciclo, setCiclo] = useState<CicloId>('anual')

  // Evento de funil: visualização da página de planos (PLAN_VIEW).
  useEffect(() => {
    track({ event: 'plan_view', page: 'planos' })
  }, [])

  return (
    <Section>
      <SectionHead
        align="center"
        eyebrow="Planos e preços"
        title="Monitore licitações e dispensas do Compras.gov por menos de R$ 0,58/dia"
        subtitle="O Painel PNCP acompanha oportunidades, dispensas e licitações oficiais do Compras.gov e da PNCP em tempo real. Teste grátis por 15 dias — sem cartão de crédito para começar."
        as="h1"
      />

      {/* Seletor de periodicidade */}
      <div className="flex flex-wrap justify-center gap-2 mb-14">
        {CICLOS.map((c) => {
          const ativo = ciclo === c.id
          const melhorCusto = c.id === 'anual'
          return (
            <button
              key={c.id}
              onClick={() => setCiclo(c.id)}
              className={cn(
                'relative rounded-xl px-5 py-2.5 text-sm font-semibold border transition-all',
                ativo
                  ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary/40'
              )}
            >
              {c.label}
              {melhorCusto && (
                <span
                  className={cn(
                    'ml-1.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full',
                    ativo ? 'bg-white/20 text-white' : 'bg-success-soft dark:bg-emerald-500/10 text-success'
                  )}
                >
                  melhor custo
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
          const economia = descontoRealPct(plan.id, ciclo)
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
              {cic.id === 'anual' && (
                <p className="text-xs font-bold text-success mb-1">
                  Melhor custo mensal efetivo
                </p>
              )}
              {economia > 0 && (
                <p className="text-xs font-bold text-success mb-4">Economize {economia}%</p>
              )}
              {economia === 0 && <div className="h-5 mb-4" />}

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

      {/* Tabela das 4 periodicidades do PRO — ANUAL em destaque */}
      <div className="mt-16 max-w-4xl mx-auto">
        <p className="text-center text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-5">
          Plano PRO — compare as 4 opções de cobrança
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {CICLOS.map((c) => {
            const total = precoCiclo('pro', c.id)
            const eq = precoMensalEquivalente('pro', c.id)
            const economia = descontoRealPct('pro', c.id)
            const melhorCusto = c.id === 'anual'
            return (
              <div
                key={c.id}
                className={cn(
                  'relative rounded-2xl border p-5 text-center',
                  melhorCusto
                    ? 'bg-primary-soft dark:bg-primary/10 border-primary ring-1 ring-primary'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                )}
              >
                {melhorCusto && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-white text-[11px] font-bold whitespace-nowrap shadow">
                    MAIS VANTAJOSO
                  </div>
                )}
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {c.label}
                </p>
                <p
                  className={cn(
                    'text-2xl font-extrabold mt-1',
                    melhorCusto ? 'text-primary' : 'text-slate-900 dark:text-white'
                  )}
                >
                  {formatReais(total)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">≈ {formatReais(eq)}/mês</p>
                {economia > 0 && (
                  <p className="text-xs font-bold text-success mt-1">Economize {economia}%</p>
                )}
              </div>
            )
          })}
        </div>
        <p className="text-center text-sm text-slate-400 dark:text-slate-500 mt-5">
          O plano <span className="font-bold text-slate-600 dark:text-slate-300">Anual</span> entrega o menor custo
          mensal efetivo: {formatReais(precoMensalEquivalente('pro', 'anual'))}/mês.
        </p>
      </div>

      <div className="mt-12 text-center">
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Todos os planos incluem teste grátis de 15 dias. A primeira cobrança ocorre somente após o término do período
          de teste. Os novos valores do plano PRO valem para contratações e renovações.
        </p>
      </div>
    </Section>
  )
}