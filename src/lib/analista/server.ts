// ============================================================================
// Utilidades de servidor do ANALISTA (sanitização + validação de vínculos).
// O user_id NUNCA vem do cliente: as rotas usam sempre o usuário da sessão.
// ============================================================================

import type { createClient } from '@/lib/supabase/server'

type Supabase = Awaited<ReturnType<typeof createClient>>

export const PRIORIDADES_VALIDAS = ['baixa', 'media', 'alta', 'urgente'] as const
export type PrioridadeValida = (typeof PRIORIDADES_VALIDAS)[number]

export function texto(v: unknown, max = 400): string | null {
  const s = String(v ?? '').trim()
  return s ? s.slice(0, max) : null
}

export function numeroOuNull(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}

export function dataOuNull(v: unknown): string | null {
  const s = String(v ?? '').trim()
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function listaTexto(v: unknown, maxItens = 12, maxLen = 40): string[] {
  if (!Array.isArray(v)) return []
  return v
    .map((x) => String(x ?? '').trim().slice(0, maxLen))
    .filter(Boolean)
    .slice(0, maxItens)
}

export function listaAnexos(v: unknown): Array<{ nome: string; url: string }> {
  if (!Array.isArray(v)) return []
  return v
    .map((x) => {
      const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>
      const url = String(o.url ?? '').trim()
      if (!/^https?:\/\//i.test(url)) return null
      return {
        nome: String(o.nome ?? url).trim().slice(0, 120) || url,
        url: url.slice(0, 1000),
      }
    })
    .filter((x): x is { nome: string; url: string } => !!x)
    .slice(0, 20)
}

export function prioridadeValida(v: unknown): PrioridadeValida {
  const s = String(v ?? '')
  return (PRIORIDADES_VALIDAS as readonly string[]).includes(s) ? (s as PrioridadeValida) : 'media'
}

/** Confere se a coluna existe e pertence ao usuário (RLS). */
export async function colunaDoUsuario(supabase: Supabase, colunaId: string): Promise<boolean> {
  if (!colunaId) return false
  const { data } = await supabase.from('kanban_colunas').select('id').eq('id', colunaId).maybeSingle()
  return !!data
}

/** Confere se a análise existe e pertence ao usuário (RLS). */
export async function analiseDoUsuario(supabase: Supabase, analiseId: string): Promise<boolean> {
  if (!analiseId) return false
  const { data } = await supabase.from('analista_analises').select('id').eq('id', analiseId).maybeSingle()
  return !!data
}

/** Próxima posição livre no fim da coluna. */
export async function proximaOrdem(supabase: Supabase, userId: string, colunaId: string): Promise<number> {
  const { data } = await supabase
    .from('kanban_cartoes')
    .select('ordem')
    .eq('user_id', userId)
    .eq('coluna_id', colunaId)
    .order('ordem', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (Number(data?.ordem) || 0) + 1
}
