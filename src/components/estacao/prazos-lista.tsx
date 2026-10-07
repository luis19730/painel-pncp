'use client'

import Link from 'next/link'
import { Clock, Circle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { encodePncpId } from '@/lib/estacao/encode'
import { TIPOS_PRAZO } from '@/lib/estacao/config'

export interface PrazoComItem {
  id: string
  data_hora: string
  tipo: string
  titulo: string | null
  concluido: boolean
  item_id: string
  workspace_itens?: { numero_controle_pncp?: string; objeto?: string | null; orgao?: string | null; uf?: string | null } | null
}

function dia(iso: string): Date {
  const d = new Date(iso)
  d.setHours(0, 0, 0, 0)
  return d
}

function labelBucket(iso: string): string {
  const d = dia(iso).getTime()
  const hoje = dia(new Date().toISOString()).getTime()
  const dia1 = 86_400_000
  if (d < hoje) return 'Atrasados'
  if (d === hoje) return 'Hoje'
  if (d === hoje + dia1) return 'Amanhã'
  if (d <= hoje + 7 * dia1) return 'Esta semana'
  return 'Depois'
}

const ORDEM = ['Atrasados', 'Hoje', 'Amanhã', 'Esta semana', 'Depois']

/** Lista de prazos agrupada por período (calendário em lista). */
export default function PrazosLista({ prazos }: { prazos: PrazoComItem[] }) {
  const grupos = new Map<string, PrazoComItem[]>()
  for (const p of prazos) {
    const b = labelBucket(p.data_hora)
    if (!grupos.has(b)) grupos.set(b, [])
    grupos.get(b)!.push(p)
  }

  if (prazos.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-10">Nenhum prazo pendente. Adicione prazos na ficha de cada licitação.</p>
  }

  return (
    <div className="space-y-6">
      {ORDEM.filter((b) => grupos.has(b)).map((b) => (
        <section key={b}>
          <h2 className={cn('text-sm font-bold mb-2', b === 'Atrasados' ? 'text-red-500' : 'text-slate-700 dark:text-slate-200')}>
            {b} <span className="text-slate-400 font-normal">({grupos.get(b)!.length})</span>
          </h2>
          <ul className="space-y-2">
            {grupos.get(b)!.map((p) => {
              const it = p.workspace_itens || {}
              const slug = it.numero_controle_pncp ? encodePncpId(it.numero_controle_pncp) : ''
              const atras = new Date(p.data_hora).getTime() < Date.now()
              return (
                <li key={p.id} className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                  <span className={cn('shrink-0', atras ? 'text-red-500' : 'text-slate-300')}>
                    {p.concluido ? <CheckCircle2 className="w-5 h-5 text-success" /> : <Circle className="w-5 h-5" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                      {p.titulo || TIPOS_PRAZO.find((t) => t.id === p.tipo)?.label}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {slug ? (
                        <Link href={`/estacao/${slug}`} className="hover:text-primary">{it.objeto || it.numero_controle_pncp} — {it.orgao || ''}</Link>
                      ) : (
                        it.objeto || 'Licitação'
                      )}
                    </p>
                  </div>
                  <span className={cn('text-xs font-semibold whitespace-nowrap', atras ? 'text-red-500' : 'text-slate-500')}>
                    <Clock className="w-3 h-3 inline mr-1" />
                    {new Date(p.data_hora).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
