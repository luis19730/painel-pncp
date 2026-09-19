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
  return <HomeContent />
}