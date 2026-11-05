import { NextResponse } from 'next/server'
import { contextoUsuario, resposta401, respostaErro } from '@/lib/estacao/server'
import { booleano, objeto, texto } from '@/lib/sicx/validacao'

export const dynamic = 'force-dynamic'

/** GET /api/sicx/itens-salvos — itens de interesse salvos pelo usuário. */
export async function GET() {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()

  const { data, error } = await supabase
    .from('sicx_itens_salvos')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (error) return respostaErro('Não foi possível carregar os itens salvos.', 500)

  return NextResponse.json({ ok: true, itens: data || [] })
}

/** POST /api/sicx/itens-salvos — salva/atualiza um termo e o alerta. */
export async function POST(req: Request) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return respostaErro('Corpo inválido.')
  }

  const termo = texto(body.termo, 120)
  if (!termo) return respostaErro('Informe o item que deseja salvar.')

  const { data, error } = await supabase
    .from('sicx_itens_salvos')
    .upsert(
      {
        user_id: user.id,
        termo,
        filtros: objeto(body.filtros),
        alerta_ativo: booleano(body.alerta_ativo),
      },
      { onConflict: 'user_id,termo' }
    )
    .select('*')
    .maybeSingle()

  if (error) return respostaErro('Não foi possível salvar o item.', 500)
  return NextResponse.json({ ok: true, item: data })
}

/** DELETE /api/sicx/itens-salvos?id=<uuid> — remove um item salvo. */
export async function DELETE(req: Request) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()

  const id = new URL(req.url).searchParams.get('id') || ''
  if (!id) return respostaErro('Informe o item a remover.')

  const { error } = await supabase.from('sicx_itens_salvos').delete().eq('id', id).eq('user_id', user.id)
  if (error) return respostaErro('Não foi possível remover o item.', 500)
  return NextResponse.json({ ok: true })
}
