import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePaidAccess } from '@/lib/auth/require-access'
import { getEditaisKV, carregarEdital, removerEdital } from '@/lib/ia/kv-edital'

/**
 * GET /api/ia/edital — devolve o edital salvo do usuário (ou edital null).
 * DELETE /api/ia/edital — remove o edital salvo do usuário.
 *
 * O edital importado é persistido por usuário no KV (EDITAIS_KV), então ele
 * sobrevive a recarregamentos e é compartilhado entre análise e chat.
 */
export async function GET() {
  const guard = await requirePaidAccess()
  if (!guard.ok) return guard.response
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, erro: 'Não autenticado.' }, { status: 401 })
  }

    const kv = await getEditaisKV()
  if (!kv) {
    return NextResponse.json({ ok: false, error: 'Armazenamento de editais indisponível.' }, { status: 500 })
  }

  const edital = await carregarEdital(kv, user.id)
  return NextResponse.json({ ok: true, edital })
}

export async function DELETE() {
  const guard = await requirePaidAccess()
  if (!guard.ok) return guard.response
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, erro: 'Não autenticado.' }, { status: 401 })
  }

    const kv = await getEditaisKV()
  if (!kv) {
    return NextResponse.json({ ok: false, error: 'Armazenamento de editais indisponível.' }, { status: 500 })
  }

  await removerEdital(kv, user.id)
  return NextResponse.json({ ok: true })
}