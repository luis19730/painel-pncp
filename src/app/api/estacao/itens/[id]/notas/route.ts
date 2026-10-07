import { NextResponse } from 'next/server'
import { contextoUsuario, resposta401, respostaErro } from '@/lib/estacao/server'

export const dynamic = 'force-dynamic'

/** POST /api/estacao/itens/[id]/notas — adiciona uma nota. */
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
  const texto = String(body.texto ?? '').trim().slice(0, 8000)
  if (!texto) return respostaErro('Escreva a nota.')

  const { data: item } = await supabase.from('workspace_itens').select('id').eq('id', id).maybeSingle()
  if (!item) return respostaErro('Item não encontrado.', 404)

  const { data, error } = await supabase
    .from('workspace_notas')
    .insert({ item_id: id, user_id: user.id, texto })
    .select('*')
    .single()
  if (error) return respostaErro('Não foi possível salvar a nota.', 500)
  return NextResponse.json({ ok: true, nota: data })
}
