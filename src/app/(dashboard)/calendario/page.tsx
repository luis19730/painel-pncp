'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, RotateCw, Filter, X,
  MapPin, Building2, Clock, ExternalLink, Search, RefreshCw, AlertCircle,
  Info, Link2, BellPlus, CheckCircle2, List, Sparkles, CalendarDays,
  CalendarRange, CalendarClock,
} from 'lucide-react'
import PageHeader from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'
import EmptyState from '@/components/ui/empty-state'
import Button from '@/components/ui/button'
import { InputWithIcon } from '@/components/ui/input'
import StatCard from '@/components/ui/stat-card'
import { CardSkeleton } from '@/components/ui/skeleton'
import { cn, formatCurrency, formatDateTime, normalizar } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { insertAlert } from '@/lib/alerts/db'
import { MODALIDADES_PNCP } from '@/lib/calendario/modalidades'
import type { CalendarioEvento, ResultadoCalendario, Facetas } from '@/lib/calendario/types'

const UF_LIST = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS_SEMANA_LONGO = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']

// ---------------------------------------------------------------------------
// Helpers de fuso (America/Sao_Paulo ≈ UTC-3, sem horário de verão)
// ---------------------------------------------------------------------------

/** Chave de data (yyyy-MM-dd) de um objeto Date, no fuso de Brasília. */
function dateKeyBR(d: Date): string {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d)
  const g = (t: string) => p.find((x) => x.type === t)?.value || '0'
  return `${g('year')}-${g('month')}-${g('day')}`
}

/** Cria um Date representando yyyy-MM-dd (meio-dia, evita deslocamento) em Brasília. */
function makeDateBR(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0)
}

/** Soma dias em uma chave de data (yyyy-MM-dd). */
function addDaysBR(iso: string, dias: number): string {
  const base = makeDateBR(iso)
  base.setDate(base.getDate() + dias)
  return dateKeyBR(base)
}

/** Hoje em yyyy-MM-dd (Brasília). */
function hojeBR(): string {
  return dateKeyBR(new Date())
}

/** Extrai data (yyyy-MM-dd) de uma string do PNCP (já no sentido de Brasília). */
function dataRealOuNull(v: string | null | undefined): string | null {
  if (!v) return null
  const s = v.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
}

/** Horário HH:MM de uma data do PNCP, se disponível. */
function horaReal(v: string | null | undefined): string | null {
  if (!v) return null
  const m = /T(\d{2}):(\d{2})/.exec(v)
  return m ? `${m[1]}:${m[2]}` : null
}

/** Data oficial do evento (prioriza encerramento das propostas). */
function dataEvento(e: CalendarioEvento): string | null {
  return dataRealOuNull(e.dataEncerramento) || dataRealOuNull(e.dataAbertura) || dataRealOuNull(e.dataPublicacao)
}

/** Mostra o texto de data/hora do evento (encerramento, ou abertura, ou publicação). */
function rotuloDataEvento(e: CalendarioEvento): string | null {
  if (dataRealOuNull(e.dataEncerramento)) {
    const h = horaReal(e.dataEncerramento)
    return h ? formatDateTime(dataRealOuNull(e.dataEncerramento)! + 'T' + h + ':00') : formatDateTime(dataRealOuNull(e.dataEncerramento)!)
  }
  if (dataRealOuNull(e.dataAbertura)) {
    const h = horaReal(e.dataAbertura)
    return h ? formatDateTime(dataRealOuNull(e.dataAbertura)! + 'T' + h + ':00') : formatDateTime(dataRealOuNull(e.dataAbertura)!)
  }
  if (dataRealOuNull(e.dataPublicacao)) return formatDateTime(dataRealOuNull(e.dataPublicacao)!)
  return null
}

// ---------------------------------------------------------------------------
// Tipos de estado da página
// ---------------------------------------------------------------------------

type Visao = 'mes' | 'semana' | 'dia' | 'agenda'
type Periodo = 'hoje' | 'amanha' | '7' | '15' | '30' | 'custom'

interface Filtros {
  uf: string
  municipio: string
  modalidade: string
  situacao: string
  periodo: Periodo
  inicio: string
  fim: string
  keyword: string
}

const FILTROS_INI: Filtros = {
  uf: '',
  municipio: '',
  modalidade: '',
  situacao: '',
  periodo: '30',
  inicio: '',
  fim: '',
  keyword: '',
}

function diasHorizonte(f: Filtros): number {
  switch (f.periodo) {
    case 'hoje': return 0
    case 'amanha': return 1
    case '7': return 7
    case '15': return 15
    case '30': return 30
    case 'custom': return 30
    default: return 30
  }
}

export default function CalendarioPage() {
  const supabase = createClient()
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INI)
  const [draft, setDraft] = useState<Filtros>(FILTROS_INI)
  const [visao, setVisao] = useState<Visao>('mes')
  const [cursor, setCursor] = useState<string>(hojeBR()) // mês/dia focado (yyyy-MM-dd)
  const [diaSel, setDiaSel] = useState<string>(hojeBR())

  const [dados, setDados] = useState<ResultadoCalendario | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const [atualizando, setAtualizando] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const [eventoSel, setEventoSel] = useState<CalendarioEvento | null>(null)
  const [alertMsg, setAlertMsg] = useState<{ ok: boolean; msg: string } | null>(null)
  const [salvandoAlerta, setSalvandoAlerta] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Autenticação (o middleware já protege a rota; aqui obtemos o userId p/ alertas).
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [supabase])

  const aplicarFiltros = useCallback(() => {
    setFiltros({ ...draft })
    setErro(false)
    setLoading(true)
  }, [draft])

  // Debounce da busca por palavra-chave.
  const onKeywordChange = useCallback((kw: string) => {
    setDraft((d) => ({ ...d, keyword: kw }))
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setFiltros((f) => ({ ...f, keyword: kw }))
      setLoading(true)
    }, 600)
  }, [])

  const buscar = useCallback(async (forcar: boolean) => {
    setErro(false)
    setLoading(!forcar)
    setAtualizando(forcar)
    try {
      const params = new URLSearchParams({
        dias: String(diasHorizonte(filtros)),
        paginas: '4',
      })
      if (filtros.uf) params.set('uf', filtros.uf)
      if (filtros.modalidade) params.set('modalidade', filtros.modalidade)
      if (filtros.municipio) params.set('municipio', filtros.municipio)
      if (filtros.keyword) params.set('keyword', filtros.keyword)
      if (forcar) params.set('force', '1')
      const res = await fetch(`/api/calendario?${params.toString()}`)
      const json = (await res.json()) as ResultadoCalendario
      if (!res.ok || !json.ok) {
        setErro(true)
        setDados(null)
        return
      }
      setDados(json)
      setErro(false)
    } catch {
      setErro(true)
      setDados(null)
    } finally {
      setLoading(false)
      setAtualizando(false)
    }
  }, [filtros])

  useEffect(() => {
    let ativo = true
    ;(async () => {
      await Promise.resolve()
      if (ativo) await buscar(false)
    })()
    return () => { ativo = false }
  }, [buscar])

  // Limpeza do debounce
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // -------------------------------------------------------------------------
  // Filtros aplicados (município/situação são pós-filtragem local se preciso)
  // -------------------------------------------------------------------------

  const eventosBase = useMemo(() => dados?.eventos || [], [dados])

  const eventos = useMemo(() => {
    let list = eventosBase
    if (filtros.municipio) {
      const m = normalizar(filtros.municipio)
      list = list.filter((e) => normalizar(e.municipio).includes(m))
    }
    if (filtros.situacao) {
      const s = normalizar(filtros.situacao)
      list = list.filter((e) => normalizar(e.situacao).includes(s))
    }
    return list
  }, [eventosBase, filtros.municipio, filtros.situacao])

  // Contadores calculados a partir dos dados reais carregados.
  const contadores = useMemo(() => {
    const hoje = hojeBR()
    const dentro = (dias: number) => {
      if (dias < 0) return 0
      if (dias === 0) return eventos.filter((e) => dataEvento(e) === hoje).length
      const fimIso = addDaysBR(hoje, dias)
      return eventos.filter((e) => {
        const d = dataEvento(e)
        return !!d && d >= hoje && d <= fimIso
      }).length
    }
    return {
      hoje: eventos.filter((e) => dataEvento(e) === hoje).length,
      sete: dentro(7),
      trinta: dentro(30),
      total: eventos.length,
    }
  }, [eventos])

  // Próximas oportunidades ordenadas pela data/hora mais próxima.
  const proximas = useMemo(() => {
    const hoje = hojeBR()
    return eventos
      .map((e) => ({ e, d: dataEvento(e) }))
      .filter((x): x is { e: CalendarioEvento; d: string } => !!x.d && x.d >= hoje)
      .sort((a, b) => {
        const ta = a.e.dataEncerramento || a.d
        const tb = b.e.dataEncerramento || b.d
        return ta.localeCompare(tb)
      })
      .slice(0, 12)
  }, [eventos])

  // Eventos do dia/mês/semana conforme a visão
  const eventosDoDia = useMemo(() => {
    const k = diaSel
    return eventos.filter((e) => dataEvento(e) === k)
      .sort((a, b) => (a.dataEncerramento || '').localeCompare(b.dataEncerramento || ''))
  }, [eventos, diaSel])

  const eventosDaSemana = useMemo(() => {
    const dom = addDaysBR(mesInicio(cursor), -new Date(makeDateBR(mesInicio(cursor))).getDay())
    const dias: string[] = []
    for (let i = 0; i < 7; i++) dias.push(addDaysBR(dom, i))
    const diasComEventos = dias
      .map((d) => ({ dia: d, eventos: eventos.filter((e) => dataEvento(e) === d) }))
      .filter((x) => x.eventos.length > 0)
    return { dias, diasComEventos }
  }, [eventos, cursor])

  function mesInicio(iso: string): string {
    return `${iso.slice(0, 7)}-01`
  }

  function tituloMes(iso: string): string {
    const [y, m] = iso.split('-').map(Number)
    return `${MESES[m - 1]} ${y}`
  }

  const mudarMes = useCallback((delta: number) => {
    setCursor((c) => {
      const [y, m] = c.split('-').map(Number)
      const d = new Date(y, m - 1 + delta, 1)
      return dateKeyBR(d)
    })
  }, [])

  // -------------------------------------------------------------------------
  // Render: estados de loading / erro / vazio
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Calendário de Oportunidades" description="Oportunidades reais de contratação pública do PNCP e seus prazos." />
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Carregando oportunidades reais do PNCP...
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <CardSkeleton key={i} />)}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  if (erro && !dados) {
    return (
      <div className="space-y-6">
        <PageHeader title="Calendário de Oportunidades" description="Oportunidades reais de contratação pública do PNCP e seus prazos." />
        <div className="card flex flex-col items-center justify-center p-10 text-center">
          <AlertCircle className="w-10 h-10 text-danger mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
            Não foi possível atualizar os dados do PNCP no momento.
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-5">
            O Portal Nacional de Contratações Públicas pode estar temporariamente indisponível.
            Nenhum dado fictício é exibido.
          </p>
          <Button icon={<RotateCw className="w-4 h-4" />} onClick={() => buscar(true)}>
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendário de Oportunidades"
        description="Prazo real de recebimento de propostas das contratações públicas, agrupado no fuso de Brasília."
        badge={<Badge variant="info" icon={<Sparkles className="w-3 h-3" />}>Dados reais do PNCP</Badge>}
      >
        <div className="flex items-center gap-2">
          {dados && !atualizando && (
            <span className="text-xs text-slate-400 hidden md:inline-flex items-center gap-1">
              <Clock className="w-3 h-3" /> Última atualização: {formatDateTime(dados.consultadoEm)}
            </span>
          )}
          <Button
            variant="secondary"
            size="sm"
            loading={atualizando}
            icon={<RotateCw className="w-4 h-4" />}
            onClick={() => buscar(true)}
          >
            Atualizar dados
          </Button>
        </div>
      </PageHeader>

      {/* Origem dos dados */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10 px-3.5 py-2.5 flex flex-wrap items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
        <Info className="w-4 h-4 shrink-0" />
        <span>
          Fonte dos dados: <strong>PNCP — Portal Nacional de Contratações Públicas</strong>{' '}
          (API oficial de contratações)
        </span>
        <a
          href="https://pncp.gov.br"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 ml-auto"
        >
          <Link2 className="w-3 h-3" /> pncp.gov.br
        </a>
      </div>

      {/* Barra de ações: contadores + botão hoje/refresh do calendário */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Hoje" value={contadores.hoje} accent="danger" icon={<CalendarDays className="w-5 h-5" />} hint="encerram hoje" />
        <StatCard label="Próximos 7 dias" value={contadores.sete} accent="warning" icon={<CalendarRange className="w-5 h-5" />} hint="recebendo propostas" />
        <StatCard label="Próximos 30 dias" value={contadores.trinta} accent="success" icon={<CalendarClock className="w-5 h-5" />} hint="prazos reais" />
        <StatCard label="Carregadas" value={contadores.total} accent="primary" icon={<List className="w-5 h-5" />} hint="na consulta atual" />
      </div>

      {/* Filtros */}
      <FiltrosPanel
        filtros={draft}
        facetas={dados?.facetas || { modalidades: [], municipios: [], situacoes: [] }}
        onKeywordChange={onKeywordChange}
        onMudanca={(patch) => setDraft((d) => ({ ...d, ...patch }))}
        onAplicar={aplicarFiltros}
        onLimpar={() => {
          setDraft(FILTROS_INI)
          setFiltros(FILTROS_INI)
          setLoading(true)
        }}
      />

      {/* Navegação do calendário + visões */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => mudarMes(-1)}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm font-semibold text-slate-900 dark:text-white w-40 text-center">
            {visao === 'dia' ? formatDateTime(diaSel) : tituloMes(cursor)}
          </span>
          <Button variant="ghost" size="sm" onClick={() => mudarMes(1)}><ChevronRight className="w-4 h-4" /></Button>
          <Button variant="secondary" size="sm" className="ml-1" onClick={() => { setCursor(hojeBR()); setDiaSel(hojeBR()) }}>
            Hoje
          </Button>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1">
          {(['mes', 'semana', 'dia', 'agenda'] as Visao[]).map((v) => (
            <button
              key={v}
              onClick={() => setVisao(v)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors',
                visao === v ? 'bg-primary text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Corpo principal do calendário */}
        <div className="lg:col-span-2 space-y-4">
          {visao === 'mes' && (
            <CalendarGrid
              cursor={cursor}
              eventos={eventos}
              hoje={hojeBR()}
              sel={diaSel}
              onSelDia={(d) => { setDiaSel(d); setVisao('dia') }}
            />
          )}
          {visao === 'semana' && (
            <WeekView eventosDaSemana={eventosDaSemana} onSelDia={(d) => { setDiaSel(d); setVisao('dia') }} />
          )}
          {visao === 'dia' && (
            <DayView dia={diaSel} eventos={eventosDoDia} onAbrir={setEventoSel} onVoltarMes={() => mudarMes(-1)} onAvancarMes={() => mudarMes(1)} />
          )}
          {visao === 'agenda' && (
            <AgendaView eventos={eventos} hoje={hojeBR()} onAbrir={setEventoSel} />
          )}

          {eventos.length === 0 && !loading && (
            <EmptyState
              icon={<CalendarIcon className="w-8 h-8" />}
              title="Nenhuma contratação encontrada"
              description="Nenhuma contratação real encontrada para os filtros selecionados. Ajuste os filtros para ampliar os resultados."
              className="border border-dashed border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            />
          )}
        </div>

        {/* Próximas oportunidades */}
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide mb-3">
              Próximas oportunidades
            </h2>
            {proximas.length === 0 ? (
              <p className="text-sm text-slate-400">
                Nenhuma contratação com prazo futuro para os filtros selecionados.
              </p>
            ) : (
              <div className="space-y-2">
                {proximas.map(({ e }) => (
                  <button
                    key={e.id}
                    onClick={() => setEventoSel(e)}
                    className="w-full text-left p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-xs text-primary font-semibold">
                      <Clock className="w-3 h-3" /> {rotuloDataEvento(e) || 'Data não informada'}
                    </div>
                    <p className="text-sm font-medium mt-1 line-clamp-1">{e.modalidade || 'Contratação'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{e.orgao || 'Órgão não informado'} · {e.uf || '—'}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-xs text-slate-400 space-y-1">
            <p>Os números e eventos são calculados a partir dos dados reais carregados do PNCP — nenhum valor é fixo ou simulado.</p>
            {dados && (
              <p>
                Fonte: {dados.totalDisponivel.toLocaleString('pt-BR')} contratações disponíveis no PNCP no período (leitura parcial — {dados.paginasLidas} página(s)).
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Modal de detalhe do evento */}
      {eventoSel && (
        <EventoModal
          evento={eventoSel}
          onFechar={() => setEventoSel(null)}
          userId={userId}
          supabase={supabase}
          naBuscaSalvar={setAlertMsg}
          salvandoAlerta={salvandoAlerta}
          setSalvandoAlerta={setSalvandoAlerta}
        />
      )}

      {/* Feedback de alerta */}
      {alertMsg && (
        <div className={cn(
          'fixed bottom-4 right-4 z-50 max-w-sm rounded-xl border px-4 py-3 shadow-lg flex items-start gap-2 text-sm',
          alertMsg.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200' :
            'border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200'
        )}>
          {alertMsg.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
          <span>{alertMsg.msg}</span>
          <button onClick={() => setAlertMsg(null)} className="ml-auto text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  )
}

// ===========================================================================
// Painel de filtros
// ===========================================================================

function FiltrosPanel({
  filtros, facetas, onKeywordChange, onMudanca, onAplicar, onLimpar,
}: {
  filtros: Filtros
  facetas: Facetas
  onKeywordChange: (k: string) => void
  onMudanca: (p: Partial<Filtros>) => void
  onAplicar: () => void
  onLimpar: () => void
}) {
  const [aberto, setAberto] = useState(false)
  const situacoes = facetas.situacoes.length ? facetas.situacoes : ['Divulgada no PNCP']
  const municipios = facetas.municipios.length ? facetas.municipios : []

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setAberto((a) => !a)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
        >
          <Filter className="w-4 h-4" /> Filtros
          <ChevronRight className={cn('w-4 h-4 transition-transform', aberto && 'rotate-90')} />
        </button>
        <Button variant="secondary" size="sm" onClick={onLimpar}>Limpar</Button>
      </div>

      {aberto && (
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">UF</label>
            <select
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              value={filtros.uf}
              onChange={(e) => onMudanca({ uf: e.target.value })}
            >
              <option value="">Todas as UFs</option>
              {UF_LIST.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Município</label>
            <select
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              value={filtros.municipio}
              onChange={(e) => onMudanca({ municipio: e.target.value })}
            >
              <option value="">Todos os municípios</option>
              {municipios.map((m) => <option key={m} value={m.split(' — ')[0]}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Modalidade</label>
            <select
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              value={filtros.modalidade}
              onChange={(e) => onMudanca({ modalidade: e.target.value })}
            >
              <option value="">Todas as modalidades</option>
              {MODALIDADES_PNCP.map((m) => <option key={m.codigo} value={String(m.codigo)}>{m.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Situação</label>
            <select
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              value={filtros.situacao}
              onChange={(e) => onMudanca({ situacao: e.target.value })}
            >
              <option value="">Todas</option>
              {Array.from(new Set(['Recebendo propostas', ...situacoes])).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Período</label>
            <select
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              value={filtros.periodo}
              onChange={(e) => onMudanca({ periodo: e.target.value as Periodo })}
            >
              <option value="hoje">Hoje</option>
              <option value="amanha">Amanhã</option>
              <option value="7">Próximos 7 dias</option>
              <option value="15">Próximos 15 dias</option>
              <option value="30">Próximos 30 dias</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Palavra-chave (objeto)</label>
            <InputWithIcon
              icon={<Search className="w-4 h-4" />}
              placeholder="Pesquisar no objeto, órgão ou município..."
              value={filtros.keyword}
              onChange={(e) => onKeywordChange(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={onAplicar} className="w-full"><Search className="w-4 h-4" /> Aplicar filtros</Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ===========================================================================
// Grade mensal
// ===========================================================================

function CalendarGrid({
  cursor, eventos, hoje, sel, onSelDia,
}: {
  cursor: string
  eventos: CalendarioEvento[]
  hoje: string
  sel: string
  onSelDia: (d: string) => void
}) {
  const [y, m] = cursor.split('-').map(Number)
  const grid = useMemo(() => {
    const primeiro = new Date(y, m - 1, 1)
    const inicioDow = primeiro.getDay()
    const dias = new Date(y, m, 0).getDate()
    const cells: (string | null)[] = []
    for (let i = 0; i < inicioDow; i++) cells.push(null)
    for (let d = 1; d <= dias; d++) cells.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    while (cells.length % 7 !== 0) cells.push(null)
    const rows: (string | null)[][] = []
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
    return rows
  }, [y, m])

  const contar = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of eventos) {
      const d = dataEvento(e)
      if (d) map.set(d, (map.get(d) || 0) + 1)
    }
    return map
  }, [eventos])

  return (
    <div className="card p-3 overflow-hidden">
      <div className={cn('grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 mb-2', 'hidden sm:grid hidden md:grid')}>
        {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {grid.flat().map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} className="min-h-[54px] sm:min-h-[88px] rounded-lg" />
          const n = contar.get(day) || 0
          const isHoje = day === hoje
          const isSel = day === sel
          const num = Number(day.slice(8, 10))
          return (
            <button
              key={day}
              onClick={() => onSelDia(day)}
              className={cn(
                'min-h-[54px] sm:min-h-[88px] rounded-lg border p-1 text-left align-top transition-colors',
                isSel ? 'border-primary bg-primary-soft dark:bg-primary/15' : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800',
                isHoje && 'ring-2 ring-primary'
              )}
            >
              <span className={cn('inline-flex w-5 h-5 items-center justify-center rounded-full text-xs font-semibold', isHoje ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300')}>
                {num}
              </span>
              {n > 0 && (
                <div className="mt-1 hidden sm:flex flex-wrap gap-0.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft text-red-700 dark:bg-red-500/15 dark:text-red-300 px-1.5 py-0.5 text-[10px] font-semibold">
                    {n} prazo{n > 1 ? 's' : ''}
                  </span>
                </div>
              )}
              {n > 0 && (
                <div className="mt-1 sm:hidden flex justify-center">
                  <span className="w-4 h-4 rounded-full bg-danger-soft dark:bg-red-500/20 inline-flex items-center justify-center text-[9px] font-bold text-red-700 dark:text-red-300">{n}</span>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ===========================================================================
// Visão semanal
// ===========================================================================

function WeekView({
  eventosDaSemana, onSelDia,
}: {
  eventosDaSemana: { dias: string[]; diasComEventos: { dia: string; eventos: CalendarioEvento[] }[] }
  onSelDia: (d: string) => void
}) {
  const hoje = hojeBR()
  const { dias, diasComEventos } = eventosDaSemana
  const map = new Map<string, CalendarioEvento[]>()
  for (const dce of diasComEventos) map.set(dce.dia, dce.eventos)
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
      {dias.map((dia) => {
        const evs = map.get(dia) || []
        const nome = DIAS_SEMANA_LONGO[new Date(makeDateBR(dia)).getDay()]
        return (
          <button
            key={dia}
            onClick={() => onSelDia(dia)}
            className={cn('text-left rounded-xl border p-3 transition-colors',
              dia === hoje ? 'border-primary ring-1 ring-primary' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800')}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{nome}, {formatDateTime(dia)}</span>
              <Badge variant={evs.length > 0 ? 'danger' : 'accent'}>{evs.length} {evs.length === 1 ? 'prazo' : 'prazos'}</Badge>
            </div>
            {evs.length > 0 && (
              <div className="mt-2 space-y-1">
                {evs.slice(0, 3).map((e) => (
                  <p key={e.id} className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1">• {e.modalidade || 'Contratação'} — {e.orgao || e.objeto}</p>
                ))}
                {evs.length > 3 && <p className="text-xs text-slate-400">+{evs.length - 3} mais</p>}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ===========================================================================
// Visão diária (lista/agenda no celular)
// ===========================================================================

function DayView({
  dia, eventos, onAbrir, onVoltarMes, onAvancarMes,
}: {
  dia: string
  eventos: CalendarioEvento[]
  onAbrir: (e: CalendarioEvento) => void
  onVoltarMes: () => void
  onAvancarMes: () => void
}) {
  const nome = DIAS_SEMANA_LONGO[new Date(makeDateBR(dia)).getDay()]
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">{nome}, {formatDateTime(dia)}</h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={onVoltarMes}><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={onAvancarMes}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>
      {eventos.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhuma contratação com prazo neste dia.</p>
      ) : (
        <div className="space-y-2">
          {eventos.map((e) => <EventoCard key={e.id} evento={e} onClick={() => onAbrir(e)} />)}
        </div>
      )}
    </div>
  )
}

// ===========================================================================
// Visão agenda
// ===========================================================================

function AgendaView({ eventos, hoje, onAbrir }: {
  eventos: CalendarioEvento[]
  hoje: string
  onAbrir: (e: CalendarioEvento) => void
}) {
  const agrupado = useMemo(() => {
    const map = new Map<string, CalendarioEvento[]>()
    for (const e of eventos) {
      const d = dataEvento(e) || 'sem-data'
      if (!map.has(d)) map.set(d, [])
      map.get(d)!.push(e)
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] === 'sem-data' ? 1 : 0) - (b[0] === 'sem-data' ? 1 : 0) || a[0].localeCompare(b[0]))
  }, [eventos])
  return (
    <div className="space-y-4">
      {agrupado.length === 0 && <p className="text-sm text-slate-400">Nenhuma contratação encontrada.</p>}
      {agrupado.map(([dia, evs]) => (
        <div key={dia}>
          <div className="flex items-center gap-2 mb-2">
            <span className={cn('text-xs font-semibold uppercase tracking-wide', dia === hoje ? 'text-primary' : 'text-slate-500 dark:text-slate-400')}>
              {dia === 'sem-data' ? 'Sem data informada' : formatDateTime(dia)}
            </span>
            {dia === hoje && <Badge variant="danger">Hoje</Badge>}
          </div>
          <div className="space-y-2">
            {evs.map((e) => <EventoCard key={e.id} evento={e} onClick={() => onAbrir(e)} />)}
          </div>
        </div>
      ))}
    </div>
  )
}

// ===========================================================================
// Card de evento
// ===========================================================================

function EventoCard({ evento, onClick }: { evento: CalendarioEvento; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-2 text-xs font-semibold text-primary">
        <MapPin className="w-3.5 h-3.5" /> {evento.modalidade || 'Contratação'}
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <span className="text-slate-500 dark:text-slate-400">{evento.uf || '—'}</span>
      </div>
      <p className="text-sm font-medium mt-1 line-clamp-2 text-slate-800 dark:text-slate-100">
        {evento.objeto || 'Objeto não informado'}
      </p>
      <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
        <span className="inline-flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {evento.orgao || 'Órgão não informado'}</span>
        {evento.valor != null && <span className="font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(evento.valor)}</span>}
      </div>
    </button>
  )
}

// ===========================================================================
// Modal de detalhe
// ===========================================================================

function EventoModal({
  evento, onFechar, userId, supabase, naBuscaSalvar, salvandoAlerta, setSalvandoAlerta,
}: {
  evento: CalendarioEvento
  onFechar: () => void
  userId: string | null
  supabase: ReturnType<typeof createClient>
  naBuscaSalvar: (m: { ok: boolean; msg: string } | null) => void
  salvandoAlerta: boolean
  setSalvandoAlerta: (b: boolean) => void
}) {
  const rotulo = rotuloDataEvento(evento)
  const hora = horaReal(evento.dataEncerramento) || horaReal(evento.dataAbertura)

  const adicionarAlerta = async () => {
    if (!userId) {
      naBuscaSalvar({ ok: false, msg: 'Faça login para adicionar aos seus alertas.' })
      return
    }
    setSalvandoAlerta(true)
    try {
      const palavra = (evento.objeto || evento.orgao || '').slice(0, 60)
      await insertAlert(supabase, userId, {
        nome: `Calendário: ${evento.modalidade || 'Contratação'} — ${(evento.orgao || 'órgão').slice(0, 40)}`,
        keyword: palavra || null,
        modalidade: evento.modalidade || null,
        uf: evento.uf || null,
        municipio: evento.municipio || null,
        orgao: evento.orgao || null,
        valor_min: null,
        valor_max: null,
        data_inicial: evento.dataAbertura || null,
        data_final: evento.dataEncerramento || null,
        ativo: true,
      })
      naBuscaSalvar({ ok: true, msg: 'Alerta criado a partir desta contratação real. Configure os canais em "Meus Alertas".' })
    } catch {
      naBuscaSalvar({ ok: false, msg: 'Não foi possível criar o alerta agora.' })
    } finally {
      setSalvandoAlerta(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50" onClick={onFechar}>
      <div
        className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <Badge variant="info">{evento.modalidade || 'Contratação'}</Badge>
            <button onClick={onFechar} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
          </div>

          <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-primary">
            <CalendarIcon className="w-4 h-4" /> {rotulo || 'Data não informada'}
            {hora && <span className="text-xs text-slate-400">({hora} Brasília)</span>}
          </div>

          <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white leading-snug">
            {evento.objeto || 'Objeto não informado'}
          </h3>

          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-400">Órgão</dt><dd className="text-slate-700 dark:text-slate-200">{evento.orgao || '—'}</dd></div>
            <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-400">Município/UF</dt><dd className="text-slate-700 dark:text-slate-200">{evento.municipio || '—'} {evento.uf ? `· ${evento.uf}` : ''}</dd></div>
            <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-400">Esfera</dt><dd className="text-slate-700 dark:text-slate-200">{evento.esfera || '—'}</dd></div>
            <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-400">Nº compra</dt><dd className="text-slate-700 dark:text-slate-200 font-mono">{evento.numero}</dd></div>
            <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-400">Situação</dt><dd className="text-slate-700 dark:text-slate-200">{evento.situacao || '—'}</dd></div>
            {evento.valor != null && (
              <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-400">Valor</dt><dd className="font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(evento.valor)}</dd></div>
            )}
            <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-400">Controle</dt><dd className="text-slate-700 dark:text-slate-200 font-mono text-xs break-all">{evento.id}</dd></div>
          </dl>

          <div className="mt-6 space-y-2">
            <a
              href={evento.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> Ver licitação no PNCP
            </a>
            <Button
              variant="secondary"
              className="w-full"
              loading={salvandoAlerta}
              icon={<BellPlus className="w-4 h-4" />}
              onClick={adicionarAlerta}
            >
              Adicionar aos meus alertas
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
