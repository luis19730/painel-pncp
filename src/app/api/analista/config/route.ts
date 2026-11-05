import { NextResponse } from 'next/server'
import { contextoUsuario, resposta401, respostaErro } from '@/lib/estacao/server'
import { configParaBanco, normalizarConfig } from '@/lib/analista/config'

export const dynamic = 'force-dynamic'

/** GET /api/analista/config — preferências do analista (padrões se ainda não salvas). */
export async function GET() {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()

  const { data, error } = await supabase.from('analista_config').select('*').maybeSingle()
  if (error) return respostaErro('Não foi possível carregar as configurações.', 500)

  return NextResponse.json({ ok: true, config: normalizarConfig(data) })
}

/** PUT /api/analista/config — salva (upsert) as preferências do usuário. */
export async function PUT(req: Request) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return respostaErro('Corpo inválido.')
  }

  const config = normalizarConfig(body)
  const { data, error } = await supabase
    .from('analista_config')
    .upsert({ user_id: user.id, ...configParaBanco(config) }, { onConflict: 'user_id' })
    .select('*')
    .maybeSingle()

  if (error) return respostaErro('Não foi possível salvar as configurações.', 500)

  return NextResponse.json({ ok: true, config: normalizarConfig(data) })
}
