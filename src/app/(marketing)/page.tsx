'use client'

import Link from 'next/link'
import {
  Search, Target, TrendingUp, Bell, Radar, Sparkles,
  ArrowRight, Shield, Check, Gauge, Layers, FileBarChart,
} from 'lucide-react'

export default function MarketingPage() {
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
                Dados públicos do PNCP · Atualização contínua
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
                <a href="#como-funciona">
                  <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-slate-800 px-7 py-3.5 text-base font-semibold text-slate-700 dark:text-slate-100 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
                    Ver como funciona
                  </button>
                </a>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-3 text-sm text-slate-500 dark:text-slate-400">
                {['Busca inteligente', 'Score de oportunidade', 'Alertas automáticos', 'Mapa de preços'].map(item => (
                  <span key={item} className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-success" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Hero visual */}
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
                    <span className="text-[10px] font-bold text-success px-2 py-1 rounded-full bg-success-soft dark:bg-emerald-500/10">● Ao vivo</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <HeroMiniStat label="Compatíveis" value="128" color="text-primary" />
                    <HeroMiniStat label="Valor total" value="R$ 40M" color="text-secondary" />
                    <HeroMiniStat label="Novas hoje" value="12" color="text-success" />
                  </div>

                  <div className="space-y-2">
                    <MiniOpp title="Aquisição de equipamentos de informática" score={94} val="R$ 125.000" uf="SP" status="Excelente" />
                    <MiniOpp title="Prestação de serviços de limpeza predial" score={87} val="R$ 320.000" uf="MG" status="Boa" />
                    <MiniOpp title="Fornecimento de materiais de escritório" score={79} val="R$ 48.500" uf="PR" status="Boa" />
                  </div>
                </div>
              </div>

              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 card px-4 py-3 shadow-xl animate-float" style={{ animationDelay: '1s' }}>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-secondary" />
                  <div>
                    <p className="text-[10px] text-slate-400">IA analisou o edital</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Score 94/100</p>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 card px-4 py-3 shadow-xl animate-float" style={{ animationDelay: '2s' }}>
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-warning" />
                  <div>
                    <p className="text-[10px] text-slate-400">Novo alerta</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">12 oportunidades hoje</p>
                  </div>
                </div>
              </div>
            </div>
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
                Dados históricos reais do PNCP para você montar propostas competitivas sem chutar.
              </p>
              <ul className="space-y-3 mb-8">
                <FeatureCheck>Menor, média, mediana e maior preço por item</FeatureCheck>
                <FeatureCheck>Preço vencedor e faixa competitiva</FeatureCheck>
                <FeatureCheck>Evolução de preços ao longo do tempo</FeatureCheck>
                <FeatureCheck>Análise estatística, não garantia de vitória</FeatureCheck>
              </ul>
              <Link href="/precos">
                <button className="inline-flex items-center gap-2 rounded-xl bg-secondary px-6 py-3 text-sm font-bold text-white hover:opacity-90 shadow-lg shadow-secondary/25 transition-all">
                  Ver mapa de preços
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
            <PriceCard />
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
                <FeatureCheck>Filtros por CNAE, região, valor e modalidade</FeatureCheck>
                <FeatureCheck>Pontuação de compatibilidade em tempo real</FeatureCheck>
                <FeatureCheck>Notificações automáticas por e-mail e app</FeatureCheck>
                <FeatureCheck>Priorize os editais mais relevantes primeiro</FeatureCheck>
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
            <FeatureCard icon={Target} title="Score de Oportunidade" desc="Inteligência que identifica as melhores oportunidades para o seu perfil." />
            <FeatureCard icon={Radar} title="Radar Personalizado" desc="Filtros avançados por CNAE, região, valor e status." />
            <FeatureCard icon={Bell} title="Alertas Inteligentes" desc="Notificações quando novas oportunidades combinam com seu perfil." />
            <FeatureCard icon={TrendingUp} title="Preços Históricos" desc="Dados reais para fundamentar suas propostas." />
            <FeatureCard icon={Layers} title="Análise de Modalidade" desc="Entenda o formato ideal para cada oportunidade." />
            <FeatureCard icon={FileBarChart} title="Relatórios" desc="Acompanhe sua participação e resultados." />
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
                Sem cartão de crédito. Crie seu perfil e receba as oportunidades certas em minutos.
              </p>
              <Link href="/cadastro">
                <button className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-base font-bold text-primary hover:bg-slate-100 shadow-lg transition-all hover:scale-[1.02]">
                  Criar conta gratuita
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>
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

function MiniOpp({ title, score, val, uf, status }: { title: string; score: number; val: string; uf: string; status: string }) {
  const scoreColor = score >= 90 ? 'text-success' : score >= 80 ? 'text-primary' : 'text-warning'
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-colors">
      <div className="w-10 h-10 shrink-0 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
        <span className={`text-xs font-bold ${scoreColor}`}>{score}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{title}</p>
        <p className="text-[11px] text-slate-400">{uf} · {status}</p>
      </div>
      <p className="text-sm font-bold text-slate-900 dark:text-white shrink-0">{val}</p>
    </div>
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

function FeatureCheck({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="w-5 h-5 shrink-0 rounded-full bg-success-soft dark:bg-emerald-500/10 flex items-center justify-center mt-0.5">
        <Check className="w-3 h-3 text-success" />
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

function PriceCard() {
  return (
    <div className="card p-6 shadow-2xl shadow-secondary/10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Preço de referência</p>
          <p className="text-3xl font-extrabold font-display text-slate-900 dark:text-white">R$ 3.187,50</p>
        </div>
        <span className="text-[10px] font-bold text-success px-2 py-1 rounded-full bg-success-soft dark:bg-emerald-500/10">127 registros</span>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatMini label="Mediana" value="R$ 3.150" />
        <StatMini label="Média" value="R$ 3.241" />
        <StatMini label="Menor" value="R$ 2.780" />
        <StatMini label="Maior" value="R$ 4.120" />
      </div>
      <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">Faixa competitiva</p>
          <span className="text-xs font-bold text-success">🟢 Competitivo</span>
        </div>
        <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-success to-accent"></div>
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-slate-400">
          <span>R$ 2.780</span>
          <span className="font-bold text-slate-600 dark:text-slate-300">R$ 3.150</span>
          <span>R$ 4.120</span>
        </div>
      </div>
      <p className="mt-4 text-[11px] text-slate-400">Análise estatística baseada em dados reais do PNCP. Não é garantia de vitória.</p>
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
        <span className="text-xs font-bold text-success px-2 py-1 rounded-full bg-success-soft dark:bg-emerald-500/10">94% compatível</span>
      </div>
      <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-700 mb-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-secondary/15 flex items-center justify-center">
          <Search className="w-6 h-6 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Notebook</p>
          <p className="text-xs text-slate-400">São Paulo · Pregão Eletrônico</p>
        </div>
        <p className="text-lg font-extrabold text-slate-900 dark:text-white">R$ 80.000</p>
      </div>
      <div className="space-y-2.5">
        <ScoreRow label="Compatibilidade" value="94%" color="bg-gradient-to-r from-success to-accent" width="w-[94%]" />
        <ScoreRow label="Concorrência" value="Baixa" color="bg-success" width="w-[70%]" />
        <ScoreRow label="Prazo" value="Adequado" color="bg-accent" width="w-[85%]" />
      </div>
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
          <h3 className="font-bold text-slate-900 dark:text-white">Alertas em tempo real</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Não perca nenhuma oportunidade</p>
        </div>
      </div>
      <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-4">
        <div className="flex items-start gap-3">
          <div className="w-2 h-2 mt-1.5 rounded-full bg-success animate-pulse shrink-0"></div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Nova oportunidade encontrada</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">12 oportunidades compatíveis hoje com seu perfil</p>
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
              <h3 className="font-bold text-slate-900 dark:text-white">Inteligência Artificial</h3>
              <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded">IA</span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Análise de edital em segundos</p>
          </div>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 p-4 border border-slate-100 dark:border-slate-700">
          <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
            <span className="font-semibold text-secondary">IA:</span> Este edital é altamente compatível
            com o perfil da sua empresa. Prazo adequado, concorrência baixa e preço competitivo.
            Recomendamos preparar a proposta.
          </p>
        </div>
        <div className="mt-3 flex gap-2">
          <span className="text-[10px] font-medium text-secondary px-2 py-1 rounded-full bg-secondary/10">Score 94</span>
          <span className="text-[10px] font-medium text-accent px-2 py-1 rounded-full bg-accent/10">Risco Baixo</span>
          <span className="text-[10px] font-medium text-success px-2 py-1 rounded-full bg-success-soft">Recomendado</span>
        </div>
      </div>
    </div>
  )
}
