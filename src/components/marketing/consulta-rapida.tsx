'use client'

// ============================================================================
// Consulta rápida (landing → home): formulário interativo que faz uma BUSCA
// REAL no PNCP e mostra os editais encontrados, com link para o detalhe/PNCP.
// Reutiliza a mesma fonte de dados das páginas Oportunidades/Busca.
// ============================================================================

import { useState } from 'react'
import Link from 'next/link'
import { Search, Loader2, ArrowRight, AlertCircle } from 'lucide-react'
import OpportunityCard from '@/components/opportunities/opportunity-card'
import DataSourceNotice, { type DataSource } from '@/components/ui/data-source-notice'
import { searchLiveOpportunities } from '@/lib/pncp-data'
import { UFS_BRASIL } from '@/data/municipios'
import { MODALIDADES_PNCP } from '@/lib/calendario/modalidades'
import type { Opportunity } from '@/types'

const INPUT_CLS =
  'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'

const VALORES = [
  { id: '', label: 'Qualquer valor', min: undefined as number | undefined, max: undefined as number | undefined },
  { id: 'ate50', label: 'Até 50 mil', min: undefined, max: 50000 },
  { id: '50a200', label: '50 mil a 200 mil', min: 50000, max: 200000 },
  { id: '200a1m', label: '200 mil a 1 milhão', min: 200000, max: 1000000 },
  { id: 'acimade1m', label: 'Acima de 1 milhão', min: 1000000, max: undefined },
]

export default function ConsultaRapida() {
  const [q, setQ] = useState('')
  const [uf, setUf] = useState('')
  const [modalidade, setModalidade] = useState('')
  const [valor, setValor] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(false)
  const [resultados, setResultados] = useState<Opportunity[] | null>(null)
  const [fonte, setFonte] = useState<DataSource>('live')

  const buscar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (carregando) return
    setCarregando(true)
    setErro(false)

    const faixa = VALORES.find((v) => v.id === valor) || VALORES[0]
    try {
      const live = await searchLiveOpportunities(q.trim() || 'licitacao', {
        uf: uf || undefined,
        modalidade: modalidade || undefined,
      })
      if (!live || live.length === 0) {
        setResultados([])
        setFonte('local')
        return
      }
      const filtrados = live.filter((o) => {
        if (faixa.min == null && faixa.max == null) return true
        if (!o.valor || o.valor <= 0) return false
        if (faixa.min != null && o.valor < faixa.min) return false
        if (faixa.max != null && o.valor > faixa.max) return false
        return true
      })
      setResultados(filtrados)
      setFonte('live')
    } catch {
      setErro(true)
      setResultados(null)
    } finally {
      setCarregando(false)
    }
  }

  const verTodasQs = new URLSearchParams()
  if (q.trim()) verTodasQs.set('q', q.trim())
  if (uf) verTodasQs.set('uf', uf)
  if (modalidade) verTodasQs.set('modalidade', modalidade)
  const verTodasHref = `/oportunidades${verTodasQs.toString() ? `?${verTodasQs}` : ''}`

  return (
    <section id="consulta" className="py-20 md:py-24 bg-slate-50 dark:bg-slate-900/30 border-y border-slate-100 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="max-w-2xl mb-8">
          <h2 className="text-3xl md:text-4xl font-extrabold font-display text-slate-900 dark:text-white mb-3">
            Teste a consulta agora
          </h2>
          <p className="text-slate-600 dark:text-slate-300">
            Filtre editais do PNCP por palavra-chave, UF, modalidade e faixa de valor. Os resultados
            abaixo são consultados em tempo real na fonte pública.
          </p>
        </div>

        <form onSubmit={buscar} className="grid gap-3 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1.3fr_1fr_auto]">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Palavra-chave (ex.: notebooks, obra, merenda)"
            aria-label="Palavra-chave"
            className={INPUT_CLS}
          />
          <select value={uf} onChange={(e) => setUf(e.target.value)} aria-label="UF" className={INPUT_CLS}>
            <option value="">UF (Todas)</option>
            {UFS_BRASIL.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <select value={modalidade} onChange={(e) => setModalidade(e.target.value)} aria-label="Modalidade" className={INPUT_CLS}>
            <option value="">Modalidade (Todas)</option>
            {MODALIDADES_PNCP.map((m) => (
              <option key={m.codigo} value={m.nome}>{m.nome}</option>
            ))}
          </select>
          <select value={valor} onChange={(e) => setValor(e.target.value)} aria-label="Faixa de valor" className={INPUT_CLS}>
            {VALORES.map((v) => (
              <option key={v.id} value={v.id}>{v.label}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={carregando}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 hover:opacity-95 transition-all disabled:opacity-60"
          >
            {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {carregando ? 'Consultando…' : 'Consultar'}
          </button>
        </form>

        <div className="mt-6">
          {carregando ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="card p-5 animate-pulse">
                  <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-700 mb-3" />
                  <div className="h-3 w-3/4 rounded bg-slate-200 dark:bg-slate-700 mb-2" />
                  <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
                </div>
              ))}
            </div>
          ) : erro ? (
            <div className="card bg-white dark:bg-slate-900 p-6 text-center">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Dados indisponíveis no momento. Não foi possível consultar a API pública do PNCP agora.
              </p>
            </div>
          ) : resultados === null ? (
            <p className="text-sm text-slate-400">
              Preencha os filtros e clique em <strong>Consultar</strong> para ver editais reais.
            </p>
          ) : resultados.length === 0 ? (
            <div className="card bg-white dark:bg-slate-900 p-6 text-center">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Nenhum edital encontrado com esses filtros.</p>
              <p className="text-xs text-slate-400 mt-1">Ajuste a palavra-chave, a UF ou a faixa de valor e tente novamente.</p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <DataSourceNotice source={fonte} />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                {resultados.length} edital(is) encontrado(s). Exibindo os {Math.min(6, resultados.length)} mais relevantes.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {resultados.slice(0, 6).map((item) => (
                  <OpportunityCard key={item.id} item={item} />
                ))}
              </div>
              <div className="mt-6">
                <Link href={verTodasHref} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover">
                  Ver todas as oportunidades <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="mt-6 text-xs text-slate-400">
          O Painel PNCP é uma plataforma independente e não possui vínculo com o PNCP ou órgãos do
          Governo Federal. Consulte sempre a fonte oficial.
        </p>
      </div>
    </section>
  )
}
