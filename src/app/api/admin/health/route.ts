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
  // O check roda no DATACENTER do worker, onde o PNCP direto é bloqueado pelo
  // WAF (timeout). A fonte "proxy" é o caminho server-side oficial: deve ser
  // chamada SEM o header Referer (o proxy responde 404/timeout se ele vier) e
  // com timeout maior (~25s, pois é mais lento que o direto).
  //
  // A rota same-origin `/api/pncp/search` exige sessão (401 sem login) — 401
  // ali significa "rota ativa, requer sessão", NÃO que o PNCP esteja fora do
  // ar. Por isso ela é registrada como informativa e não derruba a checagem.
  //
  // Considera o PNCP OK quando o direto OU o proxy responde 2xx.
  const PNCP_PROXY = process.env.NEXT_PUBLIC_PNCP_PROXY || 'https://pncp-proxy.luis19730.workers.dev'
  const paramsPing = 'q=licitacao&tipos_documento=edital&pagina=1'
  const fonteDireto = `${PNCP_BASE}/search/?${paramsPing}`
  const fonteProxy = `${PNCP_PROXY.replace(/\/$/, '')}/search/?${paramsPing}`
  const mesmaOrigem = new URL(req.url).origin

  let pncpOk = false
  let pncpDetalhe = 'Api indisponível'
  // Fontes que retornaram QUALQUER resposta HTTP (edge do PNCP respondeu) —
  // usado para distinguir "PNCP no ar mas bloqueando o datacenter (WAF)" de
  // "PNCP realmente inacessível (timeout sem resposta)".
  let diretoStatus = -1
  let proxyStatus = -1

  // Direto — no datacenter o WAF do PNCP costuma responder HTTP 520/524 à
  // requisição (e não dar timeout): isso significa que o serviço ESTÁ no ar e
  // está bloqueando apenas o IP do datacenter. No navegador do usuário a mesma
  // URL responde 200 (verificado em produção).
  try {
    const resp = await fetch(fonteDireto, {
      method: 'GET',
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json', Referer: 'https://pncp.gov.br/' },
    })
    diretoStatus = resp.status
    if (resp.ok) pncpOk = true
    pncpDetalhe = `direto: HTTP ${resp.status}`
  } catch {
    pncpDetalhe = 'direto: timeout (sem resposta)'
  }

  // Proxy — fonte server-side oficial: SEM Referer e com timeout maior.
  try {
    const resp = await fetch(fonteProxy, {
      method: 'GET',
      signal: AbortSignal.timeout(25000),
      headers: { Accept: 'application/json' },
    })
    proxyStatus = resp.status
    if (resp.ok) {
      pncpOk = true
      pncpDetalhe = `proxy: HTTP ${resp.status}`
    } else {
      pncpDetalhe = `${pncpDetalhe} · proxy: HTTP ${resp.status}`
    }
  } catch {
    pncpDetalhe = `${pncpDetalhe} · proxy: timeout`
  }

  // Regra de veredito:
  //  - 2xx em direto ou proxy → PNCP respondeu com dados → OK.
  //  - direto respondeu com status de bloqueio WAF (520/522/524/403/429) →
  //    o PNCP está NO AR, apenas bloqueando o IP do datacenter; no navegador
  //    do usuário a fonte direta funciona → não é uma indisponibilidade.
  //  - apenas timeouts (nenhuma resposta) → PNCP inacessível de verdade.
  if (!pncpOk && [520, 522, 524, 403, 429].includes(diretoStatus)) {
    pncpOk = true
    pncpDetalhe = `${pncpDetalhe} → WAF bloqueia o datacenter; navegadores acessam o PNCP normalmente`
  }

  // Same-origin — informativo: 401 = rota protegida (requer sessão), não PNCP fora do ar.
  try {
    const resp = await fetch(`${mesmaOrigem}/api/pncp/search?${paramsPing}`, {
      method: 'GET',
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json' },
    })
    if (resp.status === 401 || resp.status === 403) {
      pncpDetalhe = `${pncpDetalhe} · same-origin protegida (requer sessão: HTTP ${resp.status})`
    } else if (resp.ok) {
      pncpOk = true
      pncpDetalhe = `HTTP ${resp.status} (same-origin)`
    }
  } catch {
    pncpDetalhe = `${pncpDetalhe} · same-origin: timeout`
  }

  checagens.push({ item: 'API PNCP', ok: pncpOk, detalhe: pncpOk ? pncpDetalhe : `Inacessível (${pncpDetalhe})` })

  // 5b. Login Google (OAuth) — confirma que o provedor Google está habilitado
  // no Supabase (a rota /authorize deve responder 302 para accounts.google.com).
  let oauthOk = false
  let oauthDetalhe = 'Não verificado'
  try {
    const sb = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    if (!sb) {
      oauthDetalhe = 'NEXT_PUBLIC_SUPABASE_URL ausente'
    } else {
      const redirectTo = encodeURIComponent(`${sb}/auth/v1/callback`)
      const resp = await fetch(`${sb}/auth/v1/authorize?provider=google&redirect_to=${redirectTo}`, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(8000),
        headers: { Accept: 'application/json' },
      })
      const loc = resp.headers.get('location') || ''
      oauthOk = resp.status === 302 && loc.includes('accounts.google.com')
      oauthDetalhe = oauthOk
        ? 'Provedor Google habilitado (302)'
        : `HTTP ${resp.status}${loc ? ` → ${loc.slice(0, 60)}` : ''}`
    }
  } catch (e) {
    oauthDetalhe = (e as Error)?.message || 'timeout'
  }
  checagens.push({ item: 'Login Google (OAuth)', ok: oauthOk, detalhe: oauthDetalhe })

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

  // Total de view_opportunity nos últimos 30 dias: se zero, o tracking não
  // está gerando dados recentes. (Antes era sem filtro de período — o alerta
  // nunca sumia após a primeira visualização registrada.)
  const ha30 = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000)
  const { count: viewsOportunidade } = await client
    .from('analytics_events')
    .select('id', { count: 'exact', head: true })
    .eq('event', 'view_opportunity')
    .gte('created_at', ha30.toISOString())
  if ((viewsOportunidade || 0) === 0) {
    alertas.push({
      tipo: 'oportunidades_zerada',
      mensagem: 'Nenhuma visualização de oportunidade nos últimos 30 dias (tracking precisa gerar dados)',
      gravidade: 'aviso',
    })
  }

  // Conversão zerada em 30 dias com cadastros acontecendo.
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