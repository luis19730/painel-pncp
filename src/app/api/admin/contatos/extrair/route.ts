import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/alerts/db'
import { authorizeAdmin } from '@/lib/admin/auth'
import { executarLoteExtracao } from '@/lib/contatos/extracao'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/contatos/extrair?limite=3
 *
 * Disparo MANUAL (admin) de um pequeno lote de extração de contatos, para
 * validação/ operação sem depender do cron. RESTRITO ao admin
 * (`x-admin-password`). Limite máximo 5 por chamada.
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
    const resultado = await executarLoteExtracao(client, limite)
    return NextResponse.json({ ok: true, ...resultado })
  } catch (e) {
    return NextResponse.json(
      { ok: false, erro: (e as Error)?.message || 'Falha na extração.' },
      { status: 500 }
    )
  }
}
