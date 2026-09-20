import type { MetadataRoute } from 'next'
import { UFS_BRASIL } from '@/data/municipios'
import { GUIAS } from '@/content/guias'

const BASE = 'https://www.painelpncp.com.br'

const CATEGORIAS = [
  'informatica', 'medicamentos', 'veiculos', 'servicos-de-limpeza', 'alimentacao',
  'construcao', 'educacao', 'seguranca', 'saude', 'engenharia', 'consultoria', 'telecomunicacoes',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const estaticas = [
    '/', '/planos', '/sobre', '/sicx', '/termos', '/privacidade',
    '/licitacoes', '/categorias', '/ajuda',
  ]

  return [
    ...estaticas.map((p) => ({
      url: `${BASE}${p}`,
      lastModified: now,
      changeFrequency: (p === '/' ? 'daily' : 'weekly') as 'daily' | 'weekly',
      priority: p === '/' ? 1 : 0.7,
    })),
    ...UFS_BRASIL.map((uf) => ({
      url: `${BASE}/licitacoes/${uf}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    })),
    ...CATEGORIAS.map((c) => ({
      url: `${BASE}/categorias/${c}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...GUIAS.map((g) => ({
      url: `${BASE}/ajuda/${g.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ]
}
