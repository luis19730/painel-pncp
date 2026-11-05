'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  AlertTriangle, Calculator, HelpCircle, Kanban, Loader2, RefreshCw, Sparkles,
} from 'lucide-react'
import PageHeader from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'
import Button from '@/components/ui/button'
import Calculadora from '@/components/analista/calculadora'
import KanbanAnalista from '@/components/analista/kanban'
import { apiAnalista, jsonInit } from '@/lib/analista/client'
import { DEFAULT_CONFIG, normalizarConfig } from '@/lib/analista/config'
import type { AnaliseSalva, CartaoKanban, ColunaKanban, ConfigAnalista } from '@/lib/analista/types'
import { cn } from '@/lib/utils'

type Aba = 'calculadora' | 'kanban'

export default function AnalistaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [aba, setAba] = useState<Aba>(searchParams.get('tab') === 'kanban' ? 'kanban' : 'calculadora')
  const [config, setConfig] = useState<ConfigAnalista>(DEFAULT_CONFIG)
  const [analises, setAnalises] = useState<AnaliseSalva[]>([])
  const [colunas, setColunas] = useState<ColunaKanban[]>([])
  const [cartoes, setCartoes] = useState<CartaoKanban[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [analiseParaAbrir, setAnaliseParaAbrir] = useState<string | null>(null)
  const [pncpInicial, setPncpInicial] = useState<string | null>(null)

  // -------------------------------------------------------------------------
  // Carregamento
  // -------------------------------------------------------------------------
  const carregarAnalises = useCallback(async () => {
    const j = await apiAnalista<{ analises: AnaliseSalva[] }>('/api/analista/analises')
    setAnalises(j.analises || [])
  }, [])

  const carregarCartoes = useCallback(async () => {
    const j = await apiAnalista<{ cartoes: CartaoKanban[] }>('/api/analista/kanban/cartoes')
    setCartoes(j.cartoes || [])
  }, [])

  const carregarColunas = useCallback(async () => {
    const j = await apiAnalista<{ colunas: ColunaKanban[] }>('/api/analista/kanban/colunas')
    setColunas(j.colunas || [])
  }, [])

  const carregarTudo = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      const [cfg, cols] = await Promise.all([
        apiAnalista<{ config: ConfigAnalista }>('/api/analista/config'),
        apiAnalista<{ colunas: ColunaKanban[] }>('/api/analista/kanban/colunas'),
      ])
      setConfig(normalizarConfig(cfg.config))
      setColunas(cols.colunas || [])
      await Promise.all([carregarAnalises(), carregarCartoes()])
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar o Analista de Licitações.')
    } finally {
      setCarregando(false)
    }
  }, [carregarAnalises, carregarCartoes])

  useEffect(() => {
    void carregarTudo()
  }, [carregarTudo])

  // Parâmetros vindos de outras telas: ?tab=kanban, ?analise=<id>, ?pncp=<numero>.
  useEffect(() => {
    const analise = searchParams.get('analise')
    const pncp = searchParams.get('pncp')
    if (analise) {
      setAnaliseParaAbrir(analise)
      setAba('calculadora')
    } else if (pncp) {
      setPncpInicial(pncp)
      setAba('calculadora')
    }
    if (searchParams.get('tab') === 'kanban') setAba('kanban')
  }, [searchParams])

  const trocarAba = (nova: Aba) => {
    setAba(nova)
    router.replace(nova === 'kanban' ? '/analista?tab=kanban' : '/analista', { scroll: false })
  }

  const salvarConfig = async (novo: ConfigAnalista) => {
    const j = await apiAnalista<{ config: ConfigAnalista }>('/api/analista/config', jsonInit('PUT', novo))
    setConfig(normalizarConfig(j.config))
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="space-y-4">
      <PageHeader
        title="Analista de Licitações"
        description="Calcule a viabilidade em tempo real, simule lances e acompanhe cada oportunidade no Kanban."
        badge={
          <Badge variant="premium">
            <Sparkles className="h-3.5 w-3.5" /> NOVO
          </Badge>
        }
      >
        <Link
          href="/ajuda"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <HelpCircle className="h-4 w-4" /> Ajuda
        </Link>
        <button
          type="button"
          onClick={() => carregarTudo()}
          disabled={carregando}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Atualizar
        </button>
      </PageHeader>

      {/* ABAS ------------------------------------------------------------- */}
      <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => trocarAba('calculadora')}
          aria-pressed={aba === 'calculadora'}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors',
            aba === 'calculadora'
              ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
          )}
        >
          <Calculator className="h-4 w-4" /> Calculadora de viabilidade
        </button>
        <button
          type="button"
          onClick={() => trocarAba('kanban')}
          aria-pressed={aba === 'kanban'}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors',
            aba === 'kanban'
              ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
          )}
        >
          <Kanban className="h-4 w-4" /> Kanban de oportunidades
          {cartoes.length > 0 && (
            <span className={cn(
              'rounded-full px-1.5 text-[10px] font-bold',
              aba === 'kanban' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            )}>
              {cartoes.length}
            </span>
          )}
        </button>
      </div>

      {erro && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{erro}</span>
          <Button type="button" size="sm" variant="secondary" onClick={() => carregarTudo()} icon={<RefreshCw className="h-3.5 w-3.5" />}>
            Tentar novamente
          </Button>
        </div>
      )}

      {carregando ? (
        <div className="card space-y-3 p-6">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando calculadora, análises e Kanban...
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        </div>
      ) : aba === 'calculadora' ? (
        <Calculadora
          config={config}
          analises={analises}
          colunas={colunas}
          onConfigSalva={salvarConfig}
          onAnalisesChange={carregarAnalises}
          onCartaoCriado={carregarCartoes}
          onIrParaKanban={() => trocarAba('kanban')}
          analiseInicialId={analiseParaAbrir}
          pncpInicial={pncpInicial}
          onAnaliseAberta={() => setAnaliseParaAbrir(null)}
        />
      ) : (
        <KanbanAnalista
          colunas={colunas}
          cartoes={cartoes}
          onRecarregar={async () => {
            await Promise.all([carregarColunas(), carregarCartoes()])
          }}
          onAbrirAnalise={(id) => {
            setAnaliseParaAbrir(id)
            setAba('calculadora')
            router.replace(`/analista?analise=${encodeURIComponent(id)}`, { scroll: false })
          }}
        />
      )}
    </div>
  )
}
