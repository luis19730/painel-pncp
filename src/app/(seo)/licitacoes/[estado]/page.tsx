import type { Metadata } from 'next'
import Link from 'next/link'
import { fetchSeoLicitacoes } from '@/lib/seo-data'
import { Section, SectionHead } from '@/components/marketing/section'

const ESTADOS: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará',
  DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná',
  PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul',
  RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
}

interface LicitacaoItem {
  numeroControlePNCP: string
  objetoCompra: string
  modalidadeNome: string
  dataPublicacaoPncp: string
  municipioNome: string
  orgaoNome: string
}

export function generateMetadata({ params }: { params: Promise<{ estado: string }> }): Promise<Metadata> {
  return params.then(({ estado }) => {
    const uf = estado.toUpperCase()
    const nome = ESTADOS[uf] || uf
    return {
      title: `Licitações em ${nome} (${uf})`,
      description: `Acompanhe licitações publicadas em ${nome} no Portal Nacional de Contratações Públicas.`,
      openGraph: {
        title: `Licitações em ${nome} (${uf}) | Painel PNCP`,
        description: `Acompanhe licitações publicadas em ${nome}.`,
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

export default async function EstadoPage({ params }: { params: Promise<{ estado: string }> }) {
  const { estado } = await params
  const uf = estado.toUpperCase()
  const nome = ESTADOS[uf] || uf
  const licitacoes = (await fetchSeoLicitacoes({ q: 'licitacao', uf })) as unknown as LicitacaoItem[]

  return (
    <Section narrow>
      <nav className="text-sm text-slate-400 mb-4">
        <Link href="/licitacoes" className="hover:text-primary">Licitações</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-600 dark:text-slate-300">{nome}</span>
      </nav>

      <SectionHead
        title={`Licitações em ${nome} (${uf})`}
        subtitle="Resultados recentes filtrados por UF."
        as="h1"
      />

      {licitacoes.length === 0 ? (
        <p className="text-slate-400">Nenhuma licitação encontrada para este estado.</p>
      ) : (
        <ul className="space-y-4">
          {licitacoes.map((item) => (
            <li key={item.numeroControlePNCP}>
              <Link
                href={`/licitacoes/${uf}/${encodeURIComponent(item.municipioNome || 'geral')}`}
                className="card p-4 block hover:border-primary/40 hover:shadow-md transition"
              >
                <h2 className="font-semibold text-slate-900 dark:text-white line-clamp-2">
                  {item.objetoCompra}
                </h2>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span>{item.modalidadeNome}</span>
                  <span>{item.orgaoNome}</span>
                  <span>{item.municipioNome}</span>
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
