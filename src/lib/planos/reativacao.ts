// ============================================================================
// CAMPANHA DE REATIVAÇÃO — seleção de alvos (compartilhada).
//
// A regra de quem recebe o e-mail de recuperação pós-trial mora em UM lugar,
// reutilizada pelo cron diário (/api/cron/email-reativacao) e pelo dry-run
// (mesmo cron com ?dryRun=1). Regras:
//   - plano `free` com trial expirado (filtro SQL em listPlanosElegiveisReativacao);
//   - origem 'trial' (não confundir com manual/asaas);
//   - não bloqueado manualmente;
//   - sem assinatura ativa (status_pagamento não é 'active' nem 'trial');
//   - e-mail válido;
//   - fora dos usuários administrativos/de teste (resolverIgnorados).
// ============================================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import { listAllUsers } from '@/lib/supabase/admin'
import { resolverIgnorados } from '@/lib/admin/publico'
import { computePlanoInfo } from '@/lib/planos/plano'
import { listPlanosElegiveisReativacao } from '@/lib/planos/db'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, 'public', any>

export const EMAIL_VALIDO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function emailValido(email: string): boolean {
  return EMAIL_VALIDO_RE.test(email)
}

export interface AlvoReativacao {
  user_id: string
  email: string
}

/**
 * Resolve a lista atual de candidatos ao e-mail de recuperação (sem enviar).
 * Lança erro se não for possível listar usuários (o chamador decide o status).
 */
export async function selecionarAlvosReativacao(
  client: AnyClient,
  agora = new Date()
): Promise<AlvoReativacao[]> {
  const ignorados = await resolverIgnorados(client)
  const [registros, usersRes] = await Promise.all([
    listPlanosElegiveisReativacao(client, agora),
    listAllUsers(client).then((r) => ({ users: r.users, error: r.error })),
  ])
  if (usersRes.error || !usersRes.users) {
    throw new Error('Não foi possível listar os usuários.')
  }

  const emailPorUser = new Map<string, string>()
  for (const u of usersRes.users) {
    if (u.id && u.email) emailPorUser.set(u.id, u.email.toLowerCase())
  }

  const alvos: AlvoReativacao[] = []
  for (const r of registros) {
    if (ignorados.userIds.has(r.user_id)) continue
    const email = emailPorUser.get(r.user_id)
    if (!email || !emailValido(email)) continue

    const info = computePlanoInfo(r, agora)
    if (info.origem !== 'trial') continue
    if (info.bloqueado) continue
    if (info.plano !== 'free') continue
    if (info.statusPagamento === 'active' || info.statusPagamento === 'trial') continue

    alvos.push({ user_id: r.user_id, email })
  }

  // Ordena por e-mail para o dry-run ser estável/legível.
  alvos.sort((a, b) => a.email.localeCompare(b.email))
  return alvos
}