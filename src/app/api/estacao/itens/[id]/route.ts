import { NextResponse } from 'next/server'
import { contextoUsuario, resposta401, respostaErro } from '@/lib/estacao/server'
import { ETAPAS } from '@/lib/estacao/config'

export const dynamic = 'force-dynamic'

const ETAPAS_VALIDAS = new Set<string>([...ETAPAS.map((e) => e.id), 'descartada'])

/** GET /api/estacao/itens/[id] — ficha completa (item + notas + prazos + checklist). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()
  const { id } = await params

  const { data: item } = await supabase.from('workspace_itens').select('*').eq('id', id).maybeSingle()
  if (!item) return respostaErro('Item não encontrado.', 404)

  const [notas, prazos, checklist] = await Promise.all([
    supabase.from('workspace_notas').select('*').eq('item_id', id).order('criado_em', { ascending: false }),
    supabase.from('workspace_prazos').select('*').eq('item_id', id).order('data_hora', { ascending: true }),
    supabase.from('workspace_checklist').select('*').eq('item_id', id).order('ordem', { ascending: true }),
  ])

  return NextResponse.json({
    ok: true,
    item,
    notas: notas.data || [],
    prazos: prazos.data || [],
    checklist: checklist.data || [],
  })
}

/** PATCH /api/estacao/itens/[id] — altera etapa e/ou ordem. */
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
  if (typeof body.etapa === 'string') {
    if (!ETAPAS_VALIDAS.has(body.etapa)) return respostaErro('Etapa inválida.')
    patch.etapa = body.etapa
  }
  if (Number.isFinite(Number(body.ordem))) patch.ordem = Math.trunc(Number(body.ordem))
  if (!Object.keys(patch).length) return respostaErro('Nada para atualizar.')

  const { data, error } = await supabase
    .from('workspace_itens')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle()
  if (error) return respostaErro('Não foi possível atualizar o item.', 500)
  if (!data) return respostaErro('Item não encontrado.', 404)
  return NextResponse.json({ ok: true, item: data })
}

/** DELETE /api/estacao/itens/[id] — remove o item (cascata em notas/prazos/checklist). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()
  const { id } = await params

  const { error } = await supabase.from('workspace_itens').delete().eq('id', id)
  if (error) return respostaErro('Não foi possível remover o item.', 500)
  return NextResponse.json({ ok: true })
}
