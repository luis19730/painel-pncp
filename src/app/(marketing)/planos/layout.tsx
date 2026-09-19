import type { Metadata } from 'next'

// A página /planos é um client component ('use client') e não pode exportar
// metadata; este layout define o título/descrição SEO da rota.
export const metadata: Metadata = {
  title: 'Planos e preços',
  description:
    'Escolha o plano ideal para sua empresa: teste grátis por 15 dias, buscas ilimitadas, alertas, radar, score de oportunidade e apoio na montagem de processos licitatórios.',
}

export default function PlanosLayout({ children }: { children: React.ReactNode }) {
  return children
}
