import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/alerts/db'
import { authorizeAdmin } from '@/lib/admin/auth'
import { executarLoteFornecedores } from '@/lib/fornecedores/extracao'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/fornecedores/extrair?limite=3
 * Disparo manual de um lote de extração de vencedores/licitantes do PNCP.
 */
export async function POST(req: Request) {
  const auth = await authorizeAdmin(req)
  if (!auth.ok) return auth.response

  let client
  try {
    client = createServiceClient()
  } catch {
    return NextResponse.json({ ok: false, erro: 'Banco de dados não configurado.' }, { status: 503 })
  }

  const url = new URL(req.url)
  const pedido = Number(url.searchParams.get('limite') || 2) || 2
  const limite = Math.min(10, Math.max(1, pedido))

  try {
    const resultado = await executarLoteFornecedores(client, limite)
    return NextResponse.json({ ok: true, ...resultado })
  } catch (e) {
    return NextResponse.json(
      { ok: false, erro: (e as Error)?.message || 'Falha na extração.' },
      { status: 500 }
    )
  }
}
