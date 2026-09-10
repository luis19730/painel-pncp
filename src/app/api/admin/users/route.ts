import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/alerts/db'
import { authorizeAdmin } from '@/lib/admin/auth'
import { listarUsuariosComPlano } from '@/lib/admin/usuario-plano'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/users?busca=email
 * Lista todos os usuários (id, e-mail, plano, trial, status ASAAS).
 * `busca` (opcional) filtra por trecho do e-mail. Reutiliza a mesma fonte do
 * GET /api/admin/planos.
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
  const busca = url.searchParams.get('busca') || undefined

  let lista
  try {
    lista = await listarUsuariosComPlano(client, busca)
  } catch {
    return NextResponse.json({ ok: false, erro: 'Não foi possível listar os usuários.' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    agora: new Date().toISOString(),
    busca: busca || null,
    total: lista.length,
    usuarios: lista,
  })
}