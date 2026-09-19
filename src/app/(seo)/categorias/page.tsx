import Link from 'next/link'
import { Section, SectionHead } from '@/components/marketing/section'

export const metadata = {
  title: 'Licitações por Categoria',
  description: 'Encontre licitações públicas por categoria no PNCP.',
}

const categorias = [
  { slug: 'informatica', label: 'Informática', icon: '💻' },
  { slug: 'medicamentos', label: 'Medicamentos', icon: '💊' },
  { slug: 'veiculos', label: 'Veículos', icon: '🚗' },
  { slug: 'servicos-de-limpeza', label: 'Serviços de Limpeza', icon: '🧹' },
  { slug: 'alimentacao', label: 'Alimentação', icon: '🍎' },
  { slug: 'construcao', label: 'Construção', icon: '🏗️' },
  { slug: 'educacao', label: 'Educação', icon: '📚' },
  { slug: 'seguranca', label: 'Segurança', icon: '🔒' },
  { slug: 'saude', label: 'Saúde', icon: '🏥' },
  { slug: 'engenharia', label: 'Engenharia', icon: '⚙️' },
  { slug: 'consultoria', label: 'Consultoria', icon: '📋' },
  { slug: 'telecomunicacoes', label: 'Telecomunicações', icon: '📡' },
]

export default function CategoriasPage() {
  return (
    <Section>
      <SectionHead
        eyebrow="Segmentos"
        title="Categorias de Licitações"
        subtitle="Encontre licitações por segmento de atuação"
        as="h1"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categorias.map((cat) => (
          <Link
            key={cat.slug}
            href={`/categorias/${cat.slug}`}
            className="card p-5 flex items-center gap-4 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          >
            <span className="text-3xl" aria-hidden>{cat.icon}</span>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">{cat.label}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Ver oportunidades</p>
            </div>
          </Link>
        ))}
      </div>
    </Section>
  )
}
