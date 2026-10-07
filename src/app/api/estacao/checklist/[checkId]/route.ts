import { NextResponse } from 'next/server'
import { contextoUsuario, resposta401, respostaErro } from '@/lib/estacao/server'

export const dynamic = 'force-dynamic'

/** PATCH /api/estacao/checklist/[checkId] — concluir/editar/remarcar. */
export async function PATCH(req: Request, { params }: { params: Promise<{ checkId: string }> }) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()
  const { checkId } = await params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return respostaErro('Corpo inválido.')
  }

  const patch: Record<string, unknown> = {}
  if (typeof body.concluido === 'boolean') patch.concluido = body.concluido
  if (typeof body.descricao === 'string') {
    const d = body.descricao.trim().slice(0, 300)
    if (!d) return respostaErro('Descrição obrigatória.')
    patch.descricao = d
  }
  if (Number.isFinite(Number(body.ordem))) patch.ordem = Math.trunc(Number(body.ordem))
  if (!Object.keys(patch).length) return respostaErro('Nada para atualizar.')

  const { data, error } = await supabase
    .from('workspace_checklist')
    .update(patch)
    .eq('id', checkId)
    .select('*')
    .maybeSingle()
  if (error) return respostaErro('Não foi possível atualizar o item.', 500)
  if (!data) return respostaErro('Item não encontrado.', 404)
  return NextResponse.json({ ok: true, checklist: data })
}

/** DELETE /api/estacao/checklist/[checkId] */
export async function DELETE(_req: Request, { params }: { params: Promise<{ checkId: string }> }) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()
  const { checkId } = await params
  const { error } = await supabase.from('workspace_checklist').delete().eq('id', checkId)
  if (error) return respostaErro('Não foi possível excluir o item.', 500)
  return NextResponse.json({ ok: true })
}
