import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/alerts/db'
import { authorizeAdmin } from '@/lib/admin/auth'
import { parsePeriodo } from '@/lib/admin/periodo'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/funnel?periodo=30d
 * Funil de conversão com dados REAIS do período:
 *
 *   Visitantes → Buscaram → Visualizaram oportunidade → Cadastraram →
 *   Entraram no trial → Utilizaram (logados) → Clicaram no plano (conversion) →
 *   Iniciaram checkout → Pagaram (pagos via ASAAS no período) → Assinantes ativos.
 *
 * Cada etapa vem de uma fonte real (analytics_events, user_planos,
 * asaas_webhook_events) filtrada pelo mesmo intervalo. Nada é inventado.
 */
export async function GET(req: Request) {
  const auth = await authorizeAdmin(req)
  if (!auth.ok) return auth.response

  const url = new URL(req.url)
  const parsed = parsePeriodo(url)
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, erro: parsed.erro }, { status: 400 })
  }
  const { periodo } = parsed

  let client
  try {
    client = createServiceClient()
  } catch {
    return NextResponse.json({ ok: false, erro: 'Banco de dados não configurado.' }, { status: 503 })
  }

  const fimQuery = periodo.fim || new Date().toISOString()
  const contaEvento = async (evento: string) => {
    let q = client
      .from('analytics_events')
      .select('id', { count: 'exact', head: true })
      .eq('event', evento)
      .gte('created_at', periodo.inicio)
    if (periodo.fim) q = q.lt('created_at', periodo.fim)
    const { count } = await q
    return count || 0
  }

  const contaPlanos = async (filtros: Record<string, string | boolean>) => {
    let q = client.from('user_planos').select('user_id', { count: 'exact', head: true })
    for (const [col, val] of Object.entries(filtros)) {
      q = typeof val === 'boolean' ? q.eq(col, val) : q.eq(col, val as string)
    }
    const { count } = await q
    return count || 0
  }

  const [buscou, visualizou, cadastrou, logins, clicouPlano] = await Promise.all([
    contaEvento('search'),
    contaEvento('view_opportunity'),
    contaEvento('signup'),
    contaEvento('login'),
    contaEvento('conversion'),
  ])

  // Visitantes únicos (client_id) e usuários logados com atividade no período.
  const { data: rows, error: rowsErr } = await client
    .from('analytics_events')
    .select('id,client_id,user_id,created_at')
    .gte('created_at', periodo.inicio)
    .lt('created_at', fimQuery)
    .limit(10000)
  if (rowsErr) {
    return NextResponse.json({ ok: false, erro: 'Falha ao ler eventos.' }, { status: 500 })
  }
  const visitantes = new Set<string>()
  const usuariosAtivos = new Set<string>()
  for (const e of rows || []) {
    if (e.client_id) visitantes.add(e.client_id)
    if (e.user_id) usuariosAtivos.add(e.user_id)
  }

  // Entrou no trial: registros cujo trial_inicio caiu no período.
  let entrouTrialQ = client
    .from('user_planos')
    .select('user_id', { count: 'exact', head: true })
    .not('trial_inicio', 'is', null)
    .gte('trial_inicio', periodo.inicio)
  if (periodo.fim) entrouTrialQ = entrouTrialQ.lt('trial_inicio', periodo.fim)
  const { count: entrouTrialRaw } = await entrouTrialQ
  const entrouTrial = entrouTrialRaw || 0

  // Iniciou checkout: cadastros ASAAS criados no período.
  let checkoutQ = client
    .from('user_planos')
    .select('user_id', { count: 'exact', head: true })
    .eq('origem', 'asaas')
    .gte('created_at', periodo.inicio)
  if (periodo.fim) checkoutQ = checkoutQ.lt('created_at', periodo.fim)
  const { count: iniciouCheckoutRaw } = await checkoutQ
  const iniciouCheckout = iniciouCheckoutRaw || 0

  // Pagamentos confirmados/recebidos no período (ASAAS webhook).
  let pagosQ = client
    .from('asaas_webhook_events')
    .select('id', { count: 'exact', head: true })
    .in('event_type', ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'])
    .gte('created_at', periodo.inicio)
  if (periodo.fim) pagosQ = pagosQ.lt('created_at', periodo.fim)
  const { count: pagamentosConfirmadosRaw } = await pagosQ
  const pagamentosConfirmados = pagamentosConfirmadosRaw || 0

  // Assinantes ativos hoje (snapshot) e que pagaram no período.
  const assinantesAtivos = await contaPlanos({ status_pagamento: 'active' })
  let novosQ = client
    .from('user_planos')
    .select('user_id', { count: 'exact', head: true })
    .not('last_payment_at', 'is', null)
    .gte('last_payment_at', periodo.inicio)
  if (periodo.fim) novosQ = novosQ.lt('last_payment_at', periodo.fim)
  const { count: assinantesNovosRaw } = await novosQ
  const assinantesNovos = assinantesNovosRaw || 0

  const etapas = [
    { chave: 'visitantes', rotulo: 'Visitantes', valor: visitantes.size, cor: 'sky', fonte: 'analytics' },
    { chave: 'buscaram', rotulo: 'Buscaram', valor: buscou, cor: 'emerald', fonte: 'analytics' },
    { chave: 'visualizaram', rotulo: 'Visualizaram oportunidade', valor: visualizou, cor: 'violet', fonte: 'analytics' },
    { chave: 'cadastraram', rotulo: 'Cadastraram', valor: cadastrou, cor: 'indigo', fonte: 'analytics' },
    { chave: 'trial', rotulo: 'Entraram no trial', valor: entrouTrial, cor: 'amber', fonte: 'user_planos' },
    { chave: 'utilizaram', rotulo: 'Utilizaram (logados)', valor: usuariosAtivos.size, cor: 'cyan', fonte: 'analytics' },
    { chave: 'clicaram', rotulo: 'Clicaram no plano', valor: clicouPlano, cor: 'orange', fonte: 'analytics' },
    { chave: 'checkout', rotulo: 'Iniciaram o checkout', valor: iniciouCheckout, cor: 'teal', fonte: 'user_planos' },
    { chave: 'pagaram', rotulo: 'Pagaram', valor: pagamentosConfirmados, cor: 'lime', fonte: 'webhook' },
    { chave: 'assinantes', rotulo: 'Assinantes ativos', valor: assinantesAtivos, cor: 'green', fonte: 'user_planos' },
  ]

  const taxa = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0)

  return NextResponse.json({
    ok: true,
    agora: new Date().toISOString(),
    periodo,
    etapas,
    taxas: {
      visita_para_cadastro: taxa(cadastrou, visitantes.size),
      cadastro_para_conversao: taxa(clicouPlano, cadastrou),
      cadastro_para_pagamento: taxa(pagamentosConfirmados, cadastrou),
      checkout_para_pagamento: taxa(pagamentosConfirmados, iniciouCheckout),
    },
    extras: { logins, usuarios_ativos: usuariosAtivos.size, assinantes_novos: assinantesNovos },
  })
}