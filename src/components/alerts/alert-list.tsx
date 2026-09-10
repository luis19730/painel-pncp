'use client'

import { Mail, Send, Pencil, Trash2, Power, Bell, CalendarClock } from 'lucide-react'
import Button from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { FREQUENCIA_LABELS, type Canal, type Frequencia } from '@/lib/alerts/types'

export interface RowAlert {
  id: string
  nome: string
  keyword: string | null
  modalidade: string | null
  uf: string | null
  municipio: string | null
  orgao: string | null
  ativo: boolean
  canais: Canal[]
  frequencia: Frequencia
  horario: string | null
  modoCalendario: boolean
}

export default function AlertList({
  alerts,
  onEdit,
  onDelete,
  onToggle,
}: {
  alerts: RowAlert[]
  onEdit: (a: RowAlert) => void
  onDelete: (a: RowAlert) => void
  onToggle: (a: RowAlert) => void
}) {
  if (alerts.length === 0) return null

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Meus alertas ({alerts.length})</h3>
      {alerts.map((a) => (
        <div
          key={a.id}
          className={cn(
            'card p-4 sm:p-5 transition-colors',
            a.ativo
              ? 'bg-white dark:bg-slate-900 dark:border-slate-800'
              : 'bg-slate-50 dark:bg-slate-900/50 opacity-75'
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Bell className={cn('w-4 h-4 shrink-0', a.ativo ? 'text-primary' : 'text-slate-400')} />
                <span className="font-semibold text-slate-900 dark:text-white truncate">{a.nome}</span>
                <Badge variant={a.ativo ? 'success' : 'accent'}>{a.ativo ? 'Ativo' : 'Inativo'}</Badge>
              </div>

              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 truncate">
                {a.keyword || 'Sem palavra-chave'}
                {a.modalidade && <span className="text-slate-400"> · {a.modalidade}</span>}
                {a.uf && <span className="text-slate-400"> · {a.uf}</span>}
                {a.municipio && <span className="text-slate-400"> · {a.municipio}</span>}
                {a.orgao && <span className="text-slate-400"> · {a.orgao}</span>}
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="sm" onClick={() => onToggle(a)} title={a.ativo ? 'Desativar' : 'Ativar'}>
                <Power className={cn('w-4 h-4', a.ativo ? 'text-emerald-500' : 'text-slate-400')} />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onEdit(a)} title="Editar">
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onDelete(a)} title="Excluir">
                <Trash2 className="w-4 h-4 text-danger" />
              </Button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            {a.canais.map((c) => (
              <span key={c} className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1">
                {c === 'email' ? <Mail className="w-3 h-3 text-primary" /> : <Send className="w-3 h-3 text-sky-500" />}
                {c === 'email' ? 'E-mail' : 'Telegram'}
              </span>
            ))}
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1">
              <CalendarClock className="w-3 h-3 text-slate-400" />
              {FREQUENCIA_LABELS[a.frequencia]}
              {a.modoCalendario && a.horario ? ` · ${a.horario}` : ''}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
