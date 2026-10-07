import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type SupabaseServer = Awaited<ReturnType<typeof createClient>>

/**
 * Contexto da sessão. SEMPRE deriva o usuário do cookie de sessão (Supabase
 * Auth) — nunca confia em user_id vindo do cliente.
 */
export async function contextoUsuario(): Promise<{
  supabase: SupabaseServer
  user: { id: string; email?: string | null } | null
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user: user ? { id: user.id, email: user.email } : null }
}

export function resposta401() {
  return NextResponse.json({ ok: false, erro: 'Não autenticado.' }, { status: 401 })
}

export function respostaErro(msg: string, status = 400) {
  return NextResponse.json({ ok: false, erro: msg }, { status })
}

/**
 * true se o plano do usuário é GRATUITO (free/trial) — aplica LIMITE_GRATIS.
 * Lê o próprio registro via RLS (sessão), sem service role.
 */
export async function planoEhGratuito(supabase: SupabaseServer, userId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('user_planos')
      .select('plano,status_pagamento')
      .eq('user_id', userId)
      .maybeSingle()
    if (!data) return true
    const plano = String(data.plano || 'free')
    if (plano === 'pro' || plano === 'business') return false
    if (data.status_pagamento === 'active') return false
    return true
  } catch {
    return true
  }
}
