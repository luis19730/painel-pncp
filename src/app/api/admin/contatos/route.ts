import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/alerts/db'
import { authorizeAdmin } from '@/lib/admin/auth'

export const dynamic = 'force-dynamic'

interface Origem {
  pncp_id?: string
  numero?: string | null
  data?: string | null
  arquivo_url?: string | null
}

interface ContatoRow {
  id: number
  orgao_cnpj: string
  orgao_nome: string | null
  uf: string | null
  contato_email: string
  editais_origem: Origem[] | null
  contato_extraido_em: string | null
}

function csvCampo(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function origensTexto(origens: Origem[] | null): string {
  if (!Array.isArray(origens) || origens.length === 0) return ''
  return origens
    .map((o) => `${o.numero || o.pncp_id || '—'}${o.data ? ` (${String(o.data).slice(0, 10)})` : ''}`)
    .join(' | ')
}

/**
 * GET /api/admin/contatos?uf=&orgao=&email=&dataInicio=&dataFim=&formato=csv|json
 *
 * Exporta os contatos de e-mail extraídos dos editais. RESTRITO ao admin
 * (senha via header `x-admin-password`). NUNCA exposto em rota pública.
 *
 * CSV (default `formato=json`): órgão, e-mail, UF, nº do edital de origem,
 * data de extração.
 */
export async function GET(req: Request) {
  const auth = await authorizeAdmin(req)
  if (!auth.ok) return auth.response

  const url = new URL(req.url)
  const uf = (url.searchParams.get('uf') || '').trim().toUpperCase()
  const orgao = (url.searchParams.get('orgao') || '').trim()
  const email = (url.searchParams.get('email') || '').trim()
  const dataInicio = (url.searchParams.get('dataInicio') || '').trim()
  const dataFim = (url.searchParams.get('dataFim') || '').trim()
  const formato = (url.searchParams.get('formato') || 'json').toLowerCase()

  let client
  try {
    client = createServiceClient()
  } catch {
    return NextResponse.json({ ok: false, erro: 'Banco de dados não configurado.' }, { status: 503 })
  }

  let q = client
    .from('edital_contatos')
    .select('id,orgao_cnpj,orgao_nome,uf,contato_email,editais_origem,contato_extraido_em')
    .order('contato_extraido_em', { ascending: false })
    .limit(5000)
  if (uf) q = q.eq('uf', uf)
  if (orgao) q = q.ilike('orgao_nome', `%${orgao}%`)
  if (email) q = q.ilike('contato_email', `%${email}%`)
  if (dataInicio) q = q.gte('contato_extraido_em', `${dataInicio}T00:00:00.000Z`)
  if (dataFim) q = q.lte('contato_extraido_em', `${dataFim}T23:59:59.999Z`)

  const { data, error } = await q
  if (error) {
    return NextResponse.json({ ok: false, erro: 'Falha ao ler os contatos.' }, { status: 500 })
  }

  const rows = (data || []) as ContatoRow[]

  if (formato === 'csv') {
    const cabecalhos = ['Orgao', 'Email', 'UF', 'Edital de origem', 'Extraido em']
    const linhas = rows.map((r) => [
      r.orgao_nome || '',
      r.contato_email,
      r.uf || '',
      origensTexto(r.editais_origem),
      r.contato_extraido_em ? new Date(r.contato_extraido_em).toISOString() : '',
    ])
    const csv = `\uFEFF${cabecalhos.map(csvCampo).join(';')}\r\n${linhas.map((l) => l.map(csvCampo).join(';')).join('\r\n')}`
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="contatos-editais-${new Date().toISOString().slice(0, 10)}.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  return NextResponse.json({
    ok: true,
    total: rows.length,
    filtros: { uf: uf || null, orgao: orgao || null, email: email || null, dataInicio: dataInicio || null, dataFim: dataFim || null },
    contatos: rows.map((r) => ({
      id: r.id,
      orgao_cnpj: r.orgao_cnpj,
      orgao_nome: r.orgao_nome,
      uf: r.uf,
      contato_email: r.contato_email,
      editais_origem: r.editais_origem || [],
      contato_extraido_em: r.contato_extraido_em,
    })),
  })
}

export async function DELETE(req: Request) {
  const auth = await authorizeAdmin(req)
  if (!auth.ok) return auth.response

  const json = (await req.json().catch(() => null)) as { id?: number; ids?: number[] } | null
  const recebidos = Array.isArray(json?.ids) ? json!.ids : json?.id != null ? [json.id] : []
  const ids = recebidos.map((n) => Number(n)).filter((n) => Number.isFinite(n))
  if (ids.length === 0) {
    return NextResponse.json({ ok: false, erro: 'Informe id ou ids do(s) contato(s).' }, { status: 400 })
  }

  let client
  try {
    client = createServiceClient()
  } catch {
    return NextResponse.json({ ok: false, erro: 'Banco de dados não configurado.' }, { status: 503 })
  }

  const { error: delError } = await client.from('edital_contatos').delete().in('id', ids)
  if (delError) {
    return NextResponse.json({ ok: false, erro: 'Falha ao excluir o(s) contato(s).' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, ids, total: ids.length })
}
