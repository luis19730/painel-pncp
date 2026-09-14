// ============================================================================
// Motor do PAINEL DE CONVERSÃO.
//
// Lê APENAS dados reais já registrados (analytics_events, user_planos,
// asaas_webhook_events) e monta: funil com usuários únicos, variação vs período
// anterior, resumo executivo, recomendações automáticas, alertas, lead score,
// leads quentes, monitoramento de trials, acessos por dia, retenção D1/D7 e
// ranking de funcionalidades.
//
// Nada é inventado: quando não há dado, o valor é 0/null — nunca estimado.
// Atividade de administradores/contas de teste é excluída (lib/admin/publico).
// ============================================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import { listPlanos } from '@/lib/planos/db'
import { listAllUsers } from '@/lib/supabase/admin'
import { computePlanoInfo, type PlanoRecord } from '@/lib/planos/plano'
import { resolverIgnorados, ehIgnorado, type Ignorados } from '@/lib/admin/publico'
import { calcularLeadScore, type LeadSinais, type LeadClassificacao } from '@/lib/admin/lead-score'
import type { PeriodoCtx } from '@/lib/admin/periodo'

type AnyClient = SupabaseClient<any, 'public', any>

interface EventoRow {
  event: string
  user_id: string | null
  client_id: string | null
  page: string | null
  path: string | null
  props: Record<string, unknown> | null
  created_at: string
}

export interface EtapaFunil {
  chave: string
  rotulo: string
  valor: number
  pctAnterior: number
  pctTotal: number
  variacao: number
}

export interface LeadRow {
  user_id: string
  email: string
  score: number
  classificacao: LeadClassificacao
  motivos: string[]
  ultimaAtividade: string | null
  plano: string
  statusTrial: string
  diasRestantes: number | null
  pagou: boolean
}

export interface TrialRow {
  user_id: string
  email: string
  plano: string
  statusTrial: string
  trialFim: string | null
  diasRestantes: number | null
  status: 'ativo' | 'vencendo' | 'expirado' | 'assinante'
  acessoPermitido: boolean
}

export interface Alerta {
  tipo: string
  titulo: string
  detalhe: string
  em: string | null
}

export interface ConversaoResultado {
  agora: string
  periodo: PeriodoCtx
  resumo: {
    visitantes: number
    cadastros: number
    trials: number
    ativos: number
    engaged: number
    planViews: number
    checkouts: number
    pagamentos: number
    conversaoVisitaPagamento: number
    conversaoCadastroPagamento: number
  }
  etapas: EtapaFunil[]
  recomendacoes: string[]
  alertas: Alerta[]
  leads: LeadRow[]
  leadsQuentes: LeadRow[]
  trials: TrialRow[]
  acessosPorDia: Array<{ dia: string; valor: number }>
  retencao: { d1: number | null; d7: number | null; base: number }
  rankingFuncionalidades: Array<{ nome: string; valor: number }>
  pagamentos: Array<{ user_id: string; email: string; em: string | null; valor: number | null }>
  ignorados: { usuarios: number; clientes: number }
  eventos: EventoRow[]
}

const PAGINAS_FEATURE = new Set([
  'dashboard', 'busca', 'oportunidade', 'oportunidades', 'precos', 'precos-inteligentes',
  'analise-edital', 'ia-licitacoes', 'relatorios', 'calendario', 'modalidades',
  'concorrentes', 'meu-radar', 'alertas', 'checklist', 'justificativa', 'documentos',
  'montagem-processo', 'meus-processos', 'score', 'favoritos', 'sinapi',
])

function pct(a: number, b: number): number {
  return b > 0 ? Math.round((a / b) * 1000) / 10 : 0
}

function diaSP(iso: string): string {
  const d = new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

export function intervaloAnterior(periodo: PeriodoCtx): PeriodoCtx {
  const inicio = new Date(periodo.inicio).getTime()
  const fim = periodo.fim ? new Date(periodo.fim).getTime() : Date.now()
  const dur = Math.max(1, fim - inicio)
  const pInicio = new Date(inicio - dur)
  const pFim = new Date(inicio)
  return {
    label: `Período anterior (${periodo.label})`,
    inicio: pInicio.toISOString(),
    fim: pFim.toISOString(),
  }
}

async function lerEventos(client: AnyClient, inicio: string, fim: string): Promise<EventoRow[]> {
  const { data, error } = await client
    .from('analytics_events')
    .select('event,user_id,client_id,page,path,props,created_at')
    .gte('created_at', inicio)
    .lt('created_at', fim)
    .order('created_at', { ascending: false })
    .limit(30000)
  if (error) return []
  return (data || []) as EventoRow[]
}

interface SinaisUsuario extends Omit<LeadSinais, 'pagou'> {
  ultima: string | null
  funcs: Set<string>
  dias: Set<string>
}

function agregarPorUsuario(eventos: EventoRow[]): Map<string, SinaisUsuario> {
  const mapa = new Map<string, SinaisUsuario>()
  for (const e of eventos) {
    if (!e.user_id) continue
    let s = mapa.get(e.user_id)
    if (!s) {
      s = {
        login: 0, dashboard: 0, search: 0, priceSearch: 0, analysis: 0, report: 0,
        diasDistintos: 0, funcionalidades: 0, planView: 0, checkoutStarted: 0,
        ultima: null, funcs: new Set(), dias: new Set(),
      }
      mapa.set(e.user_id, s)
    }
    if (!s.ultima || e.created_at > s.ultima) s.ultima = e.created_at
    s.dias.add(diaSP(e.created_at))

    const page = String(e.page || '').toLowerCase()
    const path = String(e.path || '')
    switch (e.event) {
      case 'login':
        s.login++
        break
      case 'search':
        s.search++
        break
      case 'view_opportunity':
        s.funcs.add('oportunidade')
        break
      case 'plan_view':
      case 'conversion':
        s.planView++
        break
      case 'checkout_started':
        s.checkoutStarted++
        break
      case 'pageview':
        if (page === 'dashboard' || path.startsWith('/dashboard')) s.dashboard++
        else if (page === 'precos' || page === 'precos-inteligentes') s.priceSearch++
        else if (page === 'analise-edital' || page === 'ia-licitacoes') s.analysis++
        else if (page === 'relatorios') s.report++
        if (page && PAGINAS_FEATURE.has(page)) s.funcs.add(page)
        break
      default:
        break
    }
  }
  for (const s of mapa.values()) {
    s.diasDistintos = s.dias.size
    s.funcionalidades = s.funcs.size
  }
  return mapa
}

function unicos(eventos: EventoRow[], predicado: (e: EventoRow) => boolean, chave: 'user' | 'client'): number {
  const set = new Set<string>()
  for (const e of eventos) {
    if (!predicado(e)) continue
    const v = chave === 'user' ? e.user_id : e.client_id
    if (v) set.add(v)
  }
  return set.size
}

export async function montarConversao(
  client: AnyClient,
  periodo: PeriodoCtx
): Promise<ConversaoResultado> {
  const agora = new Date()
  const fim = periodo.fim || agora.toISOString()
  const anterior = intervaloAnterior(periodo)
  const anteriorFim = anterior.fim as string

  const ignorados: Ignorados = await resolverIgnorados(client)

  const [evRaw, prevRaw, planos, usersRes] = await Promise.all([
    lerEventos(client, periodo.inicio, fim),
    lerEventos(client, anterior.inicio, anteriorFim),
    listPlanos(client).catch(() => [] as PlanoRecord[]),
    listAllUsers(client).then((r) => ({ users: r.users, error: r.error })),
  ])

  const ev = evRaw.filter((e) => !ehIgnorado(ignorados, e.user_id, e.client_id))
  const prev = prevRaw.filter((e) => !ehIgnorado(ignorados, e.user_id, e.client_id))

  const emailPorUser = new Map<string, string>()
  const criadoEm = new Map<string, string>()
  for (const u of usersRes.users || []) {
    const em = String(u.email || '').trim()
    if (em && ignorados.emails.has(em.toLowerCase())) continue
    emailPorUser.set(u.id, em || '—')
    if (u.created_at) criadoEm.set(u.id, u.created_at)
  }

  const planoPorUser = new Map<string, PlanoRecord>()
  for (const p of planos) {
    if (!planoPorUser.has(p.user_id)) planoPorUser.set(p.user_id, p)
  }

  // ---- Funil (usuários únicos por etapa) ----
  const inPeriodo = (iso: string) => iso >= periodo.inicio && iso < fim
  const cadastros = Array.from(criadoEm.entries()).filter(([, c]) => inPeriodo(c)).length
  const prevCadastros = Array.from(criadoEm.entries()).filter(
    ([, c]) => c >= anterior.inicio && c < anteriorFim
  ).length

  const isEngaged = (e: EventoRow) =>
    e.event === 'search' ||
    e.event === 'view_opportunity' ||
    (e.event === 'pageview' &&
      ['precos', 'precos-inteligentes', 'analise-edital', 'ia-licitacoes', 'relatorios'].includes(
        String(e.page || '').toLowerCase()
      ))

  let trials = unicos(ev, (e) => e.event === 'trial_started', 'user')
  if (trials === 0) {
    trials = planos.filter((p) => p.trial_inicio && inPeriodo(p.trial_inicio)).length
  }
  let prevTrials = unicos(prev, (e) => e.event === 'trial_started', 'user')
  if (prevTrials === 0) {
    prevTrials = planos.filter((p) => p.trial_inicio && p.trial_inicio >= anterior.inicio && p.trial_inicio < anteriorFim).length
  }

  const visitantes = unicos(ev, (e) => true, 'client')
  const ativos = unicos(ev, (e) => true, 'user')
  const engaged = unicos(ev, isEngaged, 'user')
  const planViews = unicos(ev, (e) => e.event === 'plan_view' || e.event === 'conversion', 'user') ||
    unicos(ev, (e) => e.event === 'plan_view' || e.event === 'conversion', 'client')
  const checkouts = unicos(ev, (e) => e.event === 'checkout_started', 'user')
  const pagamentos = unicos(ev, (e) => e.event === 'payment_confirmed', 'user')

  const prevVisitantes = unicos(prev, () => true, 'client')
  const prevPlanViews = unicos(prev, (e) => e.event === 'plan_view' || e.event === 'conversion', 'user')
  const prevCheckouts = unicos(prev, (e) => e.event === 'checkout_started', 'user')
  const prevPagamentos = unicos(prev, (e) => e.event === 'payment_confirmed', 'user')

  const etapas: EtapaFunil[] = [
    { chave: 'visitantes', rotulo: 'Visitantes', valor: visitantes },
    { chave: 'cadastros', rotulo: 'Cadastros', valor: cadastros },
    { chave: 'trials', rotulo: 'Trials iniciados', valor: trials },
    { chave: 'ativos', rotulo: 'Usuários ativos', valor: ativos },
    { chave: 'engaged', rotulo: 'Engajados (funções-chave)', valor: engaged },
    { chave: 'planos', rotulo: 'Visualizaram planos', valor: planViews },
    { chave: 'checkout', rotulo: 'Iniciaram checkout', valor: checkouts },
    { chave: 'pagamentos', rotulo: 'Pagamentos confirmados', valor: pagamentos },
  ].map((e, i, arr) => {
    const prevValor = [prevVisitantes, prevCadastros, prevTrials, 0, 0, prevPlanViews, prevCheckouts, prevPagamentos][i]
    const anteriorValor = i === 0 ? 0 : arr[i - 1].valor
    return {
      ...e,
      pctAnterior: pct(e.valor, anteriorValor),
      pctTotal: pct(e.valor, visitantes),
      variacao: prevValor > 0 ? Math.round(((e.valor - prevValor) / prevValor) * 1000) / 10 : (e.valor > 0 ? 100 : 0),
    }
  })

  // ---- Leads / lead score ----
  const sinais = agregarPorUsuario(ev)
  const leads: LeadRow[] = []
  for (const [user_id, s] of sinais.entries()) {
    const rec = planoPorUser.get(user_id) || null
    const info = computePlanoInfo(rec, agora)
    const pagou = info.statusPagamento === 'active' || info.plano === 'pro' || info.plano === 'business'
    const leadScore = calcularLeadScore({ ...s, pagou })
    leads.push({
      user_id,
      email: emailPorUser.get(user_id) || '—',
      score: leadScore.score,
      classificacao: leadScore.classificacao,
      motivos: leadScore.motivos,
      ultimaAtividade: s.ultima,
      plano: info.plano,
      statusTrial: info.statusTrial,
      diasRestantes: info.diasRestantes,
      pagou,
    })
  }
  leads.sort((a, b) => b.score - a.score || (b.ultimaAtividade || '').localeCompare(a.ultimaAtividade || ''))

  // ---- Trials monitorados ----
  const trialsRows: TrialRow[] = []
  for (const [user_id, rec] of planoPorUser.entries()) {
    const info = computePlanoInfo(rec, agora)
    if (info.origem !== 'trial' && info.plano === 'free' && info.statusPagamento === 'none') continue
    let status: TrialRow['status']
    if (info.plano === 'pro' || info.plano === 'business' || info.statusPagamento === 'active') status = 'assinante'
    else if (info.statusTrial === 'expirado') status = 'expirado'
    else if (info.diasRestantes != null && info.diasRestantes <= 7) status = 'vencendo'
    else status = 'ativo'
    trialsRows.push({
      user_id,
      email: emailPorUser.get(user_id) || '—',
      plano: info.plano,
      statusTrial: info.statusTrial,
      trialFim: info.trialFimCalculado,
      diasRestantes: info.diasRestantes,
      status,
      acessoPermitido: info.acessoPermitido,
    })
  }
  trialsRows.sort((a, b) => (a.diasRestantes ?? 999) - (b.diasRestantes ?? 999))

  // ---- Acessos por dia + ranking de funcionalidades ----
  const porDia = new Map<string, number>()
  const porPagina = new Map<string, number>()
  for (const e of ev) {
    if (e.event !== 'pageview') continue
    const d = diaSP(e.created_at)
    porDia.set(d, (porDia.get(d) || 0) + 1)
    const p = String(e.page || 'home')
    if (PAGINAS_FEATURE.has(p)) porPagina.set(p, (porPagina.get(p) || 0) + 1)
  }
  const acessosPorDia = Array.from(porDia.entries()).map(([dia, valor]) => ({ dia, valor })).sort((a, b) => a.dia.localeCompare(b.dia))
  const rankingFuncionalidades = Array.from(porPagina.entries())
    .map(([nome, valor]) => ({ nome, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10)

  // ---- Retenção D1 / D7 (coorte de cadastros do período) ----
  const eventosPorUser = new Map<string, number[]>()
  for (const e of ev) {
    if (!e.user_id) continue
    const arr = eventosPorUser.get(e.user_id) || []
    arr.push(new Date(e.created_at).getTime())
    eventosPorUser.set(e.user_id, arr)
  }
  const coorte = Array.from(criadoEm.entries()).filter(([, c]) => inPeriodo(c))
  let d1 = 0
  let d7 = 0
  let d7Base = 0
  const DIA = 24 * 60 * 60 * 1000
  for (const [uid, c] of coorte) {
    const t0 = new Date(c).getTime()
    if (t0 + DIA > agora.getTime()) continue
    const evs = eventosPorUser.get(uid) || []
    if (evs.some((t) => t >= t0 + DIA && t < t0 + 2 * DIA)) d1++
    if (t0 + 7 * DIA <= agora.getTime()) {
      d7Base++
      if (evs.some((t) => t >= t0 + 7 * DIA && t < t0 + 8 * DIA)) d7++
    }
  }

  // ---- Alertas ----
  const umDiaAtras = new Date(agora.getTime() - DIA).toISOString()
  const alertas: Alerta[] = []
  for (const l of leads.filter((x) => x.classificacao === 'quente' && (x.ultimaAtividade || '') >= umDiaAtras).slice(0, 5)) {
    alertas.push({ tipo: 'lead_quente', titulo: 'Novo lead quente', detalhe: `${l.email} (score ${l.score})`, em: l.ultimaAtividade })
  }
  for (const e of ev.filter((x) => x.event === 'payment_confirmed' && x.created_at >= umDiaAtras).slice(0, 5)) {
    alertas.push({ tipo: 'pagamento', titulo: 'Novo pagamento confirmado', detalhe: emailPorUser.get(e.user_id || '') || '—', em: e.created_at })
  }
  const pagouSet = new Set(ev.filter((x) => x.event === 'payment_confirmed' && x.user_id).map((x) => x.user_id as string))
  for (const [uid, s] of sinais.entries()) {
    if (s.checkoutStarted > 0 && !pagouSet.has(uid) && !(planoPorUser.get(uid) && computePlanoInfo(planoPorUser.get(uid) || null, agora).statusPagamento === 'active')) {
      alertas.push({ tipo: 'checkout_abandonado', titulo: 'Checkout abandonado', detalhe: emailPorUser.get(uid) || uid, em: s.ultima })
    }
  }
  for (const t of trialsRows.filter((x) => x.status === 'vencendo').slice(0, 8)) {
    alertas.push({ tipo: 'trial_terminando', titulo: 'Trial próximo do vencimento', detalhe: `${t.email} (${t.diasRestantes} dia(s))`, em: t.trialFim })
  }
  for (const t of trialsRows.filter((x) => x.status === 'expirado').slice(0, 8)) {
    alertas.push({ tipo: 'trial_expirado', titulo: 'Trial expirado', detalhe: t.email, em: t.trialFim })
  }

  // ---- Recomendações automáticas ----
  const recomendacoes: string[] = []
  if (visitantes > 0 && pct(cadastros, visitantes) < 10) {
    recomendacoes.push(`Conversão visita→cadastro em ${pct(cadastros, visitantes)}% (${cadastros}/${visitantes}). Reforce a proposta de valor e o CTA de cadastro na home.`)
  }
  if (trials > 0 && engaged < trials) {
    recomendacoes.push(`Apenas ${engaged} de ${trials} trials usaram funções-chave. Ative o onboarding guiado e alerte o novo usuário no D0/D1.`)
  }
  if (planViews > 0 && checkouts === 0) {
    recomendacoes.push(`${planViews} usuário(s) viram os planos mas nenhum iniciou checkout. Reforce o CTA de contratação em /planos.`)
  }
  if (checkouts > pagamentos) {
    recomendacoes.push(`${checkouts - pagamentos} checkout(s) sem pagamento confirmado — revisar atrito no checkout e falhas de pagamento.`)
  }
  const expirados = trialsRows.filter((t) => t.status === 'expirado').length
  if (expirados > 0) {
    recomendacoes.push(`${expirados} trial(s) expirado(s) sem conversão. Dispare a sequência de recuperação por e-mail.`)
  }
  if (recomendacoes.length === 0) {
    recomendacoes.push('Funil sem gargalos críticos no período. Mantenha o monitoramento de trials e checkouts.')
  }

  const pagamentosLista = ev
    .filter((e) => e.event === 'payment_confirmed')
    .slice(0, 200)
    .map((e) => ({
      user_id: e.user_id || '',
      email: emailPorUser.get(e.user_id || '') || '—',
      em: e.created_at,
      valor: typeof e.props?.valor === 'number' ? (e.props.valor as number) : null,
    }))

  const baseD1 = d1Base(coorte, agora)

  return {
    agora: agora.toISOString(),
    periodo,
    resumo: {
      visitantes, cadastros, trials, ativos, engaged,
      planViews, checkouts, pagamentos,
      conversaoVisitaPagamento: pct(pagamentos, visitantes),
      conversaoCadastroPagamento: pct(pagamentos, cadastros),
    },
    etapas,
    recomendacoes,
    alertas,
    leads: leads.slice(0, 200),
    leadsQuentes: leads.filter((l) => l.classificacao === 'quente').slice(0, 50),
    trials: trialsRows,
    acessosPorDia,
    retencao: { d1: baseD1 > 0 ? pct(d1, baseD1) : null, d7: d7Base > 0 ? pct(d7, d7Base) : null, base: coorte.length },
    rankingFuncionalidades,
    pagamentos: pagamentosLista,
    ignorados: { usuarios: ignorados.userIds.size, clientes: ignorados.clientIds.size },
    eventos: ev.slice(0, 2000),
  }
}

/** Base do D1 = cadastros do período com pelo menos 1 dia de vida. */
function d1Base(coorte: Array<[string, string]>, agora: Date): number {
  const DIA = 24 * 60 * 60 * 1000
  return coorte.filter(([, c]) => new Date(c).getTime() + DIA <= agora.getTime()).length
}
