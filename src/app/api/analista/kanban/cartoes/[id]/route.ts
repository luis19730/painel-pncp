import { NextResponse } from 'next/server'
import { contextoUsuario, resposta401, respostaErro } from '@/lib/estacao/server'
import { CHECKLIST_SUGERIDO } from '@/lib/analista/kanban'
import {
  analiseDoUsuario,
  colunaDoUsuario,
  dataOuNull,
  listaAnexos,
  listaTexto,
  numeroOuNull,
  prioridadeValida,
  texto,
} from '@/lib/analista/server'

export const dynamic = 'force-dynamic'

/** GET /api/analista/kanban/cartoes/[id] — ficha completa do cartão. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()
  const { id } = await params

  const { data: cartao, error } = await supabase
    .from('kanban_cartoes')
    .select('*, analista_analises ( id, titulo, veredito, margem_liquida, valor_referencia, valor_ofertado )')
    .eq('id', id)
    .maybeSingle()
  if (error) return respostaErro('Não foi possível carregar o cartão.', 500)
  if (!cartao) return respostaErro('Cartão não encontrado.', 404)

  const [notas, checklist, historico] = await Promise.all([
    supabase.from('kanban_notas').select('*').eq('cartao_id', id).order('criado_em', { ascending: false }),
    supabase.from('kanban_checklist').select('*').eq('cartao_id', id).order('ordem', { ascending: true }),
    supabase.from('kanban_historico').select('*').eq('cartao_id', id).order('criado_em', { ascending: false }).limit(50),
  ])

  return NextResponse.json({
    ok: true,
    cartao,
    notas: notas.data || [],
    checklist: checklist.data || [],
    historico: historico.data || [],
  })
}

/** PATCH /api/analista/kanban/cartoes/[id] — edita campos e/ou move de coluna. */
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
    .from('kanban_cartoes')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (erroAtual) return respostaErro('Não foi possível carregar o cartão.', 500)
  if (!atual) return respostaErro('Cartão não encontrado.', 404)

  const patch: Record<string, unknown> = {}
  if ('titulo' in body) {
    const titulo = texto(body.titulo, 300)
    if (!titulo) return respostaErro('Informe o título do cartão.')
    patch.titulo = titulo
  }
  if ('orgao' in body) patch.orgao = texto(body.orgao, 300)
  if ('edital_ref' in body) patch.edital_ref = texto(body.edital_ref, 80)
  if ('modalidade' in body) patch.modalidade = texto(body.modalidade, 120)
  if ('uf' in body) patch.uf = texto(body.uf, 2)?.toUpperCase() || null
  if ('valor_referencia' in body) patch.valor_referencia = numeroOuNull(body.valor_referencia)
  if ('valor_ofertado' in body) patch.valor_ofertado = numeroOuNull(body.valor_ofertado)
  if ('margem' in body) patch.margem = numeroOuNull(body.margem)
  if ('data_sessao' in body) patch.data_sessao = dataOuNull(body.data_sessao)
  if ('prazo_proposta' in body) patch.prazo_proposta = dataOuNull(body.prazo_proposta)
  if ('prazo_entrega' in body) patch.prazo_entrega = dataOuNull(body.prazo_entrega)
  if ('responsavel' in body) patch.responsavel = texto(body.responsavel, 120)
  if ('prioridade' in body) patch.prioridade = prioridadeValida(body.prioridade)
  if ('etiquetas' in body) patch.etiquetas = listaTexto(body.etiquetas)
  if ('link_edital' in body) patch.link_edital = texto(body.link_edital, 1000)
  if ('anexos' in body) patch.anexos = listaAnexos(body.anexos)
  if ('motivo_perda' in body) patch.motivo_perda = texto(body.motivo_perda, 1000)
  if ('ordem' in body && Number.isFinite(Number(body.ordem))) patch.ordem = Math.trunc(Number(body.ordem))

  if ('analise_id' in body) {
    const analiseId = texto(body.analise_id, 60)
    if (analiseId && !(await analiseDoUsuario(supabase, analiseId))) {
      return respostaErro('Análise inválida.', 404)
    }
    patch.analise_id = analiseId
  }

  let deColuna: string | null = null
  if ('coluna_id' in body) {
    const colunaId = String(body.coluna_id ?? '').trim()
    if (!colunaId) return respostaErro('Coluna inválida.')
    if (!(await colunaDoUsuario(supabase, colunaId))) return respostaErro('Coluna inválida.', 404)
    if (colunaId !== atual.coluna_id) {
      deColuna = atual.coluna_id
      patch.coluna_id = colunaId
    }
  }

  if (!Object.keys(patch).length) return respostaErro('Nada para atualizar.')

  const { data, error } = await supabase
    .from('kanban_cartoes')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle()
  if (error) return respostaErro('Não foi possível atualizar o cartão.', 500)

  if (deColuna) {
    await supabase.from('kanban_historico').insert({
      cartao_id: id,
      user_id: user.id,
      de_coluna: deColuna,
      para_coluna: patch.coluna_id,
    })
  }

  return NextResponse.json({ ok: true, cartao: data })
}

/** POST /api/analista/kanban/cartoes/[id] — nota, checklist e conclusão de item. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()
  const { id } = await params

  const { data: cartao } = await supabase.from('kanban_cartoes').select('id').eq('id', id).maybeSingle()
  if (!cartao) return respostaErro('Cartão não encontrado.', 404)

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
    const tipo = body.tipo === 'comentario' ? 'comentario' : 'nota'
    const { data, error } = await supabase
      .from('kanban_notas')
      .insert({ cartao_id: id, user_id: user.id, texto: conteudo, tipo })
      .select('*')
      .maybeSingle()
    if (error) return respostaErro('Não foi possível salvar a anotação.', 500)
    return NextResponse.json({ ok: true, nota: data })
  }

  if (acao === 'remover_nota') {
    const notaId = String(body.nota_id ?? '').trim()
    if (!notaId) return respostaErro('Nota inválida.')
    const { error } = await supabase.from('kanban_notas').delete().eq('id', notaId).eq('cartao_id', id)
    if (error) return respostaErro('Não foi possível excluir a anotação.', 500)
    return NextResponse.json({ ok: true })
  }

  if (acao === 'checklist') {
    const item = texto(body.item, 300)
    if (!item) return respostaErro('Descreva o item do checklist.')
    const { data: ultimo } = await supabase
      .from('kanban_checklist')
      .select('ordem')
      .eq('cartao_id', id)
      .order('ordem', { ascending: false })
      .limit(1)
      .maybeSingle()
    const { data, error } = await supabase
      .from('kanban_checklist')
      .insert({ cartao_id: id, user_id: user.id, item, ordem: (Number(ultimo?.ordem) || 0) + 1 })
      .select('*')
      .maybeSingle()
    if (error) return respostaErro('Não foi possível adicionar ao checklist.', 500)
    return NextResponse.json({ ok: true, item: data })
  }

  if (acao === 'checklist_padrao') {
    const { data: existentes } = await supabase.from('kanban_checklist').select('item').eq('cartao_id', id)
    const jaTem = new Set((existentes || []).map((e: { item?: unknown }) => String(e.item)))
    const novos = CHECKLIST_SUGERIDO.filter((i) => !jaTem.has(i))
    if (!novos.length) return NextResponse.json({ ok: true, adicionados: 0 })
    const base = (existentes || []).length
    const { error } = await supabase.from('kanban_checklist').insert(
      novos.map((item, i) => ({ cartao_id: id, user_id: user.id, item, ordem: base + i }))
    )
    if (error) return respostaErro('Não foi possível adicionar o checklist sugerido.', 500)
    return NextResponse.json({ ok: true, adicionados: novos.length })
  }

  if (acao === 'check') {
    const checkId = String(body.check_id ?? '').trim()
    if (!checkId) return respostaErro('Item inválido.')
    if (typeof body.feito !== 'boolean') return respostaErro('Informe se o item foi concluído.')
    const { data, error } = await supabase
      .from('kanban_checklist')
      .update({ feito: body.feito })
      .eq('id', checkId)
      .eq('cartao_id', id)
      .select('*')
      .maybeSingle()
    if (error) return respostaErro('Não foi possível atualizar o checklist.', 500)
    return NextResponse.json({ ok: true, item: data })
  }

  if (acao === 'remover_checklist') {
    const checkId = String(body.check_id ?? '').trim()
    if (!checkId) return respostaErro('Item inválido.')
    const { error } = await supabase.from('kanban_checklist').delete().eq('id', checkId).eq('cartao_id', id)
    if (error) return respostaErro('Não foi possível excluir o item.', 500)
    return NextResponse.json({ ok: true })
  }

  return respostaErro('Ação desconhecida.')
}

/** DELETE /api/analista/kanban/cartoes/[id] — exclui o cartão (notas/checklist/histórico em cascata). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()
  const { id } = await params

  const { error } = await supabase.from('kanban_cartoes').delete().eq('id', id)
  if (error) return respostaErro('Não foi possível excluir o cartão.', 500)

  return NextResponse.json({ ok: true })
}
