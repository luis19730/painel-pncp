'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, BarChart3, Download, Loader2, RefreshCw, ShieldAlert, Sparkles,
  TrendingUp, Users, X, AlertTriangle, CheckCircle2,
} from 'lucide-react'
import { baixarCsv } from '@/lib/admin/csv'
import { LEAD_CLASSIFICACAO_META, type LeadClassificacao } from '@/lib/admin/lead-score'

const ADMIN_OK_KEY = 'painel_admin_sessao'
const ADMIN_PWD_KEY = 'painel_admin_pwd'

const PERIODOS: Array<{ id: string; label: string }> = [
  { id: 'hoje', label: 'Hoje' },
  { id: '7d', label: 'Últimos 7 dias' },
  { id: '14d', label: 'Últimos 14 dias' },
  { id: '30d', label: 'Últimos 30 dias' },
  { id: 'mes', label: 'Este mês' },
  { id: 'mes_anterior', label: 'Mês anterior' },
  { id: 'personalizado', label: 'Personalizado' },
]

interface Etapa { chave: string; rotulo: string; valor: number; pctAnterior: number; pctTotal: number; variacao: number }
interface Lead {
  user_id: string; email: string; score: number; classificacao: LeadClassificacao; motivos: string[]
  ultimaAtividade: string | null; plano: string; statusTrial: string; diasRestantes: number | null; pagou: boolean
}
interface Trial {
  user_id: string; email: string; plano: string; statusTrial: string; trialFim: string | null
  diasRestantes: number | null; status: 'ativo' | 'vencendo' | 'expirado' | 'assinante'; acessoPermitido: boolean
}
interface Alerta { tipo: string; titulo: string; detalhe: string; em: string | null }
interface Dados {
  periodo: { label: string; inicio: string; fim: string | null }
  resumo: {
    visitantes: number; cadastros: number; trials: number; ativos: number; engaged: number
    planViews: number; checkouts: number; pagamentos: number
    conversaoVisitaPagamento: number; conversaoCadastroPagamento: number
  }
  etapas: Etapa[]
  recomendacoes: string[]
  alertas: Alerta[]
  leads: Lead[]
  leadsQuentes: Lead[]
  trials: Trial[]
  acessosPorDia: Array<{ dia: string; valor: number }>
  retencao: { d1: number | null; d7: number | null; base: number }
  rankingFuncionalidades: Array<{ nome: string; valor: number }>
  pagamentos: Array<{ user_id: string; email: string; em: string | null; valor: number | null }>
  ignorados: { usuarios: number; clientes: number }
}

const CORES_ETAPA = ['bg-sky-500', 'bg-indigo-500', 'bg-amber-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-violet-500', 'bg-teal-500', 'bg-lime-500']

function dt(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch {
    return '—'
  }
}

export default function AdminConversaoPage() {
  const [pwd, setPwd] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [erroPwd, setErroPwd] = useState('')
  const [entrando, setEntrando] = useState(false)

  const [periodo, setPeriodo] = useState('30d')
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [dados, setDados] = useState<Dados | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  const [timelineUser, setTimelineUser] = useState<Lead | null>(null)
  const [timeline, setTimeline] = useState<Array<{ id: number; event: string; page: string | null; path: string | null; props: unknown; created_at: string }>>([])
  const [timelineLoading, setTimelineLoading] = useState(false)

  const headers = useCallback(
    () => ({ 'Content-Type': 'application/json', 'x-admin-password': pwd }),
    [pwd]
  )

  const urlPeriodo = useCallback(() => {
    const q = new URLSearchParams({ periodo })
    if (periodo === 'personalizado') {
      if (inicio) q.set('inicio', inicio)
      if (fim) q.set('fim', fim)
    }
    return q.toString()
  }, [periodo, inicio, fim])

  const carregar = useCallback(async (senha?: string) => {
    const p = senha ?? pwd
    setCarregando(true)
    setErro('')
    try {
      const res = await fetch(`/api/admin/conversao?${urlPeriodo()}`, {
        headers: { 'Content-Type': 'application/json', 'x-admin-password': p },
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.erro || 'Falha ao carregar.')
      setDados(data as Dados)
      setUnlocked(true)
    } catch (e) {
      setErro((e as Error).message || 'Falha ao carregar.')
      setDados(null)
    } finally {
      setCarregando(false)
    }
  }, [pwd, urlPeriodo])

  // Restaura a senha salva na sessão.
  useEffect(() => {
    try {
      const ok = sessionStorage.getItem(ADMIN_OK_KEY) === '1'
      const saved = sessionStorage.getItem(ADMIN_PWD_KEY) || ''
      if (ok && saved) {
        setPwd(saved)
        carregar(saved)
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Recarrega ao trocar o período (apenas se já desbloqueado).
  useEffect(() => {
    if (unlocked) carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo])

  const desbloquear = async (e: React.FormEvent) => {
    e.preventDefault()
    setErroPwd('')
    setEntrando(true)
    try {
      const res = await fetch('/api/admin/conversao?periodo=30d', {
        headers: { 'Content-Type': 'application/json', 'x-admin-password': pwd },
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setErroPwd(data.erro || 'Senha inválida.')
        return
      }
      try {
        sessionStorage.setItem(ADMIN_OK_KEY, '1')
        sessionStorage.setItem(ADMIN_PWD_KEY, pwd)
      } catch {
        /* ignore */
      }
      setPeriodo('30d')
      setDados(data as Dados)
      setUnlocked(true)
    } catch {
      setErroPwd('Falha de conexão.')
    } finally {
      setEntrando(false)
    }
  }

  const sair = () => {
    try {
      sessionStorage.removeItem(ADMIN_OK_KEY)
      sessionStorage.removeItem(ADMIN_PWD_KEY)
    } catch {
      /* ignore */
    }
    setUnlocked(false)
    setDados(null)
    setPwd('')
  }

  const abrirTimeline = async (lead: Lead) => {
    setTimelineUser(lead)
    setTimelineLoading(true)
    setTimeline([])
    try {
      const res = await fetch(`/api/admin/conversao/timeline?user_id=${encodeURIComponent(lead.user_id)}&limit=200`, {
        headers: headers(),
        cache: 'no-store',
      })
      const data = await res.json()
      if (data.ok) setTimeline(data.itens || [])
    } catch {
      /* ignore */
    } finally {
      setTimelineLoading(false)
    }
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0b1120] px-4">
        <form onSubmit={desbloquear} className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white mb-4">
            <BarChart3 className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Painel de Conversão</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-5">Acesso restrito. Informe a senha administrativa.</p>
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Senha de administrador"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white mb-3 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {erroPwd && <p className="text-sm text-danger mb-3">{erroPwd}</p>}
          <button
            type="submit"
            disabled={entrando || !pwd}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {entrando ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
            Entrar
          </button>
          <Link href="/admin" className="mt-4 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600">
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao painel administrativo
          </Link>
        </form>
      </div>
    )
  }

  const r = dados?.resumo
  const maxDia = Math.max(1, ...(dados?.acessosPorDia.map((d) => d.valor) || [1]))
  const maxEtapa = Math.max(1, ...(dados?.etapas.map((e) => e.valor) || [1]))

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-primary" /> Painel de Conversão
              </h1>
              <Link href="/admin" className="text-xs text-slate-400 hover:text-slate-600 inline-flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> /admin
              </Link>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Funil comercial real · {dados?.periodo.label} {r ? `· ${r.visitantes} visitantes únicos` : ''}
              {dados ? ` · ${dados.ignorados.usuarios} admin(s) excluído(s)` : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-200"
            >
              {PERIODOS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
            {periodo === 'personalizado' && (
              <>
                <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
                <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
                <button onClick={() => carregar()} className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white">Aplicar</button>
              </>
            )}
            <button onClick={() => carregar()} disabled={carregando} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
              {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Atualizar
            </button>
            <button onClick={sair} className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Sair</button>
          </div>
        </div>

        {erro && <div className="card bg-white dark:bg-slate-900 p-4 text-sm text-danger">{erro}</div>}

        {!dados ? (
          <div className="card bg-white dark:bg-slate-900 p-16 text-center text-slate-400">
            {carregando ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Sem dados.'}
          </div>
        ) : (
          <>
            {/* Exportação CSV */}
            <div className="flex flex-wrap gap-2">
              <ExportBtn label="Leads" onClick={() => baixarCsv('leads', ['score', 'classificacao', 'email', 'plano', 'status_trial', 'dias_restantes', 'pagou', 'ultima_atividade'], dados.leads.map((l) => [l.score, l.classificacao, l.email, l.plano, l.statusTrial, l.diasRestantes, l.pagou ? 'sim' : 'nao', l.ultimaAtividade]))} />
              <ExportBtn label="Leads quentes" onClick={() => baixarCsv('leads-quentes', ['score', 'email', 'plano', 'motivos'], dados.leadsQuentes.map((l) => [l.score, l.email, l.plano, l.motivos.join(' | ')]))} />
              <ExportBtn label="Trials" onClick={() => baixarCsv('trials', ['email', 'plano', 'status', 'status_trial', 'trial_fim', 'dias_restantes'], dados.trials.map((t) => [t.email, t.plano, t.status, t.statusTrial, t.trialFim, t.diasRestantes]))} />
              <ExportBtn label="Funil" onClick={() => baixarCsv('funil', ['etapa', 'valor', 'pct_etapa_anterior', 'pct_do_total', 'variacao_pct'], dados.etapas.map((e) => [e.rotulo, e.valor, e.pctAnterior, e.pctTotal, e.variacao]))} />
              <ExportBtn label="Pagamentos" onClick={() => baixarCsv('pagamentos', ['email', 'valor', 'data'], dados.pagamentos.map((p) => [p.email, p.valor, p.em]))} />
              <ExportBtn label="Eventos" onClick={() => baixarCsv('eventos', ['evento', 'pagina', 'path', 'user_id', 'data'], (dados as unknown as { eventos?: Array<{ event: string; page: string | null; path: string | null; user_id: string | null; created_at: string }> }).eventos?.map((e) => [e.event, e.page, e.path, e.user_id, e.created_at]) || [])} />
            </div>

            {/* Resumo executivo */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi label="Visitantes únicos" valor={r!.visitantes} icon={<Users className="w-4 h-4" />} cor="from-sky-500 to-blue-500" />
              <Kpi label="Cadastros" valor={r!.cadastros} icon={<Sparkles className="w-4 h-4" />} cor="from-indigo-500 to-violet-500" />
              <Kpi label="Trials iniciados" valor={r!.trials} icon={<TrendingUp className="w-4 h-4" />} cor="from-amber-500 to-orange-500" />
              <Kpi label="Usuários ativos" valor={r!.ativos} icon={<Users className="w-4 h-4" />} cor="from-cyan-500 to-teal-500" />
              <Kpi label="Visualizaram planos" valor={r!.planViews} icon={<BarChart3 className="w-4 h-4" />} cor="from-violet-500 to-purple-500" />
              <Kpi label="Checkouts iniciados" valor={r!.checkouts} icon={<BarChart3 className="w-4 h-4" />} cor="from-teal-500 to-emerald-500" />
              <Kpi label="Pagamentos" valor={r!.pagamentos} icon={<CheckCircle2 className="w-4 h-4" />} cor="from-lime-500 to-green-500" />
              <Kpi label="Visita → Pagamento" valor={`${r!.conversaoVisitaPagamento}%`} icon={<TrendingUp className="w-4 h-4" />} cor="from-emerald-500 to-green-600" />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Funil */}
              <div className="card bg-white dark:bg-slate-900 p-5">
                <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Funil de conversão (usuários únicos)</h2>
                <div className="space-y-3">
                  {dados.etapas.map((e, i) => (
                    <div key={e.chave}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700 dark:text-slate-200">{e.rotulo}</span>
                        <span className="text-slate-500 dark:text-slate-400">
                          <b className="text-slate-800 dark:text-slate-100">{e.valor}</b>
                          {i > 0 && <> · {e.pctAnterior}% da etapa anterior</>}
                          <span className={e.variacao >= 0 ? 'text-emerald-600 ml-2' : 'text-rose-600 ml-2'}>
                            {e.variacao >= 0 ? '▲' : '▼'} {Math.abs(e.variacao)}%
                          </span>
                        </span>
                      </div>
                      <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className={`h-full rounded-full ${CORES_ETAPA[i % CORES_ETAPA.length]}`} style={{ width: `${(e.valor / maxEtapa) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                {/* Recomendações */}
                <div className="card bg-white dark:bg-slate-900 p-5">
                  <h2 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" /> Recomendações automáticas
                  </h2>
                  <ul className="space-y-2">
                    {dados.recomendacoes.map((rec, i) => (
                      <li key={i} className="text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span> {rec}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Alertas */}
                <div className="card bg-white dark:bg-slate-900 p-5">
                  <h2 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" /> Alertas administrativos
                  </h2>
                  {dados.alertas.length === 0 ? (
                    <p className="text-sm text-slate-400">Nenhum alerta no período.</p>
                  ) : (
                    <ul className="space-y-2 max-h-64 overflow-y-auto">
                      {dados.alertas.map((a, i) => (
                        <li key={i} className="flex items-start justify-between gap-3 text-sm">
                          <span className="text-slate-600 dark:text-slate-300">
                            <b className="text-slate-800 dark:text-slate-100">{a.titulo}</b> · {a.detalhe}
                          </span>
                          <span className="text-xs text-slate-400 shrink-0">{dt(a.em)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Retenção */}
                <div className="card bg-white dark:bg-slate-900 p-5">
                  <h2 className="font-semibold text-slate-900 dark:text-white mb-3">Retenção (coorte de cadastros)</h2>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <Mini label="D1" valor={dados.retencao.d1 == null ? '—' : `${dados.retencao.d1}%`} />
                    <Mini label="D7" valor={dados.retencao.d7 == null ? '—' : `${dados.retencao.d7}%`} />
                    <Mini label="Coorte" valor={String(dados.retencao.base)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Leads quentes */}
            <div className="card bg-white dark:bg-slate-900 p-5">
              <h2 className="font-semibold text-slate-900 dark:text-white mb-3">🔥 Leads quentes (score ≥ 70)</h2>
              {dados.leadsQuentes.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhum lead quente no período.</p>
              ) : (
                <TabelaLeads leads={dados.leadsQuentes} onTimeline={abrirTimeline} />
              )}
            </div>

            {/* Todos os leads (top) */}
            <div className="card bg-white dark:bg-slate-900 p-5">
              <h2 className="font-semibold text-slate-900 dark:text-white mb-3">Leads do período (por score)</h2>
              {dados.leads.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhuma atividade de usuário no período.</p>
              ) : (
                <TabelaLeads leads={dados.leads.slice(0, 50)} onTimeline={abrirTimeline} />
              )}
            </div>

            {/* Trials */}
            <div className="card bg-white dark:bg-slate-900 p-5">
              <h2 className="font-semibold text-slate-900 dark:text-white mb-3">Monitoramento de trials</h2>
              {dados.trials.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhum trial no período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-400 uppercase">
                        <th className="py-2 pr-4">E-mail</th><th className="py-2 pr-4">Plano</th><th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Fim do trial</th><th className="py-2 pr-4">Dias</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados.trials.map((t) => (
                        <tr key={t.user_id} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="py-2 pr-4 text-slate-700 dark:text-slate-200">{t.email}</td>
                          <td className="py-2 pr-4">{t.plano}</td>
                          <td className="py-2 pr-4">{statusTrialBadge(t.status)}</td>
                          <td className="py-2 pr-4 text-slate-500">{dt(t.trialFim)}</td>
                          <td className="py-2 pr-4 text-slate-500">{t.diasRestantes ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Acessos por dia */}
              <div className="card bg-white dark:bg-slate-900 p-5">
                <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Acessos por dia (pageviews)</h2>
                {dados.acessosPorDia.length === 0 ? (
                  <p className="text-sm text-slate-400">Sem pageviews no período.</p>
                ) : (
                  <div className="flex items-end gap-1 h-40">
                    {dados.acessosPorDia.map((d) => (
                      <div key={d.dia} className="flex-1 flex flex-col items-center justify-end h-full" title={`${d.dia}: ${d.valor}`}>
                        <div className="w-full rounded-t bg-gradient-to-t from-primary to-secondary" style={{ height: `${(d.valor / maxDia) * 100}%` }} />
                        <span className="text-[9px] text-slate-400 mt-1 rotate-45 origin-left">{d.dia.slice(5)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ranking funcionalidades */}
              <div className="card bg-white dark:bg-slate-900 p-5">
                <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Ranking de funcionalidades</h2>
                {dados.rankingFuncionalidades.length === 0 ? (
                  <p className="text-sm text-slate-400">Sem uso no período.</p>
                ) : (
                  <div className="space-y-2">
                    {dados.rankingFuncionalidades.map((f) => (
                      <div key={f.nome} className="flex items-center gap-3">
                        <span className="w-40 text-xs text-slate-600 dark:text-slate-300 truncate">{f.nome}</span>
                        <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${(f.valor / dados.rankingFuncionalidades[0].valor) * 100}%` }} />
                        </div>
                        <span className="w-10 text-right text-xs text-slate-500">{f.valor}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Pagamentos */}
            <div className="card bg-white dark:bg-slate-900 p-5">
              <h2 className="font-semibold text-slate-900 dark:text-white mb-3">Pagamentos confirmados (webhook ASAAS)</h2>
              {dados.pagamentos.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhum pagamento confirmado no período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-400 uppercase">
                        <th className="py-2 pr-4">E-mail</th><th className="py-2 pr-4">Valor</th><th className="py-2 pr-4">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados.pagamentos.map((p, i) => (
                        <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="py-2 pr-4 text-slate-700 dark:text-slate-200">{p.email}</td>
                          <td className="py-2 pr-4">{p.valor != null ? `R$ ${p.valor.toFixed(2)}` : '—'}</td>
                          <td className="py-2 pr-4 text-slate-500">{dt(p.em)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Timeline */}
      {timelineUser && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setTimelineUser(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Timeline — {timelineUser.email}</h3>
                <p className="text-xs text-slate-400">Score {timelineUser.score} · {LEAD_CLASSIFICACAO_META[timelineUser.classificacao].label}</p>
              </div>
              <button onClick={() => setTimelineUser(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            {timelineLoading ? (
              <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
            ) : timeline.length === 0 ? (
              <p className="text-sm text-slate-400">Sem eventos registrados.</p>
            ) : (
              <ol className="space-y-3">
                {timeline.map((t) => (
                  <li key={t.id} className="flex items-start gap-3 text-sm">
                    <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div>
                      <p className="text-slate-700 dark:text-slate-200"><b>{t.event}</b>{t.page ? ` · ${t.page}` : ''}{t.path ? ` · ${t.path}` : ''}</p>
                      <p className="text-xs text-slate-400">{dt(t.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ExportBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
      <Download className="w-3.5 h-3.5" /> CSV {label}
    </button>
  )
}

function Kpi({ label, valor, icon, cor }: { label: string; valor: number | string; icon: React.ReactNode; cor: string }) {
  return (
    <div className="card bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${cor} flex items-center justify-center text-white shrink-0`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white">{valor}</p>
        </div>
      </div>
    </div>
  )
}

function Mini({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="text-lg font-bold text-slate-900 dark:text-white">{valor}</p>
    </div>
  )
}

function statusTrialBadge(status: Trial['status']) {
  const map: Record<Trial['status'], { txt: string; cls: string }> = {
    ativo: { txt: '🟢 Ativo', cls: 'text-emerald-600' },
    vencendo: { txt: '🟡 Próximo do vencimento', cls: 'text-amber-600' },
    expirado: { txt: '🔴 Expirado', cls: 'text-rose-600' },
    assinante: { txt: '🔵 Assinante', cls: 'text-sky-600' },
  }
  const m = map[status]
  return <span className={`text-xs font-semibold ${m.cls}`}>{m.txt}</span>
}

function TabelaLeads({ leads, onTimeline }: { leads: Lead[]; onTimeline: (l: Lead) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-400 uppercase">
            <th className="py-2 pr-4">Score</th><th className="py-2 pr-4">Classificação</th><th className="py-2 pr-4">E-mail</th>
            <th className="py-2 pr-4">Plano</th><th className="py-2 pr-4">Última atividade</th><th className="py-2 pr-4"></th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l.user_id} className="border-t border-slate-100 dark:border-slate-800">
              <td className="py-2 pr-4 font-bold text-slate-800 dark:text-slate-100">{l.score}</td>
              <td className="py-2 pr-4">
                <span className={`font-semibold ${LEAD_CLASSIFICACAO_META[l.classificacao].cor}`}>
                  {LEAD_CLASSIFICACAO_META[l.classificacao].emoji} {LEAD_CLASSIFICACAO_META[l.classificacao].label}
                </span>
              </td>
              <td className="py-2 pr-4 text-slate-700 dark:text-slate-200">{l.email}</td>
              <td className="py-2 pr-4">{l.plano}{l.pagou ? ' ✅' : ''}</td>
              <td className="py-2 pr-4 text-slate-500">{dt(l.ultimaAtividade)}</td>
              <td className="py-2 pr-4">
                <button onClick={() => onTimeline(l)} className="text-xs font-semibold text-primary hover:underline">Timeline</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
