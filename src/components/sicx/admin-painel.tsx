'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle, CheckCircle2, Clock3, ExternalLink,
  FileText, Inbox, Landmark, Link2, Loader2, Mail, Pencil, Plus, RefreshCw,
  Scale, Save, Store, Trash2, XCircle,
} from 'lucide-react'
import type { SicxAlmoxarifado, SicxNorma, SicxStatus } from '@/lib/sicx/types'
import { apiSicx, jsonInit } from '@/lib/sicx/client'
import { dataBR } from '@/lib/sicx/calc'
import { cn } from '@/lib/utils'

type Aba =
  | 'almoxarifados'
  | 'normas'
  | 'status'
  | 'sugestoes'
  | 'relatos'
  | 'interessados'
  | 'verificacoes'

interface Sugestao {
  id: string
  user_id: string | null
  dados: Record<string, unknown>
  status: string
  created_at: string
}

interface Relato {
  id: string
  almoxarifado_id: string | null
  motivo: string
  created_at: string
}

interface Interessado {
  id: string
  email: string
  whatsapp: string | null
  origem: string | null
  created_at: string
  descadastrado_em: string | null
}

interface Verificacao {
  id: string
  entidade: string
  entidade_id: string
  url: string | null
  status_http: number | null
  ok: boolean
  created_at: string
}

interface Dados {
  status: SicxStatus[]
  normas: SicxNorma[]
  almoxarifados: SicxAlmoxarifado[]
  sugestoes: Sugestao[]
  reports: Relato[]
  interessados: Interessado[]
  verificacoes: Verificacao[]
}

const VAZIO: Dados = {
  status: [],
  normas: [],
  almoxarifados: [],
  sugestoes: [],
  reports: [],
  interessados: [],
  verificacoes: [],
}

const INPUT =
  'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary'

const ESFERAS = ['federal', 'estadual', 'municipal', 'autarquia', 'entidade']
const TIPOS_ALMOX = [
  'almoxarifado_virtual',
  'catalogo_eletronico',
  'marketplace_publico',
  'compras_expressas',
]
const SITUACOES = ['ativo', 'em_implantacao', 'a_verificar', 'em_revisao']
const TIPOS_NORMA = ['lei', 'decreto', 'norma', 'portal', 'leitura']
const STATUS_LINK = ['verificado', 'a_verificar', 'em_revisao']

interface FormAlmox {
  id: string
  nome: string
  orgao: string
  esfera: string
  uf: string
  tipo: string
  situacao: string
  descricao: string
  como_participar: string
  url_site: string
  url_norma: string
  url_edital: string
  status_link: string
  ordem: string
  ativo: boolean
}

const ALMOX_VAZIO: FormAlmox = {
  id: '', nome: '', orgao: '', esfera: 'estadual', uf: '', tipo: 'almoxarifado_virtual',
  situacao: 'a_verificar', descricao: '', como_participar: '', url_site: '', url_norma: '',
  url_edital: '', status_link: 'a_verificar', ordem: '0', ativo: true,
}

interface FormNorma {
  id: string
  titulo: string
  tipo: string
  orgao: string
  data_publicacao: string
  url: string
  status_link: string
  destaque: boolean
  ordem: string
  ativo: boolean
}

const NORMA_VAZIA: FormNorma = {
  id: '', titulo: '', tipo: 'norma', orgao: '', data_publicacao: '', url: '',
  status_link: 'a_verificar', destaque: false, ordem: '0', ativo: true,
}

interface FormStatus {
  id: string
  titulo: string
  descricao: string
  fonte_label: string
  fonte_url: string
  ativo: boolean
}

const STATUS_VAZIO: FormStatus = {
  id: '', titulo: '', descricao: '', fonte_label: '', fonte_url: '', ativo: true,
}

function mensagemDe(e: unknown, padrao: string): string {
  return e instanceof Error ? e.message : padrao
}

export default function AdminPainelSicx() {
  const [dados, setDados] = useState<Dados>(VAZIO)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [validando, setValidando] = useState(false)
  const [aba, setAba] = useState<Aba>('almoxarifados')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [formAlmox, setFormAlmox] = useState<FormAlmox>(ALMOX_VAZIO)
  const [formNorma, setFormNorma] = useState<FormNorma>(NORMA_VAZIA)
  const [formStatus, setFormStatus] = useState<FormStatus>(STATUS_VAZIO)
  const [editando, setEditando] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setErro('')
    try {
      const r = await apiSicx<Partial<Dados>>('/api/sicx/admin')
      setDados({
        status: r.status || [],
        normas: r.normas || [],
        almoxarifados: r.almoxarifados || [],
        sugestoes: r.sugestoes || [],
        reports: r.reports || [],
        interessados: r.interessados || [],
        verificacoes: r.verificacoes || [],
      })
    } catch (e) {
      setErro(mensagemDe(e, 'Não foi possível carregar o painel.'))
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => void carregar(), 0)
    return () => window.clearTimeout(id)
  }, [carregar])

  async function enviar(payload: Record<string, unknown>, sucesso: string) {
    setSalvando(true)
    setErro('')
    setAviso('')
    try {
      await apiSicx('/api/sicx/admin', jsonInit('POST', payload))
      setAviso(sucesso)
      await carregar()
      return true
    } catch (e) {
      setErro(mensagemDe(e, 'Não foi possível salvar.'))
      return false
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(tipo: string, id: string) {
    if (!window.confirm('Excluir este registro? Esta ação não pode ser desfeita.')) return
    setErro('')
    setAviso('')
    try {
      await apiSicx(`/api/sicx/admin?tipo=${tipo}&id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      setAviso('Registro excluído.')
      if (editando === id) setEditando(null)
      await carregar()
    } catch (e) {
      setErro(mensagemDe(e, 'Não foi possível excluir.'))
    }
  }

  async function validarLinks() {
    setValidando(true)
    setErro('')
    setAviso('')
    try {
      const r = await apiSicx<{ resumo: { verificados?: number; falhas?: number; emRevisao?: number } }>(
        '/api/sicx/admin',
        jsonInit('POST', { acao: 'validar_links' })
      )
      const s = r.resumo || {}
      setAviso(
        `Validação concluída: ${s.verificados ?? 0} link(s) OK, ${s.falhas ?? 0} falha(s), ${s.emRevisao ?? 0} em revisão.`
      )
      await carregar()
    } catch (e) {
      setErro(mensagemDe(e, 'Não foi possível validar os links agora.'))
    } finally {
      setValidando(false)
    }
  }

  function editarAlmox(a: SicxAlmoxarifado) {
    setAba('almoxarifados')
    setEditando(a.id)
    setFormAlmox({
      id: a.id,
      nome: a.nome,
      orgao: a.orgao || '',
      esfera: a.esfera || 'estadual',
      uf: a.uf || '',
      tipo: a.tipo || 'almoxarifado_virtual',
      situacao: a.situacao || 'a_verificar',
      descricao: a.descricao || '',
      como_participar: a.como_participar || '',
      url_site: a.url_site || '',
      url_norma: a.url_norma || '',
      url_edital: a.url_edital || '',
      status_link: a.status_link || 'a_verificar',
      ordem: String(a.ordem ?? 0),
      ativo: true,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function editarNorma(n: SicxNorma) {
    setAba('normas')
    setEditando(n.id)
    setFormNorma({
      id: n.id,
      titulo: n.titulo,
      tipo: n.tipo || 'norma',
      orgao: n.orgao || '',
      data_publicacao: n.data_publicacao || '',
      url: n.url || '',
      status_link: n.status_link || 'a_verificar',
      destaque: !!n.destaque,
      ordem: String(n.ordem ?? 0),
      ativo: true,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function editarStatus(s: SicxStatus) {
    setAba('status')
    setEditando(s.id)
    setFormStatus({
      id: s.id,
      titulo: s.titulo,
      descricao: s.descricao || '',
      fonte_label: s.fonte_label || '',
      fonte_url: s.fonte_url || '',
      ativo: true,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function promoverSugestao(s: Sugestao) {
    const d = s.dados || {}
    setAba('almoxarifados')
    setEditando(null)
    setFormAlmox({
      ...ALMOX_VAZIO,
      nome: String(d.nome || ''),
      orgao: String(d.orgao || ''),
      uf: String(d.uf || ''),
      esfera: String(d.esfera || 'estadual'),
      descricao: String(d.observacao || ''),
      url_site: String(d.url || ''),
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const totalAlmox = dados.almoxarifados.length
  const verificados = useMemo(
    () => dados.almoxarifados.filter((a) => a.status_link === 'verificado').length,
    [dados.almoxarifados]
  )
  const emRevisao = useMemo(
    () => dados.almoxarifados.filter((a) => a.situacao === 'em_revisao' || a.status_link === 'em_revisao').length,
    [dados.almoxarifados]
  )

  const ABAS: Array<{ id: Aba; label: string; icone: typeof Store; contagem: number }> = [
    { id: 'almoxarifados', label: 'Almoxarifados', icone: Store, contagem: dados.almoxarifados.length },
    { id: 'normas', label: 'Normas e leituras', icone: Scale, contagem: dados.normas.length },
    { id: 'status', label: 'Status do SICX', icone: Landmark, contagem: dados.status.length },
    { id: 'sugestoes', label: 'Sugestões', icone: Inbox, contagem: dados.sugestoes.filter((s) => s.status === 'pendente').length },
    { id: 'relatos', label: 'Relatos de link', icone: AlertTriangle, contagem: dados.reports.length },
    { id: 'interessados', label: 'Interessados', icone: Mail, contagem: dados.interessados.length },
    { id: 'verificacoes', label: 'Verificações', icone: Clock3, contagem: dados.verificacoes.length },
  ]

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4">
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
          Painel administrativo do diretório SICX
        </p>
        <p className="mt-1 text-xs text-amber-700/90 dark:text-amber-300/90">
          Só exiba como “verificado” um link que responda HTTP 200–399. A validação automática roda semanalmente
          e coloca em revisão o registro que falhar duas vezes seguidas. Este painel é restrito a administradores.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Almoxarifados', valor: String(totalAlmox), icone: Store },
          { label: 'Links verificados', valor: String(verificados), icone: CheckCircle2 },
          { label: 'Em revisão', valor: String(emRevisao), icone: AlertTriangle },
          { label: 'Sugestões pendentes', valor: String(dados.sugestoes.filter((s) => s.status === 'pendente').length), icone: Inbox },
        ].map((s) => {
          const Icone = s.icone
          return (
            <div key={s.label} className="card p-4 dark:bg-slate-900 dark:border-slate-800">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Icone className="w-3.5 h-3.5" /> {s.label}
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{s.valor}</p>
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={validarLinks}
          disabled={validando}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
        >
          {validando ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Validar links agora
        </button>
        <button
          type="button"
          onClick={() => void carregar()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <RefreshCw className="w-4 h-4" /> Recarregar
        </button>
        <Link
          href="/credenciamento-sicx"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          Ver página pública <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {aviso && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
          {aviso}
        </div>
      )}
      {erro && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300">
          {erro}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Seções da administração">
        {ABAS.map((a) => {
          const Icone = a.icone
          const ativo = aba === a.id
          return (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={ativo}
              onClick={() => { setAba(a.id); setEditando(null) }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors',
                ativo
                  ? 'border-primary bg-primary text-white'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary'
              )}
            >
              <Icone className="w-3.5 h-3.5" /> {a.label}
              {a.contagem > 0 && (
                <span className={cn('rounded-full px-1.5 py-0.5 text-[10px]', ativo ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800')}>
                  {a.contagem}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {carregando ? (
        <div className="card p-10 flex items-center justify-center dark:bg-slate-900 dark:border-slate-800">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="ml-2 text-sm text-slate-500">Carregando...</span>
        </div>
      ) : (
        <>
          {aba === 'almoxarifados' && (
            <div className="space-y-4">
              <div className="card p-5 dark:bg-slate-900 dark:border-slate-800">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-1.5">
                  {editando ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
                  {editando ? 'Editar almoxarifado' : 'Novo almoxarifado'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input className={INPUT} placeholder="Nome *" value={formAlmox.nome} onChange={(e) => setFormAlmox((f) => ({ ...f, nome: e.target.value }))} />
                  <input className={INPUT} placeholder="Órgão responsável" value={formAlmox.orgao} onChange={(e) => setFormAlmox((f) => ({ ...f, orgao: e.target.value }))} />
                  <select className={INPUT} value={formAlmox.esfera} onChange={(e) => setFormAlmox((f) => ({ ...f, esfera: e.target.value }))} aria-label="Esfera">
                    {ESFERAS.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <input className={INPUT} placeholder="UF (ex.: SP)" maxLength={2} value={formAlmox.uf} onChange={(e) => setFormAlmox((f) => ({ ...f, uf: e.target.value.toUpperCase() }))} />
                  <select className={INPUT} value={formAlmox.tipo} onChange={(e) => setFormAlmox((f) => ({ ...f, tipo: e.target.value }))} aria-label="Tipo">
                    {TIPOS_ALMOX.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <select className={INPUT} value={formAlmox.situacao} onChange={(e) => setFormAlmox((f) => ({ ...f, situacao: e.target.value }))} aria-label="Situação">
                    {SITUACOES.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <textarea className={`${INPUT} md:col-span-2`} rows={2} placeholder="Descrição" value={formAlmox.descricao} onChange={(e) => setFormAlmox((f) => ({ ...f, descricao: e.target.value }))} />
                  <textarea className={`${INPUT} md:col-span-2`} rows={2} placeholder="Como participar" value={formAlmox.como_participar} onChange={(e) => setFormAlmox((f) => ({ ...f, como_participar: e.target.value }))} />
                  <input className={INPUT} placeholder="Site oficial (https://...)" value={formAlmox.url_site} onChange={(e) => setFormAlmox((f) => ({ ...f, url_site: e.target.value }))} />
                  <input className={INPUT} placeholder="Norma (https://...)" value={formAlmox.url_norma} onChange={(e) => setFormAlmox((f) => ({ ...f, url_norma: e.target.value }))} />
                  <input className={INPUT} placeholder="Edital (https://...)" value={formAlmox.url_edital} onChange={(e) => setFormAlmox((f) => ({ ...f, url_edital: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-2">
                    <select className={INPUT} value={formAlmox.status_link} onChange={(e) => setFormAlmox((f) => ({ ...f, status_link: e.target.value }))} aria-label="Status do link">
                      {STATUS_LINK.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <input className={INPUT} type="number" placeholder="Ordem" value={formAlmox.ordem} onChange={(e) => setFormAlmox((f) => ({ ...f, ordem: e.target.value }))} />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <input type="checkbox" checked={formAlmox.ativo} onChange={(e) => setFormAlmox((f) => ({ ...f, ativo: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-primary" />
                    Visível na página pública
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={salvando}
                    onClick={async () => {
                      const ok = await enviar(
                        {
                          acao: 'salvar_almoxarifado',
                          ...(formAlmox.id ? { id: formAlmox.id } : {}),
                          ...formAlmox,
                          ordem: Number(formAlmox.ordem) || 0,
                        },
                        formAlmox.id ? 'Almoxarifado atualizado.' : 'Almoxarifado criado.'
                      )
                      if (ok) { setFormAlmox(ALMOX_VAZIO); setEditando(null) }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
                  >
                    {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFormAlmox(ALMOX_VAZIO); setEditando(null) }}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Limpar
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {dados.almoxarifados.map((a) => (
                  <div key={a.id} className="card p-4 dark:bg-slate-900 dark:border-slate-800">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{a.nome}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {a.orgao || '—'} · {a.esfera}{a.uf ? `/${a.uf}` : ''} · {a.tipo} · {a.situacao}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          Link: {a.status_link}{a.verificado_em ? ` · verificado em ${dataBR(a.verificado_em)}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => editarAlmox(a)} className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-slate-500 hover:text-primary" aria-label={`Editar ${a.nome}`}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => excluir('almoxarifado', a.id)} className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-slate-500 hover:text-rose-500" aria-label={`Excluir ${a.nome}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {dados.almoxarifados.length === 0 && <p className="text-sm text-slate-400">Nenhum almoxarifado cadastrado.</p>}
              </div>
            </div>
          )}

          {aba === 'normas' && (
            <div className="space-y-4">
              <div className="card p-5 dark:bg-slate-900 dark:border-slate-800">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-1.5">
                  {editando ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
                  {editando ? 'Editar norma' : 'Nova norma/leitura'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input className={`${INPUT} md:col-span-2`} placeholder="Título *" value={formNorma.titulo} onChange={(e) => setFormNorma((f) => ({ ...f, titulo: e.target.value }))} />
                  <select className={INPUT} value={formNorma.tipo} onChange={(e) => setFormNorma((f) => ({ ...f, tipo: e.target.value }))} aria-label="Tipo">
                    {TIPOS_NORMA.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <input className={INPUT} placeholder="Órgão" value={formNorma.orgao} onChange={(e) => setFormNorma((f) => ({ ...f, orgao: e.target.value }))} />
                  <input className={INPUT} type="date" value={formNorma.data_publicacao} onChange={(e) => setFormNorma((f) => ({ ...f, data_publicacao: e.target.value }))} aria-label="Data de publicação" />
                  <input className={INPUT} placeholder="URL (https://...)" value={formNorma.url} onChange={(e) => setFormNorma((f) => ({ ...f, url: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-2">
                    <select className={INPUT} value={formNorma.status_link} onChange={(e) => setFormNorma((f) => ({ ...f, status_link: e.target.value }))} aria-label="Status do link">
                      {STATUS_LINK.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <input className={INPUT} type="number" placeholder="Ordem" value={formNorma.ordem} onChange={(e) => setFormNorma((f) => ({ ...f, ordem: e.target.value }))} />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <input type="checkbox" checked={formNorma.destaque} onChange={(e) => setFormNorma((f) => ({ ...f, destaque: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-primary" />
                      Destaque
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <input type="checkbox" checked={formNorma.ativo} onChange={(e) => setFormNorma((f) => ({ ...f, ativo: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-primary" />
                      Ativa
                    </label>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={salvando}
                    onClick={async () => {
                      const ok = await enviar(
                        {
                          acao: 'salvar_norma',
                          ...(formNorma.id ? { id: formNorma.id } : {}),
                          ...formNorma,
                          ordem: Number(formNorma.ordem) || 0,
                        },
                        formNorma.id ? 'Norma atualizada.' : 'Norma criada.'
                      )
                      if (ok) { setFormNorma(NORMA_VAZIA); setEditando(null) }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
                  >
                    {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
                  </button>
                  <button type="button" onClick={() => { setFormNorma(NORMA_VAZIA); setEditando(null) }} className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Limpar
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {dados.normas.map((n) => (
                  <div key={n.id} className="card p-4 dark:bg-slate-900 dark:border-slate-800">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{n.titulo}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {n.tipo} · {n.orgao || '—'}{n.data_publicacao ? ` · ${dataBR(n.data_publicacao)}` : ''} · {n.status_link}
                        </p>
                        {n.url && (
                          <a href={n.url} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">
                            <Link2 className="w-3 h-3" /> {n.url}
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => editarNorma(n)} className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-slate-500 hover:text-primary" aria-label={`Editar ${n.titulo}`}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => excluir('norma', n.id)} className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-slate-500 hover:text-rose-500" aria-label={`Excluir ${n.titulo}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {dados.normas.length === 0 && <p className="text-sm text-slate-400">Nenhuma norma cadastrada.</p>}
              </div>
            </div>
          )}

          {aba === 'status' && (
            <div className="space-y-4">
              <div className="card p-5 dark:bg-slate-900 dark:border-slate-800">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-1.5">
                  {editando ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
                  {editando ? 'Editar status' : 'Novo status'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input className={`${INPUT} md:col-span-2`} placeholder="Título *" value={formStatus.titulo} onChange={(e) => setFormStatus((f) => ({ ...f, titulo: e.target.value }))} />
                  <textarea className={`${INPUT} md:col-span-2`} rows={3} placeholder="Descrição" value={formStatus.descricao} onChange={(e) => setFormStatus((f) => ({ ...f, descricao: e.target.value }))} />
                  <input className={INPUT} placeholder="Rótulo da fonte" value={formStatus.fonte_label} onChange={(e) => setFormStatus((f) => ({ ...f, fonte_label: e.target.value }))} />
                  <input className={INPUT} placeholder="URL da fonte (https://...)" value={formStatus.fonte_url} onChange={(e) => setFormStatus((f) => ({ ...f, fonte_url: e.target.value }))} />
                  <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <input type="checkbox" checked={formStatus.ativo} onChange={(e) => setFormStatus((f) => ({ ...f, ativo: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-primary" />
                    Visível na página pública
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={salvando}
                    onClick={async () => {
                      const ok = await enviar(
                        { acao: 'salvar_status', ...(formStatus.id ? { id: formStatus.id } : {}), ...formStatus },
                        formStatus.id ? 'Status atualizado.' : 'Status criado.'
                      )
                      if (ok) { setFormStatus(STATUS_VAZIO); setEditando(null) }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
                  >
                    {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
                  </button>
                  <button type="button" onClick={() => { setFormStatus(STATUS_VAZIO); setEditando(null) }} className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Limpar
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {dados.status.map((s) => (
                  <div key={s.id} className="card p-4 dark:bg-slate-900 dark:border-slate-800">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{s.titulo}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{s.descricao}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">Atualizado em {dataBR(s.atualizado_em)}</p>
                      </div>
                      <button type="button" onClick={() => editarStatus(s)} className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-slate-500 hover:text-primary" aria-label={`Editar ${s.titulo}`}>
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {aba === 'sugestoes' && (
            <div className="space-y-2">
              {dados.sugestoes.map((s) => (
                <div key={s.id} className="card p-4 dark:bg-slate-900 dark:border-slate-800">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{String(s.dados?.nome || 'Sem nome')}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {String(s.dados?.orgao || '—')} · {String(s.dados?.uf || '—')} · {String(s.dados?.esfera || '—')} · {s.status}
                      </p>
                      {!!s.dados?.url && (
                        <a href={String(s.dados.url)} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary hover:underline">{String(s.dados.url)}</a>
                      )}
                      {!!s.dados?.observacao && <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{String(s.dados.observacao)}</p>}
                      <p className="mt-1 text-[10px] text-slate-400">Recebida em {new Date(s.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => promoverSugestao(s)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary">
                        <Plus className="w-3 h-3" /> Usar no cadastro
                      </button>
                      <button type="button" onClick={() => excluir('sugestao', s.id)} className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-slate-500 hover:text-rose-500" aria-label="Excluir sugestão">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {dados.sugestoes.length === 0 && <p className="text-sm text-slate-400">Nenhuma sugestão recebida.</p>}
            </div>
          )}

          {aba === 'relatos' && (
            <div className="space-y-2">
              {dados.reports.map((r) => (
                <div key={r.id} className="card p-4 dark:bg-slate-900 dark:border-slate-800">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm text-slate-700 dark:text-slate-200">{r.motivo}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        Almoxarifado: {r.almoxarifado_id || 'não informado'} · {new Date(r.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {r.almoxarifado_id && (
                        <button
                          type="button"
                          onClick={() => {
                            const a = dados.almoxarifados.find((x) => x.id === r.almoxarifado_id)
                            if (a) editarAlmox(a)
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary"
                        >
                          <Pencil className="w-3 h-3" /> Revisar link
                        </button>
                      )}
                      <button type="button" onClick={() => excluir('report', r.id)} className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-slate-500 hover:text-rose-500" aria-label="Excluir relato">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {dados.reports.length === 0 && <p className="text-sm text-slate-400">Nenhum relato de link recebido.</p>}
            </div>
          )}

          {aba === 'interessados' && (
            <div className="card p-4 dark:bg-slate-900 dark:border-slate-800 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400">
                    <th className="py-1.5 pr-3">E-mail</th>
                    <th className="py-1.5 pr-3">WhatsApp</th>
                    <th className="py-1.5 pr-3">Origem</th>
                    <th className="py-1.5 pr-3">Entrada</th>
                    <th className="py-1.5">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.interessados.map((i) => (
                    <tr key={i.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-1.5 pr-3 text-slate-700 dark:text-slate-200">{i.email}</td>
                      <td className="py-1.5 pr-3 text-slate-500 dark:text-slate-400">{i.whatsapp || '—'}</td>
                      <td className="py-1.5 pr-3 text-slate-500 dark:text-slate-400">{i.origem || '—'}</td>
                      <td className="py-1.5 pr-3 text-slate-500 dark:text-slate-400">{new Date(i.created_at).toLocaleDateString('pt-BR')}</td>
                      <td className="py-1.5 text-slate-500 dark:text-slate-400">{i.descadastrado_em ? 'Descadastrado' : 'Ativo'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {dados.interessados.length === 0 && <p className="py-2 text-sm text-slate-400">Nenhum interessado cadastrado.</p>}
            </div>
          )}

          {aba === 'verificacoes' && (
            <div className="card p-4 dark:bg-slate-900 dark:border-slate-800 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400">
                    <th className="py-1.5 pr-3">Data</th>
                    <th className="py-1.5 pr-3">Entidade</th>
                    <th className="py-1.5 pr-3">URL</th>
                    <th className="py-1.5 pr-3">HTTP</th>
                    <th className="py-1.5">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.verificacoes.map((v) => (
                    <tr key={v.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-1.5 pr-3 text-slate-500 dark:text-slate-400">{new Date(v.created_at).toLocaleString('pt-BR')}</td>
                      <td className="py-1.5 pr-3 text-slate-500 dark:text-slate-400">{v.entidade}</td>
                      <td className="max-w-[280px] truncate py-1.5 pr-3 text-slate-500 dark:text-slate-400" title={v.url || ''}>{v.url || '—'}</td>
                      <td className="py-1.5 pr-3 text-slate-500 dark:text-slate-400">{v.status_http ?? '—'}</td>
                      <td className="py-1.5">
                        {v.ok ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="w-3 h-3" /> OK</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400"><XCircle className="w-3 h-3" /> Falha</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {dados.verificacoes.length === 0 && <p className="py-2 text-sm text-slate-400">Nenhuma verificação registrada ainda.</p>}
            </div>
          )}
        </>
      )}

      <p className="flex items-start gap-1.5 text-[11px] text-slate-400">
        <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        Toda alteração é gravada nas tabelas do SICX com RLS. O log de verificações guarda status HTTP e data,
        servindo de auditoria do que está publicado como “verificado”.
      </p>
    </div>
  )
}
