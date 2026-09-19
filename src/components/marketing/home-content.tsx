'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Search, Target, TrendingUp, Bell, Radar, Sparkles,
  ArrowRight, Shield, Check, Gauge, Layers, FileBarChart, ExternalLink,
  ClipboardList, History, SearchCheck, BarChart3, ListTree, FileText, Zap, Crosshair,
} from 'lucide-react'
import { searchLiveOpportunities, searchLivePriceData, priceStatsFromRecords } from '@/lib/pncp-data'
import type { PriceStats } from '@/lib/market-data'
import type { Opportunity } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import ConsultaRapida from '@/components/marketing/consulta-rapida'

export default function HomeContent() {
  const [opps, setOpps] = useState<Opportunity[] | null>(null)
  const [priceStats, setPriceStats] = useState<PriceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let mounted = true

    async function load() {
      try {
        const [live, prices] = await Promise.all([
          searchLiveOpportunities('licitacao'),
          searchLivePriceData('notebook'),
        ])

        if (!mounted) return

        if (live && live.length > 0) {
          if (!cancelled) setOpps(live)
        }
        if (prices && prices.length > 0) {
          const s = priceStatsFromRecords(prices)
          if (s && !cancelled) setPriceStats(s)
        }
        if (!cancelled) setLastUpdate(new Date().toISOString())
      } catch {
        // dados ficam como indisponíveis e a interface informa
      } finally {
        if (!cancelled && mounted) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
      mounted = false
    }
  }, [])

  const show = opps && opps.length > 0
  const orgaosDistintos = show ? new Set(opps!.map((o) => o.orgao).filter(Boolean)).size : 0
  const ufSet = show ? new Set(opps!.map((o) => o.uf).filter(Boolean)) : new Set<string>()
  const ufs = Array.from(ufSet).sort()

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-soft via-transparent to-transparent dark:from-primary/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(124,58,237,0.12),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top_right,rgba(124,58,237,0.2),transparent_50%)]" />
        <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-primary dark:text-primary text-xs font-semibold mb-6">
                <Shield className="w-3.5 h-3.5" />
                Dados públicos do PNCP ·{' '}
                {lastUpdate ? `atualizado ${formatDate(lastUpdate)}` : 'atualização contínua'}
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold font-display text-slate-900 dark:text-white leading-[1.1] mb-6">
                Encontre as melhores{' '}
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  oportunidades
                </span>{' '}
                no PNCP
              </h1>
              <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-xl mx-auto lg:mx-0 mb-8">
                Monitore licitações, analise preços, acompanhe concorrentes e descubra as oportunidades
                mais relevantes para sua empresa.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link href="/cadastro">
                  <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-secondary/25 hover:opacity-95 transition-all active:scale-[0.98]">
                    Começar agora
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
                <a href="#consulta">
                  <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-slate-800 px-7 py-3.5 text-base font-semibold text-slate-700 dark:text-slate-100 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
                    Fazer uma busca rápida
                  </button>
                </a>
              </div>

              <div className="mt-4 text-center lg:text-left">
                <a href="#como-funciona" className="text-sm font-semibold text-primary hover:underline">
                  Ver como funciona →
                </a>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-3 text-sm text-slate-500 dark:text-slate-400">
                {['Busca inteligente', 'Score de oportunidade', 'Alertas automáticos', 'Mapa de preços', 'Auxílio na Montagem de Processo', 'Compras Expressas (SICX)'].map(item => (
                  <span key={item} className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-success" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Hero visual — dados reais do PNCP */}
            <div className="relative hidden lg:block">
              <div className="relative animate-float">
                <div className="card p-5 shadow-2xl shadow-primary/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">P</div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">Painel PNCP</p>
                        <p className="text-[11px] text-slate-400">Inteligência em licitações</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10">
                      Dados reais do PNCP
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <HeroMiniStat label="Oportunidades" value={show ? String(opps!.length) : loading ? '—' : 'Indisponível'} color="text-primary" />
                    <HeroMiniStat label="Órgãos" value={show ? String(orgaosDistintos) : loading ? '—' : 'Indisponível'} color="text-secondary" />
                    <HeroMiniStat label="UFs" value={show ? String(ufs.length) : loading ? '—' : 'Indisponível'} color="text-success" />
                  </div>

                  {loading ? (
                    <div className="space-y-2">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-700 animate-pulse">
                          <div className="w-10 h-10 shrink-0 rounded-full bg-slate-200 dark:bg-slate-700" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                            <div className="h-2 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : show ? (
                    <div className="space-y-2">
                      {opps!.slice(0, 3).map((o, i) => (
                        <MiniOpp key={o.id || i} opp={o} />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-4 text-center">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Dados indisponíveis no momento</p>
                      <p className="text-[11px] text-slate-400 mt-1">Não foi possível consultar a API pública do PNCP agora. Tente novamente em instantes.</p>
                    </div>
                  )}
                </div>
              </div>

              <p className="mt-8 text-center text-[11px] text-slate-400">
                Painel demonstrativo alimentado por dados reais da API pública do PNCP quando disponível.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Consulta rápida (integr. landing) — busca real no PNCP */}
      <ConsultaRapida />

      {/* NOVO RECURSO — Pesquisa de Preços Inteligente (banner comercial) */}
      <section className="relative overflow-hidden bg-gradient-to-r from-primary via-secondary to-accent">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.15),transparent_55%)]" />
        <div className="relative max-w-7xl mx-auto px-4 py-10 md:py-12 flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-[11px] font-bold uppercase tracking-wider mb-3">
              <SearchCheck className="w-3.5 h-3.5" /> Pesquisa de Preços Inteligente
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold font-display text-white leading-tight">
              Pesquise, analise e gere seu relatório de preços em poucos passos.
            </h2>
            <p className="text-white/90 text-base mt-2 max-w-2xl">
              Encontre referências de preços de forma rápida e inteligente e transforme os resultados
              em um relatório organizado para auxiliar na instrução do seu processo de contratação.
            </p>
          </div>
          <Link href="/precos-inteligentes">
            <button className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-primary shadow-lg hover:bg-slate-100 transition-all hover:scale-[1.02]">
              <SearchCheck className="w-4 h-4" /> Conhecer a Pesquisa de Preços
            </button>
          </Link>
        </div>
      </section>

      {/* Pesquisa de Preços Inteligente — destaque principal */}
      <section className="py-20 md:py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-sm font-bold text-primary dark:text-primary uppercase tracking-wider mb-3">
                Pesquisa de preços para contratação pública
              </p>
              <h2 className="text-3xl md:text-4xl font-extrabold font-display text-slate-900 dark:text-white mb-4">
                Pesquisa de Preços Inteligente
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-lg mb-4">
                Encontre referências de preços de forma rápida e inteligente e transforme os resultados
                em um relatório organizado para auxiliar na instrução do seu processo de contratação.
              </p>
              <p className="text-slate-600 dark:text-slate-300 text-base mb-8">
                Uma ferramenta que auxilia servidores, agentes públicos e setores de compras e licitações a
                pesquisar, organizar e comparar preços — e gerar um relatório estruturado de pesquisa de
                preços para apoiar a tomada de decisão.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                <FeatureCheck icon={SearchCheck}>Pesquisa inteligente de preços</FeatureCheck>
                <FeatureCheck icon={BarChart3}>Análise e organização dos resultados</FeatureCheck>
                <FeatureCheck icon={ListTree}>Comparação de preços</FeatureCheck>
                <FeatureCheck icon={FileText}>Geração de relatório</FeatureCheck>
                <FeatureCheck icon={Zap}>Mais rapidez na preparação do processo</FeatureCheck>
                <FeatureCheck icon={Crosshair}>Informações organizadas para apoiar a decisão</FeatureCheck>
              </ul>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Link href="/precos-inteligentes">
                  <button className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-primary-hover shadow-lg shadow-primary/25 transition-all">
                    <SearchCheck className="w-4 h-4" /> Conhecer a ferramenta
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
                <span className="text-xs text-slate-400">
                  Auxilia na pesquisa e organização de preços. A análise e decisão final permanecem sob
                  responsabilidade dos agentes competentes.
                </span>
              </div>
            </div>
            <PrecosRelatorioCard />
          </div>
        </div>
      </section>

      {/* Do levantamento ao relatório */}
      <section className="py-16 bg-slate-50 dark:bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-extrabold font-display text-slate-900 dark:text-white mb-3">
              Do levantamento ao relatório
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
              Uma jornada objetiva para transformar a pesquisa de preços em um relatório organizado.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <JourneyStep icon={SearchCheck} title="Pesquise" desc="Localize referências de preços" />
            <JourneyStep icon={BarChart3} title="Analise" desc="Organize e compare os resultados" />
            <JourneyStep icon={ListTree} title="Selecione" desc="Escolha as referências relevantes" />
            <JourneyStep icon={FileText} title="Gere" desc="Produza um relatório organizado" />
          </div>
        </div>
      </section>

      {/* Diferencial comercial */}
      <section className="py-20 md:py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold font-display text-slate-900 dark:text-white mb-4">
            Pare de perder tempo procurando e organizando informações manualmente.
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed mb-8">
            O Painel PNCP reúne ferramentas para tornar a pesquisa de preços mais rápida, organizada e
            prática, permitindo transformar os dados encontrados em um relatório estruturado para auxiliar
            na instrução do seu processo de contratação pública.
          </p>
          <Link href="/cadastro">
            <button className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-primary/25 hover:opacity-95 transition-all hover:scale-[1.02]">
              Começar agora
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </section>

      {/* NOVO — Auxílio na Montagem de Processo (banner) */}
      <section className="relative overflow-hidden bg-gradient-to-r from-primary via-secondary to-accent">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.15),transparent_55%)]" />
        <div className="relative max-w-7xl mx-auto px-4 py-10 md:py-12 flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-[11px] font-bold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Novo recurso
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold font-display text-white leading-tight">
              Monte seu processo de contratação
            </h2>
            <p className="text-white/90 text-base mt-2 max-w-2xl">
              Do planejamento à documentação, organize sua contratação pública passo a passo. Leia a
              Lei nº 14.133/2021 e organize a instrução do seu processo.
            </p>
          </div>
          <Link href="/montagem-processo">
            <button className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-primary shadow-lg hover:bg-slate-100 transition-all hover:scale-[1.02]">
              <ClipboardList className="w-4 h-4" /> Montar processo
            </button>
          </Link>
        </div>
      </section>

      {/* Auxílio na Montagem de Processo — destaque principal */}
      <section className="py-20 md:py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-sm font-bold text-primary dark:text-primary uppercase tracking-wider mb-3">
                Auxílio na Montagem de Processo
              </p>
              <h2 className="text-3xl md:text-4xl font-extrabold font-display text-slate-900 dark:text-white mb-4">
                Do edital à montagem do processo
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-lg mb-4">
                O Painel PNCP agora também ajuda você na organização e instrução do processo de
                contratação pública.
              </p>
              <p className="text-slate-600 dark:text-slate-300 text-base mb-8">
                Um assistente passo a passo para ajudar você a organizar as informações, documentos e
                etapas da contratação — da identificação da necessidade à geração dos documentos.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                <FeatureCheck icon={Check}>Criação e organização do processo</FeatureCheck>
                <FeatureCheck icon={Check}>Checklist de instrução</FeatureCheck>
                <FeatureCheck icon={Check}>Orientação passo a passo</FeatureCheck>
                <FeatureCheck icon={Check}>Organização dos documentos</FeatureCheck>
                <FeatureCheck icon={Check}>Controle das etapas</FeatureCheck>
                <FeatureCheck icon={Check}>Geração e organização dos documentos</FeatureCheck>
                <FeatureCheck icon={Check}>Acompanhamento das pendências</FeatureCheck>
                <FeatureCheck icon={Check}>Histórico do processo</FeatureCheck>
              </ul>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Link href="/montagem-processo">
                  <button className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-primary-hover shadow-lg shadow-primary/25 transition-all">
                    <ClipboardList className="w-4 h-4" /> Montar meu processo
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
                <span className="text-xs text-slate-400">
                  Auxilia na instrução e organização do processo. A análise e decisão final permanecem sob
                  responsabilidade dos agentes competentes.
                </span>
              </div>
            </div>
            <ProcessoCard />
          </div>
        </div>
      </section>

      {/* Jornada do usuário */}
      <section className="py-16 bg-slate-50 dark:bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-extrabold font-display text-slate-900 dark:text-white mb-3">
              Encontrar → Analisar → Comparar → Decidir → Montar → Acompanhar
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
              Mais do que encontrar licitações: agora você também pode organizar seu processo de
              contratação em um único lugar.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <JourneyStep icon={Search} title="Encontrar" desc="Oportunidades reais" />
            <JourneyStep icon={Gauge} title="Analisar" desc="Edital e score" />
            <JourneyStep icon={TrendingUp} title="Comparar" desc="Preços e concorrentes" />
            <JourneyStep icon={Check} title="Decidir" desc="Proposta com dados" />
            <JourneyStep icon={ClipboardList} title="Montar" desc="Instruir o processo" />
            <JourneyStep icon={Bell} title="Acompanhar" desc="Alertas e radar" />
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="py-20 md:py-24 bg-slate-50 dark:bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-14">
            <p className="text-sm font-bold text-primary dark:text-primary uppercase tracking-wider mb-3">Como funciona</p>
            <h2 className="text-3xl md:text-4xl font-extrabold font-display text-slate-900 dark:text-white mb-4">
              Do edital à decisão em um só lugar
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
              Não somos apenas um buscador de licitações. Somos uma central de inteligência.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <HowStep num="1" icon={Search} title="Encontre" desc="Busque oportunidades reais do PNCP" />
            <HowStep num="2" icon={Gauge} title="Analise" desc="Score de compatibilidade inteligente" />
            <HowStep num="3" icon={TrendingUp} title="Compare" desc="Preços históricos e concorrentes" />
            <HowStep num="4" icon={Check} title="Decida" desc="Fundamente sua proposta com dados" />
            <HowStep num="5" icon={Target} title="Acompanhe" desc="Alertas e radar personalizado" />
          </div>
        </div>
      </section>

      {/* Mapa de preços */}
      <section className="py-20 md:py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-sm font-bold text-secondary dark:text-secondary uppercase tracking-wider mb-3">Mapa de Preços</p>
              <h2 className="text-3xl md:text-4xl font-extrabold font-display text-slate-900 dark:text-white mb-4">
                Preço de referência, mediana e vencedor
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-lg mb-6">
                Análise de preços a partir de registros públicos do PNCP para você montar propostas
                competitivas sem chutar.
              </p>
              <ul className="space-y-3 mb-8">
                <FeatureCheck icon={Check}>Menor, média, mediana e maior preço por item</FeatureCheck>
                <FeatureCheck icon={Check}>Preço vencedor e faixa competitiva</FeatureCheck>
                <FeatureCheck icon={Check}>Evolução de preços ao longo do tempo</FeatureCheck>
                <FeatureCheck icon={Check}>Análise estatística, não garantia de vitória</FeatureCheck>
              </ul>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Link href="/cadastro">
                  <button className="inline-flex items-center gap-2 rounded-xl bg-secondary px-6 py-3 text-sm font-bold text-white hover:opacity-90 shadow-lg shadow-secondary/25 transition-all">
                    Acessar mapa de preços
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
                <span className="text-xs text-slate-400">Crie uma conta gratuita para acessar o mapa de preços completo.</span>
              </div>
            </div>
            {priceStats ? <PriceCard stats={priceStats} /> : (
              <div className="card p-6 shadow-2xl shadow-secondary/10 text-center">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Dados indisponíveis no momento</p>
                <p className="text-xs text-slate-400 mt-1">Não foi possível consultar os preços na API pública do PNCP agora.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Meu Radar */}
      <section className="py-20 md:py-24 bg-slate-50 dark:bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <RadarCard />
            <div>
              <p className="text-sm font-bold text-primary dark:text-primary uppercase tracking-wider mb-3">Meu Radar</p>
              <h2 className="text-3xl md:text-4xl font-extrabold font-display text-slate-900 dark:text-white mb-4">
                Receba somente oportunidades relevantes
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-lg mb-6">
                Configure o perfil da sua empresa e deixe que o radar busque as licitações certas para você.
              </p>
              <ul className="space-y-3 mb-8">
                <FeatureCheck icon={Check}>Filtros por CNAE, região, valor e modalidade</FeatureCheck>
                <FeatureCheck icon={Check}>Pontuação de compatibilidade com metodologia transparente</FeatureCheck>
                <FeatureCheck icon={Check}>Notificações automáticas por e-mail e app</FeatureCheck>
                <FeatureCheck icon={Check}>Priorize os editais mais relevantes primeiro</FeatureCheck>
              </ul>
              <Link href="/cadastro">
                <button className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-primary-hover shadow-lg shadow-primary/25 transition-all">
                  Ativar meu Radar
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Alertas + IA */}
      <section className="py-20 md:py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8">
            <AlertCard />
            <AICard />
          </div>
        </div>
      </section>

      {/* Features list */}
      <section className="py-16 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <FeatureCard icon={Target} title="Score de Oportunidade" desc="Metodologia transparente que identifica as melhores oportunidades para o seu perfil." />
            <FeatureCard icon={Radar} title="Radar Personalizado" desc="Filtros avançados por CNAE, região, valor e status." />
            <FeatureCard icon={Bell} title="Alertas Inteligentes" desc="Notificações quando novas oportunidades combinam com seu perfil." />
            <FeatureCard icon={TrendingUp} title="Preços Históricos" desc="Dados reais para fundamentar suas propostas." />
            <FeatureCard icon={Layers} title="Análise de Modalidade" desc="Entenda o formato ideal para cada oportunidade." />
            <FeatureCard icon={FileBarChart} title="Relatórios" desc="Acompanhe sua participação e resultados." />
            <FeatureCard icon={SearchCheck} title="Pesquisa de Preços Inteligente" desc="Encontre referências de preços, analise e gere um relatório para auxiliar na instrução do processo." />
            <FeatureCard icon={ClipboardList} title="Auxílio na Montagem de Processo" desc="Organize a instrução da sua contratação pública passo a passo, da necessidade à documentação." />
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-20 md:py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-secondary to-accent px-8 py-16 md:px-16 text-center">
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-extrabold font-display text-white mb-4">
                Comece gratuitamente hoje
              </h2>
              <p className="text-white/90 text-lg max-w-xl mx-auto mb-8">
                Crie seu perfil e tenha acesso à Pesquisa de Preços Inteligente e às demais ferramentas
                do Painel PNCP.
              </p>
              <Link href="/cadastro">
                <button className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-base font-bold text-primary hover:bg-slate-100 shadow-lg transition-all hover:scale-[1.02]">
                  Criar minha conta
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Curto CTA — montagem */}
      <section className="py-16 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold font-display text-slate-900 dark:text-white mb-3">
            Mais do que encontrar licitações.
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto mb-8">
            Agora você também pode organizar seu processo de contratação em um único lugar.
          </p>
          <Link href="/montagem-processo">
            <button className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-primary/25 hover:opacity-95 transition-all hover:scale-[1.02]">
              <ClipboardList className="w-4 h-4" /> Auxílio na Montagem de Processo · Começar
            </button>
          </Link>
        </div>
      </section>

      {/* SEO — pesquisa de preços + montagem */}
      <section className="py-14 bg-slate-50 dark:bg-slate-900/30">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-xl md:text-2xl font-bold font-display text-slate-900 dark:text-white mb-4">
            Pesquisa de preços inteligente e relatório para contratação pública
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            O Painel PNCP oferece uma pesquisa de preços inteligente para licitações e contratação pública:
            encontre referências de preços, organize e compare os resultados e gere um relatório de pesquisa
            de preços para auxiliar na instrução do seu processo. Além disso, reúne auxílio para a montagem
            de processo de contratação pública e o assistente de instrução de processo licitatório baseado
            na Lei nº 14.133/2021 — sempre com suporte técnico em linguagem comercial e tecnicamente correta,
            sem substituir a decisão dos agentes públicos responsáveis, a pesquisa de mercado ou os órgãos de controle.
          </p>
        </div>
      </section>
    </div>
  )
}

function HeroMiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-center">
      <p className={`text-lg font-bold font-display ${color}`}>{value}</p>
      <p className="text-[10px] text-slate-400">{label}</p>
    </div>
  )
}

function MiniOpp({ opp }: { opp: Opportunity }) {
  const valorTxt = opp.valor > 0 ? formatCurrency(opp.valor) : 'Valor não informado'
  return (
    <a
      href={opp.link && opp.link.startsWith('https') ? opp.link : undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-colors group"
    >
      <div className="w-10 h-10 shrink-0 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
        <ExternalLink className="w-4 h-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
          {opp.objeto || opp.orgao || 'Oportunidade'}
        </p>
        <p className="text-[11px] text-slate-400 truncate">
          {[opp.orgao, opp.uf, opp.modalidade].filter(Boolean).join(' · ') || 'Órgão não informado'}
        </p>
      </div>
      <p className="text-sm font-bold text-slate-900 dark:text-white shrink-0">{valorTxt}</p>
    </a>
  )
}

function HowStep({ num, icon: Icon, title, desc }: { num: string; icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <div className="card card-hover p-5 text-center relative">
      <span className="absolute top-3 right-4 text-4xl font-extrabold text-slate-100 dark:text-slate-800 select-none">{num}</span>
      <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="font-bold text-slate-900 dark:text-white mb-1">{title}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
    </div>
  )
}

function FeatureCheck({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="w-5 h-5 shrink-0 rounded-full bg-success-soft dark:bg-emerald-500/10 flex items-center justify-center mt-0.5">
        <Icon className="w-3 h-3 text-success" />
      </span>
      <span className="text-slate-600 dark:text-slate-300">{children}</span>
    </li>
  )
}

function FeatureCard({ icon: Icon, title, desc }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <div className="card card-hover p-6">
      <div className="w-10 h-10 rounded-xl bg-primary-soft dark:bg-primary/10 flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h3 className="font-bold text-slate-900 dark:text-white mb-1.5">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
    </div>
  )
}

function PrecosRelatorioCard() {
  return (
    <div className="card p-6 shadow-2xl shadow-primary/10">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <SearchCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">Pesquisa de Preços Inteligente</p>
            <p className="text-[11px] text-slate-400">Gerar relatório de pesquisa</p>
          </div>
        </div>
        <span className="text-[10px] font-bold text-primary bg-primary-soft dark:bg-primary/10 px-2 py-1 rounded-full">
          Para licitações
        </span>
      </div>

      <ol className="space-y-2">
        {[
          'Identificação do item pelo catálogo',
          'Busca de preços na fonte oficial',
          'Análise e comparação dos resultados',
          'Seleção das referências relevantes',
          'Relatório organizado da pesquisa',
        ].map((s, i) => (
          <li key={s} className="flex items-start gap-3 rounded-xl border border-slate-100 dark:border-slate-700 p-3">
            <span className="w-6 h-6 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
              {i + 1}
            </span>
            <span className="text-sm text-slate-600 dark:text-slate-300 leading-snug">{s}</span>
          </li>
        ))}
      </ol>

      <div className="mt-5 rounded-xl bg-slate-50 dark:bg-slate-800 p-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-primary" />
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Relatório estruturado</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">Pesquisar</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">Analisar</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">Exportar</span>
        </div>
        <p className="mt-3 text-[11px] text-slate-400">
          Ferramenta de apoio à pesquisa e organização de preços. Não substitui a pesquisa de mercado,
          a análise do agente público ou a aprovação de órgãos de controle.
        </p>
      </div>
    </div>
  )
}

function ProcessoCard() {
  return (
    <div className="card p-6 shadow-2xl shadow-primary/10">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">Montagem de Processo</p>
            <p className="text-[11px] text-slate-400">Assistente de instrução</p>
          </div>
        </div>
        <span className="text-[10px] font-bold text-primary bg-primary-soft dark:bg-primary/10 px-2 py-1 rounded-full">
          Lei 14.133/2021
        </span>
      </div>

      <ol className="space-y-2">
        {[
          'Identificação e classificação da necessidade',
          'Enquadramento da contratação',
          'Checklist inteligente de documentos',
          'Pesquisa de preços e SINAPI',
          'Orçamento, DFD, ETP, TR e análise de riscos',
          'Validações, pendências e geração do processo',
        ].map((s, i) => (
          <li key={s} className="flex items-start gap-3 rounded-xl border border-slate-100 dark:border-slate-700 p-3">
            <span className="w-6 h-6 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
              {i + 1}
            </span>
            <span className="text-sm text-slate-600 dark:text-slate-300 leading-snug">{s}</span>
          </li>
        ))}
      </ol>

      <div className="mt-5 rounded-xl bg-slate-50 dark:bg-slate-800 p-4">
        <div className="flex items-center gap-2 mb-2">
          <History className="w-4 h-4 text-primary" />
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Acompanhamento das pendências</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">Completo</span>
          <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300">Em elaboração</span>
          <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-300">Pendente</span>
        </div>
        <p className="mt-3 text-[11px] text-slate-400">
          Ferramenta de apoio à instrução. Não substitui a análise do agente público, setor técnico,
          autoridade competente ou assessoria jurídica.
        </p>
      </div>
    </div>
  )
}

function JourneyStep({ icon: Icon, title, desc }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <div className="card card-hover p-4 text-center">
      <div className="w-11 h-11 mx-auto rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-0.5">{title}</h3>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{desc}</p>
    </div>
  )
}

function PriceCard({ stats }: { stats: PriceStats }) {
  return (
    <div className="card p-6 shadow-2xl shadow-secondary/10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Preço de referência</p>
          <p className="text-3xl font-extrabold font-display text-slate-900 dark:text-white">{formatCurrency(stats.referencia)}</p>
        </div>
        <span className="text-[10px] font-bold text-success px-2 py-1 rounded-full bg-success-soft dark:bg-emerald-500/10">
          {stats.registros} registros
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatMini label="Mediana" value={formatCurrency(stats.mediana)} />
        <StatMini label="Média" value={formatCurrency(stats.media)} />
        <StatMini label="Menor" value={formatCurrency(stats.menor)} />
        <StatMini label="Maior" value={formatCurrency(stats.maior)} />
      </div>
      <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">Faixa de valores encontrados</p>
          <span className="text-xs font-bold text-success">Referência: {formatCurrency(stats.referencia)}</span>
        </div>
        <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-success to-accent"></div>
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-slate-400">
          <span>{formatCurrency(stats.menor)}</span>
          <span className="font-bold text-slate-600 dark:text-slate-300">{formatCurrency(stats.mediana)}</span>
          <span>{formatCurrency(stats.maior)}</span>
        </div>
      </div>
      <p className="mt-4 text-[11px] text-slate-400">
        Estimativa a partir dos registros disponibilizados pela API pública do PNCP. O índice público não expõe
        preços unitários reais — os valores são estimativas de referência e a análise não é garantia de vitória.
      </p>
    </div>
  )
}

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
      <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}

function RadarCard() {
  return (
    <div className="card p-6 shadow-2xl shadow-primary/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Radar className="w-5 h-5 text-primary" />
          <p className="text-sm font-bold text-slate-900 dark:text-white">Meu Radar</p>
        </div>
        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-primary-soft dark:bg-primary/10 text-primary">Filtros por perfil</span>
      </div>
      <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-700 mb-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-secondary/15 flex items-center justify-center">
          <Search className="w-6 h-6 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Compatibilidade com seu perfil</p>
          <p className="text-xs text-slate-400">CNAE, região, valor e modalidade definidos por você</p>
        </div>
      </div>
      <div className="space-y-2.5">
        <ScoreRow label="Compatibilidade pessoal somente após configurar o perfil" value="—" color="bg-gradient-to-r from-success to-accent" width="w-0" />
      </div>
      <p className="mt-3 text-[11px] text-slate-400">
        O indicador de concorrência só é exibido quando há dados suficientes para calculá-lo.
      </p>
    </div>
  )
}

function ScoreRow({ label, value, color, width }: { label: string; value: string; color: string; width: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-500 dark:text-slate-400">{label}</span>
        <span className="font-semibold text-slate-700 dark:text-slate-200">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
        <div className={`h-full rounded-full ${color} ${width}`}></div>
      </div>
    </div>
  )
}

function AlertCard() {
  return (
    <div className="card card-hover p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-warning-soft dark:bg-amber-500/10 flex items-center justify-center">
          <Bell className="w-5 h-5 text-warning" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white">Alertas automáticos</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Seja avisado quando houver novas oportunidades</p>
        </div>
      </div>
      <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-4">
        <div className="flex items-start gap-3">
          <div className="w-2 h-2 mt-1.5 rounded-full bg-success shrink-0"></div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Oportunidades monitoradas conforme seu radar</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Você recebe aviso por e-mail quando novas licitações combinam com seu perfil.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function AICard() {
  return (
    <div className="card card-hover p-6 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-accent/5 pointer-events-none" />
      <div className="relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 dark:text-white">Análise de oportunidade</h3>
              <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded">IA</span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Resumo baseado nos dados do edital</p>
          </div>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 p-4 border border-slate-100 dark:border-slate-700">
          <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
            <span className="font-semibold text-secondary">Análise:</span> Apresentamos para cada oportunidade um
            resumo objetivo, pontos positivos e pontos de atenção identificados nos dados reais disponíveis
            (órgão, objeto, prazo, localização e valor). Conclusões como &quot;concorrência baixa&quot; ou &quot;preço
            competitivo&quot; só são exibidas quando há dados suficientes para sustentá-las — caso contrário,
            informamos &quot;dados insuficientes&quot;.
          </p>
        </div>
      </div>
    </div>
  )
}