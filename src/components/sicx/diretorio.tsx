'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle, ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight,
  Copy, Download, ExternalLink, FileText, Filter, Heart, List,
  MapPin, Plus, Scale, Search, Share2, ShieldCheck, Table2, X,
} from 'lucide-react'
import type { SicxAlmoxarifado } from '@/lib/sicx/types'
import { UFS } from '@/lib/sicx/ufs'
import type { EstatisticasDiretorio } from '@/lib/sicx/calc'
import { dataBR, paraCSV } from '@/lib/sicx/calc'
import { apiSicxPublico } from '@/lib/sicx/client'
import { cn } from '@/lib/utils'

const ESFERA_LABEL: Record<string, string> = {
  federal: 'Federal',
  estadual: 'Estadual',
  municipal: 'Municipal',
  autarquia: 'Autarquia',
  entidade: 'Entidade',
}

const TIPO_LABEL: Record<string, string> = {
  almoxarifado_virtual: 'Almoxarifado virtual',
  catalogo_eletronico: 'Catálogo eletrônico',
  marketplace_publico: 'Marketplace público',
  compras_expressas: 'Compras expressas',
}

const SITUACAO_LABEL: Record<string, { label: string; classe: string }> = {
  ativo: { label: 'Ativo', classe: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  em_implantacao: { label: 'Em implantação', classe: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  a_verificar: { label: 'A verificar', classe: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  em_revisao: { label: 'Em revisão', classe: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' },
}

const INPUT =
  'w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary'

const FAV_KEY = 'sicx-favoritos'

export interface Filtros {
  busca: string
  ufs: string[]
  esfera: string
  tipo: string
  situacao: string
  ordenar: string
  soNovos: boolean
}

interface Ordenacao {
  coluna: string
  dir: 'asc' | 'desc'
}

function lerFavoritos(): string[] {
  try {
    const raw = localStorage.getItem(FAV_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.map(String) : []
  } catch {
    return []
  }
}

function gravarFavoritos(ids: string[]) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(ids))
  } catch {
    // armazenamento bloqueado
  }
}

/** Monta a query string dos filtros ativos (para URL compartilhável). */
function queryDeFiltros(f: Filtros): string {
  const p = new URLSearchParams()
  if (f.busca) p.set('q', f.busca)
  if (f.ufs.length) p.set('uf', f.ufs.join(','))
  if (f.esfera) p.set('esfera', f.esfera)
  if (f.tipo) p.set('tipo', f.tipo)
  if (f.situacao) p.set('situacao', f.situacao)
  if (f.ordenar && f.ordenar !== 'recentes') p.set('ordenar', f.ordenar)
  if (f.soNovos) p.set('novos', '1')
  const s = p.toString()
  return s ? `?${s}` : ''
}

export default function Diretorio({
  almoxarifados,
  stats,
  inicial,
}: {
  almoxarifados: SicxAlmoxarifado[]
  stats: EstatisticasDiretorio
  inicial: Filtros
}) {
  const [filtros, setFiltros] = useState<Filtros>(inicial)
  const [buscaInput, setBuscaInput] = useState(inicial.busca)
  const [modo, setModo] = useState<'tabela' | 'cards'>('tabela')
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(50)
  const [ordenacao, setOrdenacao] = useState<Ordenacao>({ coluna: 'nome', dir: 'asc' })
  const [selecionado, setSelecionado] = useState<SicxAlmoxarifado | null>(null)
  const [favoritos, setFavoritos] = useState<string[]>([])
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [sugerindo, setSugerindo] = useState(false)
  const [reportando, setReportando] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [sugestao, setSugestao] = useState({ nome: '', orgao: '', uf: '', esfera: 'estadual', url: '', observacao: '' })
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Modo padrão: cards no mobile, tabela no desktop.
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (window.innerWidth < 768) setModo('cards')
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

  // Favoritos via localStorage.
  useEffect(() => {
    const id = window.setTimeout(() => setFavoritos(lerFavoritos()), 0)
    return () => window.clearTimeout(id)
  }, [])

  // Debounce da busca.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setFiltros((f) => (f.busca === buscaInput ? f : { ...f, busca: buscaInput }))
      setPagina(1)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [buscaInput])

  // Sincroniza filtros na URL (compartilhável), sem reload.
  useEffect(() => {
    const id = window.setTimeout(() => {
      const url = `${window.location.pathname}${queryDeFiltros(filtros)}`
      window.history.replaceState(null, '', url)
    }, 150)
    return () => window.clearTimeout(id)
  }, [filtros])

  const hoje7 = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const filtrados = useMemo(() => {
    const termo = filtros.busca.trim().toLowerCase()
    const ufSet = new Set(filtros.ufs)
    return almoxarifados.filter((a) => {
      if (filtros.soNovos) {
        const criado = a.criado_em ? new Date(a.criado_em) : null
        if (!criado || Number.isNaN(criado.getTime()) || criado < hoje7) return false
      }
      if (ufSet.size && !ufSet.has(a.uf || '')) return false
      if (filtros.esfera && a.esfera !== filtros.esfera) return false
      if (filtros.tipo && a.tipo !== filtros.tipo) return false
      if (filtros.situacao && a.situacao !== filtros.situacao) return false
      if (!termo) return true
      return `${a.nome} ${a.orgao || ''} ${a.descricao || ''} ${a.uf || ''} ${a.tipo || ''}`
        .toLowerCase()
        .includes(termo)
    })
  }, [almoxarifados, filtros, hoje7])

  const ordenados = useMemo(() => {
    const lista = [...filtrados]
    const { coluna, dir } = ordenacao
    const sinal = dir === 'asc' ? 1 : -1
    lista.sort((a, b) => {
      switch (coluna) {
        case 'uf':
          return sinal * (a.uf || '').localeCompare(b.uf || '')
        case 'orgao':
          return sinal * (a.orgao || '').localeCompare(b.orgao || '')
        case 'esfera':
          return sinal * (a.esfera || '').localeCompare(b.esfera || '')
        case 'tipo':
          return sinal * (a.tipo || '').localeCompare(b.tipo || '')
        case 'situacao':
          return sinal * (a.situacao || '').localeCompare(b.situacao || '')
        case 'recentes':
          return (b.criado_em || '').localeCompare(a.criado_em || '')
        case 'nome':
        default:
          return sinal * a.nome.localeCompare(b.nome)
      }
    })
    // O dropdown "ordenar" também refina a ordenação base.
    return lista
  }, [filtrados, ordenacao])

  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / porPagina))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const inicio = (paginaAtual - 1) * porPagina
  const visiveis = ordenados.slice(inicio, inicio + porPagina)

  const filtrar = (patch: Partial<Filtros>) => {
    setFiltros((f) => ({ ...f, ...patch }))
    setPagina(1)
  }

  function alternarUf(sigla: string) {
    setFiltros((f) => {
      const tem = f.ufs.includes(sigla)
      return { ...f, ufs: tem ? f.ufs.filter((u) => u !== sigla) : [...f.ufs, sigla] }
    })
    setPagina(1)
  }

  const filtrosAtivos =
    filtros.ufs.length +
    (filtros.esfera ? 1 : 0) +
    (filtros.tipo ? 1 : 0) +
    (filtros.situacao ? 1 : 0) +
    (filtros.soNovos ? 1 : 0) +
    (filtros.busca ? 1 : 0)

  function limpar() {
    setFiltros({ busca: '', ufs: [], esfera: '', tipo: '', situacao: '', ordenar: 'recentes', soNovos: false })
    setBuscaInput('')
    setPagina(1)
  }

  function toggleOrdenar(coluna: string) {
    setOrdenacao((o) => (o.coluna === coluna ? { coluna, dir: o.dir === 'asc' ? 'desc' : 'asc' } : { coluna, dir: 'asc' }))
  }

  function setarOrdenacao(chave: string) {
    if (chave === 'recentes') setOrdenacao({ coluna: 'recentes', dir: 'desc' })
    else if (chave === 'uf') setOrdenacao({ coluna: 'uf', dir: 'asc' })
    else setOrdenacao({ coluna: 'nome', dir: 'asc' })
  }

  function favoritar(id: string) {
    setFavoritos((atual) => {
      const novo = atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]
      gravarFavoritos(novo)
      return novo
    })
  }

  async function copiarLink(texto: string) {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      window.setTimeout(() => setCopiado(false), 1500)
    } catch {
      setErro('Não foi possível copiar automaticamente.')
    }
  }

  async function compartilhar() {
    const url = `${window.location.origin}${window.location.pathname}${queryDeFiltros(filtros)}`
    const alvo = `https://wa.me/?text=${encodeURIComponent(`Credenciamento SICX — ${url}`)}`
    window.open(alvo, '_blank', 'noopener')
  }

  function exportar(formato: 'csv' | 'xlsx') {
    const linhas = filtrados.map((a) => ({
      Nome: a.nome,
      'Órgão': a.orgao || '',
      Esfera: ESFERA_LABEL[a.esfera] || a.esfera,
      UF: a.uf || '',
      Tipo: TIPO_LABEL[a.tipo] || a.tipo,
      Situação: SITUACAO_LABEL[a.situacao]?.label || a.situacao,
      'Site oficial': a.status_link === 'verificado' ? a.url_site || '' : 'a verificar',
      Norma: a.status_link === 'verificado' ? a.url_norma || '' : 'a verificar',
      Edital: a.status_link === 'verificado' ? a.url_edital || '' : 'a verificar',
      'Verificado em': a.verificado_em ? dataBR(a.verificado_em) : '',
    }))

    if (formato === 'csv') {
      const csv = paraCSV(
        ['Nome', 'Órgão', 'Esfera', 'UF', 'Tipo', 'Situação', 'Site oficial', 'Norma', 'Edital', 'Verificado em'],
        filtrados.map((a) => [
          a.nome, a.orgao || '', ESFERA_LABEL[a.esfera] || a.esfera, a.uf || '',
          TIPO_LABEL[a.tipo] || a.tipo, SITUACAO_LABEL[a.situacao]?.label || a.situacao,
          a.status_link === 'verificado' ? a.url_site || '' : 'a verificar',
          a.status_link === 'verificado' ? a.url_norma || '' : 'a verificar',
          a.status_link === 'verificado' ? a.url_edital || '' : 'a verificar',
          a.verificado_em ? dataBR(a.verificado_em) : '',
        ])
      )
      const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const el = document.createElement('a')
      el.href = url
      el.download = 'almoxarifados-sicx.csv'
      el.click()
      URL.revokeObjectURL(url)
    } else {
      void import('xlsx').then((XLSX) => {
        const ws = XLSX.utils.json_to_sheet(linhas.length ? linhas : [{ Nome: 'Nenhum resultado' }])
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'SICX')
        XLSX.writeFile(wb, 'almoxarifados-sicx.xlsx')
      })
    }
  }

  async function enviarReport() {
    if (!reportando || !motivo.trim()) return
    setErro('')
    try {
      await apiSicxPublico('/api/sicx/reportar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ almoxarifado_id: reportando, motivo }),
      })
      setMensagem('Relato enviado. Obrigado — nossa equipe vai revisar o link.')
      setReportando(null)
      setMotivo('')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar o relato.')
    }
  }

  async function enviarSugestao() {
    setErro('')
    if (!sugestao.nome.trim()) {
      setErro('Informe o nome do almoxarifado ou catálogo.')
      return
    }
    try {
      await apiSicxPublico('/api/sicx/sugestoes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(sugestao),
      })
      setMensagem('Sugestão recebida. Obrigado pela contribuição!')
      setSugerindo(false)
      setSugestao({ nome: '', orgao: '', uf: '', esfera: 'estadual', url: '', observacao: '' })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar a sugestão.')
    }
  }

  const colunas = [
    { chave: 'nome', label: 'Nome', ordena: true },
    { chave: 'orgao', label: 'Órgão', ordena: true },
    { chave: 'uf', label: 'UF', ordena: true },
    { chave: 'esfera', label: 'Esfera', ordena: true },
    { chave: 'tipo', label: 'Tipo', ordena: true },
    { chave: 'situacao', label: 'Situação', ordena: true },
    { chave: 'acoes', label: 'Ações', ordena: false },
  ]

  return (
    <div id="diretorio" className="space-y-3">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Almoxarifados e catálogos" valor={stats.total} onClick={() => { limpar(); setPagina(1) }} />
        <Kpi label="UFs com registros" valor={stats.ufsComRegistros} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
        <Kpi label="Novos nos últimos 7 dias" valor={stats.novos7dias} onClick={() => filtrar({ soNovos: !filtros.soNovos })} ativo={filtros.soNovos} />
        <Kpi label="UFs cobertas (total)" valor={UFS.length} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
      </div>

      {/* Barra de filtros (sticky) */}
      <div className="sticky top-0 z-20 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0b1120]/95 backdrop-blur p-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              value={buscaInput}
              onChange={(e) => setBuscaInput(e.target.value)}
              placeholder="Buscar nome, órgão, UF ou tipo..."
              className={`${INPUT} pl-9`}
              aria-label="Buscar almoxarifado"
            />
          </div>

          <select className={`${INPUT} w-auto`} value={filtros.esfera} onChange={(e) => filtrar({ esfera: e.target.value })} aria-label="Esfera">
            <option value="">Todas as esferas</option>
            {Object.entries(ESFERA_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          <select className={`${INPUT} w-auto`} value={filtros.tipo} onChange={(e) => filtrar({ tipo: e.target.value })} aria-label="Tipo">
            <option value="">Todos os tipos</option>
            {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          <select className={`${INPUT} w-auto`} value={filtros.situacao} onChange={(e) => filtrar({ situacao: e.target.value })} aria-label="Situação">
            <option value="">Todas as situações</option>
            {Object.entries(SITUACAO_LABEL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>

          <select className={`${INPUT} w-auto`} value={filtros.ordenar} onChange={(e) => { filtrar({ ordenar: e.target.value }); setarOrdenacao(e.target.value) }} aria-label="Ordenar">
            <option value="recentes">Mais recentes</option>
            <option value="az">Nome A–Z</option>
            <option value="uf">UF</option>
          </select>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setModo(modo === 'tabela' ? 'cards' : 'tabela')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              aria-label={modo === 'tabela' ? 'Ver em cards' : 'Ver em tabela'}
              title={modo === 'tabela' ? 'Ver em cards' : 'Ver em tabela'}
            >
              {modo === 'tabela' ? <List className="w-3.5 h-3.5" /> : <Table2 className="w-3.5 h-3.5" />}
            </button>
            <button type="button" onClick={() => exportar('csv')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800" title="Exportar CSV">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button type="button" onClick={() => exportar('xlsx')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800" title="Exportar Excel">
              <Download className="w-3.5 h-3.5" /> XLSX
            </button>
            <button type="button" onClick={compartilhar} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800" title="Compartilhar busca">
              <Share2 className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => setSugerindo((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800" title="Sugerir almoxarifado">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Chips dos filtros ativos */}
        {filtrosAtivos > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {filtros.busca && (
              <Chip onRemove={() => { setBuscaInput(''); filtrar({ busca: '' }) }}>Busca: {filtros.busca}</Chip>
            )}
            {filtros.ufs.map((u) => (
              <Chip key={u} onRemove={() => alternarUf(u)}>UF: {u}</Chip>
            ))}
            {filtros.esfera && <Chip onRemove={() => filtrar({ esfera: '' })}>{ESFERA_LABEL[filtros.esfera]}</Chip>}
            {filtros.tipo && <Chip onRemove={() => filtrar({ tipo: '' })}>{TIPO_LABEL[filtros.tipo]}</Chip>}
            {filtros.situacao && <Chip onRemove={() => filtrar({ situacao: '' })}>{SITUACAO_LABEL[filtros.situacao]?.label}</Chip>}
            {filtros.soNovos && <Chip onRemove={() => filtrar({ soNovos: false })}>Novos (7 dias)</Chip>}
            <button type="button" onClick={limpar} className="text-xs font-semibold text-primary hover:underline ml-1">
              Limpar tudo
            </button>
          </div>
        )}
      </div>

      {/* Grade de UFs (mapa) */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">UFs</h3>
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-slate-200 dark:bg-slate-700" /> 0
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-300 dark:bg-emerald-700" /> 1+
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-600" /> 3+
          </div>
        </div>
        <div className="grid grid-cols-9 gap-1.5">
          {UFS.map((uf) => {
            const qtd = stats.contagemPorUf[uf.sigla] || 0
            const ativo = filtros.ufs.includes(uf.sigla)
            return (
              <button
                key={uf.sigla}
                type="button"
                onClick={() => alternarUf(uf.sigla)}
                title={`${uf.nome}: ${qtd} registro(s)`}
                aria-pressed={ativo}
                aria-label={`${uf.nome}, ${qtd} registros`}
                className={cn(
                  'flex flex-col items-center rounded-lg border px-1 py-1.5 text-center transition-colors',
                  ativo ? 'border-primary ring-2 ring-primary/30' : 'border-slate-200 dark:border-slate-700 hover:border-primary/50',
                  qtd === 0 ? 'bg-slate-50 dark:bg-slate-800/40' : qtd >= 3 ? 'bg-emerald-600 text-white' : 'bg-emerald-200 dark:bg-emerald-800/60 text-emerald-900 dark:text-emerald-100'
                )}
              >
                <span className={cn('text-[11px] font-bold leading-none', qtd >= 3 ? 'text-white' : 'text-slate-800 dark:text-slate-100')}>{uf.sigla}</span>
                <span className={cn('text-[9px]', qtd >= 3 ? 'text-white/80' : 'text-slate-500 dark:text-slate-400')}>{qtd}</span>
              </button>
            )
          })}
        </div>
      </div>

      {mensagem && (
        <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
          {mensagem}
        </div>
      )}
      {erro && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300">
          {erro}
        </div>
      )}

      {sugerindo && (
        <div className="card p-4 dark:bg-slate-900 dark:border-slate-800">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Sugerir almoxarifado ou catálogo</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input className={INPUT} placeholder="Nome *" value={sugestao.nome} onChange={(e) => setSugestao((s) => ({ ...s, nome: e.target.value }))} />
            <input className={INPUT} placeholder="Órgão responsável" value={sugestao.orgao} onChange={(e) => setSugestao((s) => ({ ...s, orgao: e.target.value }))} />
            <input className={INPUT} placeholder="UF (ex.: SP)" maxLength={2} value={sugestao.uf} onChange={(e) => setSugestao((s) => ({ ...s, uf: e.target.value.toUpperCase() }))} />
            <select className={INPUT} value={sugestao.esfera} onChange={(e) => setSugestao((s) => ({ ...s, esfera: e.target.value }))}>
              {Object.entries(ESFERA_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input className={`${INPUT} md:col-span-2`} placeholder="Site oficial (https://...)" value={sugestao.url} onChange={(e) => setSugestao((s) => ({ ...s, url: e.target.value }))} />
            <textarea className={`${INPUT} md:col-span-2`} rows={2} placeholder="Observações" value={sugestao.observacao} onChange={(e) => setSugestao((s) => ({ ...s, observacao: e.target.value }))} />
          </div>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={enviarSugestao} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">Enviar sugestão</button>
            <button type="button" onClick={() => setSugerindo(false)} className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Cancelar</button>
          </div>
        </div>
      )}

      {/* Contagem */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>
          Exibindo {ordenados.length === 0 ? 0 : inicio + 1}–{Math.min(inicio + porPagina, ordenados.length)} de {ordenados.length} resultado(s)
        </span>
        <label className="flex items-center gap-1.5">
          Por página
          <select className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 py-1 text-xs" value={porPagina} onChange={(e) => { setPorPagina(Number(e.target.value)); setPagina(1) }}>
            {[25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>

      {/* Dados */}
      {ordenados.length === 0 ? (
        <div className="card p-8 text-center dark:bg-slate-900 dark:border-slate-800">
          <Filter className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="font-semibold text-slate-900 dark:text-white">Nenhum resultado com esses filtros</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Limpe os filtros ou tente outra busca.</p>
          <button type="button" onClick={limpar} className="mt-3 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
            Limpar filtros
          </button>
        </div>
      ) : modo === 'tabela' ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="p-2 text-left font-semibold text-slate-600 dark:text-slate-300 w-8">★</th>
                  {colunas.map((c) => (
                    <th key={c.chave} className="p-2 text-left font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {c.ordena ? (
                        <button
                          type="button"
                          onClick={() => toggleOrdenar(c.chave)}
                          className="inline-flex items-center gap-1 hover:text-primary"
                        >
                          {c.label}
                          {ordenacao.coluna === c.chave ? (ordenacao.dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : null}
                        </button>
                      ) : (
                        c.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visiveis.map((a, i) => {
                  const verified = a.status_link === 'verificado'
                  const fav = favoritos.includes(a.id)
                  return (
                    <tr key={a.id} className={cn('border-t border-slate-100 dark:border-slate-800', i % 2 === 1 && 'bg-slate-50/60 dark:bg-slate-900/40')}>
                      <td className="p-2">
                        <button type="button" onClick={() => favoritar(a.id)} aria-label={fav ? 'Remover dos favoritos' : 'Favoritar'} className={cn('text-slate-300 hover:text-rose-500', fav && 'text-rose-500')}>
                          <Heart className={cn('w-4 h-4', fav && 'fill-current')} />
                        </button>
                      </td>
                      <td className="p-2">
                        <button type="button" onClick={() => setSelecionado(a)} className="font-semibold text-primary hover:underline text-left">
                          {a.nome}
                        </button>
                      </td>
                      <td className="p-2 text-slate-600 dark:text-slate-300">{a.orgao || '—'}</td>
                      <td className="p-2 text-slate-600 dark:text-slate-300">{a.uf || '—'}</td>
                      <td className="p-2 text-slate-600 dark:text-slate-300">{ESFERA_LABEL[a.esfera] || a.esfera}</td>
                      <td className="p-2 text-slate-600 dark:text-slate-300">{TIPO_LABEL[a.tipo] || a.tipo}</td>
                      <td className="p-2">
                        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', SITUACAO_LABEL[a.situacao]?.classe)}>{SITUACAO_LABEL[a.situacao]?.label || a.situacao}</span>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1.5">
                          {verified && a.url_site ? (
                            <a href={a.url_site} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-white hover:bg-primary-hover">
                              <ExternalLink className="w-3 h-3" /> Acessar
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400">A verificar</span>
                          )}
                          <button type="button" onClick={() => copiarLink(a.url_site || '')} aria-label="Copiar link" className="text-slate-400 hover:text-primary">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => setSelecionado(a)} aria-label="Ver detalhes" className="text-slate-400 hover:text-primary">
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visiveis.map((a) => {
            const verified = a.status_link === 'verificado'
            const fav = favoritos.includes(a.id)
            return (
              <article key={a.id} className="card p-4 dark:bg-slate-900 dark:border-slate-800">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <button type="button" onClick={() => setSelecionado(a)} className="font-semibold text-slate-900 dark:text-white hover:text-primary text-left leading-snug">{a.nome}</button>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{a.orgao || 'Órgão não informado'}</p>
                  </div>
                  <button type="button" onClick={() => favoritar(a.id)} aria-label="Favoritar" className={cn('text-slate-300 hover:text-rose-500 shrink-0', fav && 'text-rose-500')}>
                    <Heart className={cn('w-4 h-4', fav && 'fill-current')} />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{ESFERA_LABEL[a.esfera] || a.esfera}{a.uf ? ` · ${a.uf}` : ''}</span>
                  <span>·</span>
                  <span>{TIPO_LABEL[a.tipo] || a.tipo}</span>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', SITUACAO_LABEL[a.situacao]?.classe)}>{SITUACAO_LABEL[a.situacao]?.label}</span>
                </div>
                <div className="mt-3 flex items-center gap-1.5">
                  {verified && a.url_site ? (
                    <a href={a.url_site} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover">
                      <ExternalLink className="w-3.5 h-3.5" /> Acessar
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">Link a verificar</span>
                  )}
                  <button type="button" onClick={() => setSelecionado(a)} className="ml-auto text-xs font-semibold text-primary hover:underline">Detalhes</button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <button type="button" disabled={paginaAtual <= 1} onClick={() => setPagina(paginaAtual - 1)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 font-semibold disabled:opacity-40">
            <ChevronLeft className="w-3.5 h-3.5" /> Anterior
          </button>
          <span>Página {paginaAtual} de {totalPaginas}</span>
          <button type="button" disabled={paginaAtual >= totalPaginas} onClick={() => setPagina(paginaAtual + 1)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 font-semibold disabled:opacity-40">
            Próxima <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Drawer de detalhes */}
      {selecionado && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Detalhes do almoxarifado">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelecionado(null)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-md h-full overflow-y-auto p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-primary">{ESFERA_LABEL[selecionado.esfera] || selecionado.esfera}{selecionado.uf ? ` · ${selecionado.uf}` : ''}</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{selecionado.nome}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{selecionado.orgao || 'Órgão não informado'}</p>
              </div>
              <button type="button" onClick={() => setSelecionado(null)} aria-label="Fechar" className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-4 h-4" /></button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className={cn('rounded-full px-2 py-0.5 font-semibold', SITUACAO_LABEL[selecionado.situacao]?.classe)}>{SITUACAO_LABEL[selecionado.situacao]?.label || selecionado.situacao}</span>
              <span className="text-slate-500 dark:text-slate-400">{TIPO_LABEL[selecionado.tipo] || selecionado.tipo}</span>
              {selecionado.status_link === 'verificado' && selecionado.verificado_em && (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><ShieldCheck className="w-3.5 h-3.5" /> Verificado em {dataBR(selecionado.verificado_em)}</span>
              )}
            </div>

            {selecionado.descricao && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{selecionado.descricao}</p>}
            {selecionado.como_participar && (
              <div className="mt-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 text-xs text-slate-600 dark:text-slate-300">
                <p className="font-semibold text-slate-700 dark:text-slate-200">Como o fornecedor participa</p>
                <p className="mt-1 leading-relaxed">{selecionado.como_participar}</p>
              </div>
            )}

            <div className="mt-4 space-y-2">
              {selecionado.status_link === 'verificado' && selecionado.url_site && (
                <a href={selecionado.url_site} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover">
                  <span className="inline-flex items-center gap-1.5"><ExternalLink className="w-4 h-4" /> Site oficial</span>
                  <ArrowUp className="w-4 h-4 rotate-45" />
                </a>
              )}
              {selecionado.status_link === 'verificado' && selecionado.url_norma && (
                <a href={selecionado.url_norma} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <Scale className="w-4 h-4" /> Norma / Decreto
                </a>
              )}
              {selecionado.status_link === 'verificado' && selecionado.url_edital && (
                <a href={selecionado.url_edital} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <FileText className="w-4 h-4" /> Edital / Ata
                </a>
              )}
              {selecionado.status_link !== 'verificado' && (
                <p className="rounded-lg bg-amber-50 dark:bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> Link ainda não validado — não é exibido como ativo.
                </p>
              )}
            </div>

            <div className="mt-4 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
              <button type="button" onClick={() => favoritar(selecionado.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                <Heart className={cn('w-3.5 h-3.5', favoritos.includes(selecionado.id) && 'fill-current text-rose-500')} /> Favoritar
              </button>
              <button type="button" onClick={() => copiarLink(selecionado.url_site || '')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                {copiado ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />} Copiar link
              </button>
              <button type="button" onClick={() => { setReportando(selecionado.id); setSelecionado(null) }} className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-rose-500">
                <AlertTriangle className="w-3.5 h-3.5" /> Reportar link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reportar link */}
      {reportando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Reportar link">
          <div className="absolute inset-0 bg-black/40" onClick={() => setReportando(null)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white">Reportar link quebrado/desatualizado</h3>
            <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} placeholder="O que está errado? (link quebrado, órgão extinto, endereço mudou...)" className={`${INPUT} mt-3`} />
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={enviarReport} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700">Enviar relato</button>
              <button type="button" onClick={() => setReportando(null)} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-start gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-500" />
        Só exibimos como ativo o link validado por HTTP 200. Registros com duas falhas seguidas na verificação automática
        entram em revisão e saem da lista pública.
      </p>
    </div>
  )
}

function Kpi({ label, valor, onClick, ativo }: { label: string; valor: number; onClick?: () => void; ativo?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'card p-3 text-left dark:bg-slate-900 dark:border-slate-800 transition-colors hover:border-primary/40',
        ativo && 'border-primary ring-2 ring-primary/20'
      )}
    >
      <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-0.5 text-xl font-extrabold text-slate-900 dark:text-white">{valor}</p>
    </button>
  )
}

function Chip({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft dark:bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
      {children}
      <button type="button" onClick={onRemove} aria-label="Remover filtro" className="hover:text-primary-hover"><X className="w-3 h-3" /></button>
    </span>
  )
}
