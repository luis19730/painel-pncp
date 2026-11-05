'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, RefreshCw, Search, Zap } from 'lucide-react'
import DataSourceNotice, { type DataSource } from '@/components/ui/data-source-notice'
import EmptyState from '@/components/ui/empty-state'
import { CardSkeleton } from '@/components/ui/skeleton'
import OpportunityCard from '@/components/opportunities/opportunity-card'
import { searchLiveOpportunities } from '@/lib/pncp-data'
import { calculateScore, scoreOpportunities } from '@/lib/scoring'
import { normalizar } from '@/lib/utils'
import type { Opportunity, CompanyProfile } from '@/types'

const SICX_RE = /credenciament|com[ré]rcio eletr[ôo]nico|compras expressas|\bsicx\b/i

function isSicx(o: Opportunity): boolean {
  return SICX_RE.test(`${o.modalidade} ${o.objeto}`)
}

function perfilLocal(): CompanyProfile | null {
  try {
    const raw = localStorage.getItem('perfilEmpresa')
    if (!raw) return null
    const d = JSON.parse(raw)
    return {
      id: '', user_id: '',
      cnpj: d.cnpj || null,
      razao_social: d.razaoSocial || null,
      nome_fantasia: d.nomeFantasia || null,
      cnaes: d.cnaes || [],
      segmentos: d.segmentos || [],
      produtos: d.produtos || [],
      servicos: d.servicos || [],
      palavras_chave: d.palavrasChave || [],
      estados: d.estados || [],
      municipios: d.municipios || [],
      valor_minimo: d.valorMinimo || null,
      valor_maximo: d.valorMaximo || null,
      modalidades: d.modalidades || [],
    } as CompanyProfile
  } catch {
    return null
  }
}

/**
 * Busca de credenciamentos publicados no PNCP — mantém a funcionalidade que já
 * existia na página, agora como ilha dentro do guia público.
 */
export default function Oportunidades() {
  const [itens, setItens] = useState<Opportunity[]>([])
  const [carregando, setCarregando] = useState(true)
  const [fonte, setFonte] = useState<DataSource>('live')
  const [perfil, setPerfil] = useState<CompanyProfile | null>(null)
  const [reload, setReload] = useState(0)
  const [busca, setBusca] = useState('')

  useEffect(() => {
    // Fora do corpo do efeito para não disparar render em cascata.
    const id = window.setTimeout(() => setPerfil(perfilLocal()), 0)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    let cancelado = false
    const inicio = window.setTimeout(() => setCarregando(true), 0)
    ;(async () => {
      try {
        const live = await searchLiveOpportunities('credenciamento')
        if (live && live.length > 0) {
          const apenas = live.filter(isSicx)
          const lista = apenas.length > 0 ? apenas : live
          const pontuada = lista.map((o) => ({ ...o, score: calculateScore(o, perfil).total }))
          if (!cancelado) {
            setItens(scoreOpportunities(pontuada, perfil))
            setFonte('live')
          }
        } else {
          if (!cancelado) {
            setItens([])
            setFonte('live')
          }
        }
      } catch {
        if (!cancelado) {
          setItens([])
          setFonte('live')
        }
      } finally {
        if (!cancelado) setCarregando(false)
      }
    })()
    return () => {
      cancelado = true
      window.clearTimeout(inicio)
    }
  }, [perfil, reload])

  const termo = normalizar(busca.trim())
  const filtrados = useMemo(
    () =>
      termo
        ? itens.filter((o) => normalizar(`${o.objeto} ${o.orgao} ${o.municipio} ${o.uf} ${o.modalidade}`).includes(termo))
        : itens,
    [itens, termo]
  )

  return (
    <div className="space-y-4">
      {!carregando && <DataSourceNotice source={fonte} />}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Processos de <strong>credenciamento</strong> publicados no PNCP. O SICX usa o credenciamento por comércio eletrônico.
        </p>
        <button type="button" onClick={() => setReload((n) => n + 1)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </button>
      </div>

      {carregando ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : itens.length === 0 ? (
        <EmptyState
          icon={<Zap className="w-8 h-8" />}
          title="Nenhum credenciamento encontrado agora"
          description="Não localizamos processos de credenciamento publicados no PNCP neste momento. Tente atualizar mais tarde."
          action="Ver todas as oportunidades"
          actionHref="/oportunidades"
        />
      ) : (
        <>
          <form onSubmit={(e) => e.preventDefault()} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por objeto, órgão, município..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </form>

          <p className="text-sm text-slate-500 dark:text-slate-400">{filtrados.length} resultado(s)</p>
          {filtrados.length === 0 ? (
            <EmptyState icon={<Search className="w-8 h-8" />} title="Nenhum resultado" description="Tente outro termo ou apague a busca." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtrados.slice(0, 12).map((item) => <OpportunityCard key={item.id} item={item} />)}
            </div>
          )}
          <Link href="/oportunidades?modalidade=Credenciamento" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover">
            Ver todos os credenciamentos <ArrowRight className="w-4 h-4" />
          </Link>
        </>
      )}
    </div>
  )
}
