import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/alerts/db'
import { authorizeAdmin } from '@/lib/admin/auth'
import { listPlanos } from '@/lib/planos/db'
import { computePlanoInfo } from '@/lib/planos/plano'
import { asaasConfigured, asaasWebhookToken } from '@/lib/asaas/config'
import { aiConfigured } from '@/lib/ia/workers-ai'

export const dynamic = 'force-dynamic'

const PNCP_BASE = process.env.NEXT_PUBLIC_PNCP_BASE || 'https://pncp.gov.br/api'

/**
 * GET /api/admin/health
 * Saúde do sistema + alertas automáticos (todos a partir de dados reais):
 *  - 8 checagens operacionais (banco, secrets, ASAAS, IA, API PNCP, fluxo de
 *    eventos, webhooks não processados);
 *  - alertas tratáveis da caixa "atenção": trials vencendo em ≤3 dias, trials
 *    expirados, inadimplentes, pagamentos pendentes, oportunidades zeradas,
 *    conversão zerada em 30 dias;
 *  - status final: verde / amarelo / vermelho.
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

  const agora = new Date()
  const checagens: { item: string; ok: boolean; detalhe: string }[] = []

  // 1. Banco de dados
  let dbOk = false
  let planos: Awaited<ReturnType<typeof listPlanos>> = []
  try {
    planos = await listPlanos(client)
    dbOk = planos.length >= 0
  } catch {
    dbOk = false
  }
  checagens.push({
    item: 'Banco de dados',
    ok: dbOk,
    detalhe: dbOk ? `${planos.length} registros de plano lidos` : 'Falha ao consultar user_planos',
  })

  // 2. Secrets
  const serviceRoleOk = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('placeholder')
  checagens.push({
    item: 'Chave de serviço (SERVICE_ROLE)',
    ok: serviceRoleOk,
    detalhe: serviceRoleOk ? 'Configurada' : 'Ausente ou placeholder',
  })
  const adminOk = !!process.env.ADMIN_PASSWORD
  checagens.push({
    item: 'Senha do administrador',
    ok: adminOk,
    detalhe: adminOk ? 'Configurada' : 'ADMIN_PASSWORD ausente',
  })

  // 3. ASAAS
  const asaasOk = asaasConfigured() && !!asaasWebhookToken()
  checagens.push({
    item: 'Integração ASAAS',
    ok: asaasOk,
    detalhe: asaasOk ? 'API Key + webhook configurados' : 'API Key ou webhook ausentes',
  })

  // 4. IA
  const iaOk = (await aiConfigured().catch(() => false)) || !!process.env.GEMINI_API_KEY
  checagens.push({
    item: 'IA (Workers AI / Gemini)',
    ok: iaOk,
    detalhe: iaOk ? 'Disponível' : 'Sem binding AI nem GEMINI_API_KEY',
  })

  // 5. API PNCP
  let pncpOk = false
  let pncpDetalhe = 'Api indisponível'
  try {
    const resp = await fetch(PNCP_BASE, {
      method: 'GET',
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json' },
    })
    pncpOk = true
    pncpDetalhe = `HTTP ${resp.status}`
  } catch (e) {
    pncpOk = false
    pncpDetalhe = (e as Error)?.message || 'timeout'
  }
  checagens.push({ item: 'API PNCP', ok: pncpOk, detalhe: pncpOk ? pncpDetalhe : `Inacessível (${pncpDetalhe})` })

  // 6. Fluxo de eventos recentes
  const ha1h = new Date(agora.getTime() - 60 * 60 * 1000)
  const { count: eventos1h } = await client
    .from('analytics_events')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', ha1h.toISOString())
  checagens.push({
    item: 'Fluxo de eventos',
    ok: (eventos1h || 0) > 0,
    detalhe: `${eventos1h || 0} eventos na última hora`,
  })

  // 7. Webhooks: não processados (reais) e rejeitados por token
  const { count: naoProcessados } = await client
    .from('asaas_webhook_events')
    .select('id', { count: 'exact', head: true })
    .eq('processed', false)
    .neq('event_type', 'REJEITADO')
  const { count: webhookRejeitados } = await client
    .from('asaas_webhook_events')
    .select('id', { count: 'exact', head: true })
    .eq('event_type', 'REJEITADO')
  const webhookOk = (naoProcessados || 0) === 0 && (webhookRejeitados || 0) === 0
  let webhookDetalhe = 'Todos processados'
  if ((naoProcessados || 0) > 0) webhookDetalhe = `${naoProcessados} não processados`
  else if ((webhookRejeitados || 0) > 0) webhookDetalhe = `${webhookRejeitados} rejeitado(s) por token`
  checagens.push({
    item: 'Webhooks ASAAS',
    ok: webhookOk,
    detalhe: webhookDetalhe,
  })

  // ---- Alertas automáticos (dados reais) ----
  const alertas: { tipo: string; mensagem: string; gravidade: 'aviso' | 'critico' }[] = []

  let trialsVencendo = 0
  let trialsExpirados = 0
  let inadimplentes = 0
  let pendentes = 0
  let ativos = 0
  let trialsAtivos = 0
  for (const p of planos) {
    const info = computePlanoInfo(p, agora)
    if (info.statusPagamento === 'active') ativos++
    if (info.statusPagamento === 'overdue') inadimplentes++
    if (info.statusPagamento === 'payment_pending') pendentes++
    if (info.statusPagamento === 'trial' || (info.origem === 'trial' && info.emTrial)) trialsAtivos++
    if (info.statusPagamento === 'trial' && info.diasRestantes !== null && info.diasRestantes <= 3) trialsVencendo++
    if (info.origem === 'trial' && info.statusTrial === 'expirado') trialsExpirados++
  }
  const trialsVencendoDetalhe = planos
    .filter((p) => {
      const info = computePlanoInfo(p, agora)
      return info.statusPagamento === 'trial' && info.diasRestantes !== null && info.diasRestantes <= 3
    })
    .map((p) => p.user_id)
    .slice(0, 5)

  if (trialsVencendo > 0) {
    alertas.push({
      tipo: 'trial_vencendo',
      mensagem: `${trialsVencendo} trial(s) expiram em até 3 dias`,
      gravidade: 'aviso',
    })
  }
  if (trialsExpirados > 0) {
    alertas.push({
      tipo: 'trial_expirado',
      mensagem: `${trialsExpirados} usuário(s) com trial expirado (sem pagamento)`,
      gravidade: 'critico',
    })
  }
  if (inadimplentes > 0) {
    alertas.push({
      tipo: 'inadimplente',
      mensagem: `${inadimplentes} assinatura(s) inadimplente(s)`,
      gravidade: 'aviso',
    })
  }
  if (pendentes > 0) {
    alertas.push({
      tipo: 'pendente',
      mensagem: `${pendentes} pagamento(s) pendente(s) de confirmação`,
      gravidade: 'aviso',
    })
  }
  if ((webhookRejeitados || 0) > 0) {
    alertas.push({
      tipo: 'webhook_token',
      mensagem: `${webhookRejeitados} webhook(s) ASAAS rejeitado(s) por token — confira o header asaas-access-token vs ASAAS_WEBHOOK_TOKEN`,
      gravidade: 'critico',
    })
  }

  // Payload dos trials vencendo (ids) auxiliam a ação manual no painel.
  if (trialsVencendoDetalhe.length > 0) {
    alertas.push({
      tipo: 'trial_vencendo_ids',
      mensagem: `Trials vencendo: ${trialsVencendoDetalhe.join(', ')}`,
      gravidade: 'aviso',
    })
  }

  // Total de view_opportunity: se zero, o tracking nunca disparou.
  const { count: viewsOportunidade } = await client
    .from('analytics_events')
    .select('id', { count: 'exact', head: true })
    .eq('event', 'view_opportunity')
  if ((viewsOportunidade || 0) === 0) {
    alertas.push({
      tipo: 'oportunidades_zerada',
      mensagem: 'Nenhuma oportunidade visualizada registrada (tracking precisa gerar dados)',
      gravidade: 'aviso',
    })
  }

  // Conversão zerada em 30 dias com cadastros acontecendo.
  const ha30 = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000)
  const { count: cadnavs30 } = await client
    .from('analytics_events')
    .select('id', { count: 'exact', head: true })
    .eq('event', 'signup')
    .gte('created_at', ha30.toISOString())
  const { count: convencs30 } = await client
    .from('analytics_events')
    .select('id', { count: 'exact', head: true })
    .eq('event', 'conversion')
    .gte('created_at', ha30.toISOString())
  if ((cadnavs30 || 0) > 0 && (convencs30 || 0) === 0) {
    alertas.push({
      tipo: 'conversao_zerada',
      mensagem: `${cadnavs30} cadastro(s) nos últimos 30 dias e nenhuma conversão (CTA de plano)`,
      gravidade: 'aviso',
    })
  }

  // ---- Status final ----
  let status: 'verde' | 'amarelo' | 'vermelho' = 'verde'
  if (!dbOk || !serviceRoleOk || !adminOk) {
    status = 'vermelho'
  } else if (
    !asaasOk ||
    !iaOk ||
    !pncpOk ||
    (eventos1h || 0) === 0 ||
    (naoProcessados || 0) > 0 ||
    (webhookRejeitados || 0) > 0 ||
    (trialsVencendo || trialsExpirados || inadimplentes || pendentes) > 0 ||
    (viewsOportunidade || 0) === 0
  ) {
    status = 'amarelo'
  }

  return NextResponse.json({
    ok: true,
    agora: agora.toISOString(),
    status,
    checagens,
    alertas,
    resumo: {
      planos: planos.length,
      trials_ativos: trialsAtivos,
      assinantes_ativos: ativos,
      inadimplentes,
      pendentes,
      eventos_1h: eventos1h || 0,
      webhooks_nao_processados: naoProcessados || 0,
      webhooks_rejeitados: webhookRejeitados || 0,
    },
  })
}