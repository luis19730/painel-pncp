import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/alerts/db'
import { authorizeAdmin } from '@/lib/admin/auth'
import { parsePeriodo } from '@/lib/admin/periodo'
import { montarConversao } from '@/lib/admin/conversao'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/conversao?periodo=30d
 *
 * Painel de conversão: funil (usuários únicos), variação vs período anterior,
 * resumo executivo, recomendações, alertas, lead score/leads quentes,
 * monitoramento de trials, acessos por dia, retenção D1/D7, ranking de
 * funcionalidades e pagamentos — tudo a partir de dados reais, excluindo
 * a atividade administrativa.
 */
export async function GET(req: Request) {
  const auth = await authorizeAdmin(req)
  if (!auth.ok) return auth.response

  const url = new URL(req.url)
  const parsed = parsePeriodo(url)
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, erro: parsed.erro }, { status: 400 })
  }

  let client
  try {
    client = createServiceClient()
  } catch {
    return NextResponse.json({ ok: false, erro: 'Banco de dados não configurado.' }, { status: 503 })
  }

  try {
    const dados = await montarConversao(client, parsed.periodo)
    return NextResponse.json({ ok: true, ...dados })
  } catch {
    return NextResponse.json({ ok: false, erro: 'Falha ao montar a conversão.' }, { status: 500 })
  }
}
