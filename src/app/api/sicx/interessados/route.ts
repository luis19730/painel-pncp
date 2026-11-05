import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { contextoUsuario, respostaErro } from '@/lib/estacao/server'
import { emailValido, texto } from '@/lib/sicx/validacao'

export const dynamic = 'force-dynamic'

/**
 * POST /api/sicx/interessados — captura de interesse (LGPD).
 * Público, mas exige consentimento explícito. Devolve o token de descadastro
 * para a interface exibir o link de saída.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return respostaErro('Corpo inválido.')
  }

  const email = emailValido(body.email)
  if (!email) return respostaErro('Informe um e-mail válido.')
  if (body.consentimento !== true) {
    return respostaErro('É necessário concordar com o uso dos dados para receber as atualizações.')
  }

  const whatsapp = texto(body.whatsapp, 40)
  const origem = texto(body.origem, 80) || 'pagina-sicx'

  // Usuário logado (opcional) — user_id nunca vem do cliente.
  const { user } = await contextoUsuario()

  const admin = createAdminClient()
  const supabase = admin
  if (!supabase) {
    // Sem service role, usa o cliente de sessão/anon: a policy pública permite
    // INSERT quando consentimento = true.
    const { createClient } = await import('@/lib/supabase/server')
    const sessao = await createClient()
    const { data, error } = await sessao
      .from('sicx_interessados')
      .insert({ email, whatsapp, consentimento: true, origem, ...(user ? { user_id: user.id } : {}) })
      .select('token')
      .maybeSingle()
    if (error) {
      if (String(error.code) === '23505') {
        return NextResponse.json({ ok: true, jaCadastrado: true, token: null })
      }
      return respostaErro('Não foi possível registrar o interesse.', 500)
    }
    return NextResponse.json({ ok: true, token: data?.token ?? null })
  }

  const { data: existente } = await supabase
    .from('sicx_interessados')
    .select('id, token, descadastrado_em')
    .ilike('email', email)
    .maybeSingle()

  if (existente) {
    if (existente.descadastrado_em) {
      const { data, error } = await supabase
        .from('sicx_interessados')
        .update({ descadastrado_em: null, whatsapp, origem, consentimento: true })
        .eq('id', existente.id)
        .select('token')
        .maybeSingle()
      if (error) return respostaErro('Não foi possível reativar o cadastro.', 500)
      return NextResponse.json({ ok: true, token: data?.token ?? existente.token })
    }
    return NextResponse.json({ ok: true, jaCadastrado: true, token: existente.token })
  }

  const { data, error } = await supabase
    .from('sicx_interessados')
    .insert({ email, whatsapp, consentimento: true, origem, ...(user ? { user_id: user.id } : {}) })
    .select('token')
    .maybeSingle()

  if (error) return respostaErro('Não foi possível registrar o interesse.', 500)
  return NextResponse.json({ ok: true, token: data?.token ?? null })
}

/** GET /api/sicx/interessados — lista (admin). */
export async function GET() {
  const { supabase, user } = await contextoUsuario()
  if (!user) return respostaErro('Não autenticado.', 401)

  const { data, error } = await supabase
    .from('sicx_interessados')
    .select('id, email, whatsapp, origem, created_at, descadastrado_em')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) return respostaErro('Acesso restrito à administração.', 403)

  return NextResponse.json({ ok: true, interessados: data || [] })
}
