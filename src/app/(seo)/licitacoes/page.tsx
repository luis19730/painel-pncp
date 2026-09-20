import type { Metadata } from 'next'
import Link from 'next/link'
import { Section, SectionHead } from '@/components/marketing/section'
import { fetchSeoLicitacoes } from '@/lib/seo-data'

export const metadata: Metadata = {
  title: 'Licitações no Brasil',
  description:
    'Acompanhe licitações publicadas no Portal Nacional de Contratações Públicas. Filtre por estado, cidade e categoria.',
  openGraph: {
    title: 'Licitações no Brasil | Painel PNCP',
    description: 'Acompanhe licitações publicadas no Portal Nacional de Contratações Públicas.',
    type: 'website',
  },
}

interface LicitacaoItem {
  numeroControlePNCP: string
  objetoCompra: string
  modalidadeNome: string
  dataPublicacaoPncp: string
  uf: string
  municipioNome: string
  orgaoNome: string
}

async function fetchLicitacoes(): Promise<LicitacaoItem[]> {
  // Usa a MESMA fonte resiliente das demais páginas SEO (PNCP direto + fallback
  // local). Antes dependia de NEXT_PUBLIC_BASE_URL, que caía em localhost e
  // deixava a página VAZIA em produção.
  return (await fetchSeoLicitacoes({ q: 'licitacao' })) as unknown as LicitacaoItem[]
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR')
  } catch {
    return dateStr
  }
}

export default async function LicitacoesPage() {
  const licitacoes = await fetchLicitacoes()

  return (
    <Section narrow>
      <SectionHead
        eyebrow="Dados abertos"
        title="Licitações no Brasil"
        subtitle="Resultados recentes do Portal Nacional de Contratações Públicas."
        as="h1"
      />

      {licitacoes.length === 0 ? (
        <p className="text-slate-400">Nenhuma licitação encontrada no momento.</p>
      ) : (
        <ul className="space-y-4">
          {licitacoes.map((item) => (
            <li key={item.numeroControlePNCP}>
              <Link
                href={`/licitacoes/${item.uf}/${encodeURIComponent(item.municipioNome || 'geral')}`}
                className="card p-4 block hover:border-primary/40 hover:shadow-md transition"
              >
                <h2 className="font-semibold text-slate-900 dark:text-white line-clamp-2">
                  {item.objetoCompra}
                </h2>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span>{item.modalidadeNome}</span>
                  <span>{item.orgaoNome}</span>
                  <span>{item.uf}</span>
                  <span>{formatDate(item.dataPublicacaoPncp)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}
