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
      description: `Licitações públicas em ${nome} no PNCP, com valores, links do edital e filtros por categoria e modalidade. Receba alertas por e-mail.`,
      alternates: { canonical: `/licitacoes/${uf}` },
      // A API do PNCP não filtra por UF no servidor: o filtro roda no cliente sobre
      // uma única página de 10 itens, então estas páginas ficam quase sempre vazias.
      // Mantidas no site para navegação, fora do índice até a fonte de dados mudar.
      robots: { index: false, follow: true },
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
        subtitle="Use a busca completa para filtrar por cidade, categoria ou órgão."
        as="h1"
      />

      {licitacoes.length === 0 ? (
        <p className="text-slate-400">Nenhuma licitação encontrada para este estado.</p>
      ) : (
        <ul className="space-y-4">
          {licitacoes.map((item) => (
            <li key={item.numeroControlePNCP}>
              <div className="card p-4">
                <h2 className="font-semibold text-slate-900 dark:text-white line-clamp-2">
                  {item.objetoCompra}
                </h2>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span>{item.modalidadeNome}</span>
                  <span>{item.orgaoNome}</span>
                  <span>{item.municipioNome}</span>
                  <span>{formatDate(item.dataPublicacaoPncp)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}
