import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePaidAccess } from '@/lib/auth/require-access'
import { sendTest } from '@/lib/alerts/processor'
import { normalizeTelegram, isValidEmail } from '@/lib/alerts/validation'
import type { Canal } from '@/lib/alerts/types'

/**
 * POST /api/alerts/test
 * Envia uma MENSAGEM DE TESTE REAL para um canal do usuário autenticado.
 * Retorna o resultado REAL do provedor — nunca sucesso falso.
 * Corpo: { canal: 'email'|'telegram', destino: string, nomeAlerta: string }
 */
export async function POST(req: Request) {
  const guard = await requirePaidAccess()
  if (!guard.ok) return guard.response
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, erro: 'Não autenticado.' }, { status: 401 })
  }

  const raw: unknown = await req.json().catch(() => null)
  if (!raw || typeof raw !== 'object') {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido.' }, { status: 400 })
  }
  const body = raw as Record<string, unknown>

  const canal = body?.canal as Canal
  const destino = String(body?.destino || '').trim()
  const nomeAlerta = String(body?.nomeAlerta || 'Meu alerta').trim()

  if (canal !== 'email' && canal !== 'telegram') {
    return NextResponse.json({ ok: false, erro: 'Canal inválido.' }, { status: 400 })
  }

  if (canal === 'email' && !isValidEmail(destino)) {
    return NextResponse.json({ ok: false, erro: 'E-mail inválido.' }, { status: 400 })
  }
  if (canal === 'telegram') {
    const tgDestino = normalizeTelegram(destino)
    if (!tgDestino) {
      return NextResponse.json({ ok: false, erro: 'Destino do Telegram inválido (use chat_id ou @username).' }, { status: 400 })
    }
    const r = await sendTest({ canal, destino: tgDestino, nomeAlerta })
    return NextResponse.json({ ok: r.ok, notConfigured: r.notConfigured, erro: r.erro })
  }

  const r = await sendTest({ canal, destino, nomeAlerta })
  return NextResponse.json({ ok: r.ok, notConfigured: r.notConfigured, erro: r.erro })
}
