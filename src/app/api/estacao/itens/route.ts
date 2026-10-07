import { NextResponse } from 'next/server'
import { contextoUsuario, resposta401, respostaErro, planoEhGratuito } from '@/lib/estacao/server'
import { LIMITE_GRATIS, ETAPAS_ATIVAS } from '@/lib/estacao/config'
import { CHECKLIST_HABILITACAO } from '@/lib/estacao/checklist-sugerido'

export const dynamic = 'force-dynamic'

function str(v: unknown, max = 2000): string | null {
  const s = String(v ?? '').trim()
  if (!s) return null
  return s.slice(0, max)
}

/** GET /api/estacao/itens — lista itens da estação (+ prazos) e filtros.
 *  ?pncp=<numero_controle_pncp> → informa se o edital já está na estação. */
export async function GET(req: Request) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()

  const url = new URL(req.url)
  const pncp = url.searchParams.get('pncp')

  if (pncp) {
    const { data } = await supabase
      .from('workspace_itens')
      .select('*')
      .eq('numero_controle_pncp', pncp)
      .maybeSingle()
    return NextResponse.json({ ok: true, existente: data || null })
  }

  const uf = (url.searchParams.get('uf') || '').trim().toUpperCase()
  const modalidade = (url.searchParams.get('modalidade') || '').trim()
  const q = (url.searchParams.get('q') || '').trim()
  const arquivados = url.searchParams.get('arquivados') === '1'

  let query = supabase
    .from('workspace_itens')
    .select('*, workspace_prazos(id,data_hora,tipo,titulo,concluido)')
    .order('ordem', { ascending: true })
    .order('atualizado_em', { ascending: false })
  if (!arquivados) query = query.neq('etapa', 'descartada')
  if (uf) query = query.eq('uf', uf)
  if (modalidade) query = query.ilike('modalidade', `%${modalidade}%`)
  if (q) query = query.or(`objeto.ilike.%${q}%,orgao.ilike.%${q}%,numero_controle_pncp.ilike.%${q}%`)

  const { data, error } = await query.limit(500)
  if (error) return respostaErro('Não foi possível carregar a estação.', 500)
  return NextResponse.json({ ok: true, itens: data || [] })
}

/** POST /api/estacao/itens — adiciona um edital à estação.
 *  Cria o item (etapa inicial), os prazos conhecidos e o checklist sugerido. */
export async function POST(req: Request) {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return respostaErro('Corpo inválido.')
  }

  const numero = str(body.numero_controle_pncp, 60)
  if (!numero) return respostaErro('Número de controle do PNCP é obrigatório.')

  // Já existe? (evita duplicidade e devolve o item)
  const { data: existente } = await supabase
    .from('workspace_itens')
    .select('*')
    .eq('numero_controle_pncp', numero)
    .maybeSingle()
  if (existente) return NextResponse.json({ ok: true, existente: true, item: existente })

  // Limite do plano gratuito (itens ATIVOS).
  if (await planoEhGratuito(supabase, user.id)) {
    const { count } = await supabase
      .from('workspace_itens')
      .select('id', { count: 'exact', head: true })
      .in('etapa', ETAPAS_ATIVAS)
    if ((count || 0) >= LIMITE_GRATIS) {
      return NextResponse.json(
        {
          ok: false,
          limite: true,
          erro: `Seu plano gratuito permite até ${LIMITE_GRATIS} licitações ativas na estação. Finalize/arquive alguma ou faça upgrade para continuar.`,
        },
        { status: 402 }
      )
    }
  }

  const valor = Number(body.valor_estimado)
  const item = {
    user_id: user.id,
    numero_controle_pncp: numero,
    orgao: str(body.orgao),
    cnpj_orgao: str(body.cnpj_orgao, 20),
    uf: str(body.uf, 2)?.toUpperCase() || null,
    municipio: str(body.municipio),
    objeto: str(body.objeto, 4000),
    modalidade: str(body.modalidade),
    valor_estimado: Number.isFinite(valor) ? valor : null,
    data_abertura: str(body.data_abertura, 40),
    data_encerramento_proposta: str(body.data_encerramento_proposta, 40),
    link_pncp: str(body.link_pncp, 500),
    etapa: 'em_analise',
  }

  const { data: criado, error } = await supabase.from('workspace_itens').insert(item).select('*').single()
  if (error) {
    // Corrida: outro pedido inseriu o mesmo item.
    if (error.code === '23505') {
      const { data: jaExiste } = await supabase.from('workspace_itens').select('*').eq('numero_controle_pncp', numero).maybeSingle()
      return NextResponse.json({ ok: true, existente: true, item: jaExiste })
    }
    return respostaErro('Não foi possível adicionar à estação.', 500)
  }

  // Prazos conhecidos do edital.
  const prazos: Array<Record<string, unknown>> = []
  if (item.data_abertura) {
    prazos.push({ item_id: criado.id, user_id: user.id, tipo: 'abertura_sessao', titulo: 'Abertura da sessão', data_hora: item.data_abertura })
  }
  if (item.data_encerramento_proposta) {
    prazos.push({ item_id: criado.id, user_id: user.id, tipo: 'envio_proposta', titulo: 'Encerramento da proposta', data_hora: item.data_encerramento_proposta })
  }
  if (prazos.length) await supabase.from('workspace_prazos').insert(prazos)

  // Checklist sugerido de habilitação.
  const checklist = CHECKLIST_HABILITACAO.map((descricao, i) => ({
    item_id: criado.id,
    user_id: user.id,
    descricao,
    ordem: i,
  }))
  await supabase.from('workspace_checklist').insert(checklist)

  return NextResponse.json({ ok: true, existente: false, item: criado })
}
