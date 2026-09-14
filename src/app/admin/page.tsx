'use client'

import { useEffect, useState } from 'react'
import {
  X, Database, Trash2, BarChart3, Wallet, HeartPulse, Target,
  Users, Activity, Eye, TrendingUp, Search, MousePointerClick,
  Lock, RefreshCw, LogOut, FileText, ShieldCheck, CreditCard, CalendarClock, Mail,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import StatCard from '@/components/ui/stat-card'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import PageHeader from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'
import Input from '@/components/ui/input'
import Button from '@/components/ui/button'

const ADMIN_OK_KEY = 'painel_admin_sessao'
const ADMIN_PWD_KEY = 'painel_admin_pwd'

type TabId = 'metricas' | 'funil' | 'usuarios' | 'assinaturas' | 'receita' | 'uso' | 'eventos' | 'saude'
type PeriodoId = 'hoje' | 'ontem' | '7d' | '30d' | '90d' | 'mes' | 'mes_anterior' | 'personalizado'

const TABS: { id: TabId; rotulo: string; icon: LucideIcon }[] = [
  { id: 'metricas', rotulo: 'MÉTRICAS', icon: BarChart3 },
  { id: 'funil', rotulo: 'FUNIL', icon: Target },
  { id: 'usuarios', rotulo: 'USUÁRIOS E PLANOS', icon: Users },
  { id: 'assinaturas', rotulo: 'ASSINATURAS ASAAS', icon: CreditCard },
  { id: 'receita', rotulo: 'RECEITA', icon: Wallet },
  { id: 'uso', rotulo: 'USO DA PLATAFORMA', icon: Activity },
  { id: 'eventos', rotulo: 'EVENTOS', icon: Database },
  { id: 'saude', rotulo: 'SAÚDE DO SISTEMA', icon: HeartPulse },
]

const PERIODO_OPCOES: { id: PeriodoId; rotulo: string }[] = [
  { id: 'hoje', rotulo: 'Hoje' },
  { id: 'ontem', rotulo: 'Ontem' },
  { id: '7d', rotulo: '7d' },
  { id: '30d', rotulo: '30d' },
  { id: '90d', rotulo: '90d' },
  { id: 'mes', rotulo: 'Mês' },
  { id: 'mes_anterior', rotulo: 'Mês ant.' },
  { id: 'personalizado', rotulo: 'Personalizar' },
]

const TABS_COM_PERIODO: TabId[] = ['metricas', 'funil', 'receita', 'uso', 'eventos']

interface PeriodoInfo {
  label: string
  inicio: string
  fim: string | null
}

interface MetricsData {
  ok: boolean
  agora: string
  periodo: PeriodoInfo
  periodoId: string
  metricas: {
    total_eventos: number
    pageview: number
    search: number
    view_opportunity: number
    signup: number
    login: number
    conversion: number
    visitantes_unicos: number
  }
  hoje: { eventos: number; buscas: number; cadastros: number; inicio: string }
  top_paginas: { path: string; views: number }[]
  serie_diaria: {
    dia: string
    eventos: number
    pageview: number
    search: number
    view_opportunity: number
    signup: number
    login: number
    conversion: number
  }[]
}

interface FunnelEtapa {
  chave: string
  rotulo: string
  valor: number
  cor: string
  fonte: string
}

interface FunnelData {
  ok: boolean
  agora: string
  periodo: PeriodoInfo
  etapas: FunnelEtapa[]
  taxas: Record<string, number>
  extras: { logins: number; usuarios_ativos: number; assinantes_novos: number }
}

interface RevenueData {
  ok: boolean
  agora: string
  periodo: PeriodoInfo
  assinantes: {
    ativos: number
    mrr: number
    mrrLabel: string
    contratadoPorCiclo: number
    contratadoPorCicloLabel: string
  }
  periodoReceita: { pagamentos_confirmados: number; receita: number; receitaLabel: string }
  distribuicao: { porCiclo: Record<string, number>; porMeio: Record<string, number> }
  projecao30d: { quantidade: number; valor: number; valorLabel: string }
}

interface EventoItem {
  id?: string
  event: string
  created_at: string
  path: string | null
  client_id: string | null
  user_id: string | null
}

interface AnalyticsItem {
  event?: string
  created_at?: string
  path?: string | null
  client_id?: string | null
  user_id?: string | null
  total?: number
  ultimo?: string | null
}

interface EventsData {
  ok: boolean
  agora: string
  periodo: PeriodoInfo
  evento: string
  total: number
  itens: EventoItem[]
}

interface HealthData {
  ok: boolean
  agora: string
  status: 'verde' | 'amarelo' | 'vermelho'
  checagens: { item: string; ok: boolean; detalhe: string }[]
  alertas: { tipo: string; mensagem: string; gravidade: 'aviso' | 'critico' }[]
  resumo: {
    planos: number
    trials_ativos: number
    assinantes_ativos: number
    inadimplentes: number
    pendentes: number
    eventos_1h: number
    webhooks_nao_processados: number
  }
}

interface AssinaturasData {
  ok: boolean
  agora: string
  total: number
  resumo: Record<string, number>
  porMeio: Record<string, number>
  assinaturas: UsuarioPlano[]
}

interface UsuarioPlano {
  user_id: string
  email: string
  criado_em: string | null
  confirmado: boolean
  plano: 'free' | 'pro' | 'business'
  origem: string
  statusTrial: 'em_teste' | 'expirado' | 'sem_trial'
  trialFim: string | null
  diasRestantes: number | null
  emTrial: boolean
  bloqueado: boolean
  acessoPermitido: boolean
  semRegistro: boolean
  statusPagamento?: string
  paymentMethod?: string
  ciclo?: string
  valorCiclo?: number
  valorCicloLabel?: string
  asaasCustomerId?: string | null
  asaasSubscriptionId?: string | null
  nextDueDate?: string | null
  lastPaymentAt?: string | null
  canceledAt?: string | null
  proximaCobranca30d?: string | null
  diasParaCobranca30d?: number | null
}

const STATUS_FILTROS = ['todos', 'trial', 'active', 'payment_pending', 'overdue', 'canceled', 'blocked'] as const

const STATUS_ASSINATURA_LABEL: Record<string, { texto: string; variant: 'success' | 'warning' | 'danger' | 'primary' | 'secondary' }> = {
  trial: { texto: 'Em teste', variant: 'primary' },
  active: { texto: 'Ativa', variant: 'success' },
  payment_pending: { texto: 'Pendente', variant: 'warning' },
  overdue: { texto: 'Inadimplente', variant: 'danger' },
  canceled: { texto: 'Cancelada', variant: 'secondary' },
  blocked: { texto: 'Bloqueada', variant: 'danger' },
  none: { texto: '—', variant: 'secondary' },
}

const EVENT_LABELS: Record<string, string> = {
  pageview: 'Visualização',
  search: 'Busca',
  view_opportunity: 'Oportunidade',
  signup: 'Cadastro',
  login: 'Login',
  conversion: 'Conversão',
}

const PLANO_LABEL: Record<string, string> = { free: 'Free', pro: 'Pro', business: 'Business' }

const CICLO_LABEL: Record<string, string> = {
  mensal: 'Mensal',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
}

const COR_BG: Record<string, string> = {
  sky: 'bg-sky-400',
  emerald: 'bg-emerald-400',
  violet: 'bg-violet-400',
  indigo: 'bg-indigo-400',
  amber: 'bg-amber-400',
  cyan: 'bg-cyan-400',
  orange: 'bg-orange-400',
  teal: 'bg-teal-400',
  lime: 'bg-lime-400',
  green: 'bg-green-400',
}

function readSession(key: string): string {
  try {
    return sessionStorage.getItem(key) || ''
  } catch {
    return ''
  }
}

export default function AdminPage() {
  const [locked, setLocked] = useState(true)
  const [adminPwd, setAdminPwd] = useState('')
  const [typedPwd, setTypedPwd] = useState('')
  const [pwdError, setPwdError] = useState('')
  const [tab, setTab] = useState<TabId>('metricas')
  const [periodo, setPeriodo] = useState<PeriodoId>('30d')
  const [iniCustom, setIniCustom] = useState('')
  const [fimCustom, setFimCustom] = useState('')

  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [funnel, setFunnel] = useState<FunnelData | null>(null)
  const [receita, setReceita] = useState<RevenueData | null>(null)
  const [eventos, setEventos] = useState<EventsData | null>(null)
  const [saude, setSaude] = useState<HealthData | null>(null)
  const [assinaturas, setAssinaturas] = useState<AssinaturasData | null>(null)

  const [usuarios, setUsuarios] = useState<UsuarioPlano[] | null>(null)
  const [buscaUsuario, setBuscaUsuario] = useState('')

  const [carregando, setCarregando] = useState<TabId | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [lastUpdated, setLastUpdated] = useState('')

  const [promovendoId, setPromovendoId] = useState<string | null>(null)

  const [eventoFiltro, setEventoFiltro] = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')

  const [detail, setDetail] = useState<{ tipo: string } | null>(null)
  const [detailData, setDetailData] = useState<AnalyticsItem[] | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')

  const [editTrial, setEditTrial] = useState<UsuarioPlano | null>(null)
  const [editTrialData, setEditTrialData] = useState('')
  const [salvandoTrial, setSalvandoTrial] = useState(false)
  const [testandoEmail, setTestandoEmail] = useState(false)
  const [excluirUser, setExcluirUser] = useState<UsuarioPlano | null>(null)
  const [excluirSenha, setExcluirSenha] = useState('')
  const [excluindo, setExcluindo] = useState(false)
  const [retroativando, setRetroativando] = useState(false)

  const headers = (): HeadersInit => ({ 'x-admin-password': adminPwd })

  const persistUnlock = (pwd: string) => {
    try {
      sessionStorage.setItem(ADMIN_OK_KEY, '1')
      sessionStorage.setItem(ADMIN_PWD_KEY, pwd)
    } catch {}
    setAdminPwd(pwd)
    setLocked(false)
  }

  const handleLogout = () => {
    try {
      sessionStorage.removeItem(ADMIN_OK_KEY)
      sessionStorage.removeItem(ADMIN_PWD_KEY)
    } catch {}
    setLocked(true)
    setAdminPwd('')
    setTypedPwd('')
    setMetrics(null)
    setFunnel(null)
    setReceita(null)
    setEventos(null)
    setSaude(null)
    setAssinaturas(null)
    setUsuarios(null)
    setErros({})
  }

  // ---------- Requisições ----------
  const periodParams = (): string => {
    const urlParams = new URLSearchParams()
    urlParams.set('periodo', periodo)
    if (periodo === 'personalizado') {
      if (iniCustom) urlParams.set('inicio', iniCustom)
      if (fimCustom) urlParams.set('fim', fimCustom)
    }
    const q = urlParams.toString()
    return q ? `?${q}` : ''
  }

  const setErro = (id: TabId, msg: string, res?: Response) => {
    setErros((prev) => ({ ...prev, [id]: msg }))
    if (res && (res.status === 401 || res.status === 403)) setLocked(true)
  }

  const loadTab = async (id: TabId, pwd?: string, silencioso = false) => {
    const senha = pwd || adminPwd
    if (silencioso) setRefreshing(true)
    setCarregando(id)
    setErro(id, '')
    try {
      const base = '/api/admin'
      let url = ''
      switch (id) {
        case 'metricas':
          url = `${base}/metrics${periodParams()}`
          break
        case 'funil':
          url = `${base}/funnel${periodParams()}`
          break
        case 'receita':
          url = `${base}/revenue${periodParams()}`
          break
        case 'uso':
          url = `${base}/metrics${periodParams()}`
          break
        case 'eventos':
          url = `${base}/events${periodParams()}&evento=${encodeURIComponent(eventoFiltro)}`
          break
        case 'saude':
          url = `${base}/health`
          break
        case 'assinaturas':
          url = `${base}/subscriptions`
          break
        case 'usuarios':
          url = `${base}/users${buscaUsuario ? `?busca=${encodeURIComponent(buscaUsuario)}` : ''}`
          break
      }
      const res = await fetch(url, { headers: { 'x-admin-password': senha } })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const msg = data?.erro || 'Não foi possível carregar os dados.'
        setErro(id, msg, res)
        return
      }
      if (id === 'metricas' || id === 'uso') setMetrics(data)
      else if (id === 'funil') setFunnel(data)
      else if (id === 'receita') setReceita(data)
      else if (id === 'eventos') setEventos(data)
      else if (id === 'saude') setSaude(data)
      else if (id === 'assinaturas') setAssinaturas(data)
      else if (id === 'usuarios') setUsuarios(data.usuarios || [])
      setLastUpdated(new Date().toLocaleTimeString('pt-BR'))
    } catch {
      setErro(id, 'Falha de conexão com o servidor.')
    } finally {
      setCarregando(null)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    const ok = readSession(ADMIN_OK_KEY) === '1'
    const pwd = readSession(ADMIN_PWD_KEY)
    if (!ok || !pwd) return
    const t = window.setTimeout(() => {
      setAdminPwd(pwd)
      setLocked(false)
      void loadTab('metricas', pwd)
    }, 0)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (carregando) return
    setPwdError('')
    if (!typedPwd) {
      setPwdError('Digite a senha de administrador.')
      return
    }
    const snapErr = erros
    setErros({})
    const antes = carregando
    setCarregando('metricas')
    try {
      const res = await fetch(`/api/admin/metrics${periodParams() ? periodParams() + '&x=1' : '?x=1'}`, {
        headers: { 'x-admin-password': typedPwd },
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const msg = data?.erro || 'Não foi possível carregar as métricas.'
        setPwdError(msg)
        setLocked(true)
        setErros({ ...snapErr })
        return
      }
      setMetrics(data)
      setLastUpdated(new Date().toLocaleTimeString('pt-BR'))
      persistUnlock(typedPwd)
    } catch {
      setPwdError('Falha de conexão com o servidor.')
      setLocked(true)
    } finally {
      setCarregando(antes)
      void antes
    }
  }

  const switchTab = (t: TabId) => {
    setTab(t)
    const precisaCarga =
      (t === 'metricas' && !metrics) ||
      (t === 'funil' && !funnel) ||
      (t === 'receita' && !receita) ||
      (t === 'uso' && !metrics) ||
      (t === 'eventos' && !eventos) ||
      (t === 'saude' && !saude) ||
      (t === 'assinaturas' && !assinaturas) ||
      (t === 'usuarios' && !usuarios)
    if (precisaCarga) void loadTab(t)
  }

  const atualizar = () => void loadTab(tab, undefined, true)

  const escolherPeriodo = (p: PeriodoId) => {
    setPeriodo(p)
    if (p !== 'personalizado' && TABS_COM_PERIODO.includes(tab)) void loadTab(tab, undefined, true)
  }

  const aplicarPersonalizado = () => {
    if (TABS_COM_PERIODO.includes(tab)) void loadTab(tab, undefined, true)
  }

  // ---------- Usuários e planos (ações) ----------
  const promover = async (userId: string, plano: string) => {
    setPromovendoId(userId)
    setErro('usuarios', '')
    try {
      const res = await fetch('/api/admin/planos', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers() },
        body: JSON.stringify({ user_id: userId, plano }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setErro('usuarios', data?.erro || 'Não foi possível alterar o plano.', res)
        return
      }
      await loadTab('usuarios')
    } catch {
      setErro('usuarios', 'Falha de conexão com o servidor.')
    } finally {
      setPromovendoId(null)
    }
  }

  const toggleBloqueio = async (userId: string, bloqueado: boolean) => {
    setPromovendoId(userId)
    setErro('usuarios', '')
    try {
      const res = await fetch('/api/admin/planos', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers() },
        body: JSON.stringify({ user_id: userId, acao: bloqueado ? 'bloquear' : 'desbloquear' }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setErro('usuarios', data?.erro || 'Não foi possível atualizar o bloqueio.', res)
        return
      }
      await loadTab('usuarios')
    } catch {
      setErro('usuarios', 'Falha de conexão com o servidor.')
    } finally {
      setPromovendoId(null)
    }
  }

  const salvarTrial = async () => {
    if (!editTrial) return
    setSalvandoTrial(true)
    setErro('usuarios', '')
    try {
      const res = await fetch('/api/admin/planos', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers() },
        body: JSON.stringify({ user_id: editTrial.user_id, acao: 'definir_trial', trial_fim: editTrialData }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setErro('usuarios', data?.erro || 'Não foi possível atualizar o teste.', res)
        return
      }
      setEditTrial(null)
      await loadTab('usuarios')
    } catch {
      setErro('usuarios', 'Falha de conexão com o servidor.')
    } finally {
      setSalvandoTrial(false)
    }
  }

  const testarEmail = async () => {
    const email = window.prompt('Digite o e-mail para enviar o teste de expiração do trial:')
    if (!email) return
    setTestandoEmail(true)
    setErro('usuarios', '')
    try {
      const res = await fetch('/api/admin/trial/test-email', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers() },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setErro('usuarios', data?.erro || 'Não foi possível enviar o e-mail de teste.', res)
        return
      }
      window.alert(`E-mail de teste enviado com sucesso para ${email}.`)
    } catch {
      setErro('usuarios', 'Falha de conexão com o servidor.')
    } finally {
      setTestandoEmail(false)
    }
  }

  const excluirUsuario = async () => {
    if (!excluirUser) return
    setExcluindo(true)
    setErro('usuarios', '')
    try {
      const res = await fetch('/api/admin/planos', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers() },
        body: JSON.stringify({ user_id: excluirUser.user_id, acao: 'excluir', confirm_password: excluirSenha }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setErro('usuarios', data?.erro || 'Não foi possível excluir o usuário.', res)
        return
      }
      setExcluirUser(null)
      setExcluirSenha('')
      await loadTab('usuarios')
    } catch {
      setErro('usuarios', 'Falha de conexão com o servidor.')
    } finally {
      setExcluindo(false)
    }
  }

  const retroativarTrial = async () => {
    if (!window.confirm('Conceder trial de 15 dias a todos os usuários legados (sem registro de plano)?')) return
    setRetroativando(true)
    setErro('usuarios', '')
    try {
      const res = await fetch('/api/admin/planos', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers() },
        body: JSON.stringify({ acao: 'retroativar_trial' }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setErro('usuarios', data?.erro || 'Não foi possível retroativar os trials.', res)
        return
      }
      window.alert(`Trial retroativo aplicado: ${data.criados} criado(s), ${data.ignorados} ignorado(s).`)
      await loadTab('usuarios')
    } catch {
      setErro('usuarios', 'Falha de conexão com o servidor.')
    } finally {
      setRetroativando(false)
    }
  }

  const openDetail = async (tipo: string) => {
    setDetail({ tipo })
    setDetailData(null)
    setDetailError('')
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/admin/analytics?tipo=${encodeURIComponent(tipo)}`, { headers: headers() })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setDetailError(data?.erro || 'Não foi possível carregar os detalhes.')
        return
      }
      setDetailData(data.itens || [])
    } catch {
      setDetailError('Falha de conexão com o servidor.')
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetail = () => setDetail(null)

  if (locked) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120]">
        <header className="bg-white dark:bg-[#0b1120] border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <h1 className="text-lg sm:text-xl font-extrabold font-display text-slate-900 dark:text-white">
              Admin · Painel PNCP
            </h1>
            <Badge variant="secondary">Acesso restrito</Badge>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 py-12">
          <Card>
            <CardBody>
              <div className="flex flex-col items-center text-center py-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-slate-400">
                  <Lock className="w-8 h-8" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Área restrita</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Digite a senha de administrador para acessar o dashboard.
                </p>
                <form onSubmit={handleUnlock} className="w-full mt-6 space-y-3">
                  <Input
                    type="password"
                    label="Senha de administrador"
                    placeholder="••••••"
                    value={typedPwd}
                    onChange={(e) => setTypedPwd(e.target.value)}
                    required
                    autoFocus
                  />
                  {pwdError && <p className="text-xs text-danger">{pwdError}</p>}
                  <Button type="submit" className="w-full" disabled={carregando !== null} loading={carregando !== null}>
                    {carregando !== null ? 'Verificando...' : 'Acessar painel'}
                  </Button>
                </form>
                <p className="mt-4 text-[11px] text-slate-400">
                  A senha é validada no servidor e nunca é embutida no código do navegador.
                </p>
              </div>
            </CardBody>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120]">
      <header className="bg-white dark:bg-[#0b1120] border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg sm:text-xl font-extrabold font-display text-slate-900 dark:text-white">
            Admin · Painel PNCP
          </h1>
          <div className="flex items-center gap-3">
            <a
              href="/admin/conversao"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              📊 Conversão
            </a>
            <Badge variant="success">Painel ao vivo</Badge>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-danger transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Sair
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
          {TABS.map((t) => {
            const Icon = t.icon
            const ativo = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => switchTab(t.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-colors ${
                  ativo
                    ? 'bg-white dark:bg-slate-900 shadow text-slate-900 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" /> {t.rotulo}
              </button>
            )
          })}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Barra superior: período + atualizar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {TABS_COM_PERIODO.includes(tab) && (
              <>
                {PERIODO_OPCOES.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => escolherPeriodo(p.id)}
                    className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors border ${
                      periodo === p.id
                        ? 'bg-primary-soft text-primary border-primary/20'
                        : 'text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {p.rotulo}
                  </button>
                ))}
                {periodo === 'personalizado' && (
                  <span className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={iniCustom}
                      onChange={(e) => setIniCustom(e.target.value)}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-200"
                    />
                    <span className="text-xs text-slate-400">até</span>
                    <input
                      type="date"
                      value={fimCustom}
                      onChange={(e) => setFimCustom(e.target.value)}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-200"
                    />
                    <Button variant="secondary" size="sm" onClick={() => void aplicarPersonalizado()}>
                      Aplicar
                    </Button>
                  </span>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-xs text-slate-400">Atualizado às {lastUpdated || '—'}</span>
            <Button variant="secondary" onClick={atualizar} disabled={refreshing || carregando === tab} loading={refreshing || carregando === tab}>
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </Button>
          </div>
        </div>

        {erros[tab] && (
          <div className="px-4 py-3 rounded-xl bg-danger-soft dark:bg-red-500/10 border border-danger/20 text-sm text-danger">
            {erros[tab]}
          </div>
        )}

        {tab === 'metricas' ? (
          <MetricasTab
            data={metrics}
            loading={carregando === 'metricas' && !metrics}
            refreshing={carregando === 'metricas' && !!metrics}
            onDetail={(tipo) => void openDetail(tipo)}
          />
        ) : tab === 'funil' ? (
          <FunilTab data={funnel} loading={carregando === 'funil' && !funnel} />
        ) : tab === 'usuarios' ? (
          <UsuariosTab
            usuarios={usuarios}
            loading={carregando === 'usuarios' && !usuarios}
            erro={erros.usuarios || ''}
            busca={buscaUsuario}
            onBuscaChange={setBuscaUsuario}
            onBuscaSubmit={() => void loadTab('usuarios')}
            onAtualizar={() => void loadTab('usuarios')}
            promovendoId={promovendoId}
            onPromover={(uid, p) => void promover(uid, p)}
            onToggleBloqueio={(uid, b) => void toggleBloqueio(uid, b)}
            onEditarTrial={(u) => {
              setEditTrial(u)
              setEditTrialData(u.trialFim ? new Date(u.trialFim).toISOString().slice(0, 10) : '')
            }}
            onExcluir={(u) => {
              setExcluirUser(u)
              setExcluirSenha('')
            }}
            retroativando={retroativando}
            onRetroativar={() => void retroativarTrial()}
            testandoEmail={testandoEmail}
            onTestarEmail={() => void testarEmail()}
          />
        ) : tab === 'assinaturas' ? (
          <AssinaturasTab
            data={assinaturas}
            loading={carregando === 'assinaturas' && !assinaturas}
            filtroStatus={filtroStatus}
            onFiltroStatus={setFiltroStatus}
            onAtualizar={() => void loadTab('assinaturas')}
          />
        ) : tab === 'receita' ? (
          <ReceitaTab data={receita} loading={carregando === 'receita' && !receita} />
        ) : tab === 'uso' ? (
          <UsoTab data={metrics} loading={carregando === 'uso' && !metrics} />
        ) : tab === 'eventos' ? (
          <EventosTab
            data={eventos}
            loading={carregando === 'eventos' && !eventos}
            eventoFiltro={eventoFiltro}
            onEventoFiltro={(v) => {
              setEventoFiltro(v)
              setTimeout(() => void loadTab('eventos'), 0)
            }}
            onAtualizar={() => void loadTab('eventos')}
          />
        ) : tab === 'saude' ? (
          <SaudeTab data={saude} loading={carregando === 'saude' && !saude} onAtualizar={() => void loadTab('saude')} />
        ) : null}
      </main>

      {editTrial && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => !salvandoTrial && setEditTrial(null)}
        >
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-slate-400" />
                <h3 className="font-bold text-slate-900 dark:text-white">Editar teste (trial)</h3>
              </div>
              <button
                onClick={() => setEditTrial(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">
                  <strong>{editTrial.email}</strong>
                </p>
                <p className="text-xs text-slate-400">Defina a data de término do período de teste. Ao salvar, o usuário volta a ter acesso enquanto o teste estiver ativo.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Fim do teste</label>
                <input
                  type="date"
                  value={editTrialData}
                  onChange={(e) => setEditTrialData(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date()
                    d.setDate(d.getDate() + 15)
                    setEditTrialData(d.toISOString().slice(0, 10))
                  }}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  +15 dias
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date()
                    d.setDate(d.getDate() + 30)
                    setEditTrialData(d.toISOString().slice(0, 10))
                  }}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  +30 dias
                </button>
              </div>
              {erros.usuarios && (
                <div className="px-3 py-2 rounded-lg bg-danger-soft dark:bg-red-500/10 border border-danger/20 text-xs text-danger">
                  {erros.usuarios}
                </div>
              )}
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setEditTrial(null)} disabled={salvandoTrial}>
                  Cancelar
                </Button>
                <Button onClick={() => void salvarTrial()} disabled={salvandoTrial || !editTrialData} loading={salvandoTrial}>
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {excluirUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => !excluindo && setExcluirUser(null)}
        >
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-500" />
                <h3 className="font-bold text-slate-900 dark:text-white">Excluir usuário</h3>
              </div>
              <button
                onClick={() => setExcluirUser(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Você está prestes a excluir <strong>{excluirUser.email}</strong>. Esta ação é permanente e remove a conta e todos os dados associados.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Senha de confirmação</label>
                <input
                  type="password"
                  value={excluirSenha}
                  onChange={(e) => setExcluirSenha(e.target.value)}
                  placeholder="Digite a senha para confirmar"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-danger/20"
                  autoFocus
                />
              </div>
              {erros.usuarios && (
                <div className="px-3 py-2 rounded-lg bg-danger-soft dark:bg-red-500/10 border border-danger/20 text-xs text-danger">
                  {erros.usuarios}
                </div>
              )}
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setExcluirUser(null)} disabled={excluindo}>
                  Cancelar
                </Button>
                <Button variant="danger" onClick={() => void excluirUsuario()} disabled={excluindo || !excluirSenha} loading={excluindo}>
                  Excluir definitivamente
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={closeDetail}
        >
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-slate-400" />
                <h3 className="font-bold text-slate-900 dark:text-white">
                  {DETAIL_LABELS[detail.tipo] || 'Detalhes'}
                </h3>
              </div>
              <button
                onClick={closeDetail}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 flex-1 overflow-y-auto">
              {detailLoading ? (
                <div className="animate-pulse space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800" />
                  ))}
                </div>
              ) : detailError ? (
                <div className="px-4 py-3 rounded-xl bg-danger-soft dark:bg-red-500/10 border border-danger/20 text-sm text-danger">
                  {detailError}
                </div>
              ) : detailData && detailData.length === 0 ? (
                <p className="text-sm text-slate-400 py-8 text-center">
                  Nenhum registro encontrado para este critério.
                </p>
              ) : (
                <DetailTable tipo={detail.tipo} itens={detailData || []} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Subcomponentes de cada aba
// ============================================================================

function SkeletonCards({ quantidade = 8 }: { quantidade?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: quantidade }).map((_, i) => (
        <div key={i} className="card bg-white dark:bg-slate-900 dark:border-slate-800 h-28" />
      ))}
    </div>
  )
}

function SkeletonLinhas({ linhas = 6 }: { linhas?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: linhas }).map((_, i) => (
        <div key={i} className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800" />
      ))}
    </div>
  )
}

function MetricasTab({
  data,
  loading,
  refreshing,
  onDetail,
}: {
  data: MetricsData | null
  loading: boolean
  refreshing: boolean
  onDetail: (tipo: string) => void
}) {
  if (loading) return <SkeletonCards quantidade={8} />

  if (!data) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-slate-400 py-10 text-center">Clique em Atualizar para carregar as métricas.</p>
        </CardBody>
      </Card>
    )
  }

  const cards: { tipo: string; label: string; valor: number; icon: LucideIcon; accent: 'primary' | 'success' | 'accent' | 'warning' | 'secondary' | 'danger'; hint: string }[] = [
    { tipo: 'pageviews', label: 'Visualizações', valor: data.metricas.pageview, icon: Eye, accent: 'primary', hint: 'pageviews + clique p/ ver' },
    { tipo: 'visitantes', label: 'Visitantes únicos', valor: data.metricas.visitantes_unicos, icon: Users, accent: 'success', hint: 'client_id distintos + clique p/ ver' },
    { tipo: 'buscas', label: 'Buscas', valor: data.metricas.search, icon: Search, accent: 'accent', hint: `${data.hoje.buscas} hoje + clique p/ ver` },
    { tipo: 'oportunidades', label: 'Oportunidades vistas', valor: data.metricas.view_opportunity, icon: Target, accent: 'warning', hint: 'detalhes visualizados + clique p/ ver' },
    { tipo: 'cadastros', label: 'Cadastros', valor: data.metricas.signup, icon: FileText, accent: 'secondary', hint: `${data.hoje.cadastros} hoje + clique p/ ver` },
    { tipo: 'logins', label: 'Logins', valor: data.metricas.login, icon: LogOut, accent: 'danger', hint: 'entradas na conta + clique p/ ver' },
    { tipo: 'conversoes', label: 'Conversões (CTA planos)', valor: data.metricas.conversion, icon: MousePointerClick, accent: 'primary', hint: 'cliques nos planos + clique p/ ver' },
    { tipo: 'hoje', label: 'Eventos hoje', valor: data.hoje.eventos, icon: Activity, accent: 'accent', hint: 'uso total de hoje + clique p/ ver' },
  ]

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon
          const zeroCritico = c.tipo === 'oportunidades' && c.valor === 0
          return (
            <button key={c.tipo} onClick={() => onDetail(c.tipo)} className="text-left cursor-pointer group">
              <div className={zeroCritico ? 'ring-2 ring-danger/40 rounded-2xl' : ''}>
                <StatCard
                  label={c.label}
                  value={c.valor.toLocaleString('pt-BR')}
                  icon={<Icon className="w-5 h-5" />}
                  accent={c.accent}
                  hint={zeroCritico ? '⚠ Nenhuma registrada — ver detalhes' : `${c.hint}`}
                />
              </div>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Top páginas ({data.periodo.label})</h3>
              <TrendingUp className="w-4 h-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardBody>
            {data.top_paginas.length === 0 ? (
              <p className="text-sm text-slate-400">Sem visualizações de página no período.</p>
            ) : (
              <div className="space-y-3">
                {data.top_paginas.map((p) => {
                  const max = data.top_paginas[0]?.views || 1
                  return (
                    <div key={p.path}>
                      <div className="flex items-center justify-between gap-3 text-xs mb-1">
                        <span className="min-w-0 flex-1 font-mono text-slate-600 dark:text-slate-300 truncate">{p.path}</span>
                        <span className="shrink-0 font-semibold text-slate-500 dark:text-slate-400">{p.views}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                          style={{ width: `${(p.views / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Resumo do período ({data.periodo.label})</h3>
              <BarChart3 className="w-4 h-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              {[
                ['Total de eventos', data.metricas.total_eventos],
                ['Visitantes únicos', data.metricas.visitantes_unicos],
                ['Cadastros', data.metricas.signup],
                ['Logins', data.metricas.login],
                ['Conversões', data.metricas.conversion],
                ['Oportunidades vistas', data.metricas.view_opportunity],
              ].map(([label, valor]) => (
                <div key={label as string} className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-sm">
                  <span className="text-slate-500 dark:text-slate-400">{label as string}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{(valor as number).toLocaleString('pt-BR')}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-slate-400">
              {refreshing ? 'Atualizando…' : `Critério: início ${new Date(data.periodo.inicio).toLocaleString('pt-BR')}`}
              {data.periodo.fim ? ` até ${new Date(data.periodo.fim).toLocaleString('pt-BR')}` : ' até agora'}
            </p>
          </CardBody>
        </Card>
      </div>
    </>
  )
}

function FunilTab({ data, loading }: { data: FunnelData | null; loading: boolean }) {
  if (loading) return <SkeletonCards quantidade={10} />

  if (!data) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-slate-400 py-10 text-center">Clique em Atualizar para carregar o funil.</p>
        </CardBody>
      </Card>
    )
  }

  const primeiro = data.etapas[0]?.valor || 0

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Visita → Cadastro"
          value={`${data.taxas.visita_para_cadastro ?? 0}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          accent="primary"
          hint="cadastros / visitantes no período"
        />
        <StatCard
          label="Cadastro → Conversão"
          value={`${data.taxas.cadastro_para_conversao ?? 0}%`}
          icon={<Target className="w-5 h-5" />}
          accent="accent"
          hint="clique em plano / cadastros"
        />
        <StatCard
          label="Cadastro → Pagamento"
          value={`${data.taxas.cadastro_para_pagamento ?? 0}%`}
          icon={<Wallet className="w-5 h-5" />}
          accent="success"
          hint="pagos via ASAAS / cadastros"
        />
        <StatCard
          label="Checkout → Pagamento"
          value={`${data.taxas.checkout_para_pagamento ?? 0}%`}
          icon={<CreditCard className="w-5 h-5" />}
          accent="warning"
          hint="pagos / checkouts iniciados"
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Funil ({data.periodo.label})</h3>
            <Badge variant="secondary">{data.periodo.label}</Badge>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            {data.etapas.map((e, i) => {
              const pct = primeiro > 0 ? Math.round((e.valor / primeiro) * 1000) / 10 : 0
              return (
                <div key={e.chave} className="flex items-center gap-3">
                  <span className="w-6 shrink-0 text-xs font-bold text-slate-400">{i + 1}</span>
                  <span className="w-52 shrink-0 text-sm font-medium text-slate-700 dark:text-slate-200 truncate" title={e.rotulo}>
                    {e.rotulo}
                  </span>
                  <div className="h-5 min-w-0 flex-1 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-lg ${COR_BG[e.cor] || 'bg-primary'}`}
                      style={{ width: `${Math.max(pct, 1)}%`, transition: 'width .4s ease' }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right text-sm font-bold text-slate-800 dark:text-slate-200">
                    {e.valor.toLocaleString('pt-BR')}
                  </span>
                  <span className="w-12 shrink-0 text-right text-xs text-slate-400">{pct}%</span>
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-[11px] text-slate-400">
            Cada etapa vem de uma fonte real (analytics_events, user_planos, asaas_webhook_events) filtrada pelo período.
          </p>
        </CardBody>
      </Card>
    </>
  )
}

function UsuariosTab({
  usuarios,
  loading,
  erro,
  busca,
  onBuscaChange,
  onBuscaSubmit,
  onAtualizar,
  promovendoId,
  onPromover,
  onToggleBloqueio,
  onEditarTrial,
  onExcluir,
  retroativando,
  onRetroativar,
  testandoEmail,
  onTestarEmail,
}: {
  usuarios: UsuarioPlano[] | null
  loading: boolean
  erro: string
  busca: string
  onBuscaChange: (v: string) => void
  onBuscaSubmit: () => void
  onAtualizar: () => void
  promovendoId: string | null
  onPromover: (userId: string, plano: string) => void
  onToggleBloqueio: (userId: string, bloqueado: boolean) => void
  onEditarTrial: (u: UsuarioPlano) => void
  onExcluir: (u: UsuarioPlano) => void
  retroativando: boolean
  onRetroativar: () => void
  testandoEmail: boolean
  onTestarEmail: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Usuários e Planos"
          description="E-mail, plano escolhido e status do teste de 15 dias (tabela user_planos + auth.users)."
          badge={<Badge variant="accent"><ShieldCheck className="w-3.5 h-3.5" /> Gestão de planos</Badge>}
        />
        <div className="sm:shrink-0 flex items-center gap-2 flex-wrap">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              onBuscaSubmit()
            }}
            className="flex items-center gap-1.5"
          >
            <Input
              type="search"
              placeholder="Buscar por e-mail…"
              value={busca}
              onChange={(e) => onBuscaChange(e.target.value)}
              className="w-52"
            />
            <Button variant="secondary" size="sm" onClick={onBuscaSubmit}>
              <Search className="w-3.5 h-3.5" />
            </Button>
          </form>
          <Button variant="ghost" onClick={onRetroativar} disabled={retroativando} loading={retroativando}>
            <CalendarClock className="w-4 h-4" />
            Trial retroativo
          </Button>
          <Button variant="ghost" onClick={onTestarEmail} disabled={testandoEmail} loading={testandoEmail}>
            <Mail className="w-4 h-4" />
            Testar e-mail
          </Button>
          <Button variant="secondary" onClick={onAtualizar} disabled={loading} loading={loading}>
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
        </div>
      </div>

      {erro && (
        <div className="px-4 py-3 rounded-xl bg-danger-soft dark:bg-red-500/10 border border-danger/20 text-sm text-danger">
          {erro}
        </div>
      )}

      <Card>
        <CardBody>
          {loading && !usuarios ? (
            <SkeletonLinhas linhas={6} />
          ) : !usuarios || usuarios.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">
              Nenhum usuário encontrado{busca ? ' com este filtro' : ' ainda'}.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700">
                    <th className="py-2 pr-4 font-semibold">E-mail</th>
                    <th className="py-2 pr-4 font-semibold">Criado em</th>
                    <th className="py-2 pr-4 font-semibold">E-mail confirmado</th>
                    <th className="py-2 pr-4 font-semibold">Plano</th>
                    <th className="py-2 pr-4 font-semibold">Status do teste</th>
                    <th className="py-2 pr-4 font-semibold">Fim do teste</th>
                    <th className="py-2 font-semibold">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.user_id} className="border-b border-slate-100 dark:border-slate-800/60 align-middle">
                      <td className="py-3 pr-4 text-slate-800 dark:text-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[220px]">{u.email}</span>
                          {u.semRegistro && <Badge variant="accent">sem plano</Badge>}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-slate-500">
                        {u.criado_em ? new Date(u.criado_em).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="py-3 pr-4">
                        {u.confirmado ? (
                          <Badge variant="success">Confirmado</Badge>
                        ) : (
                          <Badge variant="warning">Pendente</Badge>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={u.plano === 'business' ? 'premium' : u.plano === 'pro' ? 'secondary' : 'accent'}>
                          {PLANO_LABEL[u.plano]}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        {u.bloqueado ? (
                          <Badge variant="danger">Bloqueado</Badge>
                        ) : u.semRegistro ? (
                          <Badge variant="accent">Sem registro</Badge>
                        ) : u.statusTrial === 'em_teste' ? (
                          <Badge variant="success">
                            {`Ativo${u.diasRestantes != null ? ` (${u.diasRestantes} dia${u.diasRestantes === 1 ? '' : 's'} restante${u.diasRestantes === 1 ? '' : 's'})` : ''}`}
                          </Badge>
                        ) : u.statusTrial === 'expirado' ? (
                          <Badge variant="danger">
                            {u.origem === 'manual' ? 'Manual (admin)' : 'Expirado'}
                          </Badge>
                        ) : (
                          <Badge variant={u.origem === 'manual' ? 'info' : 'accent'}>
                            {u.origem === 'manual' ? 'Manual (admin)' : 'Sem trial'}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-slate-500">
                        {u.trialFim ? new Date(u.trialFim).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(['free', 'pro', 'business'] as const).map((p) => (
                            <button
                              key={p}
                              disabled={promovendoId === u.user_id || p === u.plano}
                              onClick={() => onPromover(u.user_id, p)}
                              className={`rounded-lg border px-2 py-1 text-xs font-semibold transition-colors disabled:opacity-40 ${
                                p === u.plano
                                  ? 'bg-primary-soft text-primary border-primary/20'
                                  : 'text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                              }`}
                            >
                              {PLANO_LABEL[p]}
                            </button>
                          ))}
                          <button
                            disabled={promovendoId === u.user_id}
                            onClick={() => onToggleBloqueio(u.user_id, !u.bloqueado)}
                            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition-colors disabled:opacity-40 ${
                              u.bloqueado
                                ? 'bg-danger-soft text-danger border-danger/20 hover:bg-danger/10'
                                : 'bg-danger text-white border-transparent hover:bg-danger/90'
                            }`}
                          >
                            <Lock className="w-3 h-3" /> {u.bloqueado ? 'Desbloquear' : 'Bloquear'}
                          </button>
                          <button
                            disabled={promovendoId === u.user_id}
                            onClick={() => onEditarTrial(u)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
                          >
                            <CalendarClock className="w-3 h-3" /> Trial
                          </button>
                          <button
                            disabled={promovendoId === u.user_id}
                            onClick={() => onExcluir(u)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 dark:border-red-500/30 px-2 py-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40"
                          >
                            <Trash2 className="w-3 h-3" /> Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

function AssinaturasTab({
  data,
  loading,
  filtroStatus,
  onFiltroStatus,
  onAtualizar,
}: {
  data: AssinaturasData | null
  loading: boolean
  filtroStatus: string
  onFiltroStatus: (v: string) => void
  onAtualizar: () => void
}) {
  const assinaturas = data?.assinaturas || []
  const filtradas = filtroStatus === 'todos' ? assinaturas : assinaturas.filter((u) => u.statusPagamento === filtroStatus)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Assinaturas ASAAS"
          description="Cobranças recorrentes (PRO/EMPRESA × mensal/trimestral/semestral/anual) com teste grátis de 15 dias. Contador mostra dias até a próxima cobrança."
          badge={<Badge variant="accent"><CreditCard className="w-3.5 h-3.5" /> Cobrança recorrente</Badge>}
        />
        <div className="flex items-center gap-2">
          <select
            value={filtroStatus}
            onChange={(e) => onFiltroStatus(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-200"
          >
            <option value="todos">Todos os status</option>
            {STATUS_FILTROS.filter((s) => s !== 'todos').map((s) => (
              <option key={s} value={s}>
                {STATUS_ASSINATURA_LABEL[s]?.texto || s}
              </option>
            ))}
          </select>
          <Button variant="secondary" onClick={onAtualizar} disabled={loading} loading={loading}>
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Total assinaturas" value={(data.total ?? 0).toLocaleString('pt-BR')} icon={<CreditCard className="w-5 h-5" />} accent="primary" />
          {(['trial', 'active', 'payment_pending', 'overdue', 'canceled'] as const).map((s) => (
            <StatCard
              key={s}
              label={STATUS_ASSINATURA_LABEL[s]?.texto || s}
              value={(data.resumo?.[s] ?? 0).toLocaleString('pt-BR')}
              icon={<CreditCard className="w-5 h-5" />}
              accent={STATUS_ASSINATURA_LABEL[s]?.variant || 'secondary'}
            />
          ))}
        </div>
      )}

      <Card>
        <CardBody>
          {loading && !data && !assinaturas.length ? (
            <SkeletonLinhas linhas={6} />
          ) : !data || filtradas.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">
              Nenhuma assinatura {filtroStatus !== 'todos' ? `com status "${filtroStatus}" ` : ''}encontrada.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full text-sm min-w-[1100px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700">
                    <th className="py-2 pr-4 font-semibold">E-mail</th>
                    <th className="py-2 pr-4 font-semibold">Plano</th>
                    <th className="py-2 pr-4 font-semibold">Status</th>
                    <th className="py-2 pr-4 font-semibold">Período</th>
                    <th className="py-2 pr-4 font-semibold">Valor/ciclo</th>
                    <th className="py-2 pr-4 font-semibold">Pagamento</th>
                    <th className="py-2 pr-4 font-semibold">Contador (30d)</th>
                    <th className="py-2 pr-4 font-semibold">Próx. cobrança</th>
                    <th className="py-2 pr-4 font-semibold">Último pgto</th>
                    <th className="py-2 pr-4 font-semibold">Subscription</th>
                    <th className="py-2 font-semibold">Acesso</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((u) => {
                    const st = STATUS_ASSINATURA_LABEL[u.statusPagamento || 'none'] || STATUS_ASSINATURA_LABEL.none
                    return (
                      <tr key={u.user_id} className="border-b border-slate-100 dark:border-slate-800/60 align-middle">
                        <td className="py-3 pr-4 text-slate-800 dark:text-slate-200 truncate max-w-[220px]">{u.email}</td>
                        <td className="py-3 pr-4">
                          <Badge variant={u.plano === 'business' ? 'premium' : 'secondary'}>
                            {u.plano === 'business' ? 'EMPRESA' : u.plano === 'pro' ? 'PRO' : 'Free'}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant={st.variant}>{st.texto}</Badge>
                        </td>
                        <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">
                          {CICLO_LABEL[u.ciclo || 'mensal'] || '—'}
                        </td>
                        <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">
                          {u.valorCicloLabel || '—'}
                        </td>
                        <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">
                          {u.paymentMethod === 'credit_card' ? 'Cartão' : u.paymentMethod === 'pix' ? 'PIX' : '—'}
                        </td>
                        <td className="py-3 pr-4">
                          {u.diasParaCobranca30d != null ? (
                            <Badge variant={u.diasParaCobranca30d <= 3 ? 'danger' : u.diasParaCobranca30d <= 7 ? 'warning' : 'success'}>
                              {u.diasParaCobranca30d === 0 ? 'Hoje' : `em ${u.diasParaCobranca30d} dia${u.diasParaCobranca30d === 1 ? '' : 's'}`}
                            </Badge>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-slate-500">
                          {u.proximaCobranca30d
                            ? `${new Date(u.proximaCobranca30d).toLocaleDateString('pt-BR')}${u.diasParaCobranca30d != null ? ` (${u.diasParaCobranca30d}d)` : ''}`
                            : u.nextDueDate
                              ? new Date(u.nextDueDate).toLocaleDateString('pt-BR')
                              : '—'}
                        </td>
                        <td className="py-3 pr-4 text-slate-500">
                          {u.lastPaymentAt ? new Date(u.lastPaymentAt).toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td className="py-3 pr-4">
                          {u.asaasSubscriptionId ? (
                            <span className="font-mono text-xs text-slate-400 truncate inline-block max-w-[150px]" title={u.asaasSubscriptionId}>
                              {u.asaasSubscriptionId.slice(0, 12)}…
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3">
                          {u.bloqueado ? (
                            <Badge variant="danger">Bloqueado</Badge>
                          ) : u.acessoPermitido ? (
                            <Badge variant="success">Ativo</Badge>
                          ) : (
                            <Badge variant="warning">Sem acesso</Badge>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

function ReceitaTab({ data, loading }: { data: RevenueData | null; loading: boolean }) {
  if (loading) return <SkeletonCards quantidade={4} />

  if (!data) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-slate-400 py-10 text-center">Clique em Atualizar para carregar a receita.</p>
        </CardBody>
      </Card>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Assinantes ativos" value={data.assinantes.ativos.toLocaleString('pt-BR')} icon={<Wallet className="w-5 h-5" />} accent="primary" />
        <StatCard label="MRR (mensal)" value={data.assinantes.mrrLabel} icon={<TrendingUp className="w-5 h-5" />} accent="success" hint="valor mensal equivalente real" />
        <StatCard label="Receita no período" value={data.periodoReceita.receitaLabel} icon={<CreditCard className="w-5 h-5" />} accent="accent" hint={`${data.periodoReceita.pagamentos_confirmados} pagamentos confirmados via ASAAS`} />
        <StatCard label="Próx. cobranças (30d)" value={data.projecao30d.valorLabel} icon={<CalendarClock className="w-5 h-5" />} accent="warning" hint={`${data.projecao30d.quantidade} cobranças projetadas`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Distribuição por ciclo (ativos)</h3>
              <CreditCard className="w-4 h-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardBody>
            {Object.keys(data.distribuicao.porCiclo).length === 0 ? (
              <p className="text-sm text-slate-400">Sem assinantes ativos ainda.</p>
            ) : (
              <div className="space-y-3">
                {(['mensal', 'trimestral', 'semestral', 'anual'] as const)
                  .filter((c) => (data.distribuicao.porCiclo[c] || 0) > 0)
                  .map((c) => {
                    const max = Math.max(...Object.values(data.distribuicao.porCiclo), 1)
                    return (
                      <div key={c}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-600 dark:text-slate-300">{CICLO_LABEL[c]}</span>
                          <span className="font-semibold text-slate-500">{data.distribuicao.porCiclo[c]}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${(data.distribuicao.porCiclo[c] / max) * 100}%` }} />
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Detalhes ({data.periodo.label})</h3>
              <Wallet className="w-4 h-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              {[
                ['Pagamentos confirmados no período', data.periodoReceita.pagamentos_confirmados],
                ['Recebido no período', data.periodoReceita.receitaLabel],
                ['Total contratado (ativos, por ciclo)', data.assinantes.contratadoPorCicloLabel],
                ['MRR projetado p/ assinantes ativos', data.assinantes.mrrLabel],
                ['Cartão', data.distribuicao.porMeio.credit_card ?? 0],
                ['PIX', data.distribuicao.porMeio.pix ?? 0],
              ].map(([label, valor]) => (
                <div key={label as string} className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-sm">
                  <span className="text-slate-500 dark:text-slate-400">{label as string}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{valor as string}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-slate-400">
              Valores em centavos vindos do back-end (preços fixos) e dos webhooks de pagamento ASAAS. Projeções são marcadas como tal.
            </p>
          </CardBody>
        </Card>
      </div>
    </>
  )
}

function UsoTab({ data, loading }: { data: MetricsData | null; loading: boolean }) {
  if (loading) return <SkeletonCards quantidade={3} />

  if (!data) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-slate-400 py-10 text-center">Clique em Atualizar para carregar o uso da plataforma.</p>
        </CardBody>
      </Card>
    )
  }

  const maxDia = Math.max(...data.serie_diaria.map((d) => d.eventos), 1)

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Eventos hoje" value={data.hoje.eventos.toLocaleString('pt-BR')} icon={<Activity className="w-5 h-5" />} accent="primary" hint="delay 0 (UTC-3)" />
        <StatCard label="Buscas hoje" value={data.hoje.buscas.toLocaleString('pt-BR')} icon={<Search className="w-5 h-5" />} accent="accent" />
        <StatCard label="Cadastros hoje" value={data.hoje.cadastros.toLocaleString('pt-BR')} icon={<FileText className="w-5 h-5" />} accent="success" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Uso diário (últimos 14 dias)</h3>
            <BarChart3 className="w-4 h-4 text-slate-400" />
          </div>
        </CardHeader>
        <CardBody>
          {data.serie_diaria.length === 0 ? (
            <p className="text-sm text-slate-400">Sem eventos registrados nos últimos 14 dias.</p>
          ) : (
            <div className="flex items-end gap-1.5 h-48 overflow-x-auto pb-1">
              {data.serie_diaria.map((d) => (
                <div key={d.dia} className="flex flex-col items-center min-w-[34px] flex-1" title={`${d.dia}: ${d.eventos} eventos`}>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-lg flex items-end" style={{ height: '100%' }}>
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-primary to-secondary hover:opacity-80 transition-opacity"
                      style={{ height: `${Math.max((d.eventos / maxDia) * 100, 2)}%` }}
                    />
                  </div>
                  <span className="mt-1 text-[10px] text-slate-400 font-mono">
                    {d.dia.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Top páginas ({data.periodo.label})</h3>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
        </CardHeader>
        <CardBody>
          {data.top_paginas.length === 0 ? (
            <p className="text-sm text-slate-400">Sem visualizações de página no período.</p>
          ) : (
            <div className="space-y-3">
              {data.top_paginas.map((p) => {
                const max = data.top_paginas[0]?.views || 1
                return (
                  <div key={p.path}>
                    <div className="flex items-center justify-between gap-3 text-xs mb-1">
                      <span className="min-w-0 flex-1 font-mono text-slate-600 dark:text-slate-300 truncate">{p.path}</span>
                      <span className="shrink-0 font-semibold text-slate-500 dark:text-slate-400">{p.views}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${(p.views / max) * 100}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </>
  )
}

function EventosTab({
  data,
  loading,
  eventoFiltro,
  onEventoFiltro,
  onAtualizar,
}: {
  data: EventsData | null
  loading: boolean
  eventoFiltro: string
  onEventoFiltro: (v: string) => void
  onAtualizar: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Eventos"
          description="Registros reais de analytics_events no período selecionado."
          badge={<Badge variant="accent"><Database className="w-3.5 h-3.5" /> {data?.total ?? 0} eventos</Badge>}
        />
        <div className="flex items-center gap-2">
          <select
            value={eventoFiltro}
            onChange={(e) => onEventoFiltro(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-200"
          >
            <option value="todos">Todos os eventos</option>
            {Object.entries(EVENT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <Button variant="secondary" onClick={onAtualizar} disabled={loading} loading={loading}>
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
        </div>
      </div>

      <Card>
        <CardBody>
          {loading && !data ? (
            <SkeletonLinhas linhas={8} />
          ) : !data || data.itens.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">Nenhum evento registrado neste critério.</p>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700">
                    <th className="py-2 pr-4 font-semibold">Evento</th>
                    <th className="py-2 pr-4 font-semibold">Data/hora</th>
                    <th className="py-2 pr-4 font-semibold">Rota</th>
                    <th className="py-2 pr-4 font-semibold">client_id</th>
                    <th className="py-2 font-semibold">Usuário</th>
                  </tr>
                </thead>
                <tbody>
                  {data.itens.map((r: EventoItem, i: number) => (
                    <tr key={i} className="border-b border-slate-100 dark:border-slate-800/60">
                      <td className="py-2 pr-4">
                        <Badge variant="info" className="shrink-0">{EVENT_LABELS[r.event] || r.event}</Badge>
                      </td>
                      <td className="py-2 pr-4 text-slate-500">
                        {new Date(r.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs text-slate-500 dark:text-slate-300 truncate max-w-[220px]">{r.path || '—'}</td>
                      <td className="py-2 pr-4 font-mono text-xs text-slate-400 truncate max-w-[160px]">{r.client_id || '—'}</td>
                      <td className="py-2 font-mono text-xs text-slate-400 truncate max-w-[200px]">{r.user_id ? `${r.user_id.slice(0, 8)}…` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

function SaudeTab({ data, loading, onAtualizar }: { data: HealthData | null; loading: boolean; onAtualizar: () => void }) {
  const statusMeta = {
    verde: { rotulo: 'Sistema saudável', emoji: '🟢', cor: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
    amarelo: { rotulo: 'Atenção', emoji: '🟡', cor: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
    vermelho: { rotulo: 'Crítico', emoji: '🔴', cor: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
  }
  const meta = statusMeta[data?.status || 'verde']

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Saúde do sistema"
          description="Checagens operacionais e alertas automáticos a partir de dados reais."
          badge={<Badge variant="secondary">Verificado em tempo real</Badge>}
        />
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onAtualizar} disabled={loading} loading={loading}>
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <SkeletonCards quantidade={4} />
      ) : !data ? (
        <Card>
          <CardBody>
            <p className="text-sm text-slate-400 py-10 text-center">Clique em Atualizar para rodar as checagens.</p>
          </CardBody>
        </Card>
      ) : (
        <>
          <div className={`rounded-2xl border px-5 py-4 flex items-center gap-4 ${meta.bg}`}>
            <span className="text-3xl">{meta.emoji}</span>
            <div>
              <p className={`text-lg font-bold ${meta.cor}`}>{meta.rotulo}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {data.checagens.filter((c) => c.ok).length} de {data.checagens.length} checagens ok · {data.alertas.length} alerta(s)
              </p>
            </div>
          </div>

          {data.alertas.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Alertas automáticos</h3>
                  <HeartPulse className="w-4 h-4 text-slate-400" />
                </div>
              </CardHeader>
              <CardBody>
                <div className="space-y-2">
                  {data.alertas.map((a, i) => (
                    <div
                      key={`${a.tipo}-${i}`}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${
                        a.gravidade === 'critico'
                          ? 'bg-danger-soft dark:bg-red-500/10 border border-danger/20 text-danger'
                          : 'bg-amber-soft dark:bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      <span>{a.gravidade === 'critico' ? '🔴' : '🟡'}</span>
                      <span>{a.mensagem}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="Registros de plano" value={data.resumo.planos.toLocaleString('pt-BR')} icon={<Database className="w-5 h-5" />} accent="primary" />
            <StatCard label="Trials ativos" value={data.resumo.trials_ativos.toLocaleString('pt-BR')} icon={<FileText className="w-5 h-5" />} accent="accent" />
            <StatCard label="Assinantes ativos" value={data.resumo.assinantes_ativos.toLocaleString('pt-BR')} icon={<Wallet className="w-5 h-5" />} accent="success" />
            <StatCard label="Inadimplentes" value={data.resumo.inadimplentes.toLocaleString('pt-BR')} icon={<CreditCard className="w-5 h-5" />} accent="danger" />
            <StatCard label="Pendentes" value={data.resumo.pendentes.toLocaleString('pt-BR')} icon={<CreditCard className="w-5 h-5" />} accent="warning" />
            <StatCard label="Eventos / 1h" value={data.resumo.eventos_1h.toLocaleString('pt-BR')} icon={<Activity className="w-5 h-5" />} accent="secondary" />
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Checagens</h3>
                <ShieldCheck className="w-4 h-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-2">
                {data.checagens.map((c) => (
                  <div key={c.item} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-base shrink-0">{c.ok ? '🟢' : '🔴'}</span>
                    <span className="w-52 shrink-0 text-sm font-semibold text-slate-700 dark:text-slate-200">{c.item}</span>
                    <span className={`text-xs ${c.ok ? 'text-slate-500' : 'text-danger'}`}>{c.detalhe}</span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  )
}

// ============================================================================
// Detalhes (modal das métricas — reutiliza /api/admin/analytics)
// ============================================================================

const DETAIL_LABELS: Record<string, string> = {
  pageviews: 'Visualizações (pageviews)',
  visitantes: 'Visitantes únicos',
  buscas: 'Histórico de buscas',
  oportunidades: 'Oportunidades vistas',
  cadastros: 'Cadastros realizados',
  logins: 'Log de logins',
  conversoes: 'Conversões (cliques em planos)',
  hoje: 'Todos os eventos de hoje',
}

function DetailTable({ tipo, itens }: { tipo: string; itens: AnalyticsItem[] }) {
  const fmt = (iso?: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  }

  if (tipo === 'visitantes') {
    return (
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700">
            <th className="py-2 pr-3 font-semibold">client_id</th>
            <th className="py-2 pr-3 font-semibold">Eventos</th>
            <th className="py-2 pr-3 font-semibold">Última atividade</th>
            <th className="py-2 font-semibold">Rota</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((v: AnalyticsItem) => (
            <tr key={v.client_id} className="border-b border-slate-100 dark:border-slate-800/60">
              <td className="py-2 pr-3 font-mono text-xs text-slate-600 dark:text-slate-300 truncate max-w-[180px]">{v.client_id}</td>
              <td className="py-2 pr-3 text-slate-700 dark:text-slate-200">{v.total}</td>
              <td className="py-2 pr-3 text-slate-500">{fmt(v.ultimo)}</td>
              <td className="py-2 pr-3 font-mono text-xs text-slate-400 truncate max-w-[160px]">{v.path || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700">
          <th className="py-2 pr-3 font-semibold">Evento</th>
          <th className="py-2 pr-3 font-semibold">Data/hora</th>
          <th className="py-2 pr-3 font-semibold">Rota</th>
          <th className="py-2 font-semibold">client_id</th>
        </tr>
      </thead>
      <tbody>
        {itens.map((r: AnalyticsItem, i: number) => (
          <tr key={i} className="border-b border-slate-100 dark:border-slate-800/60">
            <td className="py-2 pr-3">
              <span className="text-xs font-semibold">{r.event ? EVENT_LABELS[r.event] || r.event : '—'}</span>
            </td>
            <td className="py-2 pr-3 text-slate-500">{fmt(r.created_at)}</td>
            <td className="py-2 pr-3 font-mono text-xs text-slate-500 dark:text-slate-300 truncate max-w-[200px]">{r.path || '—'}</td>
            <td className="py-2 pr-3 font-mono text-xs text-slate-400 truncate max-w-[160px]">{r.client_id || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}