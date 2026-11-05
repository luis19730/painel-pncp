import { NextResponse } from 'next/server'
import { contextoUsuario, resposta401, respostaErro } from '@/lib/estacao/server'

export const dynamic = 'force-dynamic'

const CENARIOS = new Set(['otimista', 'realista', 'pessimista'])

function texto(v: unknown, max = 400): string | null {
  const s = String(v ?? '').trim()
  return s ? s.slice(0, max) : null
}

function numeroOuNull(v: unknown): number | null {
  const n = Number(v)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}

function objeto(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

/** GET /api/analista/analises — análises salvas do usuário. */
export async function GET(req: Request) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()

  const url = new URL(req.url)
  const edital = (url.searchParams.get('edital') || '').trim()

  let query = supabase
    .from('analista_analises')
    .select('id, edital_ref, titulo, cenario, veredito, margem_liquida, valor_referencia, valor_ofertado, criado_em, atualizado_em')
    .order('atualizado_em', { ascending: false })
    .limit(100)

  if (edital) query = query.eq('edital_ref', edital)

  const { data, error } = await query
  if (error) return respostaErro('Não foi possível carregar as análises.', 500)

  return NextResponse.json({ ok: true, analises: data || [] })
}

/** POST /api/analista/analises — salva uma nova análise. */
export async function POST(req: Request) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return respostaErro('Corpo inválido.')
  }

  const cenario = CENARIOS.has(String(body.cenario)) ? String(body.cenario) : 'realista'

  const registro = {
    user_id: user.id,
    edital_ref: texto(body.edital_ref, 80),
    titulo: texto(body.titulo, 300) || 'Análise sem título',
    cenario,
    entradas: objeto(body.entradas),
    resultados: objeto(body.resultados),
    historico: Array.isArray(body.historico) ? body.historico.slice(0, 10) : [],
    veredito: texto(body.veredito, 20),
    margem_liquida: numeroOuNull(body.margem_liquida),
    valor_referencia: numeroOuNull(body.valor_referencia),
    valor_ofertado: numeroOuNull(body.valor_ofertado),
  }

  const { data, error } = await supabase.from('analista_analises').insert(registro).select('*').maybeSingle()
  if (error) return respostaErro('Não foi possível salvar a análise.', 500)

  return NextResponse.json({ ok: true, analise: data })
}
