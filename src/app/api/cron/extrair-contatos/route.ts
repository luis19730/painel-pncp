import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/alerts/db'
import { autorizarCron } from '@/lib/cron/auth'
import { executarLoteExtracao } from '@/lib/contatos/extracao'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/extrair-contatos?limite=8
 *
 * Extração em LOTE (assíncrona, controlada) dos contatos de e-mail dos editais
 * ativos: busca editais ao vivo no PNCP, baixa o PDF de cada um, extrai o texto
 * e grava os e-mails. Processa poucos por execução (default 8, máx 20) com
 * pausa entre downloads. Idempotente: cada edital já processado é pulado.
 *
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
  const limite = Number(url.searchParams.get('limite') || process.env.CONTATOS_LOTE || 8) || 8
  const resultado = await executarLoteExtracao(client, limite)
  return NextResponse.json({ ok: true, ...resultado })
}
