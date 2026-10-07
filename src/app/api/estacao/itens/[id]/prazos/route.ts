import { NextResponse } from 'next/server'
import { contextoUsuario, resposta401, respostaErro } from '@/lib/estacao/server'
import { TIPOS_PRAZO, type PrazoTipo } from '@/lib/estacao/config'

export const dynamic = 'force-dynamic'

const TIPOS = new Set<string>(TIPOS_PRAZO.map((t) => t.id))

/** POST /api/estacao/itens/[id]/prazos — adiciona um prazo. */
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

  const tipo = (String(body.tipo || 'outro') as PrazoTipo)
  if (!TIPOS.has(tipo)) return respostaErro('Tipo de prazo inválido.')
  const dataHora = String(body.data_hora || '').trim()
  if (!dataHora || Number.isNaN(new Date(dataHora).getTime())) return respostaErro('Informe uma data/hora válida.')
  const titulo = String(body.titulo ?? '').trim().slice(0, 200) || null

  const { data: item } = await supabase.from('workspace_itens').select('id').eq('id', id).maybeSingle()
  if (!item) return respostaErro('Item não encontrado.', 404)

  const { data, error } = await supabase
    .from('workspace_prazos')
    .insert({ item_id: id, user_id: user.id, tipo, data_hora: dataHora, titulo })
    .select('*')
    .single()
  if (error) return respostaErro('Não foi possível salvar o prazo.', 500)
  return NextResponse.json({ ok: true, prazo: data })
}
