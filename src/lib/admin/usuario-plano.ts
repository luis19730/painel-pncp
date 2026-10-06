// ============================================================================
// Listagem compartilhada de USUÁRIOS + PLANOS para o painel admin.
//
// Extraída do GET /api/admin/planos para ser reutilizada por /api/admin/users,
// /api/admin/subscriptions e /api/admin/revenue — um único lugar decide como
// cada usuário aparece (plano, trial, status ASAAS, próxima cobrança).
// ============================================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import { listAllUsers } from '@/lib/supabase/admin'
import { listPlanos } from '@/lib/planos/db'
import { computePlanoInfo, proximaCobrancaInfo, type PlanoNome, type PlanoRecord } from '@/lib/planos/plano'
import { cicloById, precoCiclo, formatReais } from '@/lib/asaas/types'

export interface UsuarioComPlano {
  user_id: string
  email: string
  criado_em: string | null
  confirmado: boolean
  plano: PlanoNome
  origem: string
  statusTrial: string
  trialFim: string | null
  diasRestantes: number | null
  emTrial: boolean
  bloqueado: boolean
  acessoPermitido: boolean
  semRegistro: boolean
  statusPagamento: string
  paymentMethod: string
  ciclo: string
  valorCiclo: number
  valorCicloLabel: string
  asaasCustomerId: string | null
  asaasSubscriptionId: string | null
  nextDueDate: string | null
  lastPaymentAt: string | null
  canceledAt: string | null
  proximaCobranca30d: string | null
  diasParaCobranca30d: number | null
  /** Campanha de reativação: e-mail de recuperação pós-trial já enviado. */
  emailReativacaoEnviado: boolean
  emailReativacaoEnviadoAt: string | null
  /** Cliente PAGANTE (assinatura ASAAS ativa ou plano pago concedido manual). */
  pago: boolean
  /** Acesso ENCERRADO (trial expirado/bloqueado, sem plano pago ativo). */
  expirado: boolean
}

/**
 * Lista todos os usuários do Auth combinados com o registro user_planos.
 * `busca` (opcional) filtra por e-mail (case-insensitive, contém).
 */
export async function listarUsuariosComPlano(
  client: SupabaseClient,
  busca?: string
): Promise<UsuarioComPlano[]> {
  const [usersRes, planos] = await Promise.all([
    listAllUsers(client).then((r) => r),
    listPlanos(client).catch(() => [] as PlanoRecord[]),
  ])
  if (usersRes.error) {
    throw new Error('Não foi possível listar os usuários.')
  }

  const planoPorUser = new Map<string, PlanoRecord>()
  for (const p of planos) {
    if (!planoPorUser.has(p.user_id)) planoPorUser.set(p.user_id, p)
  }

  const filtro = busca ? String(busca).trim().toLowerCase() : ''

  const agora = new Date()

  return usersRes.users
    .map((u) => {
      const rec = planoPorUser.get(u.id) || null
      const info = computePlanoInfo(rec, agora)
      const cobranca = proximaCobrancaInfo(info, agora)
      const planoId = info.plano === 'business' ? 'empresa' : 'pro'
      const cic = cicloById(info.cicloAssinatura || 'mensal') || cicloById('mensal')!
      const valorCiclo = precoCiclo(planoId, cic.id)
      // Pagante = assinatura ASAAS ATIVA OU plano pago (pro/business) fora do
      // trial. O trial de checkout (origem 'asaas' + status 'trial') NÃO conta
      // como pagante até a primeira cobrança confirmada.
      const pago =
        info.statusPagamento === 'active' ||
        (info.acessoPermitido && info.plano !== 'free' && info.origem === 'manual')
      const expirado = !info.acessoPermitido && !pago
      return {
        user_id: u.id,
        email: u.email || '—',
        criado_em: u.created_at,
        confirmado: !!u.email_confirmed_at,
        plano: info.plano,
        origem: info.origem,
        statusTrial: info.statusTrial,
        trialFim: info.trial_inicio || info.trial_fim ? info.trialFimCalculado : null,
        diasRestantes: info.diasRestantes,
        emTrial: info.emTrial,
        bloqueado: info.bloqueado,
        acessoPermitido: info.acessoPermitido,
        semRegistro: !rec,
        statusPagamento: info.statusPagamento,
        paymentMethod: info.paymentMethod,
        ciclo: info.cicloAssinatura,
        valorCiclo,
        valorCicloLabel: formatReais(valorCiclo),
        asaasCustomerId: info.asaasCustomerId,
        asaasSubscriptionId: info.asaasSubscriptionId,
        nextDueDate: info.nextDueDate,
        lastPaymentAt: info.lastPaymentAt,
        canceledAt: info.canceledAt,
        proximaCobranca30d: cobranca.proximaCobranca,
        diasParaCobranca30d: cobranca.diasParaCobranca,
        emailReativacaoEnviado: !!rec?.email_reactivation_sent,
        emailReativacaoEnviadoAt: rec?.email_reactivation_sent_at || null,
        pago,
        expirado,
      }
    })
    .filter((u) => !filtro || u.email.toLowerCase().includes(filtro))
    // ORDEM da aba Usuários: 1) clientes PAGANTES no topo; 2) em teste;
    // 3) EXPIRADOS no fim. Dentro de cada grupo, por data de cadastro.
    .sort((a, b) => {
      const tier = (u: UsuarioComPlano) => (u.pago ? 0 : u.acessoPermitido ? 1 : 2)
      return tier(a) - tier(b) || (a.criado_em || '').localeCompare(b.criado_em || '')
    })
}