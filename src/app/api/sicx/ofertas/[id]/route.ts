import { NextResponse } from 'next/server'
import { contextoUsuario, resposta401, respostaErro } from '@/lib/estacao/server'
import { inteiro, numero, objeto, texto } from '@/lib/sicx/validacao'

export const dynamic = 'force-dynamic'

/** PATCH /api/sicx/ofertas/[id] — edita a oferta do próprio usuário. */
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
  if ('descricao' in body) {
    const descricao = texto(body.descricao, 500)
    if (!descricao) return respostaErro('Descreva o item ofertado.')
    patch.descricao = descricao
  }
  if ('categoria' in body) patch.categoria = texto(body.categoria, 40) || 'outros'
  if ('unidade' in body) patch.unidade = texto(body.unidade, 20)
  if ('preco' in body) {
    const preco = numero(body.preco)
    if (preco == null || preco <= 0) return respostaErro('Informe um preço maior que zero.')
    patch.preco = preco
  }
  if ('estoque' in body) patch.estoque = inteiro(body.estoque)
  if ('prazo_dias' in body) patch.prazo_dias = inteiro(body.prazo_dias)
  if ('frete_por_uf' in body) patch.frete_por_uf = objeto(body.frete_por_uf)
  if ('condicoes' in body) patch.condicoes = objeto(body.condicoes)
  if ('custo_unitario' in body) patch.custo_unitario = numero(body.custo_unitario)
  if ('margem_pct' in body) patch.margem_pct = numero(body.margem_pct)
  if ('indice_competitividade' in body) patch.indice_competitividade = inteiro(body.indice_competitividade)

  if (!Object.keys(patch).length) return respostaErro('Nada para atualizar.')

  const { data, error } = await supabase
    .from('sicx_ofertas')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .maybeSingle()
  if (error) return respostaErro('Não foi possível atualizar a oferta.', 500)
  if (!data) return respostaErro('Oferta não encontrada.', 404)

  return NextResponse.json({ ok: true, oferta: data })
}

/** DELETE /api/sicx/ofertas/[id] — exclui a oferta do próprio usuário. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()
  const { id } = await params

  const { error } = await supabase.from('sicx_ofertas').delete().eq('id', id).eq('user_id', user.id)
  if (error) return respostaErro('Não foi possível excluir a oferta.', 500)
  return NextResponse.json({ ok: true })
}
