import { NextResponse } from 'next/server'
import { contextoUsuario, resposta401, respostaErro } from '@/lib/estacao/server'
import { priceStatsFromRecords, searchLivePriceItems } from '@/lib/pncp-data'

export const dynamic = 'force-dynamic'

/**
 * GET /api/analista/mercado?termo=<descrição do item>
 * Compara o preço do item com contratações reais do PNCP.
 * Se não houver dado, devolve `stats: null` (a UI oculta o bloco, sem erro).
 */
export async function GET(req: Request) {
  const { user } = await contextoUsuario()
  if (!user) return resposta401()

  const url = new URL(req.url)
  const termo = (url.searchParams.get('termo') || '').trim().slice(0, 120)
  if (!termo) return respostaErro('Informe o item para comparar com o mercado.')

  try {
    const registros = await searchLivePriceItems(termo, { dias: 90, limiteCompras: 8 })
    if (!registros || registros.length === 0) {
      return NextResponse.json({ ok: true, termo, stats: null })
    }
    const stats = priceStatsFromRecords(registros)
    if (!stats) return NextResponse.json({ ok: true, termo, stats: null })

    return NextResponse.json({
      ok: true,
      termo,
      stats: {
        registros: stats.registros,
        media: stats.media,
        mediana: stats.mediana,
        menor: stats.menor,
        maior: stats.maior,
      },
    })
  } catch {
    // Falha do PNCP não deve quebrar a calculadora: apenas oculta o bloco.
    return NextResponse.json({ ok: true, termo, stats: null })
  }
}
