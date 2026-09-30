import type { Metadata } from 'next'

// A página /ajuda é um client component ('use client') e não pode exportar
// metadata; este layout define o título/descrição SEO da rota.
export const metadata: Metadata = {
  title: 'Central de ajuda',
  alternates: { canonical: '/ajuda' },
  description:
    'Guias práticos sobre licitações públicas: como ler edital, montar proposta, impugnar, precificar e usar o SICX.',
}

export default function AjudaLayout({ children }: { children: React.ReactNode }) {
  return children
}
