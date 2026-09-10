// ============================================================================
// Autorização CENTRAL de acesso pago (usada por rotas de API protegidas).
//
// Regra única (mesma do middleware e do computePlanoInfo):
//
//   ACESSO PERMITIDO = trial válido OU assinatura com pagamento confirmado
//   (status_pagamento 'active') OU trial de checkout ASAAS ('trial').
//
// NUNCA confia em localStorage/cookies/parâmetros do cliente: fonte da verdade
// é o banco (user_planos) + a sessão Supabase do usuário.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/alerts/db'
import { getPlano } from '@/lib/planos/db'
import { computePlanoInfo } from '@/lib/planos/plano'
import { isAdminEmail } from '@/lib/auth/admin-emails'
import { isEmailBloqueado } from '@/lib/auth/email-validation'
import { NextResponse } from 'next/server'

export type AcessoResultado = 'permitido' | 'nao_autenticado' | 'bloqueado'

/**
 * Determina o ACESSO real do usuário autenticado na sessão atual.
 *
 * - 'nao_autenticado': sem sessão → o caller deve retornar 401.
 * - 'bloqueado': trial expirado e sem pagamento confirmado → caller retorna 403.
 * - 'permitido': trial válido ou assinatura paga ativa.
 */
export async function verificarAcessoAPI(): Promise<AcessoResultado> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'nao_autenticado'

    // E-mails de bloqueio (placeholder/teste/descartáveis) nunca têm acesso.
    if (isEmailBloqueado(user.email)) return 'bloqueado'

    // Administradores contornam a regra de trial/pagamento (acesso pleno).
    if (isAdminEmail(user.email)) return 'permitido'

    const svc = createServiceClient()
    const rec = await getPlano(svc, user.id)
    // Sem registro (legado/Google): fail-closed — sem prova de trial válido ou
    // pagamento confirmado, o acesso pago NÃO é liberado.
    if (!rec) return 'bloqueado'

    const info = computePlanoInfo(rec)
    return info.acessoPermitido ? 'permitido' : 'bloqueado'
  } catch {
    // Falha de infraestrutura (service role ausente): não autoriza pagamento
    // indevido nem libera acesso não validado — bloqueia (fail-closed).
    return 'bloqueado'
  }
}

/**
 * Helper pronto para uso em rotas de API protegidas:
 *
 *   const guard = await requirePaidAccess()
 *   if (!guard.ok) return guard.response
 *
 * Retorna 401 se não autenticado, 403 se bloqueado.
 */
export async function requirePaidAccess(): Promise<
  { ok: true } | { ok: false; response: Response }
> {
  const acesso = await verificarAcessoAPI()
  if (acesso === 'nao_autenticado') {
    return { ok: false, response: NextResponse.json({ ok: false, erro: 'Não autenticado.' }, { status: 401 }) }
  }
  if (acesso === 'bloqueado') {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, erro: 'Seu período de teste terminou. Assine um plano para continuar.', bloqueado: true },
        { status: 403 }
      ),
    }
  }
  return { ok: true }
}
