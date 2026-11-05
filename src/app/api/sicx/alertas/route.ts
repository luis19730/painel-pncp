import { NextResponse } from 'next/server'
import { contextoUsuario, resposta401, respostaErro } from '@/lib/estacao/server'
import { texto } from '@/lib/sicx/validacao'

export const dynamic = 'force-dynamic'

const TIPOS = ['item', 'norma', 'status', 'prazo']

/** GET /api/sicx/alertas — assinaturas de novidades do usuário. */
export async function GET() {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()

  const { data, error } = await supabase
    .from('sicx_alertas')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (error) return respostaErro('Não foi possível carregar os alertas.', 500)

  return NextResponse.json({ ok: true, alertas: data || [] })
}

/** POST /api/sicx/alertas — assina uma novidade (norma, status etc.). */
export async function POST(req: Request) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return respostaErro('Corpo inválido.')
  }

  const tipo = TIPOS.includes(String(body.tipo)) ? String(body.tipo) : 'norma'
  const referencia = texto(body.referencia, 120)
  if (!referencia) return respostaErro('Informe o que deseja acompanhar.')
  const canal = body.canal === 'email' ? 'email' : 'interno'

  const { data, error } = await supabase
    .from('sicx_alertas')
    .upsert(
      { user_id: user.id, tipo, referencia, canal, ativo: true },
      { onConflict: 'user_id,tipo,referencia' }
    )
    .select('*')
    .maybeSingle()

  if (error) return respostaErro('Não foi possível criar o alerta.', 500)
  return NextResponse.json({ ok: true, alerta: data })
}

/** DELETE /api/sicx/alertas?id=<uuid> — cancela a assinatura. */
export async function DELETE(req: Request) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()

  const id = new URL(req.url).searchParams.get('id') || ''
  if (!id) return respostaErro('Informe o alerta a remover.')

  const { error } = await supabase.from('sicx_alertas').delete().eq('id', id).eq('user_id', user.id)
  if (error) return respostaErro('Não foi possível remover o alerta.', 500)
  return NextResponse.json({ ok: true })
}
