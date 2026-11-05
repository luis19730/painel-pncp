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

/** GET /api/analista/analises/[id] — análise completa (entradas + resultados + histórico). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()
  const { id } = await params

  const { data, error } = await supabase.from('analista_analises').select('*').eq('id', id).maybeSingle()
  if (error) return respostaErro('Não foi possível carregar a análise.', 500)
  if (!data) return respostaErro('Análise não encontrada.', 404)

  return NextResponse.json({ ok: true, analise: data })
}

/** PUT /api/analista/analises/[id] — edita e guarda a versão anterior no histórico. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()
  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return respostaErro('Corpo inválido.')
  }

  const { data: atual, error: erroAtual } = await supabase
    .from('analista_analises')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (erroAtual) return respostaErro('Não foi possível carregar a análise.', 500)
  if (!atual) return respostaErro('Análise não encontrada.', 404)

  const historicoAtual = Array.isArray(atual.historico) ? atual.historico : []
  const versaoAnterior = {
    em: atual.atualizado_em || new Date().toISOString(),
    titulo: atual.titulo,
    cenario: atual.cenario,
    veredito: atual.veredito,
    margem_liquida: atual.margem_liquida,
    entradas: atual.entradas,
    resultados: atual.resultados,
  }
  const historico = [versaoAnterior, ...historicoAtual].slice(0, 10)

  const patch: Record<string, unknown> = { historico }
  if ('edital_ref' in body) patch.edital_ref = texto(body.edital_ref, 80)
  if ('titulo' in body) patch.titulo = texto(body.titulo, 300) || 'Análise sem título'
  if ('cenario' in body) patch.cenario = CENARIOS.has(String(body.cenario)) ? String(body.cenario) : atual.cenario
  if ('entradas' in body) patch.entradas = objeto(body.entradas)
  if ('resultados' in body) patch.resultados = objeto(body.resultados)
  if ('veredito' in body) patch.veredito = texto(body.veredito, 20)
  if ('margem_liquida' in body) patch.margem_liquida = numeroOuNull(body.margem_liquida)
  if ('valor_referencia' in body) patch.valor_referencia = numeroOuNull(body.valor_referencia)
  if ('valor_ofertado' in body) patch.valor_ofertado = numeroOuNull(body.valor_ofertado)

  const { data, error } = await supabase
    .from('analista_analises')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle()
  if (error) return respostaErro('Não foi possível salvar a análise.', 500)

  return NextResponse.json({ ok: true, analise: data })
}

/** POST /api/analista/analises/[id] — duplica a análise. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()
  const { id } = await params

  const { data: original, error: erroOriginal } = await supabase
    .from('analista_analises')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (erroOriginal) return respostaErro('Não foi possível carregar a análise.', 500)
  if (!original) return respostaErro('Análise não encontrada.', 404)

  const { data, error } = await supabase
    .from('analista_analises')
    .insert({
      user_id: user.id,
      edital_ref: original.edital_ref,
      titulo: `${original.titulo || 'Análise'} (cópia)`.slice(0, 300),
      cenario: original.cenario,
      entradas: original.entradas,
      resultados: original.resultados,
      historico: [],
      veredito: original.veredito,
      margem_liquida: original.margem_liquida,
      valor_referencia: original.valor_referencia,
      valor_ofertado: original.valor_ofertado,
    })
    .select('*')
    .maybeSingle()
  if (error) return respostaErro('Não foi possível duplicar a análise.', 500)

  return NextResponse.json({ ok: true, analise: data })
}

/** DELETE /api/analista/analises/[id] — remove a análise. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()
  const { id } = await params

  const { error } = await supabase.from('analista_analises').delete().eq('id', id)
  if (error) return respostaErro('Não foi possível excluir a análise.', 500)

  return NextResponse.json({ ok: true })
}
