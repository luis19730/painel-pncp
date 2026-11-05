import { NextResponse } from 'next/server'
import { contextoUsuario, respostaErro } from '@/lib/estacao/server'
import { texto, urlSegura } from '@/lib/sicx/validacao'

export const dynamic = 'force-dynamic'

/**
 * POST /api/sicx/sugestoes — sugestão pública de almoxarifado/catálogo.
 * Cria uma linha "pendente" para análise do admin.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return respostaErro('Corpo inválido.')
  }

  const nome = texto(body.nome, 200)
  if (!nome) return respostaErro('Informe o nome do almoxarifado ou catálogo.')

  const url = urlSegura(body.url)
  if (body.url && !url) return respostaErro('Informe um endereço http(s) válido.')

  const dados = {
    nome,
    orgao: texto(body.orgao, 200),
    uf: texto(body.uf, 2)?.toUpperCase() || null,
    esfera: texto(body.esfera, 20) || null,
    url,
    observacao: texto(body.observacao, 1500),
  }

  const { supabase, user } = await contextoUsuario()
  const { error } = await supabase.from('sicx_sugestoes').insert({
    user_id: user?.id ?? null,
    dados,
    status: 'pendente',
  })

  if (error) return respostaErro('Não foi possível registrar a sugestão.', 500)
  return NextResponse.json({ ok: true })
}
