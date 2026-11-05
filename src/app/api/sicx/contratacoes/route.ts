import { NextResponse } from 'next/server'
import { contextoUsuario, resposta401, respostaErro } from '@/lib/estacao/server'
import { garantirColunasContratacoes, colunaDoUsuario } from '@/lib/sicx/contratacoes-server'
import { prazoInfo } from '@/lib/sicx/calc'
import { dataISO, inteiro, numero, objeto, texto } from '@/lib/sicx/validacao'

export const dynamic = 'force-dynamic'

/**
 * GET /api/sicx/contratacoes — quadro completo do usuário.
 * Devolve colunas, cartões e indicadores (inclusive prazos vencidos).
 */
export async function GET() {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()

  await garantirColunasContratacoes(supabase, user.id)

  const [colunasRes, cartoesRes] = await Promise.all([
    supabase
      .from('sicx_contratacoes_colunas')
      .select('*')
      .eq('user_id', user.id)
      .order('ordem', { ascending: true }),
    supabase
      .from('sicx_contratacoes')
      .select('*')
      .eq('user_id', user.id)
      .order('ordem', { ascending: true })
      .order('created_at', { ascending: false }),
  ])

  if (colunasRes.error || cartoesRes.error) {
    return respostaErro('Não foi possível carregar suas contratações.', 500)
  }

  const colunas = colunasRes.data || []
  const cartoes = cartoesRes.data || []
  const nomePorId = new Map(colunas.map((c: { id: string; nome: string }) => [c.id, c.nome]))

  let atrasados = 0
  let valorTotal = 0
  let margemPrevista = 0
  for (const c of cartoes) {
    valorTotal += Number(c.valor) || 0
    margemPrevista += Number(c.margem_prevista) || 0
    const nome = String(nomePorId.get(c.coluna_id) || '').toLowerCase()
    const prazo = c?.datas?.prazo_entrega as string | undefined
    const info = prazoInfo(prazo || null)
    if (nome !== 'pago' && info.status !== 'ok' && info.status !== 'sem-prazo') atrasados += 1
  }

  return NextResponse.json({
    ok: true,
    colunas,
    cartoes,
    indicadores: {
      total: cartoes.length,
      atrasados,
      valorTotal,
      margemPrevista,
      ticketMedio: cartoes.length ? valorTotal / cartoes.length : 0,
    },
  })
}

/** POST /api/sicx/contratacoes — cria um cartão (inclusive pelo checklist). */
export async function POST(req: Request) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return respostaErro('Corpo inválido.')
  }

  const item = texto(body.item, 300)
  if (!item) return respostaErro('Informe o item ou a contratação.')

  await garantirColunasContratacoes(supabase, user.id)

  let colunaId = texto(body.coluna_id, 60)
  if (colunaId && !(await colunaDoUsuario(supabase, user.id, colunaId))) {
    return respostaErro('Coluna inválida.', 404)
  }
  if (!colunaId) {
    const { data: primeira } = await supabase
      .from('sicx_contratacoes_colunas')
      .select('id')
      .eq('user_id', user.id)
      .order('ordem', { ascending: true })
      .limit(1)
      .maybeSingle()
    colunaId = primeira?.id ?? null
  }

  const dataPrazo = dataISO(body.prazo_entrega)
  const { data, error } = await supabase
    .from('sicx_contratacoes')
    .insert({
      user_id: user.id,
      coluna_id: colunaId,
      orgao: texto(body.orgao, 300),
      item,
      quantidade: numero(body.quantidade, 3),
      valor: numero(body.valor),
      datas: {
        pedido: dataISO(body.pedido),
        prazo_entrega: dataPrazo,
        pagamento_previsto: dataISO(body.pagamento_previsto),
        pago_em: null,
      },
      checklist: Array.isArray(body.checklist) ? body.checklist : [],
      margem_prevista: numero(body.margem_prevista),
      ordem: inteiro(body.ordem) ?? 0,
    })
    .select('*')
    .maybeSingle()

  if (error) return respostaErro('Não foi possível criar a contratação.', 500)

  if (colunaId && data?.id) {
    const { data: coluna } = await supabase
      .from('sicx_contratacoes_colunas')
      .select('nome')
      .eq('id', colunaId)
      .eq('user_id', user.id)
      .maybeSingle()
    await supabase.from('sicx_contratacoes_historico').insert({
      contratacao_id: data.id,
      user_id: user.id,
      de_coluna: null,
      para_coluna: coluna?.nome ?? null,
    })
  }

  return NextResponse.json({ ok: true, cartao: data })
}

/** PATCH /api/sicx/contratacoes — move cartões em lote (body: { ordens: [{id,coluna_id,ordem}] }). */
export async function PATCH(req: Request) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return respostaErro('Corpo inválido.')
  }

  const ordens = Array.isArray(body.ordens) ? body.ordens : []
  if (!ordens.length) return respostaErro('Nada para atualizar.')

  for (const entrada of ordens) {
    const obj = objeto(entrada)
    const id = texto(obj.id, 60)
    if (!id) continue
    const patch: Record<string, unknown> = { ordem: inteiro(obj.ordem) ?? 0 }
    const colunaId = texto(obj.coluna_id, 60)
    if (colunaId) {
      if (!(await colunaDoUsuario(supabase, user.id, colunaId))) continue
      patch.coluna_id = colunaId
    }
    await supabase.from('sicx_contratacoes').update(patch).eq('id', id).eq('user_id', user.id)
  }

  return NextResponse.json({ ok: true })
}
