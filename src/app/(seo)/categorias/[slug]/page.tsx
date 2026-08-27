import Link from 'next/link'

const categoriasMap: Record<string, string> = {
  'informatica': 'Informatica',
  'medicamentos': 'Medicamentos',
  'veiculos': 'Veiculos',
  'servicos-de-limpeza': 'Servicos de Limpeza',
  'alimentacao': 'Alimentacao',
  'construcao': 'Construcao',
  'educacao': 'Educacao',
  'seguranca': 'Seguranca',
  'saude': 'Saude',
  'engenharia': 'Engenharia',
  'consultoria': 'Consultoria',
  'telecomunicacoes': 'Telecomunicacoes',
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const nome = categoriasMap[slug] || slug
  return {
    title: `Licitacoes de ${nome} - Painel PNCP`,
    description: `Encontre licitacoes publicas de ${nome} no Portal Nacional de Contratacoes Publicas.`,
  }
}

export default async function CategoriaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const nome = categoriasMap[slug] || slug

  let items: unknown[] = []
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const resp = await fetch(`${base}/api/pncp/search/?q=${encodeURIComponent(nome)}&tipos_documento=edital&pagina=1`, {
      next: { revalidate: 300 },
    })
    const data = await resp.json()
    items = data.items || []
  } catch {
    items = []
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <nav className="text-sm text-gray-500 mb-4">
        <Link href="/licitacoes" className="hover:text-gray-900">Licitacoes</Link>
        <span className="mx-2">/</span>
        <Link href="/categorias" className="hover:text-gray-900">Categorias</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{nome}</span>
      </nav>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Licitacoes de {nome}</h1>
      <p className="text-gray-500 mb-8">
        {items.length > 0 ? `${items.length} oportunidades encontradas` : 'Carregando oportunidades...'}
      </p>

      <div className="space-y-3">
        {items.map((item, i) => {
          const obj = item as Record<string, unknown> & { description?: string; orgao_nome?: string; uf?: string; valor_global?: number; data_publicacao_pncp?: string; numero_controle_pncp?: string }
          return (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{obj.description || obj.orgao_nome || 'Sem titulo'}</p>
                  <p className="text-sm text-gray-500 mt-1">{obj.orgao_nome}</p>
                  <div className="flex gap-3 mt-2 text-xs text-gray-400">
                    {obj.uf && <span>{obj.uf}</span>}
                    {obj.valor_global && <span>R$ {Number(obj.valor_global).toLocaleString('pt-BR')}</span>}
                    {obj.data_publicacao_pncp && <span>{new Date(obj.data_publicacao_pncp).toLocaleDateString('pt-BR')}</span>}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        {items.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            Nenhuma oportunidade encontrada para esta categoria.
          </div>
        )}
      </div>
    </div>
  )
}
