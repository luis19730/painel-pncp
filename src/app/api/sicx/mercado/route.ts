import { NextResponse } from 'next/server'
import { contextoUsuario, resposta401, respostaErro } from '@/lib/estacao/server'
import { priceStatsFromRecords, searchLivePriceItems } from '@/lib/pncp-data'
import { resumoMercado } from '@/lib/sicx/calc'

export const dynamic = 'force-dynamic'

/**
 * GET /api/sicx/mercado?termo=<item>&dias=<n>
 * Pesquisa preços praticados no PNCP (dados públicos) para o buscador da
 * Parte 7.1. Se não houver dado, devolve `stats: null` — a UI mostra estado
 * vazio, nunca inventa número.
 */
export async function GET(req: Request) {
  const { user } = await contextoUsuario()
  if (!user) return resposta401()

  const url = new URL(req.url)
  const termo = (url.searchParams.get('termo') || '').trim().slice(0, 120)
  if (termo.length < 2) return respostaErro('Informe ao menos 2 caracteres para pesquisar.')

  const dias = Math.min(365, Math.max(7, Number(url.searchParams.get('dias')) || 90))

  try {
    const registros = await searchLivePriceItems(termo, { dias, limiteCompras: 12 })
    if (!registros || registros.length === 0) {
      return NextResponse.json({ ok: true, termo, stats: null, dispersao: [] })
    }

    const stats = priceStatsFromRecords(registros)
    if (!stats) return NextResponse.json({ ok: true, termo, stats: null, dispersao: [] })

    const resumo = resumoMercado(
      registros.map((r) => ({ valor: Number(r.valor) || 0, orgao: r.orgao }))
    )

    // Dispersão: até 60 pontos (valor + órgão), ordenados por valor.
    const dispersao = registros
      .map((r) => ({
        valor: Number(r.valor) || 0,
        orgao: r.orgao || '',
        uf: r.uf || '',
        data: r.data || '',
      }))
      .filter((p) => p.valor > 0)
      .sort((a, b) => a.valor - b.valor)
      .slice(0, 60)

    return NextResponse.json({
      ok: true,
      termo,
      stats: {
        ...stats,
        ...resumo,
      },
      dispersao,
      fonte: 'PNCP',
      aviso: 'Valores públicos observados em contratações recentes. Não é cotação oficial nem garantia de preço.',
    })
  } catch {
    return NextResponse.json({
      ok: true,
      termo,
      stats: null,
      dispersao: [],
      aviso: 'Não foi possível consultar o PNCP agora. Tente novamente em instantes.',
    })
  }
}
