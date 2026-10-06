import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/alerts/db'
import { authorizeAdmin } from '@/lib/admin/auth'

export const dynamic = 'force-dynamic'

const ORDENS: Record<string, { col: string; asc: boolean }> = {
  vitorias: { col: 'vitorias', asc: false },
  valor: { col: 'valor_total_homologado', asc: false },
  participacoes: { col: 'participacoes', asc: false },
  recentes: { col: 'ultima_participacao', asc: false },
  nome: { col: 'razao_social', asc: true },
}

/**
 * GET /api/admin/fornecedores?busca=&uf=&ordem=&limite=
 * Base de fornecedores (vencedores/licitantes) agregada por CNPJ.
 */
export async function GET(req: Request) {
  const auth = await authorizeAdmin(req)
  if (!auth.ok) return auth.response

  let client
  try {
    client = createServiceClient()
  } catch {
    return NextResponse.json({ ok: false, erro: 'Banco de dados não configurado.' }, { status: 503 })
  }

  const url = new URL(req.url)
  const busca = (url.searchParams.get('busca') || '').trim()
  const uf = (url.searchParams.get('uf') || '').trim().toUpperCase()
  const ordem = ORDENS[url.searchParams.get('ordem') || 'vitorias'] || ORDENS.vitorias
  const limite = Math.min(1000, Math.max(1, Number(url.searchParams.get('limite')) || 300))

  let q = client
    .from('fornecedores')
    .select('*', { count: 'exact' })
    .order(ordem.col, { ascending: ordem.asc })
    .limit(limite)
  if (searchOk(busca)) {
    const termo = busca.replace(/[%,]/g, ' ')
    q = q.or(`razao_social.ilike.%${termo}%,cnpj.ilike.%${termo.replace(/\D/g, '')}%`)
  }
  if (uf) q = q.eq('uf', uf)

  const { data, error, count } = await q
  if (error) {
    return NextResponse.json({ ok: false, erro: 'Falha ao listar fornecedores.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, total: count ?? (data || []).length, fornecedores: data || [] })
}

function searchOk(s: string): boolean {
  return s.length >= 2
}
