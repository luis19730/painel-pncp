'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle, BarChart3, Bell, Building2, Calculator, CheckCircle2, Download,
  FileSpreadsheet, Gauge, Link2, Loader2, LogIn, Monitor, Plus, Radar,
  Search, ShieldCheck, Store, Target, Trash2, Upload, Wallet,
} from 'lucide-react'
import type { SicxNorma } from '@/lib/sicx/types'
import {
  AVISO_INDICE, AVISO_INTEGRACAO, CANAIS_INTEGRACAO, CATEGORIAS_MERCADO,
  ROTULO_FERRAMENTA,
} from '@/lib/sicx/conteudo'
import {
  calcularMargemOferta, dataBR, indiceCompetitividade, inferirCategoria, moeda, pct, percentil,
} from '@/lib/sicx/calc'
import { apiSicxOpcional, jsonInit } from '@/lib/sicx/client'
import { cn } from '@/lib/utils'
import Contratacoes from './contratacoes'

type Aba = 'mercado' | 'oferta' | 'integracao' | 'contratacoes' | 'radar' | 'monitor'

interface Stats {
  quantidade: number
  minimo: number
  mediana: number
  media: number
  maximo: number
  orgaos?: Array<{ nome: string; quantidade: number }>
}

interface Ponto {
  valor: number
  orgao: string
  uf: string
  data: string
}

interface Oferta {
  id: string
  categoria: string
  descricao: string
  unidade: string | null
  preco: number
  estoque: number | null
  prazo_dias: number | null
  indice_competitividade: number | null
  margem_pct: number | null
}

const INPUT =
  'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary'

/** Referência fixa da carga do módulo — evita chamar função impura no render. */
const AGORA_MS = Date.now()

const ABAS: Array<{ id: Aba; label: string; icone: typeof Search }> = [
  { id: 'mercado', label: '7.1 Preços e ofertas', icone: Search },
  { id: 'oferta', label: '7.2 Minha oferta', icone: Calculator },
  { id: 'integracao', label: '7.3 Integração', icone: Link2 },
  { id: 'contratacoes', label: '7.4 Minhas contratações', icone: BarChart3 },
  { id: 'radar', label: '7.5 Radar de normas', icone: Radar },
  { id: 'monitor', label: '7.6 Monitor de CNPJ', icone: Monitor },
]

function LoginAviso() {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 text-sm text-slate-600 dark:text-slate-300">
      <p className="flex items-center gap-2 font-semibold"><LogIn className="w-4 h-4 text-primary" /> Entre para usar esta ferramenta</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">A leitura da página é livre. Salvar itens, ofertas e contratações exige uma conta.</p>
      <Link href="/login?redirect=%2Fcredenciamento-sicx" className="mt-2 inline-flex rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover">Entrar</Link>
    </div>
  )
}

export default function Ferramentas({ normas }: { normas: SicxNorma[] }) {
  const [aba, setAba] = useState<Aba>('mercado')

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Ferramentas do fornecedor">
        {ABAS.map((a) => {
          const Icone = a.icone
          const ativo = aba === a.id
          return (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={ativo}
              onClick={() => setAba(a.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors',
                ativo
                  ? 'border-primary bg-primary text-white'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary'
              )}
            >
              <Icone className="w-3.5 h-3.5" /> {a.label}
            </button>
          )
        })}
      </div>

      <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-2.5 mb-4">
        <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300">{ROTULO_FERRAMENTA}</p>
      </div>

      {aba === 'mercado' && <Mercado onCalcular={() => setAba('oferta')} />}
      {aba === 'oferta' && <MinhaOferta />}
      {aba === 'integracao' && <Integracao />}
      {aba === 'contratacoes' && <Contratacoes />}
      {aba === 'radar' && <RadarNormas normas={normas} />}
      {aba === 'monitor' && <MonitorCnpj />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// 7.1 — Buscador de preços e ofertas
// ---------------------------------------------------------------------------
function Mercado({ onCalcular }: { onCalcular: () => void }) {
  const [termo, setTermo] = useState('')
  const [dias, setDias] = useState(90)
  const [carregando, setCarregando] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [pontos, setPontos] = useState<Ponto[]>([])
  const [pesquisado, setPesquisado] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [precisaLogin, setPrecisaLogin] = useState(false)

  async function buscar(termoBusca: string) {
    const alvo = termoBusca.trim()
    if (alvo.length < 2) return
    setTermo(alvo)
    setCarregando(true); setErro(''); setAviso(''); setPesquisado(true)
    try {
      const r = await apiSicxOpcional<{ stats: Stats | null; dispersao: Ponto[] }>(
        `/api/sicx/mercado?termo=${encodeURIComponent(alvo)}&dias=${dias}`
      )
      if (!r) { setPrecisaLogin(true); return }
      setStats(r.stats)
      setPontos(r.dispersao || [])
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível pesquisar agora.')
      setStats(null); setPontos([])
    } finally {
      setCarregando(false)
    }
  }

  async function salvarItem() {
    if (!termo.trim()) return
    setAviso('')
    try {
      const r = await apiSicxOpcional('/api/sicx/itens-salvos', jsonInit('POST', {
        termo: termo.trim(), filtros: { dias }, alerta_ativo: true,
      }))
      if (!r) { setPrecisaLogin(true); return }
      setAviso('Item salvo. Você pode gerenciá-lo na conta (alertas internos).')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar o item.')
    }
  }

  const maxPontos = useMemo(() => Math.max(...pontos.map((p) => p.valor), 1), [pontos])

  return (
    <div className="space-y-4">
      <div className="card p-4 dark:bg-slate-900 dark:border-slate-800">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {CATEGORIAS_MERCADO.map((c) => (
            <button key={c.id} type="button" onClick={() => buscar(c.termo || c.label)} className="rounded-full border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary">
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input className={`${INPUT} pl-9`} value={termo} onChange={(e) => setTermo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') buscar(termo) }} placeholder="Ex.: caneta esferográfica azul, papel A4, luva de procedimento" aria-label="Item para pesquisar" />
          </div>
          <select className={`${INPUT} w-auto`} value={dias} onChange={(e) => setDias(Number(e.target.value))} aria-label="Período">
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
            <option value={180}>Últimos 180 dias</option>
            <option value={365}>Últimos 12 meses</option>
          </select>
          <button type="button" onClick={() => buscar(termo)} disabled={carregando} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60">
            {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Pesquisar
          </button>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">Fonte: contratações públicas recentes do PNCP. Não é cotação oficial.</p>
      </div>

      {precisaLogin && <LoginAviso />}
      {erro && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{erro}</p>}
      {aviso && <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">{aviso}</p>}

      {carregando && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
        </div>
      )}

      {!carregando && pesquisado && !stats && (
        <div className="card p-6 text-center dark:bg-slate-900 dark:border-slate-800">
          <Search className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="font-semibold text-slate-900 dark:text-white">Sem dados suficientes para esse item</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Tente um termo mais genérico ou amplie o período. Nenhum número é inventado quando não há dado.</p>
        </div>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Registros', valor: String(stats.quantidade) },
              { label: 'Menor preço', valor: moeda(stats.minimo) },
              { label: 'Mediana', valor: moeda(stats.mediana) },
              { label: 'Maior preço', valor: moeda(stats.maximo) },
            ].map((s) => (
              <div key={s.label} className="card p-4 dark:bg-slate-900 dark:border-slate-800">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{s.label}</p>
                <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{s.valor}</p>
              </div>
            ))}
          </div>

          <div className="card p-4 dark:bg-slate-900 dark:border-slate-800">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Dispersão dos preços observados</h4>
            <ul className="space-y-1.5">
              {pontos.map((p, i) => (
                <li key={`${p.valor}-${i}`} className="flex items-center gap-2 text-xs">
                  <span className="w-20 shrink-0 font-semibold text-slate-700 dark:text-slate-200">{moeda(p.valor)}</span>
                  <span className="h-2 rounded-full bg-gradient-to-r from-primary/70 to-secondary/70" style={{ width: `${Math.max(4, (p.valor / maxPontos) * 100)}%` }} />
                  <span className="min-w-0 flex-1 truncate text-slate-500 dark:text-slate-400">{p.orgao}{p.uf ? ` · ${p.uf}` : ''}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-slate-400">
              Percentil 25: {moeda(percentil(pontos.map((p) => p.valor), 25))} · Percentil 75: {moeda(percentil(pontos.map((p) => p.valor), 75))}
            </p>
          </div>

          {stats.orgaos && stats.orgaos.length > 0 && (
            <div className="card p-4 dark:bg-slate-900 dark:border-slate-800">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Órgãos que mais aparecem</h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                {stats.orgaos.map((o) => <li key={o.nome} className="flex justify-between gap-2"><span className="truncate">{o.nome}</span><span className="font-semibold">{o.quantidade}</span></li>)}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={salvarItem} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">
              <Bell className="w-3.5 h-3.5" /> Salvar item e ativar alerta
            </button>
            <button type="button" onClick={onCalcular} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-hover">
              <Calculator className="w-3.5 h-3.5" /> Calcular se compensa
            </button>
          </div>
        </>
      )}

      <p className="text-[11px] text-slate-400 dark:text-slate-500">
        <ShieldCheck className="inline w-3.5 h-3.5 text-emerald-500 mr-1" />
        Valores públicos observados. O Painel não participa da contratação nem garante preço, venda ou posição.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 7.2 — Minha oferta
// ---------------------------------------------------------------------------
function MinhaOferta() {
  const [form, setForm] = useState({
    descricao: '', categoria: 'papelaria', unidade: 'un', preco: '', custo: '',
    frete: '', imposto: '', despesa: '', prazo: '', estoque: '',
  })
  const [stats, setStats] = useState<Stats | null>(null)
  const [carregandoMercado, setCarregandoMercado] = useState(false)
  const [ofertas, setOfertas] = useState<Oferta[]>([])
  const [carregandoOfertas, setCarregandoOfertas] = useState(false)
  const [precisaLogin, setPrecisaLogin] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [salvando, setSalvando] = useState(false)

  const margem = calcularMargemOferta({
    preco: Number(String(form.preco).replace(',', '.')),
    custoUnitario: Number(String(form.custo).replace(',', '.')),
    frete: Number(String(form.frete).replace(',', '.')),
    impostoPct: Number(String(form.imposto).replace(',', '.')),
    despesaPct: Number(String(form.despesa).replace(',', '.')),
  })

  const indice = indiceCompetitividade({
    preco: Number(String(form.preco).replace(',', '.')) || 0,
    precoMinimo: stats?.minimo ?? null,
    precoMediana: stats?.mediana ?? null,
    precoMaximo: stats?.maximo ?? null,
    prazoDias: form.prazo ? Number(form.prazo) : null,
    descricao: form.descricao,
    unidade: form.unidade,
    categoria: form.categoria,
    regularidadeInformada: null,
  })

  function campo(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
    if (k === 'descricao' && v.length > 12) {
      const sugerida = inferirCategoria(v)
      if (sugerida !== 'outros') setForm((f) => ({ ...f, categoria: sugerida }))
    }
  }

  async function comparar() {
    if (!form.descricao.trim()) { setErro('Descreva o item para comparar com o mercado.'); return }
    setErro(''); setCarregandoMercado(true)
    try {
      const r = await apiSicxOpcional<{ stats: Stats | null }>(`/api/sicx/mercado?termo=${encodeURIComponent(form.descricao)}`)
      if (!r) { setPrecisaLogin(true); return }
      setStats(r.stats)
      if (!r.stats) setAviso('Sem dados de mercado para esse termo. O índice usa pontuação neutra no critério de preço.')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível comparar com o mercado.')
    } finally {
      setCarregandoMercado(false)
    }
  }

  async function carregarOfertas() {
    setCarregandoOfertas(true)
    try {
      const r = await apiSicxOpcional<{ ofertas: Oferta[] }>('/api/sicx/ofertas')
      if (!r) { setPrecisaLogin(true); return }
      setOfertas(r.ofertas || [])
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar suas ofertas.')
    } finally {
      setCarregandoOfertas(false)
    }
  }

  async function salvar() {
    if (!form.descricao.trim() || !form.preco.trim()) { setErro('Informe descrição e preço.'); return }
    setErro(''); setAviso(''); setSalvando(true)
    try {
      const r = await apiSicxOpcional('/api/sicx/ofertas', jsonInit('POST', {
        categoria: form.categoria,
        descricao: form.descricao,
        unidade: form.unidade,
        preco: String(form.preco).replace(',', '.'),
        custo_unitario: form.custo ? String(form.custo).replace(',', '.') : null,
        prazo_dias: form.prazo ? Number(form.prazo) : null,
        estoque: form.estoque ? Number(form.estoque) : null,
        margem_pct: margem.margemPct,
        indice_competitividade: indice.total,
        condicoes: { impostoPct: Number(form.imposto) || 0, despesaPct: Number(form.despesa) || 0 },
      }))
      if (!r) { setPrecisaLogin(true); return }
      setAviso('Oferta salva na sua conta.')
      await carregarOfertas()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar a oferta.')
    } finally {
      setSalvando(false)
    }
  }

  async function remover(id: string) {
    try {
      await apiSicxOpcional(`/api/sicx/ofertas/${id}`, { method: 'DELETE' })
      setOfertas((l) => l.filter((o) => o.id !== id))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível excluir a oferta.')
    }
  }

  async function exportar(formato: 'csv' | 'xlsx') {
    const XLSX = await import('xlsx')
    const linhas = ofertas.map((o) => ({
      Descrição: o.descricao, Categoria: o.categoria, Unidade: o.unidade || '', 'Preço (R$)': o.preco,
      Estoque: o.estoque ?? '', 'Prazo (dias)': o.prazo_dias ?? '', 'Margem (%)': o.margem_pct ?? '',
      'Índice (0–100)': o.indice_competitividade ?? '',
    }))
    const ws = XLSX.utils.json_to_sheet(linhas.length ? linhas : [{ Descrição: 'Nenhuma oferta salva' }])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Ofertas')
    XLSX.writeFile(wb, `minhas-ofertas-sicx.${formato}`)
  }

  async function importar(arquivo: File) {
    setErro(''); setAviso('')
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.read(await arquivo.arrayBuffer(), { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const linhas = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
      let enviadas = 0
      for (const l of linhas) {
        const descricao = String(l.Descrição ?? l.Descricao ?? l.descricao ?? '').trim()
        const preco = String(l['Preço (R$)'] ?? l.Preco ?? l.preco ?? '').replace(',', '.')
        if (!descricao || !Number(preco)) continue
        const r = await apiSicxOpcional('/api/sicx/ofertas', jsonInit('POST', {
          descricao,
          categoria: String(l.Categoria ?? l.categoria ?? 'outros'),
          unidade: String(l.Unidade ?? l.unidade ?? ''),
          preco,
          estoque: l.Estoque ?? l.estoque ?? null,
          prazo_dias: l['Prazo (dias)'] ?? l.prazo_dias ?? null,
        }))
        if (!r) { setPrecisaLogin(true); return }
        enviadas += 1
      }
      setAviso(`${enviadas} oferta(s) importada(s).`)
      await carregarOfertas()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível ler a planilha. Use as colunas Descrição, Preço (R$), Unidade, Categoria, Estoque, Prazo (dias).')
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4 dark:bg-slate-900 dark:border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5"><Store className="w-4 h-4 text-primary" /> Dados da oferta</h3>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Descrição do item *</label>
            <textarea className={INPUT} rows={2} value={form.descricao} onChange={(e) => campo('descricao', e.target.value)} placeholder="Ex.: caneta esferográfica azul, ponta média, caixa com 50" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Categoria</label>
              <select className={INPUT} value={form.categoria} onChange={(e) => campo('categoria', e.target.value)}>
                {CATEGORIAS_MERCADO.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Unidade</label>
              <input className={INPUT} value={form.unidade} onChange={(e) => campo('unidade', e.target.value)} placeholder="un, cx, kg..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { k: 'preco' as const, label: 'Preço de venda (R$) *' },
              { k: 'custo' as const, label: 'Custo unitário (R$)' },
              { k: 'frete' as const, label: 'Frete por unidade (R$)' },
              { k: 'prazo' as const, label: 'Prazo de entrega (dias)' },
              { k: 'imposto' as const, label: 'Impostos (% do preço)' },
              { k: 'despesa' as const, label: 'Despesas (% do preço)' },
              { k: 'estoque' as const, label: 'Estoque disponível' },
            ].map((c) => (
              <div key={c.k}>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">{c.label}</label>
                <input className={INPUT} inputMode="decimal" value={form[c.k]} onChange={(e) => campo(c.k, e.target.value)} placeholder="0" />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={comparar} disabled={carregandoMercado} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60">
              {carregandoMercado ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BarChart3 className="w-3.5 h-3.5" />} Comparar com o mercado
            </button>
            <button type="button" onClick={salvar} disabled={salvando} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-60">
              {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Salvar oferta
            </button>
            <button type="button" onClick={carregarOfertas} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">
              <Download className="w-3.5 h-3.5" /> Minhas ofertas
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4 dark:bg-slate-900 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5"><Wallet className="w-4 h-4 text-emerald-500" /> Resultado da oferta</h3>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div><p className="text-[10px] uppercase text-slate-500">Lucro</p><p className={cn('text-sm font-bold', margem.lucro >= 0 ? 'text-emerald-600' : 'text-rose-600')}>{moeda(margem.lucro)}</p></div>
              <div><p className="text-[10px] uppercase text-slate-500">Margem</p><p className="text-sm font-bold text-slate-900 dark:text-white">{pct(margem.margemPct)}</p></div>
              <div><p className="text-[10px] uppercase text-slate-500">Markup</p><p className="text-sm font-bold text-slate-900 dark:text-white">{pct(margem.markupPct)}</p></div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Custo total: {moeda(margem.custoTotal)} · Receita: {moeda(margem.receita)}</p>
          </div>

          <div className="card p-4 dark:bg-slate-900 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5"><Gauge className="w-4 h-4 text-primary" /> Índice de competitividade</h3>
              <span className="text-2xl font-extrabold text-primary">{indice.total}<span className="text-xs text-slate-400">/100</span></span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${indice.total}%` }} /></div>
            <ul className="mt-3 space-y-1.5">
              {indice.criterios.map((c) => (
                <li key={c.nome} className="flex items-start justify-between gap-2 text-[11px]">
                  <span className="text-slate-600 dark:text-slate-300"><strong>{c.nome}</strong>: {c.detalhe}</span>
                  <span className="shrink-0 font-semibold text-slate-700 dark:text-slate-200">{c.pontos.toFixed(0)}/{c.maximo}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[10px] text-amber-600 dark:text-amber-400">{AVISO_INDICE}</p>
          </div>

          {stats && (
            <div className="card p-4 dark:bg-slate-900 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
              <p className="font-semibold text-slate-900 dark:text-white mb-1">Mercado ({stats.quantidade} registros)</p>
              <p>Menor {moeda(stats.minimo)} · Mediana {moeda(stats.mediana)} · Maior {moeda(stats.maximo)}</p>
            </div>
          )}
        </div>
      </div>

      {precisaLogin && <LoginAviso />}
      {erro && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{erro}</p>}
      {aviso && <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">{aviso}</p>}

      <div className="card p-4 dark:bg-slate-900 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5"><FileSpreadsheet className="w-4 h-4 text-primary" /> Minhas ofertas ({ofertas.length})</h3>
          <div className="flex flex-wrap gap-1.5">
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              <Upload className="w-3 h-3" /> Importar CSV/XLSX
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importar(f); e.target.value = '' }} />
            </label>
            <button type="button" onClick={() => exportar('csv')} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300"><Download className="w-3 h-3" /> CSV</button>
            <button type="button" onClick={() => exportar('xlsx')} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300"><Download className="w-3 h-3" /> XLSX</button>
          </div>
        </div>
        {carregandoOfertas ? (
          <p className="mt-3 text-xs text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Carregando...</p>
        ) : ofertas.length === 0 ? (
          <p className="mt-3 text-xs text-slate-400">Clique em “Minhas ofertas” para carregar ou salve a primeira oferta.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {ofertas.map((o) => (
              <li key={o.id} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{o.descricao}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{moeda(o.preco)} · {o.categoria} · índice {o.indice_competitividade ?? '—'}</p>
                </div>
                <button type="button" onClick={() => remover(o.id)} aria-label="Excluir oferta" className="text-slate-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 7.3 — Assistente de integração
// ---------------------------------------------------------------------------
function Integracao() {
  const [canal, setCanal] = useState(CANAIS_INTEGRACAO[0].id)
  const atual = CANAIS_INTEGRACAO.find((c) => c.id === canal) || CANAIS_INTEGRACAO[0]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {CANAIS_INTEGRACAO.map((c) => (
          <button key={c.id} type="button" onClick={() => setCanal(c.id)} className={cn('rounded-full border px-3 py-1.5 text-xs font-semibold', canal === c.id ? 'border-primary bg-primary text-white' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary')}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="card p-5 dark:bg-slate-900 dark:border-slate-800">
        <h3 className="font-semibold text-slate-900 dark:text-white">{atual.label}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{atual.descricao}</p>
        <ul className="mt-3 space-y-2">
          {atual.checklist.map((i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /> {i}</li>
          ))}
        </ul>
      </div>
      <p className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3 text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {AVISO_INTEGRACAO}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 7.5 — Radar de normas
// ---------------------------------------------------------------------------
function RadarNormas({ normas }: { normas: SicxNorma[] }) {
  const [assinados, setAssinados] = useState<Record<string, string>>({})
  const [precisaLogin, setPrecisaLogin] = useState(false)
  const [erro, setErro] = useState('')

  function ehNovo(data: string | null): boolean {
    if (!data) return false
    const d = new Date(`${data}T00:00:00`)
    if (Number.isNaN(d.getTime())) return false
    return (AGORA_MS - d.getTime()) / 86400000 <= 30
  }

  async function assinar(norma: SicxNorma) {
    setErro('')
    try {
      const r = await apiSicxOpcional<{ alerta: { id: string } }>('/api/sicx/alertas', jsonInit('POST', { tipo: 'norma', referencia: norma.id }))
      if (!r) { setPrecisaLogin(true); return }
      setAssinados((a) => ({ ...a, [norma.id]: r.alerta.id }))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível assinar as novidades.')
    }
  }

  async function cancelar(norma: SicxNorma) {
    const id = assinados[norma.id]
    if (!id) return
    try {
      await apiSicxOpcional(`/api/sicx/alertas?id=${id}`, { method: 'DELETE' })
      setAssinados((a) => { const c = { ...a }; delete c[norma.id]; return c })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível cancelar.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {normas.map((n) => (
          <div key={n.id} className="card p-4 dark:bg-slate-900 dark:border-slate-800">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">{n.titulo}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{n.orgao || 'Órgão não informado'}{n.data_publicacao ? ` · ${dataBR(n.data_publicacao)}` : ''}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {ehNovo(n.data_publicacao) && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">Novo</span>}
                {n.status_link === 'verificado' && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">Verificado</span>}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {n.status_link === 'verificado' && n.url ? (
                <a href={n.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"><Link2 className="w-3 h-3" /> Abrir fonte</a>
              ) : (
                <span className="text-[11px] text-slate-400">Link a verificar — não exibido como ativo.</span>
              )}
              <button type="button" onClick={() => (assinados[n.id] ? cancelar(n) : assinar(n))} className={cn('inline-flex items-center gap-1 text-[11px] font-semibold', assinados[n.id] ? 'text-emerald-600' : 'text-slate-500 hover:text-primary')}>
                <Bell className="w-3 h-3" /> {assinados[n.id] ? 'Acompanhando' : 'Acompanhar novidades'}
              </button>
            </div>
          </div>
        ))}
      </div>
      {precisaLogin && <LoginAviso />}
      {erro && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{erro}</p>}
      <p className="text-[11px] text-slate-400">O selo “Novo” marca publicações dos últimos 30 dias. As assinaturas geram alertas internos; não enviamos e-mail nesta página.</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 7.6 — Monitor público de CNPJ
// ---------------------------------------------------------------------------
function MonitorCnpj() {
  const [cnpj, setCnpj] = useState('')
  const [dados, setDados] = useState<{
    encontrado: boolean
    fornecedor: { razao_social?: string | null; participacoes?: number; vitorias?: number; valor_total_homologado?: number; ultima_participacao?: string | null } | null
    participacoes: Array<{ pncp_id: string; orgao_nome: string | null; uf: string | null; valor_total_homologado: number | null; data_resultado: string | null }>
    aviso?: string
  } | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [precisaLogin, setPrecisaLogin] = useState(false)

  async function buscar() {
    const digitos = cnpj.replace(/\D/g, '')
    if (digitos.length !== 14) { setErro('Informe um CNPJ com 14 dígitos.'); return }
    setErro(''); setCarregando(true); setDados(null)
    try {
      const r = await apiSicxOpcional<typeof dados>(`/api/sicx/monitor?cnpj=${digitos}`)
      if (!r) { setPrecisaLogin(true); return }
      setDados(r)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível consultar o CNPJ.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-4 dark:bg-slate-900 dark:border-slate-800">
        <div className="flex flex-wrap gap-2">
          <input className={`${INPUT} flex-1 min-w-[200px]`} value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" aria-label="CNPJ" />
          <button type="button" onClick={buscar} disabled={carregando} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60">
            {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />} Consultar
          </button>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">Consulta sobre a base interna alimentada por resultados publicados no PNCP.</p>
      </div>

      {precisaLogin && <LoginAviso />}
      {erro && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{erro}</p>}

      {dados && !dados.encontrado && (
        <div className="card p-5 dark:bg-slate-900 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-300">{dados.aviso}</div>
      )}

      {dados?.encontrado && dados.fornecedor && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Participações', valor: String(dados.fornecedor.participacoes ?? 0) },
              { label: 'Vitórias', valor: String(dados.fornecedor.vitorias ?? 0) },
              { label: 'Valor homologado', valor: moeda(dados.fornecedor.valor_total_homologado ?? 0) },
              { label: 'Última participação', valor: dataBR(dados.fornecedor.ultima_participacao || null) },
            ].map((s) => (
              <div key={s.label} className="card p-4 dark:bg-slate-900 dark:border-slate-800">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{s.label}</p>
                <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{s.valor}</p>
              </div>
            ))}
          </div>
          <div className="card p-4 dark:bg-slate-900 dark:border-slate-800 overflow-x-auto">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">{dados.fornecedor.razao_social || 'Fornecedor'}</h4>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400">
                  <th className="py-1 pr-3">Órgão</th>
                  <th className="py-1 pr-3">UF</th>
                  <th className="py-1 pr-3">Valor</th>
                  <th className="py-1">Data</th>
                </tr>
              </thead>
              <tbody>
                {dados.participacoes.map((p, i) => (
                  <tr key={`${p.pncp_id}-${i}`} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-1.5 pr-3 text-slate-700 dark:text-slate-200">{p.orgao_nome || '—'}</td>
                    <td className="py-1.5 pr-3 text-slate-500 dark:text-slate-400">{p.uf || '—'}</td>
                    <td className="py-1.5 pr-3 text-slate-700 dark:text-slate-200">{p.valor_total_homologado != null ? moeda(p.valor_total_homologado) : '—'}</td>
                    <td className="py-1.5 text-slate-500 dark:text-slate-400">{dataBR(p.data_resultado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {dados.participacoes.length === 0 && <p className="mt-2 text-xs text-slate-400">Nenhuma participação detalhada na base.</p>}
          </div>
          {dados.aviso && <p className="text-[11px] text-slate-400">{dados.aviso}</p>}
        </>
      )}
      <p className="text-[11px] text-slate-400 flex items-start gap-1.5"><Target className="w-3.5 h-3.5 mt-0.5 shrink-0" /> Monitor informativo. Não avalia idoneidade, não prevê resultado e não substitui consulta oficial.</p>
    </div>
  )
}
