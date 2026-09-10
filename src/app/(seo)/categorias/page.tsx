import Link from 'next/link'

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
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Categorias de Licitações</h1>
      <p className="text-gray-500 mb-8">Encontre licitações por segmento de atuação</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categorias.map(cat => (
          <Link
            key={cat.slug}
            href={`/categorias/${cat.slug}`}
            className="flex items-center gap-4 p-5 bg-white rounded-xl border border-gray-200 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
          >
            <span className="text-3xl">{cat.icon}</span>
            <div>
              <h3 className="font-semibold text-gray-900">{cat.label}</h3>
              <p className="text-sm text-gray-500">Ver oportunidades</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
