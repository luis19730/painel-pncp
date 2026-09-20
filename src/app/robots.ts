import type { MetadataRoute } from 'next'

const BASE = 'https://www.painelpncp.com.br'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Áreas internas/privadas não devem ser indexadas.
        disallow: [
          '/api/',
          '/admin',
          '/dashboard',
          '/oportunidades',
          '/busca',
          '/meu-radar',
          '/alertas',
          '/favoritos',
          '/precos',
          '/precos-inteligentes',
          '/concorrentes',
          '/analise-edital',
          '/ia-licitacoes',
          '/score',
          '/modalidades',
          '/estudo-tecnico',
          '/matriz-riscos',
          '/checklist',
          '/justificativa',
          '/documentos',
          '/montagem-processo',
          '/meus-processos',
          '/sinapi',
          '/relatorios',
          '/calendario',
          '/perfil',
          '/configuracoes',
          '/credenciamento-sicx',
          '/checkout',
          '/minha-assinatura',
          '/plano-bloqueado',
          '/login',
          '/confirmado',
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  }
}
