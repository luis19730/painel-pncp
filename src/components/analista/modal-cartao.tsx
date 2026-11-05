'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, Check, CheckSquare, ChevronRight, Clock, ExternalLink, History,
  Kanban, Link2, Loader2, MessageSquare, Paperclip, Pencil, Plus, Save, Send,
  StickyNote, Trash2, X,
} from 'lucide-react'
import Button from '@/components/ui/button'
import { cn, formatDate } from '@/lib/utils'
import { apiAnalista, jsonInit } from '@/lib/analista/client'
import { CHECKLIST_SUGERIDO, ETIQUETAS_SUGERIDAS, PRIORIDADES, corEtiqueta, prazoInfo } from '@/lib/analista/kanban'
import type {
  CartaoKanban, ChecklistKanban, ColunaKanban, HistoricoKanban, NotaKanban, Prioridade,
} from '@/lib/analista/types'
import { CampoData, CampoMoeda, CampoNumero, CampoSelect, CampoTexto, Secao } from './campos'

type Aba = 'dados' | 'anotacoes' | 'checklist' | 'historico'

// O formulário do cartão é dinâmico (campos opcionais vindos do banco), por isso
// os valores são livres; o payload é saneado no servidor antes de gravar.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ValoresFormulario = Record<string, any>

interface CartaoCompleto extends CartaoKanban {
  analista_analises?: CartaoKanban['analista_analises']
}

/** ISO/date -> "YYYY-MM-DDTHH:mm" no fuso local (para o input datetime-local). */
function paraInputData(valor: string | null | undefined): string {
  if (!valor) return ''
  const d = new Date(valor)
  if (Number.isNaN(d.getTime())) return String(valor).slice(0, 16)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function limpar<T extends ValoresFormulario>(obj: T): Partial<T> {
  const saida: ValoresFormulario = {}
  for (const [k, v] of Object.entries(obj)) {
    saida[k] = v === '' ? null : v
  }
  return saida as Partial<T>
}

const ABAS: Array<{ id: Aba; label: string; icone: typeof Pencil }> = [
  { id: 'dados', label: 'Dados', icone: Pencil },
  { id: 'anotacoes', label: 'Anotações', icone: MessageSquare },
  { id: 'checklist', label: 'Checklist', icone: CheckSquare },
  { id: 'historico', label: 'Histórico', icone: History },
]

export default function ModalCartao({
  aberto,
  cartao,
  colunaInicial,
  colunas,
  onFechar,
  onSalvo,
  onAbrirAnalise,
}: {
  aberto: boolean
  cartao: CartaoKanban | null
  colunaInicial?: string | null
  colunas: ColunaKanban[]
  onFechar: () => void
  onSalvo: () => void | Promise<void>
  onAbrirAnalise?: (id: string) => void
}) {
  const editando = !!cartao
  const [aba, setAba] = useState<Aba>('dados')
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  const [form, setForm] = useState<ValoresFormulario>({})
  const [notas, setNotas] = useState<NotaKanban[]>([])
  const [checklist, setChecklist] = useState<ChecklistKanban[]>([])
  const [historico, setHistorico] = useState<HistoricoKanban[]>([])

  const [novaNota, setNovaNota] = useState('')
  const [tipoNota, setTipoNota] = useState<'nota' | 'comentario'>('nota')
  const [novoItem, setNovoItem] = useState('')
  const [novaEtiqueta, setNovaEtiqueta] = useState('')
  const [anexoNome, setAnexoNome] = useState('')
  const [anexoUrl, setAnexoUrl] = useState('')

  const colunaAtual = useMemo(
    () => colunas.find((c) => c.id === form.coluna_id) || colunas[0],
    [colunas, form.coluna_id]
  )

  const progresso = useMemo(() => {
    const total = checklist.length
    const feitos = checklist.filter((c) => c.feito).length
    return { total, feitos, pct: total ? Math.round((feitos / total) * 100) : 0 }
  }, [checklist])

  const prazo = prazoInfo(form.prazo_proposta)

  const carregarDetalhe = useCallback(async (id: string) => {
    setCarregando(true)
    setErro('')
    try {
      const j = await apiAnalista<{
        cartao: CartaoCompleto
        notas: NotaKanban[]
        checklist: ChecklistKanban[]
        historico: HistoricoKanban[]
      }>(`/api/analista/kanban/cartoes/${id}`)
      const c = j.cartao
      setForm({
        ...c,
        data_sessao: paraInputData(c.data_sessao),
        prazo_proposta: paraInputData(c.prazo_proposta),
        prazo_entrega: paraInputData(c.prazo_entrega),
        valor_referencia: Number(c.valor_referencia) || 0,
        valor_ofertado: Number(c.valor_ofertado) || 0,
        margem: Number(c.margem) || 0,
        etiquetas: Array.isArray(c.etiquetas) ? c.etiquetas : [],
        anexos: Array.isArray(c.anexos) ? c.anexos : [],
      })
      setNotas(j.notas || [])
      setChecklist(j.checklist || [])
      setHistorico(j.historico || [])
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar o cartão.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    if (!aberto) return
    // Sincroniza o formulário com o cartão aberto (uma única vez por abertura).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAba('dados')
    setErro('')
    setAviso('')
    setNovaNota('')
    setNovoItem('')
    setNovaEtiqueta('')
    setAnexoNome('')
    setAnexoUrl('')
    if (cartao) {
      void carregarDetalhe(cartao.id)
    } else {
      setForm({
        coluna_id: colunaInicial || colunas[0]?.id || '',
        titulo: '',
        orgao: '',
        edital_ref: '',
        modalidade: '',
        uf: '',
        valor_referencia: 0,
        valor_ofertado: 0,
        margem: 0,
        data_sessao: '',
        prazo_proposta: '',
        prazo_entrega: '',
        responsavel: '',
        prioridade: 'media',
        etiquetas: [],
        link_edital: '',
        anexos: [],
        motivo_perda: '',
      })
      setNotas([])
      setChecklist([])
      setHistorico([])
    }
  }, [aberto, cartao, colunaInicial, colunas, carregarDetalhe])

  useEffect(() => {
    if (!aberto) return
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [aberto, onFechar])

  if (!aberto) return null

  const set = (patch: ValoresFormulario) => setForm((f) => ({ ...f, ...patch }))

  const salvar = async () => {
    const titulo = String(form.titulo || '').trim()
    if (!titulo) {
      setErro('Informe o título do cartão.')
      setAba('dados')
      return
    }
    if (!form.coluna_id) {
      setErro('Escolha a coluna do cartão.')
      setAba('dados')
      return
    }
    setSalvando(true)
    setErro('')
    try {
      const payload = limpar({
        coluna_id: form.coluna_id,
        titulo,
        orgao: form.orgao,
        edital_ref: form.edital_ref,
        modalidade: form.modalidade,
        uf: String(form.uf || '').toUpperCase(),
        valor_referencia: form.valor_referencia,
        valor_ofertado: form.valor_ofertado,
        margem: form.margem,
        data_sessao: form.data_sessao,
        prazo_proposta: form.prazo_proposta,
        prazo_entrega: form.prazo_entrega,
        responsavel: form.responsavel,
        prioridade: form.prioridade,
        etiquetas: form.etiquetas,
        link_edital: form.link_edital,
        anexos: form.anexos,
        motivo_perda: form.motivo_perda,
      })
      if (editando && cartao) {
        await apiAnalista(`/api/analista/kanban/cartoes/${cartao.id}`, jsonInit('PATCH', payload))
      } else {
        await apiAnalista('/api/analista/kanban/cartoes', jsonInit('POST', payload))
      }
      await onSalvo()
      onFechar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar o cartão.')
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async () => {
    if (!cartao) return
    if (typeof window !== 'undefined' && !window.confirm('Excluir este cartão e todo o seu histórico?')) return
    try {
      await apiAnalista(`/api/analista/kanban/cartoes/${cartao.id}`, { method: 'DELETE' })
      await onSalvo()
      onFechar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível excluir o cartão.')
    }
  }

  const acao = async (body: Record<string, unknown>) => {
    if (!cartao) return null
    try {
      const j = await apiAnalista<ValoresFormulario>(
        `/api/analista/kanban/cartoes/${cartao.id}`,
        jsonInit('POST', body)
      )
      await onSalvo()
      return j
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível concluir a ação.')
      return null
    }
  }

  const adicionarNota = async () => {
    const texto = novaNota.trim()
    if (!texto) return
    const j = await acao({ acao: 'nota', texto, tipo: tipoNota })
    if (j?.nota) {
      setNotas((n) => [j.nota as NotaKanban, ...n])
      setNovaNota('')
      setAviso('Anotação salva.')
    }
  }

  const removerNota = async (id: string) => {
    const j = await acao({ acao: 'remover_nota', nota_id: id })
    if (j) setNotas((n) => n.filter((x) => x.id !== id))
  }

  const adicionarItem = async (texto?: string) => {
    const item = (texto ?? novoItem).trim()
    if (!item) return
    const j = await acao({ acao: 'checklist', item })
    if (j?.item) {
      setChecklist((c) => [...c, j.item as ChecklistKanban])
      setNovoItem('')
    }
  }

  const checklistPadrao = async () => {
    const j = await acao({ acao: 'checklist_padrao' })
    if (j) {
      await carregarDetalhe(cartao!.id)
      setAviso(`${j.adicionados || 0} item(ns) sugerido(s) adicionado(s).`)
    }
  }

  const alternarCheck = async (item: ChecklistKanban) => {
    setChecklist((c) => c.map((x) => (x.id === item.id ? { ...x, feito: !x.feito } : x)))
    const j = await acao({ acao: 'check', check_id: item.id, feito: !item.feito })
    if (!j) await carregarDetalhe(cartao!.id)
  }

  const removerCheck = async (id: string) => {
    const j = await acao({ acao: 'remover_checklist', check_id: id })
    if (j) setChecklist((c) => c.filter((x) => x.id !== id))
  }

  const adicionarEtiqueta = (valor?: string) => {
    const t = (valor ?? novaEtiqueta).trim().slice(0, 40)
    if (!t) return
    setForm((f) => {
      const atuais: string[] = Array.isArray(f.etiquetas) ? f.etiquetas : []
      if (atuais.includes(t)) return f
      return { ...f, etiquetas: [...atuais, t].slice(0, 12) }
    })
    setNovaEtiqueta('')
  }

  const removerEtiqueta = (t: string) => {
    setForm((f) => ({ ...f, etiquetas: (f.etiquetas || []).filter((x: string) => x !== t) }))
  }

  const adicionarAnexo = () => {
    const url = anexoUrl.trim()
    if (!/^https?:\/\//i.test(url)) {
      setErro('Informe um link válido (começando com http:// ou https://).')
      return
    }
    setForm((f) => ({
      ...f,
      anexos: [...(f.anexos || []), { nome: (anexoNome.trim() || url).slice(0, 120), url }].slice(0, 20),
    }))
    setAnexoNome('')
    setAnexoUrl('')
    setErro('')
  }

  const removerAnexo = (url: string) => {
    setForm((f) => ({ ...f, anexos: (f.anexos || []).filter((a: { url?: string }) => a.url !== url) }))
  }

  const nomeColuna = (id: string | null | undefined) =>
    colunas.find((c) => c.id === id)?.nome || (id ? 'coluna removida' : '—')

  const notasTimeline = notas.filter((n) => (n.tipo || 'nota') === 'nota')
  const comentarios = notas.filter((n) => n.tipo === 'comentario')

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-modal-cartao"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onFechar()
      }}
    >
      <div className="my-4 w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        {/* CABEÇALHO ------------------------------------------------------ */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">
              <Kanban className="h-3.5 w-3.5" />
              {editando ? 'Cartão do Kanban' : 'Novo cartão'}
              {colunaAtual && (
                <>
                  <ChevronRight className="h-3 w-3" />
                  <span className="text-slate-500 dark:text-slate-300">{colunaAtual.nome}</span>
                </>
              )}
            </p>
            <h2 id="titulo-modal-cartao" className="mt-0.5 truncate font-display text-lg font-bold text-slate-900 dark:text-white">
              {String(form.titulo || '').trim() || 'Sem título'}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {editando && form.margem != null && Number(form.margem) !== 0 && (
                <span className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-bold',
                  Number(form.margem) >= 15
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                    : Number(form.margem) >= 0
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                )}>
                  margem {Number(form.margem).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
                </span>
              )}
              {editando && form.analista_analises?.veredito && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  veredito {form.analista_analises.veredito}
                </span>
              )}
              {prazo && (
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', prazo.classe)}>
                  <Clock className="mr-0.5 inline h-3 w-3" /> {prazo.texto}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ABAS ----------------------------------------------------------- */}
        {editando && (
          <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 pt-2 dark:border-slate-800">
            {ABAS.map((a) => {
              const Icone = a.icone
              const contador =
                a.id === 'anotacoes' ? notas.length : a.id === 'checklist' ? checklist.length : 0
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAba(a.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-xs font-semibold transition-colors',
                    aba === a.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                  )}
                >
                  <Icone className="h-3.5 w-3.5" /> {a.label}
                  {contador > 0 && (
                    <span className="rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {contador}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        <div className="max-h-[68vh] space-y-3 overflow-y-auto p-4">
          {carregando ? (
            <p className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando cartão...
            </p>
          ) : aba === 'dados' ? (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <CampoTexto
                  id="cartao-titulo"
                  label="Título *"
                  valor={form.titulo || ''}
                  onChange={(v) => set({ titulo: v })}
                  placeholder="Ex.: Pregão 12/2026 — material de escritório"
                  maxLength={300}
                  className="sm:col-span-2"
                />
                <CampoSelect
                  id="cartao-coluna"
                  label="Coluna"
                  valor={form.coluna_id || ''}
                  onChange={(v) => set({ coluna_id: v })}
                  opcoes={colunas.map((c) => ({ value: c.id, label: c.nome }))}
                />
                <CampoSelect
                  id="cartao-prioridade"
                  label="Prioridade"
                  valor={form.prioridade || 'media'}
                  onChange={(v) => set({ prioridade: v as Prioridade })}
                  opcoes={PRIORIDADES.map((p) => ({ value: p.id, label: p.label }))}
                />
                <CampoTexto
                  id="cartao-orgao"
                  label="Órgão"
                  valor={form.orgao || ''}
                  onChange={(v) => set({ orgao: v })}
                  placeholder="Nome do órgão"
                />
                <CampoTexto
                  id="cartao-edital"
                  label="Número PNCP"
                  valor={form.edital_ref || ''}
                  onChange={(v) => set({ edital_ref: v })}
                  placeholder="00000000000000-1-000001/2026"
                />
                <CampoTexto
                  id="cartao-modalidade"
                  label="Modalidade"
                  valor={form.modalidade || ''}
                  onChange={(v) => set({ modalidade: v })}
                  placeholder="Pregão eletrônico"
                />
                <div className="grid grid-cols-2 gap-3">
                  <CampoTexto
                    id="cartao-uf"
                    label="UF"
                    valor={form.uf || ''}
                    onChange={(v) => set({ uf: v.toUpperCase().slice(0, 2) })}
                    placeholder="SP"
                    maxLength={2}
                  />
                  <CampoTexto
                    id="cartao-responsavel"
                    label="Responsável"
                    valor={form.responsavel || ''}
                    onChange={(v) => set({ responsavel: v })}
                    placeholder="Quem cuida"
                  />
                </div>
                <CampoMoeda
                  id="cartao-valor-ref"
                  label="Valor de referência"
                  valor={Number(form.valor_referencia) || 0}
                  onChange={(v) => set({ valor_referencia: v })}
                />
                <CampoMoeda
                  id="cartao-valor-ofertado"
                  label="Valor ofertado"
                  valor={Number(form.valor_ofertado) || 0}
                  onChange={(v) => set({ valor_ofertado: v })}
                />
                <CampoNumero
                  id="cartao-margem"
                  label="Margem líquida"
                  sufixo="%"
                  valor={Number(form.margem) || 0}
                  onChange={(v) => set({ margem: v })}
                  step={0.1}
                />
                <div className="flex items-end">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    O cartão pode ser vinculado a uma análise salva para abrir a calculadora com um clique.
                  </p>
                </div>
                <CampoData
                  id="cartao-sessao"
                  label="Data da sessão"
                  valor={form.data_sessao || ''}
                  onChange={(v) => set({ data_sessao: v })}
                />
                <CampoData
                  id="cartao-prazo-proposta"
                  label="Prazo da proposta"
                  valor={form.prazo_proposta || ''}
                  onChange={(v) => set({ prazo_proposta: v })}
                />
                <CampoData
                  id="cartao-prazo-entrega"
                  label="Prazo de entrega"
                  valor={form.prazo_entrega || ''}
                  onChange={(v) => set({ prazo_entrega: v })}
                />
                <CampoTexto
                  id="cartao-link"
                  label="Link do edital"
                  valor={form.link_edital || ''}
                  onChange={(v) => set({ link_edital: v })}
                  placeholder="https://pncp.gov.br/..."
                  className="sm:col-span-2"
                />
                <CampoTexto
                  id="cartao-motivo-perda"
                  label="Motivo de perda / desistência"
                  valor={form.motivo_perda || ''}
                  onChange={(v) => set({ motivo_perda: v })}
                  placeholder="Preencha se o cartão for para a coluna de perdidas"
                  className="sm:col-span-2"
                />
              </div>

              {/* ETIQUETAS */}
              <Secao titulo="Etiquetas" icone={<Link2 className="h-4 w-4" />} className="bg-slate-50/60 dark:bg-slate-800/30">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(form.etiquetas || []).map((t: string) => (
                    <span key={t} className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', corEtiqueta(t))}>
                      {t}
                      <button type="button" onClick={() => removerEtiqueta(t)} aria-label={`Remover etiqueta ${t}`} className="opacity-60 hover:opacity-100">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {(form.etiquetas || []).length === 0 && <span className="text-xs text-slate-400">Nenhuma etiqueta.</span>}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    value={novaEtiqueta}
                    onChange={(e) => setNovaEtiqueta(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        adicionarEtiqueta()
                      }
                    }}
                    placeholder="Nova etiqueta e Enter"
                    aria-label="Nova etiqueta"
                    maxLength={40}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <Button type="button" size="sm" variant="secondary" onClick={() => adicionarEtiqueta()} icon={<Plus className="h-3.5 w-3.5" />}>
                    Adicionar
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {ETIQUETAS_SUGERIDAS.filter((t) => !(form.etiquetas || []).includes(t)).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => adicionarEtiqueta(t)}
                      className="rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-[10px] text-slate-500 hover:border-primary hover:text-primary dark:border-slate-600 dark:text-slate-400"
                    >
                      + {t}
                    </button>
                  ))}
                </div>
              </Secao>

              {/* ANEXOS */}
              <Secao titulo="Anexos e links" icone={<Paperclip className="h-4 w-4" />} className="bg-slate-50/60 dark:bg-slate-800/30">
                <div className="space-y-1.5">
                  {(form.anexos || []).map((a: { nome: string; url: string }) => (
                    <div key={a.url} className="flex items-center gap-2 rounded-lg bg-white p-2 text-xs dark:bg-slate-900">
                      <Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <a href={a.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-semibold text-primary hover:underline">
                        {a.nome}
                      </a>
                      <button type="button" onClick={() => removerAnexo(a.url)} aria-label={`Remover anexo ${a.nome}`} className="text-slate-400 hover:text-rose-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {(form.anexos || []).length === 0 && <p className="text-xs text-slate-400">Nenhum anexo. Cole links de documentos, planilhas ou pastas.</p>}
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
                  <input
                    value={anexoNome}
                    onChange={(e) => setAnexoNome(e.target.value)}
                    placeholder="Nome (opcional)"
                    aria-label="Nome do anexo"
                    maxLength={120}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <input
                    value={anexoUrl}
                    onChange={(e) => setAnexoUrl(e.target.value)}
                    placeholder="https://..."
                    aria-label="URL do anexo"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <Button type="button" size="sm" variant="secondary" onClick={adicionarAnexo} icon={<Plus className="h-3.5 w-3.5" />}>
                    Anexar
                  </Button>
                </div>
              </Secao>

              {editando && form.analise_id && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Vinculado à análise <strong>{form.analista_analises?.titulo || 'salva'}</strong>
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onFechar()
                      onAbrirAnalise?.(String(form.analise_id))
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Abrir na calculadora
                  </button>
                </div>
              )}

              {editando && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Criado em {formatDate(form.criado_em)} · atualizado em {formatDate(form.atualizado_em)}
                  </p>
                  <Button type="button" size="sm" variant="ghost" onClick={excluir} icon={<Trash2 className="h-3.5 w-3.5" />}>
                    Excluir cartão
                  </Button>
                </div>
              )}
            </>
          ) : aba === 'anotacoes' ? (
            <>
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="mb-2 flex gap-1">
                  <button
                    type="button"
                    onClick={() => setTipoNota('nota')}
                    className={cn('rounded-lg px-2.5 py-1 text-[11px] font-semibold', tipoNota === 'nota' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')}
                  >
                    <StickyNote className="mr-1 inline h-3 w-3" /> Nota da linha do tempo
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoNota('comentario')}
                    className={cn('rounded-lg px-2.5 py-1 text-[11px] font-semibold', tipoNota === 'comentario' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')}
                  >
                    <MessageSquare className="mr-1 inline h-3 w-3" /> Comentário
                  </button>
                </div>
                <textarea
                  value={novaNota}
                  onChange={(e) => setNovaNota(e.target.value)}
                  rows={3}
                  maxLength={4000}
                  placeholder={tipoNota === 'nota' ? 'Ex.: liguei para o órgão e confirmaram a data...' : 'Ex.: @equipe, precisamos da certidão atualizada.'}
                  aria-label="Nova anotação"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <div className="mt-2 flex justify-end">
                  <Button type="button" size="sm" onClick={adicionarNota} disabled={!novaNota.trim()} icon={<Send className="h-3.5 w-3.5" />}>
                    Publicar
                  </Button>
                </div>
              </div>

              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Linha do tempo ({notasTimeline.length})
                </p>
                <div className="space-y-2">
                  {notasTimeline.map((n) => (
                    <div key={n.id} className="group flex items-start gap-2 rounded-xl border border-slate-200 p-2.5 dark:border-slate-700">
                      <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <div className="min-w-0 flex-1">
                        <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{n.texto}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">{formatDate(n.criado_em)}</p>
                      </div>
                      <button type="button" onClick={() => removerNota(n.id)} aria-label="Excluir anotação" className="text-slate-300 opacity-0 transition-opacity hover:text-rose-600 group-hover:opacity-100">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {notasTimeline.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400 dark:border-slate-700">Nenhuma nota na linha do tempo.</p>}
                </div>
              </div>

              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Comentários ({comentarios.length})
                </p>
                <div className="space-y-2">
                  {comentarios.map((n) => (
                    <div key={n.id} className="group flex items-start gap-2 rounded-xl bg-sky-50 p-2.5 dark:bg-sky-500/10">
                      <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
                      <div className="min-w-0 flex-1">
                        <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{n.texto}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">{formatDate(n.criado_em)}</p>
                      </div>
                      <button type="button" onClick={() => removerNota(n.id)} aria-label="Excluir comentário" className="text-slate-300 opacity-0 transition-opacity hover:text-rose-600 group-hover:opacity-100">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {comentarios.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400 dark:border-slate-700">Nenhum comentário.</p>}
                </div>
              </div>
            </>
          ) : aba === 'checklist' ? (
            <>
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    Progresso: {progresso.feitos}/{progresso.total}
                  </span>
                  <span className="font-bold text-primary">{progresso.pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progresso.pct}%` }} />
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  value={novoItem}
                  onChange={(e) => setNovoItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      adicionarItem()
                    }
                  }}
                  placeholder="Novo item do checklist"
                  aria-label="Novo item do checklist"
                  maxLength={300}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <Button type="button" size="sm" onClick={() => adicionarItem()} icon={<Plus className="h-4 w-4" />}>
                  Adicionar
                </Button>
              </div>

              <div className="space-y-1.5">
                {checklist.map((c) => (
                  <div key={c.id} className="group flex items-start gap-2 rounded-xl border border-slate-200 p-2.5 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => alternarCheck(c)}
                      role="checkbox"
                      aria-checked={c.feito}
                      aria-label={c.item}
                      className={cn(
                        'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                        c.feito ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600'
                      )}
                    >
                      {c.feito && <Check className="h-3 w-3" />}
                    </button>
                    <span className={cn('min-w-0 flex-1 text-sm', c.feito ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200')}>
                      {c.item}
                    </span>
                    <button type="button" onClick={() => removerCheck(c.id)} aria-label="Remover item" className="text-slate-300 opacity-0 transition-opacity hover:text-rose-600 group-hover:opacity-100">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {checklist.length === 0 && (
                  <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400 dark:border-slate-700">
                    Nenhum item. Adicione manualmente ou use o checklist sugerido.
                  </p>
                )}
              </div>

              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Checklist sugerido de habilitação</p>
                  <Button type="button" size="sm" variant="secondary" onClick={checklistPadrao} icon={<Plus className="h-3.5 w-3.5" />}>
                    Adicionar todos
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {CHECKLIST_SUGERIDO.filter((i) => !checklist.some((c) => c.item === i)).map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => adicionarItem(i)}
                      className="rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-[10px] text-slate-500 hover:border-primary hover:text-primary dark:border-slate-600 dark:text-slate-400"
                    >
                      + {i.length > 38 ? `${i.slice(0, 38)}...` : i}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cada mudança de coluna é registrada automaticamente, com data e hora.
              </p>
              <div className="space-y-2">
                {historico.map((h) => (
                  <div key={h.id} className="flex items-start gap-2 rounded-xl border border-slate-200 p-2.5 dark:border-slate-700">
                    <History className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1 text-sm text-slate-700 dark:text-slate-200">
                      <p>
                        <strong>{nomeColuna(h.de_coluna)}</strong>
                        <ChevronRight className="mx-1 inline h-3.5 w-3.5 text-slate-400" />
                        <strong>{nomeColuna(h.para_coluna)}</strong>
                      </p>
                      <p className="text-[10px] text-slate-400">{formatDate(h.criado_em)}</p>
                    </div>
                  </div>
                ))}
                {historico.length === 0 && (
                  <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400 dark:border-slate-700">
                    Nenhuma movimentação registrada ainda.
                  </p>
                )}
              </div>
            </>
          )}

          {erro && (
            <p className="flex items-start gap-1.5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {erro}
            </p>
          )}
          {aviso && !erro && (
            <p className="flex items-start gap-1.5 rounded-xl bg-emerald-50 p-2 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {aviso}
            </p>
          )}
        </div>

        {/* RODAPÉ --------------------------------------------------------- */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onFechar}>
            Fechar
          </Button>
          {aba === 'dados' && (
            <Button type="button" loading={salvando} onClick={salvar} icon={<Save className="h-4 w-4" />}>
              {editando ? 'Salvar cartão' : 'Criar cartão'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
