'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  LayoutGrid, Loader2, Search, RefreshCw, Clock, Trophy, Sparkles, X, HelpCircle, Calendar,
} from 'lucide-react'
import PageHeader from '@/components/ui/page-header'
import EmptyState from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import Kanban from '@/components/estacao/kanban'
import { type BoardItem, proximoPrazo } from '@/components/estacao/card-item'
import { apiEstacao } from '@/lib/estacao/client'
import { UFS_BRASIL } from '@/data/municipios'

interface ItemRow extends BoardItem {
  ordem?: number
}

const AJUDA_KEY = 'estacao_ajuda_oculta'

export default function EstacaoPage() {
  const [itens, setItens] = useState<ItemRow[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [mostrarAjuda, setMostrarAjuda] = useState(true)

  const [q, setQ] = useState('')
  const [uf, setUf] = useState('')
  const [modalidade, setModalidade] = useState('')
  const [arquivados, setArquivados] = useState(false)

  useEffect(() => {
    try {
      setMostrarAjuda(localStorage.getItem(AJUDA_KEY) !== '1')
    } catch {
      /* ignore */
    }
  }, [])

  const ocultarAjuda = () => {
    setMostrarAjuda(false)
    try {
      localStorage.setItem(AJUDA_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      const j = await apiEstacao<{ itens: ItemRow[] }>('/api/estacao/itens?arquivados=1')
      setItens(j.itens || [])
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const mover = useCallback(async (itemId: string, etapa: string) => {
    setItens((prev) => prev.map((i) => (i.id === itemId ? { ...i, etapa } : i)))
    try {
      await apiEstacao(`/api/estacao/itens/${itemId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ etapa }),
      })
    } catch {
      void carregar()
    }
  }, [carregar])

  const filtrados = useMemo(() => {
    const termo = q.trim().toLowerCase()
    return itens.filter((i) => {
      if (!arquivados && i.etapa === 'descartada') return false
      if (uf && (i.uf || '').toUpperCase() !== uf) return false
      if (modalidade && !(i.modalidade || '').toLowerCase().includes(modalidade.toLowerCase())) return false
      if (termo) {
        const alvo = `${i.objeto || ''} ${i.orgao || ''} ${i.numero_controle_pncp}`.toLowerCase()
        if (!alvo.includes(termo)) return false
      }
      return true
    })
  }, [itens, q, uf, modalidade, arquivados])

  const ativas = itens.filter((i) => !['ganha', 'perdida', 'descartada'].includes(i.etapa)).length
  const ganhas = itens.filter((i) => i.etapa === 'ganha').length
  const proximos48 = itens.filter((i) => {
    const p = proximoPrazo(i.workspace_prazos)
    if (!p) return false
    const d = new Date(p.data_hora).getTime() - Date.now()
    return d >= 0 && d <= 48 * 3_600_000
  }).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Minha Estação"
        description="Acompanhe cada licitação do edital ao resultado."
        badge={<Badge variant="accent"><LayoutGrid className="w-3.5 h-3.5" /> {ativas} ativa(s)</Badge>}
      >
        <Link href="/oportunidades" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-primary border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
          <Search className="w-4 h-4" /> Buscar editais
        </Link>
        <button onClick={() => carregar()} disabled={carregando} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
          {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Atualizar
        </button>
      </PageHeader>

      {erro && <div className="card bg-white dark:bg-slate-900 p-4 text-sm text-danger">{erro}</div>}

      {/* Passo a passo (dica) — some ao clicar em "Entendi" */}
      {mostrarAjuda && (
        <div className="rounded-2xl border border-primary/20 bg-primary-soft/60 dark:bg-primary/10 p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-primary" /> Como funciona a sua Estação
            </h2>
            <button onClick={ocultarAjuda} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label="Ocultar ajuda">
              <X className="w-4 h-4" />
            </button>
          </div>
          <ol className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { n: '1', t: 'Adicione', d: 'Clique em “Adicionar à minha estação” em qualquer edital.' },
              { n: '2', t: 'Organize', d: 'Arraste os cartões entre as colunas (ou use o seletor no celular).' },
              { n: '3', t: 'Trabalhe', d: 'Abra a ficha para notas, checklist e prazos.' },
              { n: '4', t: 'Receba alertas', d: 'Avisamos por e-mail 24h antes de cada prazo.' },
            ].map((s) => (
              <li key={s.n} className="flex gap-3 rounded-xl bg-white/70 dark:bg-slate-900/60 p-3">
                <span className="w-6 h-6 shrink-0 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">{s.n}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{s.t}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Resumo */}
      {itens.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-primary-soft dark:bg-primary/15 flex items-center justify-center"><LayoutGrid className="w-5 h-5 text-primary" /></span>
            <div>
              <p className="text-xs text-slate-500">Licitações ativas</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{ativas}</p>
            </div>
          </div>
          <div className="card bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-600" /></span>
            <div>
              <p className="text-xs text-slate-500">Prazos em até 48h</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{proximos48}</p>
            </div>
          </div>
          <div className="card bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center"><Trophy className="w-5 h-5 text-emerald-600" /></span>
            <div>
              <p className="text-xs text-slate-500">Vitórias</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{ganhas}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      {itens.length > 0 && (
        <div className="card bg-white dark:bg-slate-900 p-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-slate-500 mb-1">Buscar</label>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Objeto, órgão ou número..." className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">UF</label>
            <select value={uf} onChange={(e) => setUf(e.target.value)} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm">
              <option value="">Todas</option>
              {UFS_BRASIL.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Modalidade</label>
            <input value={modalidade} onChange={(e) => setModalidade(e.target.value)} placeholder="Ex.: Pregão" className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm w-40" />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 pb-2">
            <input type="checkbox" checked={arquivados} onChange={(e) => setArquivados(e.target.checked)} />
            Mostrar descartadas
          </label>
        </div>
      )}

      {carregando && itens.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : itens.length === 0 ? (
        <EmptyState
          icon={<LayoutGrid className="w-8 h-8" />}
          title="Sua estação está vazia"
          description="Encontre uma licitação e clique em “Adicionar à minha estação”. Ela aparece aqui para você acompanhar em um quadro, com prazos, notas e checklist."
          action="Buscar editais abertos"
          actionHref="/oportunidades"
        />
      ) : (
        <>
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Dica: arraste os cartões para mudar a etapa. No celular, use o seletor no próprio cartão. Clique no cartão para abrir a ficha.
          </p>
          <Kanban itens={filtrados} onMover={mover} />
          {filtrados.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">Nenhum cartão corresponde aos filtros.</p>
          )}
        </>
      )}

      {itens.length > 0 && (
        <div className="pt-2">
          <Link href="/estacao/prazos" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
            <Calendar className="w-4 h-4" /> Ver todos os prazos da estação
          </Link>
        </div>
      )}
    </div>
  )
}
