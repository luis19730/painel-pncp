import { NextResponse } from 'next/server'
import { carregarConteudoSicx } from '@/lib/sicx/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/sicx/conteudo — conteúdo público do SICX (status, normas e
 * almoxarifados). Usa a chave anon (RLS) e cai no fallback estático se o banco
 * estiver indisponível. Nunca devolve dado de usuário.
 */
export async function GET() {
  const conteudo = await carregarConteudoSicx()
  return NextResponse.json({ ok: true, ...conteudo })
}
