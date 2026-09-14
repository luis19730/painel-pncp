import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/alerts/db'
import { authorizeAdmin } from '@/lib/admin/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/conversao/timeline?user_id=<id>&limit=100
 *
 * Histórico cronológico (timeline individual) das ações de um usuário,
 * lido diretamente de analytics_events.
 */
export async function GET(req: Request) {
  const auth = await authorizeAdmin(req)
  if (!auth.ok) return auth.response

  const url = new URL(req.url)
  const userId = url.searchParams.get('user_id') || ''
  if (!userId) {
    return NextResponse.json({ ok: false, erro: 'Informe user_id.' }, { status: 400 })
  }
  const limite = Math.min(500, Math.max(1, Number(url.searchParams.get('limit') || 100) || 100))

  let client
  try {
    client = createServiceClient()
  } catch {
    return NextResponse.json({ ok: false, erro: 'Banco de dados não configurado.' }, { status: 503 })
  }

  const { data, error } = await client
    .from('analytics_events')
    .select('id,event,page,path,props,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limite)

  if (error) {
    return NextResponse.json({ ok: false, erro: 'Falha ao ler a timeline.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, user_id: userId, itens: data || [] })
}
