import { NextResponse } from 'next/server'
import { contextoUsuario, resposta401, respostaErro } from '@/lib/estacao/server'

export const dynamic = 'force-dynamic'

/** PATCH /api/estacao/notas/[notaId] — edita o texto da nota. */
export async function PATCH(req: Request, { params }: { params: Promise<{ notaId: string }> }) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()
  const { notaId } = await params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return respostaErro('Corpo inválido.')
  }
  const texto = String(body.texto ?? '').trim().slice(0, 8000)
  if (!texto) return respostaErro('Escreva a nota.')

  const { data, error } = await supabase
    .from('workspace_notas')
    .update({ texto })
    .eq('id', notaId)
    .select('*')
    .maybeSingle()
  if (error) return respostaErro('Não foi possível editar a nota.', 500)
  if (!data) return respostaErro('Nota não encontrada.', 404)
  return NextResponse.json({ ok: true, nota: data })
}

/** DELETE /api/estacao/notas/[notaId] */
export async function DELETE(_req: Request, { params }: { params: Promise<{ notaId: string }> }) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()
  const { notaId } = await params
  const { error } = await supabase.from('workspace_notas').delete().eq('id', notaId)
  if (error) return respostaErro('Não foi possível excluir a nota.', 500)
  return NextResponse.json({ ok: true })
}
