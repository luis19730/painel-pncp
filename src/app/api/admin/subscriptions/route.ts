import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/alerts/db'
import { authorizeAdmin } from '@/lib/admin/auth'
import { listarUsuariosComPlano } from '@/lib/admin/usuario-plano'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/subscriptions
 * Assinaturas ASAAS registradas (status != none) + resumo por status.
 * Fonte real: mesma listagem de usuários+planos do painel.
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

  let lista
  try {
    lista = await listarUsuariosComPlano(client)
  } catch {
    return NextResponse.json({ ok: false, erro: 'Não foi possível listar as assinaturas.' }, { status: 500 })
  }

  const assinaturas = lista.filter((u) => u.statusPagamento !== 'none')
  const resumo: Record<string, number> = {}
  for (const a of assinaturas) {
    resumo[a.statusPagamento] = (resumo[a.statusPagamento] || 0) + 1
  }

  const porMeio: Record<string, number> = {}
  for (const a of assinaturas) {
    const meio = a.paymentMethod || 'none'
    porMeio[meio] = (porMeio[meio] || 0) + 1
  }

  return NextResponse.json({
    ok: true,
    agora: new Date().toISOString(),
    total: assinaturas.length,
    resumo,
    porMeio,
    assinaturas: assinaturas.sort((a, b) =>
      String((b.lastPaymentAt || b.criado_em) || '').localeCompare(String((a.lastPaymentAt || a.criado_em) || ''))
    ),
  })
}