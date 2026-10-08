'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, ExternalLink, Trash2, Plus, Check, Loader2,
  FileSearch, TrendingUp, FileCheck, CheckCircle2, Circle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { buildPncpEditalUrl } from '@/lib/pncp'
import { ETAPAS, TIPOS_PRAZO, labelEtapa, type PrazoTipo } from '@/lib/estacao/config'
import type { WorkspaceItem, WorkspaceNota, WorkspacePrazo, WorkspaceChecklistItem } from '@/lib/estacao/types'
import { apiEstacao as api } from '@/lib/estacao/client'

function fmtDataHora(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR')
  } catch {
    return iso
  }
}

export default function FichaEdital({ itemId, onRemovido }: { itemId: string; onRemovido: () => void }) {
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [item, setItem] = useState<WorkspaceItem | null>(null)
  const [notas, setNotas] = useState<WorkspaceNota[]>([])
  const [prazos, setPrazos] = useState<WorkspacePrazo[]>([])
  const [checklist, setChecklist] = useState<WorkspaceChecklistItem[]>([])

  const [novaNota, setNovaNota] = useState('')
  const [novoCheck, setNovoCheck] = useState('')
  const [novoTipo, setNovoTipo] = useState<PrazoTipo>('outro')
  const [novoTitulo, setNovoTitulo] = useState('')
  const [novaData, setNovaData] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      const j = await api(`/api/estacao/itens/${itemId}`)
      setItem(j.item)
      setNotas(j.notas || [])
      setPrazos(j.prazos || [])
      setChecklist(j.checklist || [])
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setCarregando(false)
    }
  }, [itemId])

  useEffect(() => {
    if (itemId) void carregar()
  }, [itemId, carregar])

  const mover = async (etapa: string) => {
    if (!item) return
    setItem({ ...item, etapa: etapa as WorkspaceItem['etapa'] })
    try {
      await api(`/api/estacao/itens/${itemId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ etapa }),
      })
    } catch {
      void carregar()
    }
  }

  const addNota = async () => {
    const texto = novaNota.trim()
    if (!texto) return
    setOcupado(true)
    try {
      const j = await api(`/api/estacao/itens/${itemId}/notas`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ texto }),
      })
      setNotas((n) => [j.nota, ...n])
      setNovaNota('')
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  const editarNota = async (id: string, atual: string) => {
    const texto = window.prompt('Editar nota:', atual)
    if (texto == null || !texto.trim()) return
    try {
      const j = await api(`/api/estacao/notas/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ texto }),
      })
      setNotas((n) => n.map((x) => (x.id === id ? j.nota : x)))
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  const delNota = async (id: string) => {
    try {
      await api(`/api/estacao/notas/${id}`, { method: 'DELETE' })
      setNotas((n) => n.filter((x) => x.id !== id))
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  const addCheck = async () => {
    const descricao = novoCheck.trim()
    if (!descricao) return
    setOcupado(true)
    try {
      const j = await api(`/api/estacao/itens/${itemId}/checklist`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ descricao, ordem: checklist.length }),
      })
      setChecklist((c) => [...c, j.checklist])
      setNovoCheck('')
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  const toggleCheck = async (c: WorkspaceChecklistItem) => {
    setChecklist((l) => l.map((x) => (x.id === c.id ? { ...x, concluido: !x.concluido } : x)))
    try {
      await api(`/api/estacao/checklist/${c.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ concluido: !c.concluido }),
      })
    } catch {
      setChecklist((l) => l.map((x) => (x.id === c.id ? { ...x, concluido: c.concluido } : x)))
    }
  }

  const delCheck = async (id: string) => {
    try {
      await api(`/api/estacao/checklist/${id}`, { method: 'DELETE' })
      setChecklist((c) => c.filter((x) => x.id !== id))
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  const addPrazo = async () => {
    if (!novaData) return
    setOcupado(true)
    try {
      const j = await api(`/api/estacao/itens/${itemId}/prazos`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tipo: novoTipo,
          titulo: novoTitulo.trim() || undefined,
          data_hora: new Date(novaData).toISOString(),
        }),
      })
      setPrazos((p) => [...p, j.prazo].sort((a, b) => +new Date(a.data_hora) - +new Date(b.data_hora)))
      setNovoTitulo('')
      setNovaData('')
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  const togglePrazo = async (p: WorkspacePrazo) => {
    setPrazos((l) => l.map((x) => (x.id === p.id ? { ...x, concluido: !x.concluido } : x)))
    try {
      await api(`/api/estacao/prazos/${p.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ concluido: !p.concluido }),
      })
    } catch {
      setPrazos((l) => l.map((x) => (x.id === p.id ? { ...x, concluido: p.concluido } : x)))
    }
  }

  const delPrazo = async (id: string) => {
    try {
      await api(`/api/estacao/prazos/${id}`, { method: 'DELETE' })
      setPrazos((p) => p.filter((x) => x.id !== id))
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  const excluirItem = async () => {
    if (!item || !window.confirm('Remover esta licitação da sua estação? Notas, prazos e checklist serão apagados.')) return
    try {
      await api(`/api/estacao/itens/${itemId}`, { method: 'DELETE' })
      onRemovido()
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  if (carregando) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
        <div className="h-40 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
      </div>
    )
  }
  if (erro && !item) {
    return <p className="text-sm text-danger">{erro}</p>
  }
  if (!item) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500 mb-4">Esta licitação não está na sua estação.</p>
        <Link href="/estacao" className="text-primary font-semibold hover:underline">Voltar à Minha Estação</Link>
      </div>
    )
  }

  const linkPncp = item.link_pncp || buildPncpEditalUrl({ id: item.numero_controle_pncp })
  const checkFeitos = checklist.filter((c) => c.concluido).length

  return (
    <div className="space-y-6">
      <Link href="/estacao" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-primary">
        <ArrowLeft className="w-4 h-4" /> Minha Estação
      </Link>

      {erro && <div className="px-4 py-2 rounded-xl bg-danger-soft text-sm text-danger">{erro}</div>}

      {/* Cabeçalho */}
      <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">{item.objeto || item.numero_controle_pncp}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <span>{item.orgao || '—'}</span>
              <span>·</span>
              <span>{item.municipio || '—'}/{item.uf || '—'}</span>
              {item.modalidade && <Badge variant="accent">{item.modalidade}</Badge>}
              {item.valor_estimado ? <Badge variant="secondary">{formatCurrency(item.valor_estimado)}</Badge> : null}
            </div>
            <p className="mt-2 text-xs text-slate-400 font-mono">{item.numero_controle_pncp}</p>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
              <span>Abertura: {item.data_abertura ? formatDate(item.data_abertura) : '—'}</span>
              <span>Encerramento: {item.data_encerramento_proposta ? formatDate(item.data_encerramento_proposta) : '—'}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <a href={linkPncp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">
              Ver no PNCP <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button onClick={excluirItem} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-danger/30 px-3 py-2 text-sm font-semibold text-danger hover:bg-danger/10">
              <Trash2 className="w-3.5 h-3.5" /> Remover
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Etapa</label>
            <select value={item.etapa} onChange={(e) => mover(e.target.value)} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm">
              {ETAPAS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
              <option value="descartada">{labelEtapa('descartada')}</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/analise-edital" className="inline-flex items-center gap-1.5 rounded-xl bg-primary-soft dark:bg-primary/15 px-3 py-2 text-sm font-semibold text-primary hover:opacity-90">
              <FileSearch className="w-4 h-4" /> Analisar edital com IA
            </Link>
            <Link href="/precos-inteligentes" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">
              <TrendingUp className="w-4 h-4" /> Pesquisa de preços
            </Link>
            <Link href="/montagem-processo" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">
              <FileCheck className="w-4 h-4" /> Montar processo
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notas */}
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-5">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Notas</h2>
          <textarea value={novaNota} onChange={(e) => setNovaNota(e.target.value)} rows={3} placeholder="Anote algo sobre esta licitação..." className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
          <button onClick={addNota} disabled={ocupado || !novaNota.trim()} className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50">
            {ocupado ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Adicionar nota
          </button>
          <ul className="mt-4 space-y-2">
            {notas.length === 0 && <li className="text-xs text-slate-400">Nenhuma nota ainda.</li>}
            {notas.map((n) => (
              <li key={n.id} className="rounded-xl border border-slate-100 dark:border-slate-800 p-3">
                <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{n.texto}</p>
                <div className="mt-2 flex items-center gap-3 text-xs">
                  <span className="text-slate-400">{fmtDataHora(n.criado_em)}</span>
                  <button onClick={() => editarNota(n.id, n.texto)} className="text-primary hover:underline">Editar</button>
                  <button onClick={() => delNota(n.id)} className="text-danger hover:underline">Excluir</button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Checklist */}
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Checklist de habilitação</h2>
            <span className="text-xs text-slate-400">{checkFeitos}/{checklist.length}</span>
          </div>
          <div className="flex gap-2">
            <input value={novoCheck} onChange={(e) => setNovoCheck(e.target.value)} placeholder="Novo item..." className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" onKeyDown={(e) => e.key === 'Enter' && addCheck()} />
            <button onClick={addCheck} disabled={ocupado || !novoCheck.trim()} className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <ul className="mt-3 space-y-1.5">
            {checklist.map((c) => (
              <li key={c.id} className="flex items-center gap-2 group">
                <button onClick={() => toggleCheck(c)} className="shrink-0" aria-label="Marcar">
                  {c.concluido ? <CheckCircle2 className="w-5 h-5 text-success" /> : <Circle className="w-5 h-5 text-slate-300" />}
                </button>
                <span className={cn('flex-1 text-sm', c.concluido ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200')}>{c.descricao}</span>
                <button onClick={() => delCheck(c.id)} className="opacity-0 group-hover:opacity-100 text-danger" aria-label="Excluir">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Prazos */}
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-5 lg:col-span-2">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Prazos</h2>
          <div className="flex flex-wrap gap-2 items-end">
            <select value={novoTipo} onChange={(e) => setNovoTipo(e.target.value as PrazoTipo)} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm">
              {TIPOS_PRAZO.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <input value={novoTitulo} onChange={(e) => setNovoTitulo(e.target.value)} placeholder="Título (opcional)" className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
            <input type="datetime-local" value={novaData} onChange={(e) => setNovaData(e.target.value)} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
            <button onClick={addPrazo} disabled={ocupado || !novaData} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50">
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </div>
          <ul className="mt-4 space-y-2">
            {prazos.length === 0 && <li className="text-xs text-slate-400">Nenhum prazo cadastrado.</li>}
            {prazos.map((p) => {
              const atras = !p.concluido && new Date(p.data_hora).getTime() < Date.now()
              return (
                <li key={p.id} className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-800 p-3">
                  <button onClick={() => togglePrazo(p)} className="shrink-0" aria-label="Concluir">
                    {p.concluido ? <CheckCircle2 className="w-5 h-5 text-success" /> : <Circle className="w-5 h-5 text-slate-300" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm', p.concluido ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200')}>
                      {p.titulo || TIPOS_PRAZO.find((t) => t.id === p.tipo)?.label}
                    </p>
                    <p className={cn('text-xs', atras ? 'text-red-500 font-semibold' : 'text-slate-400')}>{fmtDataHora(p.data_hora)}</p>
                  </div>
                  {p.alerta_enviado && <span className="text-[10px] text-success hidden sm:inline">alerta enviado</span>}
                  <button onClick={() => delPrazo(p.id)} className="text-danger" aria-label="Excluir">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
