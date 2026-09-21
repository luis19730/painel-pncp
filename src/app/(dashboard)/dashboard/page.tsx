'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TrendingUp, FileText, Clock, AlertTriangle, Heart, DollarSign, Search, Radar, ArrowRight, Building2, AlertCircle, Calendar, Sparkles, Users, CheckCircle2, FileSearch } from 'lucide-react';
import OpportunityCard from '@/components/opportunities/opportunity-card';
import StatCard from '@/components/ui/stat-card';
import PageHeader from '@/components/ui/page-header';
import DataSourceNotice, { type DataSource } from '@/components/ui/data-source-notice';
import { Badge } from '@/components/ui/badge';
import { CardSkeleton, StatsSkeleton } from '@/components/ui/skeleton';
import { formatCurrency, normalizar, formatDate, getDaysUntil, getDeadlineColor, cn } from '@/lib/utils';
import { calculateScore } from '@/lib/scoring';
import { searchLiveContratacoes } from '@/lib/pncp-data';
import { computeOpportunityMetrics, filterQuery } from '@/lib/opportunity';
import { createClient } from '@/lib/supabase/client';
import { alertKey as alertStorageKey, favoriteKey as favoriteStorageKey } from '@/lib/storage-keys';
import type { CompanyProfile, Opportunity } from '@/types';

function loadProfile(): CompanyProfile | null {
  try {
    const raw = localStorage.getItem('perfilEmpresa')
    if (!raw) return null
    const data = JSON.parse(raw)
    return {
      id: '', user_id: '',
      cnpj: data.cnpj || null,
      razao_social: data.razaoSocial || null,
      nome_fantasia: data.nomeFantasia || null,
      cnaes: data.cnaes || [],
      segmentos: data.segmentos || [],
      produtos: data.produtos || [],
      servicos: data.servicos || [],
      palavras_chave: data.palavrasChave || [],
      estados: data.estados || [],
      municipios: data.municipios || [],
      valor_minimo: data.valorMinimo || null,
      valor_maximo: data.valorMaximo || null,
      modalidades: data.modalidades || [],
    } as CompanyProfile
  } catch { return null }
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [numFavoritos, setNumFavoritos] = useState(0)
  const [numAlertas, setNumAlertas] = useState(0)

  // Alertas novos — últimas entregas de alerta do usuário (Supabase).
  const [alertasNovos, setAlertasNovos] = useState<Array<{ id: string; canal: string | null; status: string | null; obj: string | null; em: string | null }>>([])
  const [alertasLoading, setAlertasLoading] = useState(true)

  // Editais abertos — mesma fonte viva de /oportunidades e /busca (PNCP),
  // com fallback para a base demonstrativa local quando a API está inacessível.
  const [liveOpps, setLiveOpps] = useState<Opportunity[] | null>(null)
  const [liveSource, setLiveSource] = useState<DataSource>('local')
  const [liveLoading, setLiveLoading] = useState(true)
  const [livePage, setLivePage] = useState(1)
  const [liveReload, setLiveReload] = useState(0)
  const [busca, setBusca] = useState('')
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return
      const userId = data.user?.id ?? null
      try {
        setProfile(loadProfile())
        const favs = JSON.parse(localStorage.getItem(favoriteStorageKey(userId)) || '[]')
        const al = JSON.parse(localStorage.getItem(alertStorageKey(userId)) || '[]')
        setNumFavoritos(Array.isArray(favs) ? favs.length : 0)
        setNumAlertas(Array.isArray(al) ? al.length : 0)
      } catch {
        setError(true)
        setNumFavoritos(0)
        setNumAlertas(0)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Carrega as últimas entregas de alerta do usuário (best-effort).
  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    ;(async () => {
      try {
        const { data: auth } = await supabase.auth.getUser()
        const userId = auth.user?.id
        if (!userId) {
          if (!cancelled) setAlertasLoading(false)
          return
        }
        const { data } = await supabase
          .from('alert_deliveries')
          .select('id,canal,status,oportunidade_obj,data_envio,created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5)
        if (cancelled) return
        setAlertasNovos(
          (data || []).map((r) => ({
            id: String(r.id),
            canal: r.canal ?? null,
            status: r.status ?? null,
            obj: r.oportunidade_obj ?? null,
            em: r.data_envio || r.created_at || null,
          }))
        )
      } catch {
        /* alertas são opcionais */
      } finally {
        if (!cancelled) setAlertasLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Indicadores REAIS calculados a partir das contratações ao vivo do PNCP.
  // Sem dados reais, os números exibem "—" (nunca dados fictícios).
  const liveMetrics = useMemo(
    () => (liveOpps && liveOpps.length > 0 ? computeOpportunityMetrics(liveOpps) : null),
    [liveOpps]
  )
  const metrics = liveMetrics
  const baseOpps = liveOpps && liveOpps.length > 0 ? liveOpps : []
  const usandoLive = liveSource === 'live' && !!liveMetrics

  const scored = useMemo(
    () => baseOpps.map((o) => ({ ...o, score: calculateScore(o, profile).total })).sort((a, b) => b.score - a.score),
    [baseOpps, profile]
  )

  // Próximos prazos: editais ainda abertos, ordenados pela data de encerramento.
  const proximosPrazos = useMemo(() => {
    const agora = Date.now()
    return baseOpps
      .filter((o) => o.dataEncerramento && new Date(o.dataEncerramento).getTime() >= agora)
      .sort((a, b) => new Date(a.dataEncerramento).getTime() - new Date(b.dataEncerramento).getTime())
      .slice(0, 5)
  }, [baseOpps])

  // Editais abertos - mesma fonte viva de /oportunidades e /busca (PNCP),
  // com fallback para a base demonstrativa local quando a API esta inacessivel.
  useEffect(() => {
    let cancelled = false
    setLiveLoading(true)
    searchLiveContratacoes({ dias: 30, page: livePage })
      .then((opportunities) => {
        if (cancelled) return
        const temVivos = !!opportunities && opportunities.length > 0
        setLiveOpps(temVivos ? opportunities : null)
        setLiveSource(temVivos ? 'live' : 'local')
      })
      .catch(() => {
        if (cancelled) return
        setLiveOpps(null)
        setLiveSource('local')
      })
      .finally(() => {
        if (cancelled) return
        setLiveLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [livePage, liveReload, profile])

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Sua central de inteligência em licitações públicas" />
        <StatsSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Sua central de inteligência em licitações públicas" />
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 text-center py-16 px-6">
          <AlertCircle className="mx-auto w-10 h-10 text-red-500 mb-3" />
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Não foi possível carregar os dados do painel. Tente novamente mais tarde.
          </p>
        </div>
      </div>
    )
  }

  const hotItems = scored.filter((o) => o.score >= 70)

  const cards = [
    {
      label: 'Oportunidades na base',
      value: metrics ? metrics.total : '—',
      icon: <FileText className="w-5 h-5" />,
      accent: 'primary' as const,
      hint: usandoLive ? 'contratações reais do PNCP (últimos 30 dias)' : 'indisponível no momento',
      href: '/oportunidades',
    },
    {
      label: 'Abertas',
      value: metrics ? metrics.abertas : '—',
      icon: <Clock className="w-5 h-5" />,
      accent: 'success' as const,
      hint: 'com prazo de proposta em andamento',
      href: '/oportunidades?status=aberta',
    },
    {
      label: 'Encerradas',
      value: metrics ? metrics.encerradas : '—',
      icon: <AlertTriangle className="w-5 h-5" />,
      accent: 'danger' as const,
      hint: 'com prazo já encerrado',
      href: '/oportunidades?status=encerrada',
    },
    {
      label: 'Valor total',
      value: metrics ? formatCurrency(metrics.valorTotal) : '—',
      icon: <DollarSign className="w-5 h-5" />,
      accent: 'secondary' as const,
      hint: usandoLive ? 'soma dos valores estimados (amostra real)' : 'indisponível no momento',
      href: '/oportunidades',
    },
    {
      label: 'Favoritas',
      value: numFavoritos,
      icon: <Heart className="w-5 h-5" />,
      accent: 'danger' as const,
      hint: numFavoritos > 0 ? 'salvas no navegador' : 'nenhuma favorita no navegador',
      href: '/favoritos',
    },
    {
      label: 'Alertas ativos',
      value: numAlertas,
      icon: <AlertTriangle className="w-5 h-5" />,
      accent: 'warning' as const,
      hint: numAlertas > 0 ? 'cadastrados no navegador' : 'nenhum alerta no navegador',
      href: '/alertas',
    },
    {
      label: 'Top UF',
      value: metrics ? metrics.topUf : '—',
      icon: <Radar className="w-5 h-5" />,
      accent: 'accent' as const,
      hint: metrics ? `${metrics.topUfCount} registros` : 'indisponível no momento',
      href: metrics && metrics.topUf !== '—' ? filterQuery({ uf: metrics.topUf }) : undefined,
    },
    {
      label: 'Top modalidade',
      value: metrics ? metrics.topModalidade : '—',
      icon: <TrendingUp className="w-5 h-5" />,
      accent: 'primary' as const,
      hint: metrics ? `${metrics.topModalidadeCount} registros` : 'indisponível no momento',
      href: metrics && metrics.topModalidade !== '—' ? filterQuery({ modalidade: metrics.topModalidade }) : undefined,
    },
  ]

  const cardItems = [
    { href: '/oportunidades', title: 'Encontrar', icon: Search, desc: 'Editais abertos com filtros e score de oportunidade', color: 'bg-primary text-white shadow-primary/25', cta: 'Explorar' },
    { href: '/analise-edital', title: 'Analisar', icon: FileSearch, desc: 'Análise de edital com IA: exigências, prazos e riscos', color: 'bg-gradient-to-br from-violet-500 to-secondary text-white shadow-secondary/25', cta: 'Analisar' },
    { href: '/precos-inteligentes', title: 'Precificar', icon: TrendingUp, desc: 'Pesquisa, histórico e comparação de preços', color: 'bg-secondary text-white shadow-secondary/25', cta: 'Pesquisar' },
    { href: '/montagem-processo', title: 'Montar processo', icon: FileText, desc: 'Instrução passo a passo e pendências', color: 'bg-gradient-to-br from-primary to-secondary text-white shadow-primary/25', cta: 'Montar' },
    { href: '/meu-radar', title: 'Acompanhar', icon: Radar, desc: 'Radar, alertas, favoritos e prazos', color: 'bg-success text-white shadow-success/25', cta: 'Acompanhar' },
    { href: '/concorrentes', title: 'Concorrentes', icon: Users, desc: 'Vencedores por órgão, item e região', color: 'bg-accent text-white shadow-accent/25', cta: 'Ver' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={
          usandoLive
            ? 'Indicadores calculados a partir de contratações reais do PNCP'
            : 'Indicadores indisponíveis no momento (fonte PNCP não respondeu)'
        }
      />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          const q = busca.trim()
          router.push(q ? `/oportunidades?q=${encodeURIComponent(q)}` : '/oportunidades')
        }}
        className="flex gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar oportunidades por palavra-chave (objeto, órgão, município)..."
            title="Busca por palavra-chave: procura no objeto, órgão e município dos editais."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors"
        >
          Buscar
        </button>
      </form>

      {usandoLive ? (
        <DataSourceNotice source="live" />
      ) : (
        <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3.5 py-2.5 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
          Indicadores indisponíveis no momento: não foi possível consultar a API de consulta do PNCP
          agora. Os números aparecem automaticamente quando a fonte responde — não exibimos dados fictícios.
        </div>
      )}

      <section className="card bg-white dark:bg-slate-900 dark:border-slate-800">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Editais abertos</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {liveLoading
                ? 'Consultando editais no PNCP...'
                : liveSource === 'live'
                  ? `${liveOpps?.length ?? 0} editais ao vivo do PNCP (pagina ${livePage})`
                  : 'indisponível: a API do PNCP não respondeu agora'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLiveReload((n) => n + 1)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-primary hover:text-primary-hover border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <Radar className="w-4 h-4" /> Atualizar
          </button>
        </div>
        <div className="p-6">
          {liveLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : liveOpps && liveOpps.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveOpps.slice(0, 6).map((item) => (
                <OpportunityCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Nenhum edital aberto no momento.</p>
          )}
        </div>
      </section>

      {/* Próximos prazos + Alertas novos */}
      <div className="grid md:grid-cols-2 gap-6">
        <section className="card bg-white dark:bg-slate-900 dark:border-slate-800">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Próximos prazos de encerramento</h2>
          </div>
          <div className="p-5">
            {liveLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-10 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
                ))}
              </div>
            ) : proximosPrazos.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhum prazo em aberto no momento. Ajuste a busca ou volte mais tarde.</p>
            ) : (
              <ul className="space-y-3">
                {proximosPrazos.map((o) => {
                  const dias = getDaysUntil(o.dataEncerramento)
                  return (
                    <li key={o.id}>
                      <Link href={`/oportunidades/${o.id}`} className="block group">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 line-clamp-1 group-hover:text-primary transition-colors">{o.objeto}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          <span className={`inline-flex items-center gap-1 font-semibold ${getDeadlineColor(dias)}`}>
                            <Clock className="w-3 h-3" /> {formatDate(o.dataEncerramento)}
                            {typeof dias === 'number' && dias >= 0 && <span>· {dias}d</span>}
                          </span>
                          <span className="text-slate-400 truncate">{o.orgao}</span>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>

        <section className="card bg-white dark:bg-slate-900 dark:border-slate-800">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Alertas novos</h2>
            </div>
            <Link href="/alertas" className="text-xs font-semibold text-primary hover:underline">Ver todos</Link>
          </div>
          <div className="p-5">
            {alertasLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-10 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
                ))}
              </div>
            ) : alertasNovos.length === 0 ? (
              <p className="text-sm text-slate-400">
                Nenhum alerta novo. Configure alertas em{' '}
                <Link href="/alertas" className="text-primary hover:underline">Alertas</Link> para ser avisado.
              </p>
            ) : (
              <ul className="space-y-3">
                {alertasNovos.map((a) => (
                  <li key={a.id} className="flex items-start gap-2">
                    <CheckCircle2 className={cn('w-4 h-4 mt-0.5 shrink-0', a.status === 'enviado' ? 'text-emerald-500' : a.status === 'falhou' ? 'text-rose-500' : 'text-slate-400')} />
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800 dark:text-slate-100 line-clamp-1">{a.obj || 'Alerta'}</p>
                      <p className="text-xs text-slate-400">{[a.canal, a.status, a.em ? formatDate(a.em) : null].filter(Boolean).join(' · ')}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {cards.map((c) => (
          <StatCard
            key={c.label}
            label={c.label}
            value={c.value}
            icon={c.icon}
            accent={c.accent}
            hint={c.hint}
            href={c.href || undefined}
          />
        ))}
      </div>

      <div>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Atalhos rápidos</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Ações essenciais da sua jornada de licitações.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cardItems.map((card) => {
          const Icon = card.icon
          return (
            <Link key={card.title} href={card.href} className={`group relative overflow-hidden rounded-2xl ${card.color} p-5 transition-all hover:-translate-y-0.5 hover:shadow-xl`}>
              <div className="relative z-10">
                <Icon className="w-8 h-8 mb-3 text-white/90" />
                <h3 className="text-lg font-bold text-white mb-1">{card.title}</h3>
                <p className="text-sm text-white/80 mb-4">{card.desc}</p>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white">
                  {card.cta} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-xl" />
            </Link>
          )
        })}
        </div>
      </div>

      <div className="card">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Distribuição por UF</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {usandoLive ? 'Oportunidades ao vivo por estado (PNCP)' : 'Registros por estado na base demonstrativa'}
          </p>
        </div>
        <div className="p-6">
          {(metrics?.ufs.length ?? 0) > 0 ? (
            <div className="space-y-3">
              {(metrics?.ufs ?? []).map(([uf, count], _i, arr) => {
                const max = arr[0][1]
                return (
                  <Link key={uf} href={filterQuery({ uf })} className="flex items-center gap-3 rounded-lg px-2 py-1 -mx-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                    <span className="w-10 text-xs font-semibold text-slate-600 dark:text-slate-300">{uf}</span>
                    <div className="flex-1 h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${(count / max) * 100}%` }} />
                    </div>
                    <span className="w-10 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">{count}</span>
                  </Link>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400">—</p>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Por modalidade</h2>
          </div>
          <div className="p-6">
            {(metrics?.modalidades.length ?? 0) > 0 ? (
              <ul className="space-y-2">
                {(metrics?.modalidades ?? []).map(([m, count]) => (
                  <li key={m} className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
                    <Link href={filterQuery({ modalidade: m })} className="flex-1 hover:text-primary transition-colors">{m}</Link>
                    <b className="text-slate-700 dark:text-slate-200">{count}</b>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">—</p>
            )}
          </div>
        </div>
        <div className="card">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Top órgãos</h2>
          </div>
          <div className="p-6">
            {(metrics?.orgaos.length ?? 0) > 0 ? (
              <ul className="space-y-2">
                {(metrics?.orgaos ?? []).map(([o, count]) => (
                  <li key={o} className="text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2">
                    <Building2 className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <span className="flex-1">{o}</span>
                    <b className="text-slate-700 dark:text-slate-200">{count}</b>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">—</p>
            )}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              🔥 Oportunidades com maior compatibilidade
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {usandoLive
                ? 'Pontuação do seu perfil sobre as oportunidades ao vivo do PNCP'
                : 'Pontuação derivada do seu perfil sobre os registros da base'}
            </p>
          </div>
          <Link href="/oportunidades" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover">
            Ver todas <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {profile ? (
          scored.length === 0 ? (
            <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-8 text-center">
              <p className="text-slate-500 dark:text-slate-400">Oportunidades indisponíveis no momento (fonte PNCP não respondeu).</p>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(hotItems.length > 0 ? hotItems : scored).slice(0, 6).map((item) => (
              <OpportunityCard key={item.id} item={item} />
            ))}
          </div>
          )
        ) : (
          <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-8 text-center">
            <p className="text-slate-600 dark:text-slate-300 font-medium">Configure seu perfil para personalizar as recomendações.</p>
            <Link
              href="/perfil"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
            >
              Configurar perfil <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>

      <div className="card">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Registros da base por valor</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {usandoLive ? 'Maiores valores entre as oportunidades ao vivo do PNCP' : 'Maiores valores entre os registros demonstrativos'}
          </p>
        </div>
        {scored.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">Registros indisponíveis no momento (fonte PNCP não respondeu).</p>
        ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {scored.slice(0, 8).map((item) => (
            <div key={item.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {profile && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{item.score || 0}/100</span>
                      <Badge variant={normalizar(item.situacao).includes('abert') || normalizar(item.situacao).includes('andamento') ? 'success' : item.situacao === 'Sem data' ? 'warning' : 'danger'}>{item.situacao}</Badge>
                    </div>
                  )}
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.objeto}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.orgao} · {item.municipio}/{item.uf}</p>
                </div>
                <div className="text-right shrink-0">
                  {item.valor > 0 && (
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(item.valor)}</p>
                  )}
                  <p className="text-xs mt-1 text-slate-400">{item.modalidade}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}
