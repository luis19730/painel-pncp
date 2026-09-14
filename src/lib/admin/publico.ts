// ============================================================================
// Exclusão de atividade administrativa/teste das métricas comerciais.
//
// Um evento gerado por administrador (ADMIN_EMAILS) ou por contas listadas em
// ANALYTICS_IGNORED_EMAILS / ANALYTICS_IGNORED_USER_IDS não deve contaminar o
// funil comercial. A identificação usa a lista de e-mails administrativos já
// existente no projeto + variáveis de ambiente opcionais, sem exigir tabela
// de roles (que não existe).
// ============================================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import { listAllUsers } from '@/lib/supabase/admin'

type AnyClient = SupabaseClient<any, 'public', any>

export interface Ignorados {
  /** IDs de usuários (auth) a excluir. */
  userIds: Set<string>
  /** E-mails normalizados a excluir. */
  emails: Set<string>
  /** client_id de navegador a excluir (visitantes de teste). */
  clientIds: Set<string>
}

function splitEnv(...values: Array<string | undefined>): string[] {
  return values
    .filter(Boolean)
    .join(',')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/** E-mails administrativos/teste (ADMIN_EMAILS + ANALYTICS_IGNORED_EMAILS). */
export function emailsIgnorados(): string[] {
  const base = splitEnv(process.env.ADMIN_EMAILS, process.env.ANALYTICS_IGNORED_EMAILS)
  const lista = base.length ? base : ['luis19730@gmail.com']
  return Array.from(new Set(lista.map((e) => e.toLowerCase())))
}

/** client_ids ignorados (ANALYTICS_IGNORED_CLIENT_IDS). */
export function clientIdsIgnorados(): Set<string> {
  return new Set(splitEnv(process.env.ANALYTICS_IGNORED_CLIENT_IDS))
}

/**
 * Resolve o conjunto completo de usuários/clientes ignorados:
 * IDs explícitos (ANALYTICS_IGNORED_USER_IDS) + IDs dos e-mails admin/teste.
 */
export async function resolverIgnorados(client: AnyClient): Promise<Ignorados> {
  const userIds = new Set(splitEnv(process.env.ANALYTICS_IGNORED_USER_IDS))
  const emails = new Set(emailsIgnorados())
  const clientIds = clientIdsIgnorados()

  try {
    const res = await listAllUsers(client)
    for (const u of res.users || []) {
      const em = String(u.email || '').trim().toLowerCase()
      if (em && emails.has(em) && u.id) userIds.add(u.id)
    }
  } catch {
    // Se não for possível listar usuários, seguimos apenas com os IDs explícitos.
  }

  return { userIds, emails, clientIds }
}

/** true se o usuário/cliente deve ser excluído das métricas comerciais. */
export function ehIgnorado(
  ignorados: Ignorados,
  user_id: string | null | undefined,
  client_id: string | null | undefined
): boolean {
  if (user_id && ignorados.userIds.has(user_id)) return true
  if (client_id && ignorados.clientIds.has(client_id)) return true
  return false
}
