'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { LayoutGrid, Loader2, Search, RefreshCw } from 'lucide-react'
import PageHeader from '@/components/ui/page-header'
import EmptyState from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import Kanban from '@/components/estacao/kanban'
import { type BoardItem } from '@/components/estacao/card-item'
import { apiEstacao } from '@/lib/estacao/client'
import { UFS_BRASIL } from '@/data/municipios'

interface ItemRow extends BoardItem {
  ordem?: number
}

export default function EstacaoPage() {
  const [itens, setItens] = useState<ItemRow[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const [q, setQ] = useState('')
  const [uf, setUf] = useState('')
  const [modalidade, setModalidade] = useState('')
  const [arquivados, setArquivados] = useState(false)

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

  const ativos = itens.filter((i) => !['ganha', 'perdida', 'descartada'].includes(i.etapa)).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Minha Estação"
        description="Acompanhe cada licitação do edital ao resultado."
        badge={<Badge variant="accent"><LayoutGrid className="w-3.5 h-3.5" /> {ativos} ativa(s)</Badge>}
      >
        <Link href="/oportunidades" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-primary border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
          <Search className="w-4 h-4" /> Buscar editais
        </Link>
        <button onClick={() => carregar()} disabled={carregando} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
          {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Atualizar
        </button>
      </PageHeader>

      {erro && <div className="card bg-white dark:bg-slate-900 p-4 text-sm text-danger">{erro}</div>}

      {/* Filtros */}
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
          description="Encontre uma licitação e clique em “Adicionar à minha estação”. Ela aparece aqui para você acompanhar em um quadro (kanban), com prazos, notas e checklist."
          action="Buscar editais abertos"
          actionHref="/oportunidades"
        />
      ) : (
        <Kanban itens={filtrados} onMover={mover} />
      )}
    </div>
  )
}
