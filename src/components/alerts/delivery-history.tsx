'use client'

import { CheckCircle2, Clock, AlertTriangle, Mail, Send, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Canal, DeliveryRecord, StatusEnvio } from '@/lib/alerts/types'

const STATUS_META: Record<StatusEnvio, { label: string; icon: React.ReactNode; cls: string }> = {
  enviado: {
    label: 'Enviado',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    cls: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30',
  },
  agendado: {
    label: 'Agendado',
    icon: <Clock className="w-4 h-4 text-amber-500" />,
    cls: 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-200 dark:border-amber-500/30',
  },
  falhou: {
    label: 'Falhou',
    icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
    cls: 'text-red-700 dark:text-red-400 bg-red-500/10 border-red-200 dark:border-red-500/30',
  },
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function oppTitle(d: DeliveryRecord): string {
  if (!d.oportunidade_obj) return 'Oportunidade'
  try {
    const obj = JSON.parse(d.oportunidade_obj)
    return obj?.titulo || obj?.tipo || 'Oportunidade'
  } catch {
    return 'Oportunidade'
  }
}

export default function DeliveryHistory({ deliveries }: { deliveries: DeliveryRecord[] }) {
  if (!deliveries || deliveries.length === 0) {
    return (
      <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6 text-center">
        <Inbox className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto" />
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Nenhuma notificação enviada até o momento.</p>
      </div>
    )
  }

  return (
    <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-4 sm:p-5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Histórico de notificações</h3>
      <ul className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {deliveries.map((d) => {
          const meta = STATUS_META[d.status]
          return (
            <li key={d.id} className="flex items-start gap-3 rounded-xl border border-slate-100 dark:border-slate-800 p-3">
              <span className={cn('mt-0.5 shrink-0 inline-flex items-center justify-center rounded-full border p-1', meta.cls)}>
                {meta.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-800 dark:text-slate-100 text-sm truncate">{oppTitle(d)}</span>
                  <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold', meta.cls)}>
                    {meta.icon}
                    {meta.label}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    {d.canal === 'email' ? <Mail className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                    {d.canal === 'email' ? 'E-mail' : 'Telegram'}
                  </span>
                  <span>Envio: {fmtDate(d.data_envio || d.data_agendada)}</span>
                  {d.status === 'falhou' && d.erro && <span className="text-red-500">({d.erro})</span>}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
