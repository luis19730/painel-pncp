import { NextResponse } from 'next/server'
import { contextoUsuario, resposta401, respostaErro } from '@/lib/estacao/server'
import { CHECKLIST_PREPARO } from '@/lib/sicx/conteudo'
import { progressoChecklist } from '@/lib/sicx/calc'
import { booleano, dataISO, texto } from '@/lib/sicx/validacao'

export const dynamic = 'force-dynamic'

/** GET /api/sicx/preparo — checklist "Meu preparo" + data-alvo do usuário. */
export async function GET() {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()

  const [itens, preparo] = await Promise.all([
    supabase
      .from('sicx_checklist')
      .select('item_key, feito, validade, updated_at')
      .eq('user_id', user.id),
    supabase
      .from('sicx_preparo')
      .select('data_alvo, updated_at')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  if (itens.error) return respostaErro('Não foi possível carregar o checklist.', 500)

  const salvos = (itens.data || []) as Array<{ item_key: string; feito: boolean; validade: string | null }>
  return NextResponse.json({
    ok: true,
    itens: salvos,
    data_alvo: preparo.data?.data_alvo ?? null,
    progresso: progressoChecklist(CHECKLIST_PREPARO, salvos),
  })
}

/**
 * PUT /api/sicx/preparo — salva um item do checklist ou a data-alvo.
 * Body: { item_key, feito?, validade? } ou { data_alvo }.
 * O user_id vem SEMPRE da sessão (RLS reforça).
 */
export async function PUT(req: Request) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return respostaErro('Corpo inválido.')
  }

  if ('data_alvo' in body) {
    const data = dataISO(body.data_alvo)
    const { error } = await supabase
      .from('sicx_preparo')
      .upsert({ user_id: user.id, data_alvo: data, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (error) return respostaErro('Não foi possível salvar a data-alvo.', 500)
    return NextResponse.json({ ok: true, data_alvo: data })
  }

  const itemKey = texto(body.item_key, 60)
  if (!itemKey) return respostaErro('Informe o item do checklist.')
  if (!CHECKLIST_PREPARO.some((i) => i.key === itemKey)) return respostaErro('Item de checklist inválido.')

  const patch: Record<string, unknown> = {
    user_id: user.id,
    item_key: itemKey,
    updated_at: new Date().toISOString(),
  }
  if ('feito' in body) patch.feito = booleano(body.feito)
  if ('validade' in body) patch.validade = dataISO(body.validade)

  const { data, error } = await supabase
    .from('sicx_checklist')
    .upsert(patch, { onConflict: 'user_id,item_key' })
    .select('item_key, feito, validade, updated_at')
    .maybeSingle()

  if (error) return respostaErro('Não foi possível salvar o checklist.', 500)
  return NextResponse.json({ ok: true, item: data })
}
