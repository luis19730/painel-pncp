'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, ChevronRight, GripVertical,
  Loader2, LogIn, Plus, StickyNote, Trash2, X,
} from 'lucide-react'
import Link from 'next/link'
import { apiSicxOpcional, jsonInit } from '@/lib/sicx/client'
import { dataBR, moeda, prazoInfo } from '@/lib/sicx/calc'
import { CORES_COLUNA } from '@/lib/sicx/kanban'
import { cn } from '@/lib/utils'

interface Coluna {
  id: string
  nome: string
  ordem: number
  cor: string
}

interface Cartao {
  id: string
  coluna_id: string | null
  orgao: string | null
  item: string
  valor: number | null
  datas: { prazo_entrega?: string | null; pedido?: string | null }
  checklist: Array<{ item: string; feito: boolean }>
  margem_prevista: number | null
}

interface Nota {
  id: string
  texto: string
  created_at: string
}

interface Historico {
  id: string
  de_coluna: string | null
  para_coluna: string | null
  created_at: string
}

interface Indicadores {
  total: number
  atrasados: number
  valorTotal: number
  margemPrevista: number
  ticketMedio: number
}

const INPUT =
  'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary'

const PRAZO_CLASSE: Record<string, string> = {
  vencido: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  urgente: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  ok: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  'sem-prazo': 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
}

export default function Contratacoes() {
  const [colunas, setColunas] = useState<Coluna[]>([])
  const [cartoes, setCartoes] = useState<Cartao[]>([])
  const [indicadores, setIndicadores] = useState<Indicadores | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [precisaLogin, setPrecisaLogin] = useState(false)
  const [erro, setErro] = useState('')
  const [aberto, setAberto] = useState<Cartao | null>(null)
  const [notas, setNotas] = useState<Nota[]>([])
  const [historico, setHistorico] = useState<Historico[]>([])
  const [novaNota, setNovaNota] = useState('')
  const [novoItem, setNovoItem] = useState('')
  const [novoOrgao, setNovoOrgao] = useState('')
  const [novoValor, setNovoValor] = useState('')
  const [novoPrazo, setNovoPrazo] = useState('')
  const [editandoColunas, setEditandoColunas] = useState(false)
  const [novaColuna, setNovaColuna] = useState('')

  async function carregar() {
    setErro('')
    try {
      const r = await apiSicxOpcional<{ colunas: Coluna[]; cartoes: Cartao[]; indicadores: Indicadores }>('/api/sicx/contratacoes')
      if (!r) {
        setPrecisaLogin(true)
        return
      }
      setColunas(r.colunas || [])
      setCartoes(r.cartoes || [])
      setIndicadores(r.indicadores || null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar o quadro.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    // Agendado para não chamar setState no corpo do efeito.
    const id = window.setTimeout(() => void carregar(), 0)
    return () => window.clearTimeout(id)
  }, [])

  const porColuna = useMemo(() => {
    const mapa = new Map<string, Cartao[]>()
    for (const c of colunas) mapa.set(c.id, [])
    for (const c of cartoes) {
      if (c.coluna_id && mapa.has(c.coluna_id)) mapa.get(c.coluna_id)!.push(c)
    }
    return mapa
  }, [colunas, cartoes])

  async function criar() {
    if (!novoItem.trim()) return
    setErro('')
    try {
      const r = await apiSicxOpcional('/api/sicx/contratacoes', jsonInit('POST', {
        item: novoItem,
        orgao: novoOrgao || null,
        valor: novoValor || null,
        prazo_entrega: novoPrazo || null,
      }))
      if (!r) { setPrecisaLogin(true); return }
      setNovoItem(''); setNovoOrgao(''); setNovoValor(''); setNovoPrazo('')
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível criar o cartão.')
    }
  }

  async function mover(id: string, colunaId: string) {
    setErro('')
    setCartoes((lista) => lista.map((c) => (c.id === id ? { ...c, coluna_id: colunaId } : c)))
    try {
      await apiSicxOpcional(`/api/sicx/contratacoes/${id}`, jsonInit('PATCH', { coluna_id: colunaId }))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível mover o cartão.')
      await carregar()
    }
  }

  async function abrir(id: string) {
    setErro('')
    try {
      const r = await apiSicxOpcional<{ cartao: Cartao; notas: Nota[]; historico: Historico[] }>(`/api/sicx/contratacoes/${id}`)
      if (!r) { setPrecisaLogin(true); return }
      setAberto(r.cartao)
      setNotas(r.notas || [])
      setHistorico(r.historico || [])
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível abrir o cartão.')
    }
  }

  async function adicionarNota() {
    if (!aberto || !novaNota.trim()) return
    try {
      const r = await apiSicxOpcional<{ nota: Nota }>(`/api/sicx/contratacoes/${aberto.id}`, jsonInit('POST', { acao: 'nota', texto: novaNota }))
      if (!r) return
      setNotas((n) => [r.nota, ...n])
      setNovaNota('')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar a anotação.')
    }
  }

  async function alternarChecklist(indice: number, feito: boolean) {
    if (!aberto) return
    try {
      const r = await apiSicxOpcional<{ checklist: Cartao['checklist'] }>(
        `/api/sicx/contratacoes/${aberto.id}`,
        jsonInit('POST', { acao: 'check', indice, feito })
      )
      if (!r) return
      setAberto({ ...aberto, checklist: r.checklist })
      setCartoes((lista) => lista.map((c) => (c.id === aberto.id ? { ...c, checklist: r.checklist } : c)))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível atualizar o checklist.')
    }
  }

  async function adicionarChecklist() {
    if (!aberto) return
    const item = window.prompt('Descreva o item do checklist:')
    if (!item) return
    try {
      const r = await apiSicxOpcional<{ checklist: Cartao['checklist'] }>(
        `/api/sicx/contratacoes/${aberto.id}`,
        jsonInit('POST', { acao: 'checklist', item })
      )
      if (!r) return
      setAberto({ ...aberto, checklist: r.checklist })
      setCartoes((lista) => lista.map((c) => (c.id === aberto.id ? { ...c, checklist: r.checklist } : c)))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível adicionar ao checklist.')
    }
  }

  async function excluir(id: string) {
    if (!window.confirm('Excluir esta contratação? As notas e o histórico também serão apagados.')) return
    try {
      await apiSicxOpcional(`/api/sicx/contratacoes/${id}`, { method: 'DELETE' })
      setAberto(null)
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível excluir.')
    }
  }

  async function renomearColuna(id: string, nome: string) {
    if (!nome.trim()) return
    try {
      await apiSicxOpcional(`/api/sicx/contratacoes/colunas/${id}`, jsonInit('PATCH', { nome }))
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível renomear a coluna.')
    }
  }

  async function criarColuna() {
    if (!novaColuna.trim()) return
    try {
      await apiSicxOpcional('/api/sicx/contratacoes/colunas', jsonInit('POST', { nome: novaColuna }))
      setNovaColuna('')
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível criar a coluna.')
    }
  }

  if (carregando) {
    return <div className="card p-8 flex items-center justify-center dark:bg-slate-900 dark:border-slate-800"><Loader2 className="w-5 h-5 animate-spin text-primary" /><span className="ml-2 text-sm text-slate-500">Carregando suas contratações...</span></div>
  }

  if (precisaLogin) {
    return (
      <div className="card p-8 text-center dark:bg-slate-900 dark:border-slate-800">
        <CalendarClock className="w-9 h-9 text-primary mx-auto mb-3" />
        <h3 className="font-semibold text-slate-900 dark:text-white">Entre para acompanhar suas contratações</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
          O quadro, as notas e os prazos ficam vinculados à sua conta.
        </p>
        <Link href="/login?redirect=%2Fcredenciamento-sicx" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover">
          <LogIn className="w-4 h-4" /> Entrar
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {indicadores && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Contratações', valor: String(indicadores.total) },
            { label: 'Com prazo estourado', valor: String(indicadores.atrasados) },
            { label: 'Valor total', valor: moeda(indicadores.valorTotal) },
            { label: 'Margem prevista', valor: moeda(indicadores.margemPrevista) },
          ].map((i) => (
            <div key={i.label} className="card p-4 dark:bg-slate-900 dark:border-slate-800">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{i.label}</p>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{i.valor}</p>
            </div>
          ))}
        </div>
      )}

      {erro && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{erro}</p>}

      <div className="card p-4 dark:bg-slate-900 dark:border-slate-800">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Item/contratação *</label>
            <input className={INPUT} value={novoItem} onChange={(e) => setNovoItem(e.target.value)} placeholder="Ex.: pedido de 200 caixas de papel A4" />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Órgão</label>
            <input className={INPUT} value={novoOrgao} onChange={(e) => setNovoOrgao(e.target.value)} placeholder="Órgão comprador" />
          </div>
          <div className="w-[130px]">
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Valor (R$)</label>
            <input className={INPUT} inputMode="decimal" value={novoValor} onChange={(e) => setNovoValor(e.target.value)} placeholder="0,00" />
          </div>
          <div className="w-[150px]">
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Prazo de entrega</label>
            <input className={INPUT} type="date" value={novoPrazo} onChange={(e) => setNovoPrazo(e.target.value)} />
          </div>
          <button type="button" onClick={criar} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setEditandoColunas((v) => !v)} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-primary">
          {editandoColunas ? 'Concluir edição de colunas' : 'Editar colunas'}
        </button>
        {editandoColunas && (
          <div className="flex items-center gap-1">
            <input className={`${INPUT} w-[180px] py-1.5`} value={novaColuna} onChange={(e) => setNovaColuna(e.target.value)} placeholder="Nova coluna" />
            <button type="button" onClick={criarColuna} className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">Adicionar</button>
          </div>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {colunas.map((coluna) => {
          const lista = porColuna.get(coluna.id) || []
          return (
            <div key={coluna.id} className="w-[270px] shrink-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-2">
              <div className="flex items-center justify-between px-1 py-1.5">
                {editandoColunas ? (
                  <input
                    className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 py-1 text-xs font-semibold"
                    defaultValue={coluna.nome}
                    onBlur={(e) => renomearColuna(coluna.id, e.target.value)}
                  />
                ) : (
                  <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', CORES_COLUNA[coluna.cor] || CORES_COLUNA.slate)}>
                    {coluna.nome}
                  </span>
                )}
                <span className="ml-2 text-[11px] text-slate-400">{lista.length}</span>
              </div>
              <div className="space-y-2">
                {lista.map((cartao) => {
                  const prazo = prazoInfo(cartao.datas?.prazo_entrega || null)
                  return (
                    <div key={cartao.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5">
                      <button type="button" onClick={() => abrir(cartao.id)} className="w-full text-left">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">{cartao.item}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{cartao.orgao || 'Órgão não informado'}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {cartao.valor != null && <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">{moeda(cartao.valor)}</span>}
                          {prazo.status !== 'sem-prazo' && (
                            <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', PRAZO_CLASSE[prazo.status])}>{prazo.label}</span>
                          )}
                        </div>
                      </button>
                      <div className="mt-2 flex items-center gap-1.5">
                        <GripVertical className="w-3 h-3 text-slate-300 shrink-0" />
                        <select
                          value={cartao.coluna_id || ''}
                          onChange={(e) => mover(cartao.id, e.target.value)}
                          className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 py-1 text-[11px] text-slate-600 dark:text-slate-300"
                          aria-label={`Mover ${cartao.item}`}
                        >
                          {colunas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                      </div>
                    </div>
                  )
                })}
                {lista.length === 0 && <p className="px-1 py-3 text-center text-[11px] text-slate-400">Nenhum cartão</p>}
              </div>
            </div>
          )
        })}
      </div>

      {aberto && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-0 md:p-4" role="dialog" aria-modal="true" aria-label="Detalhes da contratação">
          <div className="bg-white dark:bg-slate-900 w-full md:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-2xl md:rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">{aberto.item}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{aberto.orgao || 'Órgão não informado'} · {aberto.valor != null ? moeda(aberto.valor) : 'valor não informado'}</p>
              </div>
              <button type="button" onClick={() => setAberto(null)} aria-label="Fechar" className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-4 h-4" /></button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Checklist</h4>
                <ul className="space-y-1.5">
                  {(aberto.checklist || []).map((item, indice) => (
                    <li key={`${item.item}-${indice}`}>
                      <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <input type="checkbox" checked={item.feito} onChange={(e) => alternarChecklist(indice, e.target.checked)} className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-primary" />
                        <span className={item.feito ? 'line-through text-slate-400' : ''}>{item.item}</span>
                      </label>
                    </li>
                  ))}
                  {(aberto.checklist || []).length === 0 && <li className="text-xs text-slate-400">Nenhum item.</li>}
                </ul>
                <button type="button" onClick={adicionarChecklist} className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"><Plus className="w-3 h-3" /> Adicionar item</button>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1"><StickyNote className="w-3.5 h-3.5" /> Anotações</h4>
                <div className="flex gap-1.5">
                  <input className={`${INPUT} py-1.5 text-xs`} value={novaNota} onChange={(e) => setNovaNota(e.target.value)} placeholder="Escrever anotação..." />
                  <button type="button" onClick={adicionarNota} className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-white">Salvar</button>
                </div>
                <ul className="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
                  {notas.map((n) => (
                    <li key={n.id} className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2 text-xs text-slate-600 dark:text-slate-300">
                      {n.texto}
                      <span className="block text-[10px] text-slate-400 mt-1">{new Date(n.created_at).toLocaleString('pt-BR')}</span>
                    </li>
                  ))}
                  {notas.length === 0 && <li className="text-xs text-slate-400">Nenhuma anotação.</li>}
                </ul>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1"><ArrowRight className="w-3.5 h-3.5" /> Histórico</h4>
              <ul className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                {historico.map((h) => (
                  <li key={h.id} className="flex items-center gap-1.5">
                    <ChevronRight className="w-3 h-3" />
                    {h.de_coluna ? `${h.de_coluna} → ${h.para_coluna}` : `Criado em ${h.para_coluna || '—'}`}
                    <span className="text-slate-400">· {new Date(h.created_at).toLocaleString('pt-BR')}</span>
                  </li>
                ))}
                {historico.length === 0 && <li>Sem movimentações registradas.</li>}
              </ul>
            </div>

            <div className="mt-5 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
              <span className="text-[11px] text-slate-400">Prazo: {dataBR(aberto.datas?.prazo_entrega || null)}</span>
              <button type="button" onClick={() => excluir(aberto.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:underline"><Trash2 className="w-3.5 h-3.5" /> Excluir</button>
            </div>
          </div>
        </div>
      )}

      <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-start gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        Os prazos e indicadores são seus controles internos. Não há integração oficial com o SICX nem com o PNCP para este quadro.
      </p>
    </div>
  )
}
