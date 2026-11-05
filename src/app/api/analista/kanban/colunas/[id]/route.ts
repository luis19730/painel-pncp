import { NextResponse } from 'next/server'
import { contextoUsuario, resposta401, respostaErro } from '@/lib/estacao/server'
import { CORES_DISPONIVEIS } from '@/lib/analista/kanban'

export const dynamic = 'force-dynamic'

/** PATCH /api/analista/kanban/colunas/[id] — renomeia / muda a cor. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()
  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return respostaErro('Corpo inválido.')
  }

  const patch: Record<string, unknown> = {}
  if ('nome' in body) {
    const nome = String(body.nome ?? '').trim().slice(0, 80)
    if (!nome) return respostaErro('Informe o nome da coluna.')
    patch.nome = nome
  }
  if ('cor' in body) patch.cor = CORES_DISPONIVEIS.includes(String(body.cor)) ? String(body.cor) : 'slate'
  if (!Object.keys(patch).length) return respostaErro('Nada para atualizar.')

  const { data, error } = await supabase
    .from('kanban_colunas')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) {
    if (String(error.code) === '23505') return respostaErro('Já existe uma coluna com esse nome.')
    return respostaErro('Não foi possível atualizar a coluna.', 500)
  }
  if (!data) return respostaErro('Coluna não encontrada.', 404)

  return NextResponse.json({ ok: true, coluna: data })
}

/** DELETE /api/analista/kanban/colunas/[id] — remove a coluna (e seus cartões). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()
  const { id } = await params

  const { count } = await supabase
    .from('kanban_colunas')
    .select('id', { count: 'exact', head: true })
  if ((count || 0) <= 1) return respostaErro('Mantenha ao menos uma coluna no Kanban.')

  const { error } = await supabase.from('kanban_colunas').delete().eq('id', id)
  if (error) return respostaErro('Não foi possível excluir a coluna.', 500)

  return NextResponse.json({ ok: true })
}
