// ============================================================================
// Autenticação do painel /admin (server-side).
//
// A senha de administrador NÃO fica no bundle do navegador. Ela é validada
// aqui, no servidor, contra a variável de ambiente ADMIN_PASSWORD (secret do
// worker / .env.local). Portanto não existe senha embutida em código.
//
// O painel /admin é protegido APENAS pela senha de administrador — não exige
// sessão/log-in no site (o middleware não redireciona /admin para /login).
// ============================================================================

import { NextResponse } from 'next/server'

/**
 * Valida o acesso ao painel admin pela senha (variável ADMIN_PASSWORD).
 * Retorna `{ ok: true }` em caso de sucesso ou um NextResponse de erro.
 */
export async function authorizeAdmin(
  req: Request
): Promise<{ ok: true; user: null } | { ok: false; response: Response }> {
  const expected = process.env.ADMIN_PASSWORD
  const pwd = req.headers.get('x-admin-password') || ''

  if (!expected) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, erro: 'Senha de administrador não configurada no servidor.' },
        { status: 503 }
      ),
    }
  }
  if (!pwd || pwd !== expected) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, erro: 'Senha de administrador inválida.' }, { status: 403 }),
    }
  }
  return { ok: true, user: null }
}