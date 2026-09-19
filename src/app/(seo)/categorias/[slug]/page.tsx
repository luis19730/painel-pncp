import type { Metadata } from 'next'
import Link from 'next/link'
import { fetchSeoLicitacoes } from '@/lib/seo-data'
import { Section, SectionHead } from '@/components/marketing/section'

const categoriasMap: Record<string, string> = {
  'informatica': 'Informática',
  'medicamentos': 'Medicamentos',
  'veiculos': 'Veículos',
  'servicos-de-limpeza': 'Serviços de Limpeza',
  'alimentacao': 'Alimentação',
  'construcao': 'Construção',
  'educacao': 'Educação',
  'seguranca': 'Segurança',
  'saude': 'Saúde',
  'engenharia': 'Engenharia',
  'consultoria': 'Consultoria',
  'telecomunicacoes': 'Telecomunicações',
}

const queries: Record<string, string> = {
  'informatica': 'computador notebook impressora',
  'medicamentos': 'medicamento dipirona',
  'veiculos': 'veiculo pneu combustivel',
  'servicos-de-limpeza': 'limpeza material',
  'alimentacao': 'arroz oleo alimentacao',
  'construcao': 'cimento construcao',
  'educacao': 'uniforme escolar educacao',
  'seguranca': 'seguranca',
  'saude': 'saude medicamento hospitalar',
  'engenharia': 'engenharia',
  'consultoria': 'consultoria',
  'telecomunicacoes': 'telecomunicacao',
}

interface SeoItem {
  numeroControlePNCP: string
  objetoCompra: string
  modalidadeNome: string
  dataPublicacaoPncp: string
  uf: string
  municipioNome: string
  orgaoNome: string
  valor_global?: number
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('pt-BR')
  } catch {
    return d
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const nome = categoriasMap[slug] || slug
  return {
    title: `Licitações de ${nome}`,
    description: `Encontre licitações públicas de ${nome} no Portal Nacional de Contratações Públicas.`,
  }
}

export default async function CategoriaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const nome = categoriasMap[slug] || slug
  const q = queries[slug] || nome

  const items = (await fetchSeoLicitacoes({ q })) as unknown as SeoItem[]

  return (
    <Section narrow>
      <nav className="text-sm text-slate-400 mb-4">
        <Link href="/licitacoes" className="hover:text-primary">Licitações</Link>
        <span className="mx-2">/</span>
        <Link href="/categorias" className="hover:text-primary">Categorias</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-600 dark:text-slate-300">{nome}</span>
      </nav>

      <SectionHead
        title={`Licitações de ${nome}`}
        subtitle={
          items.length > 0
            ? `${items.length} oportunidades encontradas`
            : 'Nenhuma oportunidade encontrada'
        }
        as="h1"
      />

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.numeroControlePNCP} className="card p-4 hover:shadow-md transition-shadow">
            <p className="font-semibold text-slate-900 dark:text-white line-clamp-2">{item.objetoCompra}</p>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{item.orgaoNome}</span>
              <span>{item.municipioNome && `${item.municipioNome}/${item.uf}`}</span>
              <span>{item.modalidadeNome}</span>
              {item.valor_global != null && <span>R$ {Number(item.valor_global).toLocaleString('pt-BR')}</span>}
              <span>{formatDate(item.dataPublicacaoPncp)}</span>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            Nenhuma oportunidade encontrada para esta categoria.
          </div>
        )}
      </div>
    </Section>
  )
}
