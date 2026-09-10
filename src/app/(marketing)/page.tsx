import type { Metadata } from 'next'
import HomeContent from '@/components/marketing/home-content'

export const metadata: Metadata = {
  title: 'Pesquisa de Preços Inteligente e licitações no PNCP',
  description:
    'Painel PNCP: pesquisa de preços inteligente para licitações e contratação pública, análise de oportunidades, mapa de preços, radar e auxílio na montagem de processo. Encontre, analise e gere relatórios de preços para compras públicas.',
  openGraph: {
    title: 'Pesquisa de Preços Inteligente e licitações no PNCP',
    description:
      'Encontre referências de preços, analise e compare resultados e gere um relatório de pesquisa de preços para auxiliar na instrução do seu processo de contratação pública.',
    type: 'website',
    siteName: 'Painel PNCP',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pesquisa de Preços Inteligente e licitações no PNCP',
    description:
      'Pesquisa de preços inteligente para compras públicas, licitações e contratação pública, com geração de relatório organizado.',
  },
}

export default function MarketingPage() {
  return <HomeContent />
}