import { NextResponse } from 'next/server'
import { contextoUsuario, resposta401, respostaErro } from '@/lib/estacao/server'
import {
  analiseDoUsuario,
  colunaDoUsuario,
  dataOuNull,
  listaAnexos,
  listaTexto,
  numeroOuNull,
  prioridadeValida,
  proximaOrdem,
  texto,
} from '@/lib/analista/server'

export const dynamic = 'force-dynamic'

/** GET /api/analista/kanban/cartoes — todos os cartões do usuário (com a análise vinculada). */
export async function GET() {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()

  const { data, error } = await supabase
    .from('kanban_cartoes')
    .select('*, analista_analises ( id, titulo, veredito, margem_liquida )')
    .order('ordem', { ascending: true })
    .limit(1000)

  if (error) return respostaErro('Não foi possível carregar o Kanban.', 500)

  // Contadores para a barra de progresso do checklist e o total de anotações.
  const [checks, notas] = await Promise.all([
    supabase.from('kanban_checklist').select('cartao_id, feito').limit(5000),
    supabase.from('kanban_notas').select('cartao_id').limit(5000),
  ])

  const porCartao = new Map<string, { total: number; feitos: number }>()
  for (const c of checks.data || []) {
    const atual = porCartao.get(c.cartao_id) || { total: 0, feitos: 0 }
    atual.total += 1
    if (c.feito) atual.feitos += 1
    porCartao.set(c.cartao_id, atual)
  }
  const notasPorCartao = new Map<string, number>()
  for (const n of notas.data || []) {
    notasPorCartao.set(n.cartao_id, (notasPorCartao.get(n.cartao_id) || 0) + 1)
  }

  const cartoes = (data || []).map((c: Record<string, unknown>) => ({
    ...c,
    checklist_total: porCartao.get(String(c.id))?.total || 0,
    checklist_feitos: porCartao.get(String(c.id))?.feitos || 0,
    notas_total: notasPorCartao.get(String(c.id)) || 0,
  }))

  return NextResponse.json({ ok: true, cartoes })
}

/** POST /api/analista/kanban/cartoes — cria um cartão (manual, do edital ou da calculadora). */
export async function POST(req: Request) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return respostaErro('Corpo inválido.')
  }

  const colunaId = String(body.coluna_id ?? '').trim()
  if (!colunaId) return respostaErro('Escolha a coluna do cartão.')
  if (!(await colunaDoUsuario(supabase, colunaId))) return respostaErro('Coluna inválida.', 404)

  const titulo = texto(body.titulo, 300)
  if (!titulo) return respostaErro('Informe o título do cartão.')

  let analiseId: string | null = texto(body.analise_id, 60)
  if (analiseId && !(await analiseDoUsuario(supabase, analiseId))) analiseId = null

  const ordem = Number.isFinite(Number(body.ordem))
    ? Math.trunc(Number(body.ordem))
    : await proximaOrdem(supabase, user.id, colunaId)

  const registro = {
    user_id: user.id,
    coluna_id: colunaId,
    ordem,
    titulo,
    orgao: texto(body.orgao, 300),
    edital_ref: texto(body.edital_ref, 80),
    modalidade: texto(body.modalidade, 120),
    uf: texto(body.uf, 2)?.toUpperCase() || null,
    valor_referencia: numeroOuNull(body.valor_referencia),
    valor_ofertado: numeroOuNull(body.valor_ofertado),
    margem: numeroOuNull(body.margem),
    analise_id: analiseId,
    data_sessao: dataOuNull(body.data_sessao),
    prazo_proposta: dataOuNull(body.prazo_proposta),
    prazo_entrega: dataOuNull(body.prazo_entrega),
    responsavel: texto(body.responsavel, 120),
    prioridade: prioridadeValida(body.prioridade),
    etiquetas: listaTexto(body.etiquetas),
    link_edital: texto(body.link_edital, 1000),
    anexos: listaAnexos(body.anexos),
    motivo_perda: texto(body.motivo_perda, 1000),
  }

  const { data, error } = await supabase.from('kanban_cartoes').insert(registro).select('*').maybeSingle()
  if (error) return respostaErro('Não foi possível criar o cartão.', 500)

  return NextResponse.json({ ok: true, cartao: data })
}
