import Link from 'next/link'

export const metadata = {
  title: 'Licitacoes por Categoria',
  description: 'Encontre licitacoes publicas por categoria no PNCP.',
}

const categorias = [
  { slug: 'informatica', label: 'Informatica', icon: '💻' },
  { slug: 'medicamentos', label: 'Medicamentos', icon: '💊' },
  { slug: 'veiculos', label: 'Veiculos', icon: '🚗' },
  { slug: 'servicos-de-limpeza', label: 'Servicos de Limpeza', icon: '🧹' },
  { slug: 'alimentacao', label: 'Alimentacao', icon: '🍎' },
  { slug: 'construcao', label: 'Construcao', icon: '🏗️' },
  { slug: 'educacao', label: 'Educacao', icon: '📚' },
  { slug: 'seguranca', label: 'Seguranca', icon: '🔒' },
  { slug: 'saude', label: 'Saude', icon: '🏥' },
  { slug: 'engenharia', label: 'Engenharia', icon: '⚙️' },
  { slug: 'consultoria', label: 'Consultoria', icon: '📋' },
  { slug: 'telecomunicacoes', label: 'Telecomunicacoes', icon: '📡' },
]

export default function CategoriasPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Categorias de Licitacoes</h1>
      <p className="text-gray-500 mb-8">Encontre licitacoes por segmento de atuacao</p>

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
