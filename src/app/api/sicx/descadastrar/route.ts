import { NextResponse } from 'next/server'
import { contextoUsuario, respostaErro } from '@/lib/estacao/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/sicx/descadastrar — remove o interesse a partir do token enviado
 * por e-mail. A função no banco é SECURITY DEFINER e só marca
 * `descadastrado_em`, sem expor a lista.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return respostaErro('Corpo inválido.')
  }

  const token = String(body.token ?? '').trim()
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    return respostaErro('Link de descadastro inválido.')
  }

  const { supabase } = await contextoUsuario()
  const { data, error } = await supabase.rpc('sicx_descadastrar', { p_token: token })
  if (error) return respostaErro('Não foi possível concluir o descadastro.', 500)

  return NextResponse.json({ ok: true, descadastrado: data === true })
}
