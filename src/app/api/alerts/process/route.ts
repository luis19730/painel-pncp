import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePaidAccess } from '@/lib/auth/require-access'
import { processUserImmediate } from '@/lib/alerts/processor'

/**
 * POST /api/alerts/process
 * Dispara IMEDIATAMENTE o processamento (envio real) apenas dos alertas ATIVOS
 * do usuário autenticado. Este endpoint é a via "sob demanda" — o processamento
 * contínuo é feito pelo Cron Trigger do worker (a cada minuto).
 */
export async function POST(req: Request) {
  const guard = await requirePaidAccess()
  if (!guard.ok) return guard.response
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, erro: 'Não autenticado.' }, { status: 401 })
  }

  try {
    const report = await processUserImmediate(user.id)
    return NextResponse.json({ ok: true, total: report.total, executados: report.executados })
  } catch (e) {
    return NextResponse.json({ ok: false, erro: (e as Error)?.message || 'Erro ao processar.' }, { status: 500 })
  }
}
