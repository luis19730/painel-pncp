import { NextResponse } from 'next/server'
import { contextoUsuario, resposta401, respostaErro } from '@/lib/estacao/server'
import { COLUNAS_PADRAO, CORES_DISPONIVEIS } from '@/lib/analista/kanban'

export const dynamic = 'force-dynamic'

/**
 * Garante as 10 colunas padrão no primeiro acesso.
 * `ignoreDuplicates` evita erro se duas abas criarem ao mesmo tempo
 * (a constraint unique(user_id, nome) protege o banco).
 */
async function garantirColunas(supabase: Awaited<ReturnType<typeof contextoUsuario>>['supabase'], userId: string) {
  const { data: existentes } = await supabase.from('kanban_colunas').select('id').limit(1)
  if (existentes && existentes.length > 0) return

  await supabase.from('kanban_colunas').upsert(
    COLUNAS_PADRAO.map((c, i) => ({
      user_id: userId,
      nome: c.nome,
      ordem: i,
      cor: c.cor,
    })),
    { onConflict: 'user_id,nome', ignoreDuplicates: true }
  )
}

/** GET /api/analista/kanban/colunas — colunas do Kanban (cria as padrão no 1º acesso). */
export async function GET() {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()

  await garantirColunas(supabase, user.id)

  const { data, error } = await supabase
    .from('kanban_colunas')
    .select('*')
    .order('ordem', { ascending: true })
    .order('criado_em', { ascending: true })
  if (error) return respostaErro('Não foi possível carregar as colunas.', 500)

  return NextResponse.json({ ok: true, colunas: data || [] })
}

/** POST /api/analista/kanban/colunas — cria uma coluna no fim do quadro. */
export async function POST(req: Request) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return respostaErro('Corpo inválido.')
  }

  const nome = String(body.nome ?? '').trim().slice(0, 80)
  if (!nome) return respostaErro('Informe o nome da coluna.')
  const cor = CORES_DISPONIVEIS.includes(String(body.cor)) ? String(body.cor) : 'slate'

  const { data: ultima } = await supabase
    .from('kanban_colunas')
    .select('ordem')
    .order('ordem', { ascending: false })
    .limit(1)
    .maybeSingle()

  const ordem = (Number(ultima?.ordem) || 0) + 1

  const { data, error } = await supabase
    .from('kanban_colunas')
    .insert({ user_id: user.id, nome, cor, ordem })
    .select('*')
    .maybeSingle()

  if (error) {
    if (String(error.code) === '23505') return respostaErro('Já existe uma coluna com esse nome.')
    return respostaErro('Não foi possível criar a coluna.', 500)
  }

  return NextResponse.json({ ok: true, coluna: data })
}

/** PUT /api/analista/kanban/colunas — reordena (body: { ordem: [ids...] }). */
export async function PUT(req: Request) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return respostaErro('Corpo inválido.')
  }

  const ids = Array.isArray(body.ordem) ? body.ordem.map(String).filter(Boolean) : []
  if (!ids.length) return respostaErro('Informe a nova ordem das colunas.')

  const resultados = await Promise.all(
    ids.map((id, index) =>
      supabase
        .from('kanban_colunas')
        .update({ ordem: index })
        .eq('id', id)
        .eq('user_id', user.id)
    )
  )
  if (resultados.some((r) => r.error)) return respostaErro('Não foi possível reordenar as colunas.', 500)

  return NextResponse.json({ ok: true })
}
