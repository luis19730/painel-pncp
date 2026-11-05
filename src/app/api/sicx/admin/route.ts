import { NextResponse } from 'next/server'
import { contextoUsuario, resposta401, respostaErro } from '@/lib/estacao/server'
import { usuarioEhAdminSicx } from '@/lib/sicx/server'
import { verificarLinksSicx } from '@/lib/sicx/links'
import { booleano, dataISO, texto, urlSegura } from '@/lib/sicx/validacao'

export const dynamic = 'force-dynamic'

const TIPOS_VALIDOS = ['lei', 'decreto', 'norma', 'portal', 'leitura']
const ESFERAS_VALIDAS = ['federal', 'estadual', 'municipal', 'autarquia', 'entidade']
const TIPOS_ALMOX = ['almoxarifado_virtual', 'catalogo_eletronico', 'marketplace_publico', 'compras_expressas']
const SITUACOES = ['ativo', 'em_implantacao', 'a_verificar', 'em_revisao']
const STATUS_LINK = ['verificado', 'a_verificar', 'em_revisao']

async function exigirAdmin() {
  const { supabase, user } = await contextoUsuario()
  if (!user) return { erro: resposta401() }
  const admin = await usuarioEhAdminSicx(supabase, user.email)
  if (!admin) return { erro: respostaErro('Acesso restrito à administração.', 403) }
  return { supabase, user }
}

/** GET /api/sicx/admin — todo o conteúdo, inclusive o que não está público. */
export async function GET() {
  const ctx = await exigirAdmin()
  if ('erro' in ctx) return ctx.erro
  const { supabase } = ctx

  const [status, normas, almoxarifados, sugestoes, reports, interessados, verificacoes] = await Promise.all([
    supabase.from('sicx_status').select('*').order('atualizado_em', { ascending: false }),
    supabase.from('sicx_normas').select('*').order('ordem', { ascending: true }),
    supabase.from('sicx_almoxarifados').select('*').order('ordem', { ascending: true }),
    supabase.from('sicx_sugestoes').select('*').order('created_at', { ascending: false }).limit(200),
    supabase.from('sicx_link_reports').select('*').order('created_at', { ascending: false }).limit(200),
    supabase.from('sicx_interessados').select('id,email,whatsapp,origem,created_at,descadastrado_em').order('created_at', { ascending: false }).limit(500),
    supabase.from('sicx_link_verificacoes').select('*').order('created_at', { ascending: false }).limit(200),
  ])

  return NextResponse.json({
    ok: true,
    status: status.data || [],
    normas: normas.data || [],
    almoxarifados: almoxarifados.data || [],
    sugestoes: sugestoes.data || [],
    reports: reports.data || [],
    interessados: interessados.data || [],
    verificacoes: verificacoes.data || [],
  })
}

/** POST /api/sicx/admin — salvar conteúdo ou disparar a validação de links. */
export async function POST(req: Request) {
  const ctx = await exigirAdmin()
  if ('erro' in ctx) return ctx.erro
  const { supabase } = ctx

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return respostaErro('Corpo inválido.')
  }

  const acao = String(body.acao ?? '')

  if (acao === 'validar_links') {
    const resumo = await verificarLinksSicx(supabase)
    return NextResponse.json({ ok: true, resumo })
  }

  if (acao === 'salvar_status') {
    const id = texto(body.id, 60)
    const patch = {
      titulo: texto(body.titulo, 240),
      descricao: texto(body.descricao, 2000),
      fonte_label: texto(body.fonte_label, 200),
      fonte_url: urlSegura(body.fonte_url),
      ativo: 'ativo' in body ? booleano(body.ativo) : true,
      atualizado_em: new Date().toISOString(),
    }
    if (!patch.titulo) return respostaErro('Informe o título do status.')

    const query = id
      ? supabase.from('sicx_status').update(patch).eq('id', id)
      : supabase.from('sicx_status').insert(patch)
    const { data, error } = await query.select('*').maybeSingle()
    if (error) return respostaErro('Não foi possível salvar o status.', 500)
    return NextResponse.json({ ok: true, registro: data })
  }

  if (acao === 'salvar_norma') {
    const id = texto(body.id, 60)
    const titulo = texto(body.titulo, 300)
    if (!titulo) return respostaErro('Informe o título da norma.')
    const tipo = TIPOS_VALIDOS.includes(String(body.tipo)) ? String(body.tipo) : 'norma'
    const url = urlSegura(body.url)
    if (body.url && !url) return respostaErro('Informe uma URL http(s) válida.')

    const patch = {
      titulo,
      tipo,
      orgao: texto(body.orgao, 200),
      data_publicacao: dataISO(body.data_publicacao),
      url,
      status_link: STATUS_LINK.includes(String(body.status_link)) ? String(body.status_link) : 'a_verificar',
      destaque: booleano(body.destaque),
      ordem: Number(body.ordem) || 0,
      ativo: 'ativo' in body ? booleano(body.ativo) : true,
    }
    const query = id
      ? supabase.from('sicx_normas').update(patch).eq('id', id)
      : supabase.from('sicx_normas').insert(patch)
    const { data, error } = await query.select('*').maybeSingle()
    if (error) return respostaErro('Não foi possível salvar a norma.', 500)
    return NextResponse.json({ ok: true, registro: data })
  }

  if (acao === 'salvar_almoxarifado') {
    const id = texto(body.id, 60)
    const nome = texto(body.nome, 240)
    if (!nome) return respostaErro('Informe o nome do almoxarifado.')
    const urlSite = urlSegura(body.url_site)
    const urlNorma = urlSegura(body.url_norma)
    const urlEdital = urlSegura(body.url_edital)
    if (body.url_site && !urlSite) return respostaErro('Site oficial inválido.')
    if (body.url_norma && !urlNorma) return respostaErro('URL da norma inválida.')
    if (body.url_edital && !urlEdital) return respostaErro('URL do edital inválida.')

    const patch = {
      nome,
      orgao: texto(body.orgao, 200),
      esfera: ESFERAS_VALIDAS.includes(String(body.esfera)) ? String(body.esfera) : 'federal',
      uf: texto(body.uf, 2)?.toUpperCase() || null,
      tipo: TIPOS_ALMOX.includes(String(body.tipo)) ? String(body.tipo) : 'almoxarifado_virtual',
      situacao: SITUACOES.includes(String(body.situacao)) ? String(body.situacao) : 'a_verificar',
      descricao: texto(body.descricao, 1500),
      como_participar: texto(body.como_participar, 2000),
      url_site: urlSite,
      url_norma: urlNorma,
      url_edital: urlEdital,
      status_link: STATUS_LINK.includes(String(body.status_link)) ? String(body.status_link) : 'a_verificar',
      ordem: Number(body.ordem) || 0,
      ativo: 'ativo' in body ? booleano(body.ativo) : true,
    }
    const query = id
      ? supabase.from('sicx_almoxarifados').update(patch).eq('id', id)
      : supabase.from('sicx_almoxarifados').insert(patch)
    const { data, error } = await query.select('*').maybeSingle()
    if (error) return respostaErro('Não foi possível salvar o almoxarifado.', 500)
    return NextResponse.json({ ok: true, registro: data })
  }

  return respostaErro('Ação desconhecida.')
}

/** DELETE /api/sicx/admin?tipo=norma|almoxarifado|sugestao|report&id=... */
export async function DELETE(req: Request) {
  const ctx = await exigirAdmin()
  if ('erro' in ctx) return ctx.erro
  const { supabase } = ctx

  const url = new URL(req.url)
  const tipo = url.searchParams.get('tipo') || ''
  const id = url.searchParams.get('id') || ''
  if (!id) return respostaErro('Informe o registro a excluir.')

  const tabela =
    tipo === 'norma'
      ? 'sicx_normas'
      : tipo === 'almoxarifado'
        ? 'sicx_almoxarifados'
        : tipo === 'sugestao'
          ? 'sicx_sugestoes'
          : tipo === 'report'
            ? 'sicx_link_reports'
            : ''
  if (!tabela) return respostaErro('Tipo inválido.')

  const { error } = await supabase.from(tabela).delete().eq('id', id)
  if (error) return respostaErro('Não foi possível excluir o registro.', 500)
  return NextResponse.json({ ok: true })
}
