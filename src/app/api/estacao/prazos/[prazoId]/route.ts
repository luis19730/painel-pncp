import { NextResponse } from 'next/server'
import { contextoUsuario, resposta401, respostaErro } from '@/lib/estacao/server'
import { TIPOS_PRAZO } from '@/lib/estacao/config'

export const dynamic = 'force-dynamic'

const TIPOS = new Set<string>(TIPOS_PRAZO.map((t) => t.id))

/** PATCH /api/estacao/prazos/[prazoId] — concluir, editar data/título/tipo. */
export async function PATCH(req: Request, { params }: { params: Promise<{ prazoId: string }> }) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()
  const { prazoId } = await params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return respostaErro('Corpo inválido.')
  }

  const patch: Record<string, unknown> = {}
  if (typeof body.concluido === 'boolean') patch.concluido = body.concluido
  if (typeof body.titulo === 'string') patch.titulo = body.titulo.trim().slice(0, 200) || null
  if (typeof body.tipo === 'string') {
    if (!TIPOS.has(body.tipo)) return respostaErro('Tipo de prazo inválido.')
    patch.tipo = body.tipo
  }
  if (typeof body.data_hora === 'string') {
    if (Number.isNaN(new Date(body.data_hora).getTime())) return respostaErro('Data/hora inválida.')
    patch.data_hora = body.data_hora
    // Mudou a data → o alerta pode ser enviado de novo.
    patch.alerta_enviado = false
  }
  if (!Object.keys(patch).length) return respostaErro('Nada para atualizar.')

  const { data, error } = await supabase
    .from('workspace_prazos')
    .update(patch)
    .eq('id', prazoId)
    .select('*')
    .maybeSingle()
  if (error) return respostaErro('Não foi possível atualizar o prazo.', 500)
  if (!data) return respostaErro('Prazo não encontrado.', 404)
  return NextResponse.json({ ok: true, prazo: data })
}

/** DELETE /api/estacao/prazos/[prazoId] */
export async function DELETE(_req: Request, { params }: { params: Promise<{ prazoId: string }> }) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()
  const { prazoId } = await params
  const { error } = await supabase.from('workspace_prazos').delete().eq('id', prazoId)
  if (error) return respostaErro('Não foi possível excluir o prazo.', 500)
  return NextResponse.json({ ok: true })
}
