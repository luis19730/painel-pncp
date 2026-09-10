import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePaidAccess } from '@/lib/auth/require-access'
import {
  avaliarAnalise,
  analiseMetrics,
  listAnalises,
} from '@/lib/analises/db'

// ============================================================================
// POST /api/analise-edital/avaliacao
//   body: { id: string, correta: boolean }
//
// Registra a avaliação da classificação de uma análise (correta/incorreta).
// Essa avaliação alimenta o cálculo REAL da "Taxa de precisão" da página
// /analise-edital: precisão = classificações corretas / classificações
// avaliadas × 100 (calculada somente com dados suficientes).
// Retorna o histórico + métricas atualizados (recalculados na hora).
// ============================================================================

export async function POST(req: Request) {
  const guard = await requirePaidAccess()
  if (!guard.ok) return guard.response
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, erro: 'Não autenticado.' }, { status: 401 })
  }

  try {
    const raw: unknown = await req.json().catch(() => null)
    const body = (raw || {}) as Record<string, unknown>
    const id = String(body?.id || '').trim()
    const correta = body?.correta

    if (!id) {
      return NextResponse.json({ ok: false, error: 'Informe o id da análise.' }, { status: 400 })
    }
    if (typeof correta !== 'boolean') {
      return NextResponse.json(
        { ok: false, error: 'Informe o campo `correta` (true/false).' },
        { status: 400 }
      )
    }

    const atualizada = await avaliarAnalise(supabase, user.id, id, correta)
    if (!atualizada) {
      return NextResponse.json(
        { ok: false, error: 'Análise não encontrada para este usuário.' },
        { status: 404 }
      )
    }

    const [historico, metricas] = await Promise.all([
      listAnalises(supabase, user.id, 30),
      analiseMetrics(supabase, user.id),
    ])

    return NextResponse.json({ ok: true, analise: atualizada, historico, metricas })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `Erro ao avaliar: ${(e as Error)?.message || 'desconhecido'}` },
      { status: 500 }
    )
  }
}
