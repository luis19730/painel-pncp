import type { Metadata } from 'next'
import HomeContent from '@/components/marketing/home-content'

export const metadata: Metadata = {
  title: { absolute: 'Painel PNCP - Consulta de Licitações e Montagem de Processos' },
  description:
    'Consulte licitações do PNCP em segundos, filtre editais por UF, modalidade e valor e monte processos licitatórios com apoio da ferramenta. Comece gratuitamente.',
  openGraph: {
    title: 'Painel PNCP - Consulta de Licitações e Montagem de Processos',
    description:
      'Encontre e analise editais do PNCP com filtros avançados e apoio na montagem de processos licitatórios. Comece gratuitamente.',
    type: 'website',
    siteName: 'Painel PNCP',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Painel PNCP - Consulta de Licitações e Montagem de Processos',
    description:
      'Consulte licitações do PNCP em segundos e monte processos com mais agilidade.',
  },
}

export default function MarketingPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', name: 'Painel PNCP', url: 'https://www.painelpncp.com.br' },
      { '@type': 'WebSite', name: 'Painel PNCP', url: 'https://www.painelpncp.com.br', inLanguage: 'pt-BR' },
      {
        '@type': 'SoftwareApplication',
        name: 'Painel PNCP',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description:
          'Consulta de licitações do PNCP, análise de edital com IA, pesquisa de preços e apoio à montagem de processos licitatórios.',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <HomeContent />
    </>
  )
}