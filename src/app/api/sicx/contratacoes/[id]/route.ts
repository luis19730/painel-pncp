import { NextResponse } from 'next/server'
import { contextoUsuario, resposta401, respostaErro } from '@/lib/estacao/server'
import { colunaDoUsuario } from '@/lib/sicx/contratacoes-server'
import { dataISO, inteiro, numero, texto } from '@/lib/sicx/validacao'

export const dynamic = 'force-dynamic'

/** GET /api/sicx/contratacoes/[id] — ficha do cartão com notas e histórico. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()
  const { id } = await params

  const { data: cartao, error } = await supabase
    .from('sicx_contratacoes')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) return respostaErro('Não foi possível carregar a contratação.', 500)
  if (!cartao) return respostaErro('Contratação não encontrada.', 404)

  const [notas, historico] = await Promise.all([
    supabase
      .from('sicx_contratacoes_notas')
      .select('*')
      .eq('contratacao_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('sicx_contratacoes_historico')
      .select('*')
      .eq('contratacao_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  return NextResponse.json({
    ok: true,
    cartao,
    notas: notas.data || [],
    historico: historico.data || [],
  })
}

/** PATCH /api/sicx/contratacoes/[id] — edita campos e move de coluna. */
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

  const { data: atual, error: erroAtual } = await supabase
    .from('sicx_contratacoes')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (erroAtual) return respostaErro('Não foi possível carregar a contratação.', 500)
  if (!atual) return respostaErro('Contratação não encontrada.', 404)

  const patch: Record<string, unknown> = {}
  if ('orgao' in body) patch.orgao = texto(body.orgao, 300)
  if ('item' in body) {
    const item = texto(body.item, 300)
    if (!item) return respostaErro('Informe o item da contratação.')
    patch.item = item
  }
  if ('quantidade' in body) patch.quantidade = numero(body.quantidade, 3)
  if ('valor' in body) patch.valor = numero(body.valor)
  if ('margem_prevista' in body) patch.margem_prevista = numero(body.margem_prevista)
  if ('margem_realizada' in body) patch.margem_realizada = numero(body.margem_realizada)
  if ('motivo_problema' in body) patch.motivo_problema = texto(body.motivo_problema, 1000)
  if ('ordem' in body) patch.ordem = inteiro(body.ordem) ?? 0
  if ('checklist' in body && Array.isArray(body.checklist)) patch.checklist = body.checklist

  if ('datas' in body && body.datas && typeof body.datas === 'object') {
    const datas = body.datas as Record<string, unknown>
    patch.datas = {
      pedido: dataISO(datas.pedido),
      prazo_entrega: dataISO(datas.prazo_entrega),
      pagamento_previsto: dataISO(datas.pagamento_previsto),
      pago_em: dataISO(datas.pago_em),
    }
  }

  let deColuna: string | null = null
  if ('coluna_id' in body) {
    const colunaId = String(body.coluna_id ?? '').trim()
    if (!colunaId) return respostaErro('Coluna inválida.')
    if (!(await colunaDoUsuario(supabase, user.id, colunaId))) return respostaErro('Coluna inválida.', 404)
    if (colunaId !== atual.coluna_id) {
      deColuna = atual.coluna_id
      patch.coluna_id = colunaId
    }
  }

  if (!Object.keys(patch).length) return respostaErro('Nada para atualizar.')

  const { data, error } = await supabase
    .from('sicx_contratacoes')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .maybeSingle()
  if (error) return respostaErro('Não foi possível atualizar a contratação.', 500)

  if (deColuna !== null) {
    const ids = [deColuna, patch.coluna_id as string].filter(Boolean)
    const { data: nomes } = await supabase
      .from('sicx_contratacoes_colunas')
      .select('id, nome')
      .in('id', ids)
      .eq('user_id', user.id)
    const mapa = new Map((nomes || []).map((c: { id: string; nome: string }) => [c.id, c.nome]))
    await supabase.from('sicx_contratacoes_historico').insert({
      contratacao_id: id,
      user_id: user.id,
      de_coluna: mapa.get(deColuna) ?? null,
      para_coluna: mapa.get(patch.coluna_id as string) ?? null,
    })
  }

  return NextResponse.json({ ok: true, cartao: data })
}

/** POST /api/sicx/contratacoes/[id] — nota ou item de checklist. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()
  const { id } = await params

  const { data: cartao } = await supabase
    .from('sicx_contratacoes')
    .select('id, checklist')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!cartao) return respostaErro('Contratação não encontrada.', 404)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return respostaErro('Corpo inválido.')
  }

  const acao = String(body.acao ?? '')

  if (acao === 'nota') {
    const conteudo = texto(body.texto, 4000)
    if (!conteudo) return respostaErro('Escreva a anotação.')
    const { data, error } = await supabase
      .from('sicx_contratacoes_notas')
      .insert({ contratacao_id: id, user_id: user.id, texto: conteudo })
      .select('*')
      .maybeSingle()
    if (error) return respostaErro('Não foi possível salvar a anotação.', 500)
    return NextResponse.json({ ok: true, nota: data })
  }

  if (acao === 'remover_nota') {
    const notaId = texto(body.nota_id, 60)
    if (!notaId) return respostaErro('Nota inválida.')
    const { error } = await supabase
      .from('sicx_contratacoes_notas')
      .delete()
      .eq('id', notaId)
      .eq('contratacao_id', id)
      .eq('user_id', user.id)
    if (error) return respostaErro('Não foi possível excluir a anotação.', 500)
    return NextResponse.json({ ok: true })
  }

  if (acao === 'checklist') {
    const item = texto(body.item, 300)
    if (!item) return respostaErro('Descreva o item do checklist.')
    const atual = Array.isArray(cartao.checklist) ? cartao.checklist : []
    const novo = [...atual, { item, feito: false }]
    const { error } = await supabase
      .from('sicx_contratacoes')
      .update({ checklist: novo })
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) return respostaErro('Não foi possível adicionar ao checklist.', 500)
    return NextResponse.json({ ok: true, checklist: novo })
  }

  if (acao === 'check') {
    const indice = inteiro(body.indice)
    if (indice == null || indice < 0) return respostaErro('Item inválido.')
    const atual = Array.isArray(cartao.checklist) ? cartao.checklist : []
    if (indice >= atual.length) return respostaErro('Item inválido.', 404)
    const novo = atual.map((i: { item: string; feito: boolean }, n: number) =>
      n === indice ? { ...i, feito: body.feito === true } : i
    )
    const { error } = await supabase
      .from('sicx_contratacoes')
      .update({ checklist: novo })
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) return respostaErro('Não foi possível atualizar o checklist.', 500)
    return NextResponse.json({ ok: true, checklist: novo })
  }

  if (acao === 'remover_checklist') {
    const indice = inteiro(body.indice)
    if (indice == null || indice < 0) return respostaErro('Item inválido.')
    const atual = Array.isArray(cartao.checklist) ? cartao.checklist : []
    const novo = atual.filter((_: unknown, n: number) => n !== indice)
    const { error } = await supabase
      .from('sicx_contratacoes')
      .update({ checklist: novo })
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) return respostaErro('Não foi possível atualizar o checklist.', 500)
    return NextResponse.json({ ok: true, checklist: novo })
  }

  return respostaErro('Ação desconhecida.')
}

/** DELETE /api/sicx/contratacoes/[id] — exclui o cartão (notas/histórico em cascata). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()
  const { id } = await params

  const { error } = await supabase.from('sicx_contratacoes').delete().eq('id', id).eq('user_id', user.id)
  if (error) return respostaErro('Não foi possível excluir a contratação.', 500)
  return NextResponse.json({ ok: true })
}
