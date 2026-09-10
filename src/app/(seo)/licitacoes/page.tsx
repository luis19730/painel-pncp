import type { Metadata } from 'next'
import Link from 'next/link'
import { fetchSeoLicitacoes } from '@/lib/seo-data'

export const metadata: Metadata = {
  title: 'Licitações no Brasil | Painel PNCP',
  description:
    'Acompanhe licitações publicadas no Portal Nacional de Contratações Públicas. Filtre por estado, cidade e categoria.',
  openGraph: {
    title: 'Licitações no Brasil | Painel PNCP',
    description:
      'Acompanhe licitações publicadas no Portal Nacional de Contratações Públicas.',
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

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR')
  } catch {
    return dateStr
  }
}

export default async function LicitacoesPage() {
  const licitacoes = (await fetchSeoLicitacoes()) as unknown as LicitacaoItem[]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Licitações no Brasil</h1>
        <p className="text-gray-500 mb-8">
          Resultados recentes do Portal Nacional de Contratações Públicas.
        </p>

        {licitacoes.length === 0 && (
          <p className="text-gray-400">Nenhuma licitação encontrada no momento.</p>
        )}

        <ul className="space-y-4">
          {licitacoes.map((item) => (
            <li key={item.numeroControlePNCP}>
              <Link
                href={`/licitacoes/${item.uf}/${encodeURIComponent(item.municipioNome || 'geral')}`}
                className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition"
              >
                <h2 className="font-semibold text-gray-900 line-clamp-2">
                  {item.objetoCompra}
                </h2>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                  <span>{item.modalidadeNome}</span>
                  <span>{item.orgaoNome}</span>
                  <span>{item.uf}</span>
                  <span>{formatDate(item.dataPublicacaoPncp)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
