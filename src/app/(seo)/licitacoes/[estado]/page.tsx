import type { Metadata } from 'next'
import Link from 'next/link'

const ESTADOS: Record<string, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AP: 'Amapa',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceara',
  DF: 'Distrito Federal',
  ES: 'Espirito Santo',
  GO: 'Goias',
  MA: 'Maranhao',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais',
  PA: 'Para',
  PB: 'Paraiba',
  PR: 'Parana',
  PE: 'Pernambuco',
  PI: 'Piaui',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
  RO: 'Rondonia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SP: 'Sao Paulo',
  SE: 'Sergipe',
  TO: 'Tocantins',
}

interface LicitacaoItem {
  numeroControlePNCP: string
  objetoCompra: string
  modalidadeNome: string
  dataPublicacaoPncp: string
  municipioNome: string
  orgaoNome: string
}

interface SearchResponse {
  items?: LicitacaoItem[]
  data?: LicitacaoItem[]
  total?: number
}

export function generateMetadata({ params }: { params: Promise<{ estado: string }> }): Promise<Metadata> {
  return params.then(({ estado }) => {
    const uf = estado.toUpperCase()
    const nome = ESTADOS[uf] || uf
    return {
      title: `Licitacoes em ${nome} (${uf}) | Painel PNCP`,
      description: `Acompanhe licitacoes publicadas em ${nome} no Portal Nacional de Contratacoes Publicas.`,
      openGraph: {
        title: `Licitacoes em ${nome} (${uf}) | Painel PNCP`,
        description: `Acompanhe licitacoes publicadas em ${nome}.`,
        type: 'website',
      },
    }
  })
}

async function fetchByEstado(uf: string): Promise<LicitacaoItem[]> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const res = await fetch(
      `${base}/api/pncp/search/?q=licitacao&uf=${uf.toUpperCase()}&pagina=1`,
      { next: { revalidate: 120 } }
    )
    if (!res.ok) return []
    const data: SearchResponse = await res.json()
    return data.items ?? data.data ?? []
  } catch {
    return []
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR')
  } catch {
    return dateStr
  }
}

export default async function EstadoPage({ params }: { params: Promise<{ estado: string }> }) {
  const { estado } = await params
  const uf = estado.toUpperCase()
  const nome = ESTADOS[uf] || uf
  const licitacoes = await fetchByEstado(uf)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <nav className="text-sm text-gray-400 mb-4">
          <Link href="/licitacoes" className="hover:text-blue-600">
            Licitacoes
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-700">{nome}</span>
        </nav>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Licitacoes em {nome} ({uf})
        </h1>
        <p className="text-gray-500 mb-8">
          Resultados recentes filtrados por UF.
        </p>

        {licitacoes.length === 0 && (
          <p className="text-gray-400">Nenhuma licitacao encontrada para este estado.</p>
        )}

        <ul className="space-y-4">
          {licitacoes.map((item) => (
            <li key={item.numeroControlePNCP}>
              <Link
                href={`/licitacoes/${uf}/${encodeURIComponent(item.municipioNome || 'geral')}`}
                className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition"
              >
                <h2 className="font-semibold text-gray-900 line-clamp-2">
                  {item.objetoCompra}
                </h2>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                  <span>{item.modalidadeNome}</span>
                  <span>{item.orgaoNome}</span>
                  <span>{item.municipioNome}</span>
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
