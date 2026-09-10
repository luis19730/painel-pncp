import type { Metadata } from 'next'
import Link from 'next/link'
import { fetchSeoLicitacoes } from '@/lib/seo-data'

const ESTADOS: Record<string, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AP: 'Amapá',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais',
  PA: 'Pará',
  PB: 'Paraíba',
  PR: 'Paraná',
  PE: 'Pernambuco',
  PI: 'Piauí',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
  RO: 'Rondônia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SP: 'São Paulo',
  SE: 'Sergipe',
  TO: 'Tocantins',
}

interface LicitacaoItem {
  numeroControlePNCP: string
  objetoCompra: string
  modalidadeNome: string
  dataPublicacaoPncp: string
  orgaoNome: string
}

export function generateMetadata({
  params,
}: {
  params: Promise<{ estado: string; cidade: string }>
}): Promise<Metadata> {
  return params.then(({ estado, cidade }) => {
    const uf = estado.toUpperCase()
    const nomeEstado = ESTADOS[uf] || uf
    const nomeCidade = decodeURIComponent(cidade)
    return {
      title: `Licitações em ${nomeCidade} - ${nomeEstado} | Painel PNCP`,
      description: `Acompanhe licitações publicadas em ${nomeCidade}, ${nomeEstado} no Portal Nacional de Contratações Públicas.`,
      openGraph: {
        title: `Licitações em ${nomeCidade} - ${nomeEstado} | Painel PNCP`,
        description: `Acompanhe licitações publicadas em ${nomeCidade}, ${nomeEstado}.`,
        type: 'website',
      },
    }
  })
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR')
  } catch {
    return dateStr
  }
}

export default async function CidadePage({
  params,
}: {
  params: Promise<{ estado: string; cidade: string }>
}) {
  const { estado, cidade } = await params
  const uf = estado.toUpperCase()
  const nomeEstado = ESTADOS[uf] || uf
  const nomeCidade = decodeURIComponent(cidade)
  const licitacoes = (await fetchSeoLicitacoes({ q: 'licitacao', uf, municipio: nomeCidade })) as unknown as LicitacaoItem[]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <nav className="text-sm text-gray-400 mb-4">
          <Link href="/licitacoes" className="hover:text-blue-600">
            Licitações
          </Link>
          <span className="mx-2">/</span>
          <Link href={`/licitacoes/${uf}`} className="hover:text-blue-600">
            {nomeEstado}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-700">{nomeCidade}</span>
        </nav>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Licitações em {nomeCidade} - {nomeEstado}
        </h1>
        <p className="text-gray-500 mb-8">
          Resultados recentes para esta cidade.
        </p>

        {licitacoes.length === 0 && (
          <p className="text-gray-400">Nenhuma licitação encontrada para esta cidade.</p>
        )}

        <ul className="space-y-4">
          {licitacoes.map((item) => (
            <li key={item.numeroControlePNCP}>
              <div className="block bg-white border border-gray-200 rounded-lg p-4">
                <h2 className="font-semibold text-gray-900 line-clamp-2">
                  {item.objetoCompra}
                </h2>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                  <span>{item.modalidadeNome}</span>
                  <span>{item.orgaoNome}</span>
                  <span>{formatDate(item.dataPublicacaoPncp)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
