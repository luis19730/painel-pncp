import { NextResponse } from 'next/server'
import { contextoUsuario, resposta401, respostaErro } from '@/lib/estacao/server'
import { CORES_COLUNA } from '@/lib/sicx/kanban'
import { garantirColunasContratacoes } from '@/lib/sicx/contratacoes-server'
import { texto } from '@/lib/sicx/validacao'

export const dynamic = 'force-dynamic'

/** GET /api/sicx/contratacoes/colunas — colunas do Kanban (cria as padrão). */
export async function GET() {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()

  await garantirColunasContratacoes(supabase, user.id)

  const { data, error } = await supabase
    .from('sicx_contratacoes_colunas')
    .select('*')
    .eq('user_id', user.id)
    .order('ordem', { ascending: true })
  if (error) return respostaErro('Não foi possível carregar as colunas.', 500)

  return NextResponse.json({ ok: true, colunas: data || [] })
}

/** POST /api/sicx/contratacoes/colunas — cria uma coluna no fim do quadro. */
export async function POST(req: Request) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return respostaErro('Corpo inválido.')
  }

  const nome = texto(body.nome, 80)
  if (!nome) return respostaErro('Informe o nome da coluna.')
  const cor = Object.prototype.hasOwnProperty.call(CORES_COLUNA, String(body.cor)) ? String(body.cor) : 'slate'

  const { data: ultima } = await supabase
    .from('sicx_contratacoes_colunas')
    .select('ordem')
    .eq('user_id', user.id)
    .order('ordem', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await supabase
    .from('sicx_contratacoes_colunas')
    .insert({ user_id: user.id, nome, cor, ordem: (Number(ultima?.ordem) || 0) + 1 })
    .select('*')
    .maybeSingle()

  if (error) {
    if (String(error.code) === '23505') return respostaErro('Já existe uma coluna com esse nome.')
    return respostaErro('Não foi possível criar a coluna.', 500)
  }

  return NextResponse.json({ ok: true, coluna: data })
}

/** PUT /api/sicx/contratacoes/colunas — reordena (body: { ordem: [ids] }). */
export async function PUT(req: Request) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return respostaErro('Corpo inválido.')
  }

  const ids = Array.isArray(body.ordem) ? body.ordem.map(String).filter(Boolean) : []
  if (!ids.length) return respostaErro('Informe a nova ordem das colunas.')

  const resultados = await Promise.all(
    ids.map((id, index) =>
      supabase
        .from('sicx_contratacoes_colunas')
        .update({ ordem: index })
        .eq('id', id)
        .eq('user_id', user.id)
    )
  )
  if (resultados.some((r) => r.error)) return respostaErro('Não foi possível reordenar as colunas.', 500)

  return NextResponse.json({ ok: true })
}
