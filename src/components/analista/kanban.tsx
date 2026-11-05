'use client'

import { useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowLeft, ArrowRight, Check, CheckSquare, ChevronDown, ChevronRight,
  Clock, ExternalLink, Filter, GripVertical, Kanban, Link2, MessageSquare, Paperclip,
  Pencil, Plus, RefreshCw, Search, SlidersHorizontal, Target, Trash2, TrendingUp, Trophy, X,
} from 'lucide-react'
import Button from '@/components/ui/button'
import { cn, formatCurrency } from '@/lib/utils'
import { apiAnalista, jsonInit } from '@/lib/analista/client'
import {
  CORES_DISPONIVEIS, CORES_COLUNA, corColuna, corEtiqueta, prazoInfo, prioridadeInfo,
} from '@/lib/analista/kanban'
import type { CartaoKanban, ColunaKanban } from '@/lib/analista/types'
import ModalCartao from './modal-cartao'

type Ordenacao = 'manual' | 'prazo' | 'valor' | 'margem' | 'atualizado'

function pct(v: number | null | undefined): string {
  return `${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}

function corMargem(v: number | null | undefined): string {
  const n = Number(v || 0)
  if (n < 0) return 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
  if (n < 10) return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
}

export default function KanbanAnalista({
  colunas,
  cartoes,
  onRecarregar,
  onAbrirAnalise,
}: {
  colunas: ColunaKanban[]
  cartoes: CartaoKanban[]
  onRecarregar: () => void | Promise<void>
  onAbrirAnalise: (id: string) => void
}) {
  const [cols, setCols] = useState<ColunaKanban[]>(colunas)
  const [lista, setLista] = useState<CartaoKanban[]>(cartoes)
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const [erro, setErro] = useState('')

  const [busca, setBusca] = useState('')
  const [prioridade, setPrioridade] = useState('')
  const [uf, setUf] = useState('')
  const [ordenacao, setOrdenacao] = useState<Ordenacao>('manual')
  const [soAtrasados, setSoAtrasados] = useState(false)
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)

  const [modalAberto, setModalAberto] = useState(false)
  const [cartaoSelecionado, setCartaoSelecionado] = useState<CartaoKanban | null>(null)
  const [colunaInicial, setColunaInicial] = useState<string | null>(null)

  const [editandoColuna, setEditandoColuna] = useState<ColunaKanban | null>(null)
  const [nomeColuna, setNomeColuna] = useState('')
  const [cor, setCor] = useState('slate')
  const [novaColuna, setNovaColuna] = useState(false)
  const [nomeNovaColuna, setNomeNovaColuna] = useState('')

  // Sincroniza com o servidor sem useEffect: quando o pai recarrega e entrega
  // novos arrays, ajustamos o estado local durante a renderização (padrão
  // recomendado pelo React para "derivar estado de props").
  const [propsAnteriores, setPropsAnteriores] = useState({ colunas, cartoes })
  if (propsAnteriores.colunas !== colunas || propsAnteriores.cartoes !== cartoes) {
    if (propsAnteriores.colunas !== colunas) setCols(colunas)
    if (propsAnteriores.cartoes !== cartoes) setLista(cartoes)
    setPropsAnteriores({ colunas, cartoes })
  }

  const ufsDisponiveis = useMemo(
    () => Array.from(new Set(lista.map((c) => c.uf).filter(Boolean))).sort() as string[],
    [lista]
  )

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const arr = lista.filter((c) => {
      if (prioridade && c.prioridade !== prioridade) return false
      if (uf && (c.uf || '').toUpperCase() !== uf) return false
      if (soAtrasados) {
        const p = prazoInfo(c.prazo_proposta) || prazoInfo(c.data_sessao)
        if (!p?.vencido) return false
      }
      if (termo) {
        const alvo = `${c.titulo || ''} ${c.orgao || ''} ${c.edital_ref || ''} ${c.modalidade || ''} ${(c.etiquetas || []).join(' ')} ${c.responsavel || ''}`.toLowerCase()
        if (!alvo.includes(termo)) return false
      }
      return true
    })

    if (ordenacao === 'manual') return arr.sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
    if (ordenacao === 'valor') {
      return arr.sort((a, b) => (Number(b.valor_ofertado) || Number(b.valor_referencia) || 0) - (Number(a.valor_ofertado) || Number(a.valor_referencia) || 0))
    }
    if (ordenacao === 'margem') return arr.sort((a, b) => (Number(b.margem) || 0) - (Number(a.margem) || 0))
    if (ordenacao === 'atualizado') return arr.sort((a, b) => String(b.atualizado_em).localeCompare(String(a.atualizado_em)))
    return arr.sort((a, b) => {
      const da = a.prazo_proposta ? new Date(a.prazo_proposta).getTime() : Number.POSITIVE_INFINITY
      const db = b.prazo_proposta ? new Date(b.prazo_proposta).getTime() : Number.POSITIVE_INFINITY
      return da - db
    })
  }, [lista, busca, prioridade, uf, soAtrasados, ordenacao])

  const [montadoEm] = useState(() => Date.now())

  const metricas = useMemo(() => {
    const total = lista.length
    const valor = lista.reduce((s, c) => s + (Number(c.valor_ofertado) || Number(c.valor_referencia) || 0), 0)
    const comMargem = lista.filter((c) => c.margem != null)
    const margemMedia = comMargem.length ? comMargem.reduce((s, c) => s + Number(c.margem || 0), 0) / comMargem.length : 0
    const agora = montadoEm
    const limite = agora + 7 * 86400000
    const proximos = lista.filter((c) => {
      const alvo = c.prazo_proposta || c.data_sessao
      if (!alvo) return false
      const t = new Date(alvo).getTime()
      return t >= agora && t <= limite
    }).length
    const vencidos = lista.filter((c) => {
      const p = prazoInfo(c.prazo_proposta) || prazoInfo(c.data_sessao)
      return !!p?.vencido
    }).length
    const ganhos = lista.filter((c) => /ganha|homologad|contrato/i.test(nomeDaColuna(cols, c.coluna_id))).length
    return { total, valor, margemMedia, proximos, vencidos, ganhos }
  }, [lista, cols, montadoEm])

  // -------------------------------------------------------------------------
  // Movimentação
  // -------------------------------------------------------------------------
  const mover = async (cartaoId: string, colunaId: string) => {
    const atual = lista.find((c) => c.id === cartaoId)
    if (!atual || atual.coluna_id === colunaId) return
    setErro('')
    setLista((l) => l.map((c) => (c.id === cartaoId ? { ...c, coluna_id: colunaId } : c)))
    try {
      await apiAnalista(`/api/analista/kanban/cartoes/${cartaoId}`, jsonInit('PATCH', { coluna_id: colunaId }))
      await onRecarregar()
    } catch (e) {
      setLista((l) => l.map((c) => (c.id === cartaoId ? { ...c, coluna_id: atual.coluna_id } : c)))
      setErro(e instanceof Error ? e.message : 'Não foi possível mover o cartão.')
    }
  }

  const abrirNovo = (colunaId?: string) => {
    setCartaoSelecionado(null)
    setColunaInicial(colunaId || cols[0]?.id || null)
    setModalAberto(true)
  }

  const abrirCartao = (c: CartaoKanban) => {
    setCartaoSelecionado(c)
    setColunaInicial(c.coluna_id)
    setModalAberto(true)
  }

  // -------------------------------------------------------------------------
  // Colunas
  // -------------------------------------------------------------------------
  const abrirEdicaoColuna = (c: ColunaKanban) => {
    setNovaColuna(false)
    setEditandoColuna(c)
    setNomeColuna(c.nome)
    setCor(c.cor)
  }

  const salvarColuna = async () => {
    if (!editandoColuna) return
    const nome = nomeColuna.trim()
    if (!nome) {
      setErro('Informe o nome da coluna.')
      return
    }
    try {
      await apiAnalista(`/api/analista/kanban/colunas/${editandoColuna.id}`, jsonInit('PATCH', { nome, cor }))
      setEditandoColuna(null)
      await onRecarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar a coluna.')
    }
  }

  const excluirColuna = async () => {
    if (!editandoColuna) return
    const qtd = lista.filter((c) => c.coluna_id === editandoColuna.id).length
    const msg = qtd
      ? `Excluir a coluna “${editandoColuna.nome}” e seus ${qtd} cartão(ões)?`
      : `Excluir a coluna “${editandoColuna.nome}”?`
    if (typeof window !== 'undefined' && !window.confirm(msg)) return
    try {
      await apiAnalista(`/api/analista/kanban/colunas/${editandoColuna.id}`, { method: 'DELETE' })
      setEditandoColuna(null)
      await onRecarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível excluir a coluna.')
    }
  }

  const criarColuna = async () => {
    const nome = nomeNovaColuna.trim()
    if (!nome) {
      setErro('Informe o nome da coluna.')
      return
    }
    try {
      await apiAnalista('/api/analista/kanban/colunas', jsonInit('POST', { nome, cor }))
      setNovaColuna(false)
      setNomeNovaColuna('')
      setCor('slate')
      await onRecarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível criar a coluna.')
    }
  }

  const moverColuna = async (id: string, direcao: -1 | 1) => {
    const idx = cols.findIndex((c) => c.id === id)
    const alvo = idx + direcao
    if (idx < 0 || alvo < 0 || alvo >= cols.length) return
    const nova = [...cols]
    const [item] = nova.splice(idx, 1)
    nova.splice(alvo, 0, item)
    setCols(nova)
    try {
      await apiAnalista('/api/analista/kanban/colunas', jsonInit('PUT', { ordem: nova.map((c) => c.id) }))
      await onRecarregar()
    } catch (e) {
      setCols(cols)
      setErro(e instanceof Error ? e.message : 'Não foi possível reordenar as colunas.')
    }
  }

  return (
    <div className="space-y-4">
      {/* MÉTRICAS --------------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Metrica rotulo="Cartões" valor={String(metricas.total)} icone={<Kanban className="h-4 w-4" />} />
        <Metrica rotulo="Valor no funil" valor={formatCurrency(metricas.valor)} icone={<TrendingUp className="h-4 w-4" />} />
        <Metrica rotulo="Margem média" valor={pct(metricas.margemMedia)} icone={<Target className="h-4 w-4" />} />
        <Metrica rotulo="Prazos em 7 dias" valor={String(metricas.proximos)} icone={<Clock className="h-4 w-4" />} destaque={metricas.proximos > 0} />
        <Metrica rotulo="Prazos vencidos" valor={String(metricas.vencidos)} icone={<AlertTriangle className="h-4 w-4" />} alerta={metricas.vencidos > 0} />
        <Metrica rotulo="Ganhos / contratos" valor={String(metricas.ganhos)} icone={<Trophy className="h-4 w-4" />} />
      </div>

      {metricas.vencidos > 0 && (
        <button
          type="button"
          onClick={() => {
            setSoAtrasados(true)
            setFiltrosAbertos(true)
          }}
          className="flex w-full items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-left text-xs text-rose-700 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">
            {metricas.vencidos} cartão(ões) com prazo vencido. Clique para filtrar e revisar.
          </span>
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* FILTROS ---------------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título, órgão, edital, etiqueta..."
            aria-label="Buscar cartões"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
        <button
          type="button"
          onClick={() => setFiltrosAbertos((v) => !v)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold',
            filtrosAbertos || prioridade || uf || soAtrasados
              ? 'border-primary/30 bg-primary/5 text-primary'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
          )}
        >
          <Filter className="h-3.5 w-3.5" /> Filtros
          {(prioridade || uf || soAtrasados) && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
        </button>
        <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only">Ordenar</span>
          <select
            value={ordenacao}
            onChange={(e) => setOrdenacao(e.target.value as Ordenacao)}
            aria-label="Ordenar cartões"
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="manual">Manual</option>
            <option value="prazo">Prazo mais próximo</option>
            <option value="valor">Maior valor</option>
            <option value="margem">Maior margem</option>
            <option value="atualizado">Atualizado recente</option>
          </select>
        </label>
        <Button type="button" size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => abrirNovo()}>
          Cartão
        </Button>
        <Button type="button" size="sm" variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => { setNovaColuna(true); setCor('slate'); setNomeNovaColuna('') }}>
          Coluna
        </Button>
        <button
          type="button"
          onClick={() => onRecarregar()}
          aria-label="Atualizar Kanban"
          title="Atualizar"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {filtrosAbertos && (
        <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/40 sm:grid-cols-3">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Prioridade
            <select
              value={prioridade}
              onChange={(e) => setPrioridade(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-normal dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="">Todas</option>
              <option value="urgente">Urgente</option>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            UF
            <select
              value={uf}
              onChange={(e) => setUf(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-normal dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="">Todas</option>
              {ufsDisponiveis.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => setSoAtrasados((v) => !v)}
              className={cn(
                'flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold',
                soAtrasados
                  ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300'
                  : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
              )}
            >
              Só prazos vencidos
            </button>
            <button
              type="button"
              onClick={() => { setPrioridade(''); setUf(''); setSoAtrasados(false); setBusca('') }}
              className="rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 hover:text-primary"
            >
              Limpar
            </button>
          </div>
        </div>
      )}

      {erro && (
        <p className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{erro}</span>
          <button type="button" onClick={() => setErro('')} aria-label="Fechar erro"><X className="h-4 w-4" /></button>
        </p>
      )}

      {/* QUADRO ----------------------------------------------------------- */}
      {cols.length === 0 ? (
        <div className="card flex flex-col items-center justify-center p-10 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 text-primary">
            <Kanban className="h-8 w-8" />
          </div>
          <h3 className="mb-1 text-lg font-semibold text-slate-900 dark:text-white">Nenhuma coluna no Kanban</h3>
          <p className="mb-5 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Crie a primeira coluna para começar a organizar suas licitações.
          </p>
          <Button type="button" onClick={() => { setNovaColuna(true); setCor('slate'); setNomeNovaColuna('') }} icon={<Plus className="h-4 w-4" />}>
            Criar coluna
          </Button>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-3">
          {cols.map((col, index) => {
            const cards = filtrados.filter((c) => c.coluna_id === col.id)
            const cores = corColuna(col.cor)
            return (
              <section
                key={col.id}
                onDragOver={(e) => {
                  e.preventDefault()
                  setOver(col.id)
                }}
                onDragLeave={() => setOver((o) => (o === col.id ? null : o))}
                onDrop={(e) => {
                  e.preventDefault()
                  const id = e.dataTransfer.getData('text/plain') || dragging
                  if (id) void mover(id, col.id)
                  setOver(null)
                  setDragging(null)
                }}
                className={cn(
                  'flex w-[280px] shrink-0 flex-col rounded-2xl border transition-colors',
                  over === col.id ? 'border-primary bg-primary/5' : cores.borda,
                  over === col.id ? '' : cores.fundo
                )}
                aria-label={`Coluna ${col.nome}`}
              >
                <div className="p-3">
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', cores.barra)} />
                      <h3 className={cn('truncate text-sm font-bold', cores.texto)} title={col.nome}>{col.nome}</h3>
                      <span className="rounded-full bg-white px-1.5 text-[10px] font-bold text-slate-500 dark:bg-slate-900 dark:text-slate-300">
                        {cards.length}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center">
                      <button
                        type="button"
                        onClick={() => moverColuna(col.id, -1)}
                        disabled={index === 0}
                        aria-label={`Mover coluna ${col.nome} para a esquerda`}
                        className="rounded p-1 text-slate-400 hover:bg-white/70 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-800"
                      >
                        <ArrowLeft className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moverColuna(col.id, 1)}
                        disabled={index === cols.length - 1}
                        aria-label={`Mover coluna ${col.nome} para a direita`}
                        className="rounded p-1 text-slate-400 hover:bg-white/70 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-800"
                      >
                        <ArrowRight className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirEdicaoColuna(col)}
                        aria-label={`Editar coluna ${col.nome}`}
                        className="rounded p-1 text-slate-400 hover:bg-white/70 hover:text-slate-700 dark:hover:bg-slate-800"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                    {formatCurrency(cards.reduce((s, c) => s + (Number(c.valor_ofertado) || Number(c.valor_referencia) || 0), 0))}
                  </p>
                </div>

                <div className="min-h-[80px] flex-1 space-y-2 px-2 pb-2">
                  {cards.map((c) => (
                    <CartaoItem
                      key={c.id}
                      cartao={c}
                      colunas={cols}
                      onAbrir={() => abrirCartao(c)}
                      onMover={(colunaId) => mover(c.id, colunaId)}
                      onDragStart={() => setDragging(c.id)}
                      onDragEnd={() => setDragging(null)}
                      onAbrirAnalise={onAbrirAnalise}
                    />
                  ))}
                  {cards.length === 0 && (
                    <p className="rounded-xl border border-dashed border-slate-300/70 px-2 py-6 text-center text-[11px] text-slate-400 dark:border-slate-600">
                      Solte um cartão aqui
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => abrirNovo(col.id)}
                    className="flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 py-1.5 text-[11px] font-semibold text-slate-500 hover:border-primary hover:text-primary dark:border-slate-600 dark:text-slate-400"
                  >
                    <Plus className="h-3.5 w-3.5" /> Adicionar cartão
                  </button>
                </div>
              </section>
            )
          })}
        </div>
      )}

      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        Arraste os cartões entre as colunas (desktop) ou use o seletor “Mover para” no cartão (celular). Toda movimentação fica registrada no histórico do cartão.
      </p>

      {/* MODAL CARTÃO ----------------------------------------------------- */}
      <ModalCartao
        aberto={modalAberto}
        cartao={cartaoSelecionado}
        colunaInicial={colunaInicial}
        colunas={cols}
        onFechar={() => setModalAberto(false)}
        onSalvo={onRecarregar}
        onAbrirAnalise={onAbrirAnalise}
      />

      {/* MODAL COLUNA ----------------------------------------------------- */}
      {(editandoColuna || novaColuna) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-coluna"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setEditandoColuna(null)
              setNovaColuna(false)
            }
          }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="titulo-coluna" className="font-display text-base font-bold text-slate-900 dark:text-white">
                {editandoColuna ? 'Editar coluna' : 'Nova coluna'}
              </h2>
              <button
                type="button"
                onClick={() => { setEditandoColuna(null); setNovaColuna(false) }}
                aria-label="Fechar"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Nome
              <input
                value={editandoColuna ? nomeColuna : nomeNovaColuna}
                onChange={(e) => (editandoColuna ? setNomeColuna(e.target.value) : setNomeNovaColuna(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void (editandoColuna ? salvarColuna() : criarColuna())
                  }
                }}
                maxLength={80}
                autoFocus
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </label>
            <p className="mb-1 mt-3 text-xs font-semibold text-slate-600 dark:text-slate-300">Cor</p>
            <div className="flex flex-wrap gap-1.5">
              {CORES_DISPONIVEIS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCor(c)}
                  aria-label={`Cor ${c}`}
                  aria-pressed={cor === c}
                  className={cn(
                    'h-7 w-7 rounded-full border-2 transition-transform',
                    CORES_COLUNA[c]?.barra || 'bg-slate-400',
                    cor === c ? 'scale-110 border-slate-900 dark:border-white' : 'border-transparent'
                  )}
                />
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              {editandoColuna ? (
                <Button type="button" variant="ghost" size="sm" onClick={excluirColuna} icon={<Trash2 className="h-3.5 w-3.5" />}>
                  Excluir
                </Button>
              ) : <span />}
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => { setEditandoColuna(null); setNovaColuna(false) }}>
                  Cancelar
                </Button>
                <Button type="button" size="sm" onClick={() => void (editandoColuna ? salvarColuna() : criarColuna())} icon={<Check className="h-3.5 w-3.5" />}>
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Cartão
// ---------------------------------------------------------------------------
function CartaoItem({
  cartao,
  colunas,
  onAbrir,
  onMover,
  onDragStart,
  onDragEnd,
  onAbrirAnalise,
}: {
  cartao: CartaoKanban
  colunas: ColunaKanban[]
  onAbrir: () => void
  onMover: (colunaId: string) => void
  onDragStart: () => void
  onDragEnd: () => void
  onAbrirAnalise: (id: string) => void
}) {
  const prazo = prazoInfo(cartao.prazo_proposta) || prazoInfo(cartao.data_sessao)
  const prioridade = prioridadeInfo(cartao.prioridade)
  const valor = Number(cartao.valor_ofertado) || Number(cartao.valor_referencia) || 0
  const totalCheck = Number(cartao.checklist_total) || 0
  const feitosCheck = Number(cartao.checklist_feitos) || 0
  const progresso = totalCheck ? Math.round((feitosCheck / totalCheck) * 100) : 0

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', cartao.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      className="group cursor-grab rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600" aria-hidden="true" />
        <button type="button" onClick={onAbrir} className="min-w-0 flex-1 text-left">
          <p className="line-clamp-2 text-xs font-bold leading-snug text-slate-900 dark:text-white">{cartao.titulo}</p>
          {cartao.orgao && <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-500 dark:text-slate-400">{cartao.orgao}</p>}
        </button>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold', prioridade.classe)}>{prioridade.label}</span>
        {cartao.margem != null && Number(cartao.margem) !== 0 && (
          <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold', corMargem(cartao.margem))}>
            {pct(cartao.margem)}
          </span>
        )}
        {cartao.analista_analises?.veredito && (
          <span
            className={cn(
              'rounded-full px-1.5 py-0.5 text-[9px] font-bold',
              cartao.analista_analises.veredito === 'verde'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                : cartao.analista_analises.veredito === 'amarelo'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                  : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
            )}
          >
            {cartao.analista_analises.veredito}
          </span>
        )}
        {prazo && (
          <span className={cn('inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold', prazo.classe)}>
            <Clock className="h-2.5 w-2.5" /> {prazo.texto}
          </span>
        )}
      </div>

      {(cartao.etiquetas || []).length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {cartao.etiquetas.slice(0, 3).map((t) => (
            <span key={t} className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-semibold', corEtiqueta(t))}>{t}</span>
          ))}
          {cartao.etiquetas.length > 3 && (
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              +{cartao.etiquetas.length - 3}
            </span>
          )}
        </div>
      )}

      {valor > 0 && (
        <p className="mt-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">{formatCurrency(valor)}</p>
      )}

      {totalCheck > 0 && (
        <div className="mt-1.5">
          <div className="flex items-center justify-between text-[9px] text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-0.5"><CheckSquare className="h-2.5 w-2.5" /> {feitosCheck}/{totalCheck}</span>
            <span>{progresso}%</span>
          </div>
          <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progresso}%` }} />
          </div>
        </div>
      )}

      <div className="mt-1.5 flex items-center justify-between gap-1 text-[10px] text-slate-400">
        <div className="flex items-center gap-1.5">
          {cartao.responsavel && <span className="max-w-[80px] truncate">{cartao.responsavel}</span>}
          {(Number(cartao.notas_total) || 0) > 0 && (
            <span className="inline-flex items-center gap-0.5"><MessageSquare className="h-2.5 w-2.5" /> {cartao.notas_total}</span>
          )}
          {(cartao.anexos || []).length > 0 && (
            <span className="inline-flex items-center gap-0.5"><Paperclip className="h-2.5 w-2.5" /> {cartao.anexos.length}</span>
          )}
          {cartao.analise_id && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onAbrirAnalise(cartao.analise_id!)
              }}
              title="Abrir análise vinculada"
              aria-label="Abrir análise vinculada"
              className="inline-flex items-center gap-0.5 text-primary hover:underline"
            >
              <Link2 className="h-2.5 w-2.5" /> análise
            </button>
          )}
        </div>
        {cartao.link_edital && (
          <a
            href={cartao.link_edital}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Abrir edital"
            aria-label="Abrir edital"
            className="text-slate-400 hover:text-primary"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* Mover (mobile / acessibilidade) */}
      <div className="mt-1.5 lg:hidden">
        <label className="sr-only" htmlFor={`mover-${cartao.id}`}>Mover cartão</label>
        <div className="relative">
          <select
            id={`mover-${cartao.id}`}
            value={cartao.coluna_id}
            onChange={(e) => onMover(e.target.value)}
            className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 pr-6 text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            {colunas.map((c) => (
              <option key={c.id} value={c.id}>Mover para: {c.nome}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      <button
        type="button"
        onClick={onAbrir}
        className="mt-1 w-full rounded-lg py-0.5 text-[10px] font-semibold text-slate-400 opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
      >
        Abrir cartão
      </button>
    </article>
  )
}

function Metrica({
  rotulo,
  valor,
  icone,
  destaque,
  alerta,
}: {
  rotulo: string
  valor: string
  icone: React.ReactNode
  destaque?: boolean
  alerta?: boolean
}) {
  return (
    <div className={cn(
      'rounded-xl border p-2.5',
      alerta
        ? 'border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10'
        : destaque
          ? 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
          : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
    )}>
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {icone} {rotulo}
      </p>
      <p className={cn(
        'mt-0.5 truncate text-sm font-bold',
        alerta ? 'text-rose-700 dark:text-rose-300' : 'text-slate-900 dark:text-white'
      )}>{valor}</p>
    </div>
  )
}

function nomeDaColuna(cols: ColunaKanban[], id: string): string {
  return cols.find((c) => c.id === id)?.nome || ''
}
