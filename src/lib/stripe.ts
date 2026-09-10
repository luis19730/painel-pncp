import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not configured')

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-07-29.dahlia',
  typescript: true,
})

export const STRIPE_PLANS = {
  pro: {
    name: 'Profissional',
    price: 5990,
    interval: 'month' as const,
    features: [
      'Buscas ilimitadas',
      'Radar personalizado',
      'Até 20 alertas',
      'Score de oportunidades',
      'Histórico de preços',
      'Análise básica',
    ],
  },
  business: {
    name: 'Empresa',
    price: 14990,
    interval: 'month' as const,
    features: [
      'Múltiplas buscas avançadas',
      'Múltiplas empresas',
      'Alertas ilimitados',
      'Score avançado',
      'Histórico completo',
      'Análise de concorrentes',
      'Relatórios exportáveis',
      'IA para análise de editais',
      'Suporte prioritário',
    ],
  },
}
