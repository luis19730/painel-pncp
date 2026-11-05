import type { Metadata } from 'next'
import { Section } from '@/components/marketing/section'
import Descadastro from '@/components/sicx/descadastro'

export const metadata: Metadata = {
  title: 'Cancelar inscrição — SICX',
  robots: { index: false, follow: false },
  alternates: { canonical: '/credenciamento-sicx' },
}

export default async function DescadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  return (
    <Section narrow>
      <Descadastro token={String(token || '')} />
    </Section>
  )
}
