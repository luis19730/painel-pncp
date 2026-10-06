import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/alerts/db'
import { autorizarCron } from '@/lib/cron/auth'
import { executarLoteFornecedores } from '@/lib/fornecedores/extracao'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/extrair-fornecedores?limite=4
 *
 * Extração em lote dos VENCEDORES/LICITANTES (resultados por item) das
 * contratações publicadas no PNCP. Alimenta a base `fornecedores`.
 * Protegido por CRON_SECRET (mesmo padrão dos demais crons).
 */
export async function GET(req: Request) {
  const auth = autorizarCron(req)
  if (!auth.ok) return auth.response

  let client
  try {
    client = createServiceClient()
  } catch {
    return NextResponse.json({ ok: false, erro: 'SUPABASE_SERVICE_ROLE_KEY não configurada.' }, { status: 503 })
  }

  const url = new URL(req.url)
  const limite = Number(url.searchParams.get('limite') || process.env.FORNECEDORES_LOTE || 4) || 4
  const resultado = await executarLoteFornecedores(client, limite)
  return NextResponse.json({ ok: true, ...resultado })
}
