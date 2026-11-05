import { NextResponse } from 'next/server'
import { contextoUsuario, resposta401, respostaErro } from '@/lib/estacao/server'
import { inteiro, numero, objeto, texto } from '@/lib/sicx/validacao'

export const dynamic = 'force-dynamic'

/** GET /api/sicx/ofertas — ofertas cadastradas pelo usuário. */
export async function GET() {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()

  const { data, error } = await supabase
    .from('sicx_ofertas')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
  if (error) return respostaErro('Não foi possível carregar suas ofertas.', 500)

  return NextResponse.json({ ok: true, ofertas: data || [] })
}

/** POST /api/sicx/ofertas — cadastra uma oferta (simulador "Minha oferta"). */
export async function POST(req: Request) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return respostaErro('Corpo inválido.')
  }

  const descricao = texto(body.descricao, 500)
  if (!descricao) return respostaErro('Descreva o item ofertado.')

  const preco = numero(body.preco)
  if (preco == null || preco <= 0) return respostaErro('Informe um preço maior que zero.')

  const { data, error } = await supabase
    .from('sicx_ofertas')
    .insert({
      user_id: user.id,
      categoria: texto(body.categoria, 40) || 'outros',
      descricao,
      unidade: texto(body.unidade, 20),
      preco,
      estoque: inteiro(body.estoque),
      prazo_dias: inteiro(body.prazo_dias),
      frete_por_uf: objeto(body.frete_por_uf),
      condicoes: objeto(body.condicoes),
      custo_unitario: numero(body.custo_unitario),
      margem_pct: numero(body.margem_pct),
      indice_competitividade: inteiro(body.indice_competitividade),
    })
    .select('*')
    .maybeSingle()

  if (error) return respostaErro('Não foi possível salvar a oferta.', 500)
  return NextResponse.json({ ok: true, oferta: data })
}
