// ============================================================================
// Cliente Supabase ADMIN (server-only, SERVICE_ROLE).
//
// Só o servidor (worker / rotas de API) usa esta chave. Usado para criar
// usuários SEM confirmação automática de e-mail, confirmar depois de validar o
// token e consultar/limpar contas — sem depender de configuração do Supabase
// (o projeto tem "Confirm email" DESLIGADO, por isso o signUp público cria
// sessão e confirma na hora).
//
// Se a chave estiver ausente, retorna null — os callers tratam com erro claro
// e NUNCA marcam um e-mail como confirmado sem validação real.
// ============================================================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || key.includes('placeholder')) return null
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}

/** True se a SERVICE_ROLE estiver disponível neste ambiente. */
export function adminConfigured(): boolean {
  return !!createAdminClient()
}

/**
 * Lista TODOS os usuários do Auth, paginando de 1000 em 1000 até esgotar.
 *
 * O `admin.listUsers()` do Supabase retorna no máximo 50 registros por padrão
 * (e até 1000 com perPage). Sem paginar, o painel admin, o trial retroativo e o
 * cron de expiração enxergariam apenas os PRIMEIROS usuários cadastrados.
 */
export async function listAllUsers(
  client: SupabaseClient
): Promise<{ users: { id: string; email?: string; created_at: string | null; email_confirmed_at?: string | null }[]; error: { message: string } | null }> {
  const users: { id: string; email?: string; created_at: string | null; email_confirmed_at?: string | null }[] = []
  let page = 1
  const perPage = 1000

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage })
    if (error) return { users, error }
    for (const u of data.users) {
      users.push({
        id: u.id,
        email: u.email,
        created_at: u.created_at || null,
        email_confirmed_at: u.email_confirmed_at || null,
      })
    }
    if (data.users.length < perPage) break
    page++
  }

  return { users, error: null }
}