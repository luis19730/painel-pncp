import Link from 'next/link'
import { Check, Sparkles, Building2, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

const plans = [
  {
    name: 'FREE',
    price: 'R$ 0',
    period: 'grátis para sempre',
    description: 'Para quem quer conhecer a plataforma.',
    icon: Shield,
    features: [
      'Busca básica de licitações',
      'Favoritos (até 5)',
      'Radar básico',
      'Alertas (até 3)',
      'Acesso a dados públicos do PNCP',
    ],
    cta: 'Começar grátis',
    href: '/cadastro',
    highlighted: false,
    accent: 'from-slate-500 to-slate-600',
  },
  {
    name: 'PRO',
    price: 'R$ 59,90',
    period: '/mês',
    description: 'Para empresas que querem encontrar mais oportunidades.',
    icon: Sparkles,
    features: [
      'Buscas avançadas ilimitadas',
      'Radar personalizado',
      'Alertas (até 20)',
      'Score de oportunidade',
      'Histórico de preços',
      'Favoritos ilimitados',
      'Análise de concorrentes',
      'Suporte por e-mail',
    ],
    cta: 'Assinar Pro',
    href: '/cadastro',
    highlighted: true,
    accent: 'from-primary to-secondary',
  },
  {
    name: 'EMPRESA',
    price: 'R$ 149,90',
    period: '/mês',
    description: 'Para equipes que gerenciam múltiplas empresas.',
    icon: Building2,
    features: [
      'Múltiplas empresas',
      'Tudo do plano Pro ilimitado',
      'IA para análise de editais',
      'Relatórios exportáveis',
      'Alertas ilimitados',
      'Gerenciamento de equipe',
      'Suporte prioritário',
      'Integração via API',
    ],
    cta: 'Assinar Empresa',
    href: '/cadastro',
    highlighted: false,
    accent: 'from-violet-500 to-accent',
  },
]

export default function PlanosPage() {
  return (
    <div className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-14">
          <p className="text-sm font-bold text-primary dark:text-primary uppercase tracking-wider mb-3">Planos e preços</p>
          <h1 className="text-4xl md:text-5xl font-extrabold font-display text-slate-900 dark:text-white mb-4">
            Escolha o plano ideal para sua empresa
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            Comece grátis e escale quando precisar. Sem surpresas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => {
            const Icon = plan.icon
            return (
              <div
                key={plan.name}
                className={cn(
                  'relative bg-white dark:bg-slate-900 rounded-3xl border p-7 md:p-8 flex flex-col transition-all duration-200',
                  plan.highlighted
                    ? 'border-transparent shadow-2xl shadow-primary/20 ring-2 ring-primary lg:-translate-y-3'
                    : 'border-slate-200 dark:border-slate-700 hover:shadow-lg'
                )}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold shadow-lg">
                    MAIS POPULAR
                  </div>
                )}

                <div className={cn('w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-5', plan.accent)}>
                  <Icon className="w-6 h-6 text-white" />
                </div>

                <h3 className="text-2xl font-extrabold font-display text-slate-900 dark:text-white mb-1">{plan.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">{plan.description}</p>

                <div className="mb-6">
                  <span className="text-4xl font-extrabold font-display text-slate-900 dark:text-white">{plan.price}</span>
                  <span className="text-slate-500 dark:text-slate-400 ml-1">{plan.period}</span>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                      <span className="w-5 h-5 shrink-0 rounded-full bg-success-soft dark:bg-emerald-500/10 flex items-center justify-center mt-0.5">
                        <Check className="w-3 h-3 text-success" />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={cn(
                    'inline-flex items-center justify-center gap-2 rounded-xl font-bold text-sm px-4 py-3 transition-all duration-200',
                    plan.highlighted
                      ? 'bg-gradient-to-r from-primary to-secondary text-white hover:opacity-95 shadow-lg shadow-primary/25 hover:scale-[1.02]'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                  )}
                >
                  {plan.cta}
                </Link>
              </div>
            )
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Integração de pagamento em breve. Planos sujeitos a alteração.
          </p>
        </div>
      </div>
    </div>
  )
}
