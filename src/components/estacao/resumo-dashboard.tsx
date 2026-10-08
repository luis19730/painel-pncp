'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LayoutGrid, Clock, Trophy, ArrowRight, Plus } from 'lucide-react'
import { apiEstacao } from '@/lib/estacao/client'
import { encodePncpId } from '@/lib/estacao/encode'
import { TIPOS_PRAZO } from '@/lib/estacao/config'
import { countdown } from '@/components/estacao/card-item'

interface Proximo {
  id: string
  titulo: string | null
  tipo: string
  data_hora: string
  item_id: string
  workspace_itens?: { numero_controle_pncp?: string; objeto?: string | null; orgao?: string | null } | null
}

interface Resumo {
  total: number
  ativas: number
  ganhas: number
  prazos48h: number
  proximos: Proximo[]
}

/** Cartão-resumo da Estação exibido no /dashboard. Nunca quebra o dashboard:
 *  em erro/sem sessão, simplesmente não renderiza. */
export default function ResumoEstacao() {
  const [dados, setDados] = useState<Resumo | null>(null)
  const [loading, setLoading] = useState(true)
  const [oculto, setOculto] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const d = await apiEstacao<Resumo>('/api/estacao/resumo')
        setDados(d)
      } catch {
        setOculto(true)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (oculto) return null
  if (loading) return <div className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
  if (!dados) return null

  if (dados.total === 0) {
    return (
      <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-primary" /> Minha Estação
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Adicione licitações e acompanhe do edital ao resultado — com prazos, notas e alertas por e-mail.
          </p>
        </div>
        <Link href="/oportunidades" className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover shrink-0">
          <Plus className="w-4 h-4" /> Adicionar licitações
        </Link>
      </div>
    )
  }

  return (
    <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-primary" /> Minha Estação
        </h2>
        <Link href="/estacao" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
          Abrir estação <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
          <p className="text-[11px] text-slate-500">Ativas</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">{dados.ativas}</p>
        </div>
        <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 p-3">
          <p className="text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1"><Clock className="w-3 h-3" /> Prazos 48h</p>
          <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{dados.prazos48h}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-3">
          <p className="text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1"><Trophy className="w-3 h-3" /> Vitórias</p>
          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{dados.ganhas}</p>
        </div>
      </div>

      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">Próximos prazos</p>
      {dados.proximos.length === 0 ? (
        <p className="text-xs text-slate-400">Nenhum prazo futuro cadastrado. Abra a ficha de uma licitação para adicionar prazos.</p>
      ) : (
        <ul className="space-y-2">
          {dados.proximos.slice(0, 3).map((p) => {
            const it = p.workspace_itens || {}
            const cd = countdown(p.data_hora)
            const slug = it.numero_controle_pncp ? encodePncpId(it.numero_controle_pncp) : ''
            return (
              <li key={p.id} className="flex items-center gap-3">
                <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  cd.atrasado || cd.urgente
                    ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                }`}>{cd.texto}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                    {p.titulo || TIPOS_PRAZO.find((t) => t.id === p.tipo)?.label}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {slug ? (
                      <Link href={`/estacao/${slug}`} className="hover:text-primary">{it.objeto || it.numero_controle_pncp}</Link>
                    ) : (
                      it.objeto || 'Licitação'
                    )}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <div className="mt-3">
        <Link href="/estacao/prazos" className="text-xs font-semibold text-primary hover:underline">Ver todos os prazos</Link>
      </div>
    </div>
  )
}
