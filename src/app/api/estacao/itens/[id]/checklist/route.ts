import { NextResponse } from 'next/server'
import { contextoUsuario, resposta401, respostaErro } from '@/lib/estacao/server'

export const dynamic = 'force-dynamic'

/** POST /api/estacao/itens/[id]/checklist — adiciona item ao checklist. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()
  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return respostaErro('Corpo inválido.')
  }
  const descricao = String(body.descricao ?? '').trim().slice(0, 300)
  if (!descricao) return respostaErro('Descreva o item do checklist.')
  const ordem = Number.isFinite(Number(body.ordem)) ? Math.trunc(Number(body.ordem)) : 999

  const { data: item } = await supabase.from('workspace_itens').select('id').eq('id', id).maybeSingle()
  if (!item) return respostaErro('Item não encontrado.', 404)

  const { data, error } = await supabase
    .from('workspace_checklist')
    .insert({ item_id: id, user_id: user.id, descricao, ordem })
    .select('*')
    .single()
  if (error) return respostaErro('Não foi possível salvar o item.', 500)
  return NextResponse.json({ ok: true, checklist: data })
}
