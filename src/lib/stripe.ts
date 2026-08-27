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
      'Ate 20 alertas',
      'Score de oportunidades',
      'Historico de precos',
      'Analise basica',
    ],
  },
  business: {
    name: 'Empresa',
    price: 14990,
    interval: 'month' as const,
    features: [
      'Multiplas buscas avancadas',
      'Multiplas empresas',
      'Alertas ilimitados',
      'Score avancado',
      'Historico completo',
      'Analise de concorrentes',
      'Relatorios exportaveis',
      'IA para analise de editais',
      'Suporte prioritario',
    ],
  },
}
