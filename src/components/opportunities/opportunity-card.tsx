'use client'

import Link from 'next/link'
import { MapPin, Building2, Calendar, Coins, ExternalLink } from 'lucide-react'
import { ScoreBadge } from '@/components/opportunities/score-badge'
import FavoriteButton from '@/components/opportunities/favorite-button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate, getDaysUntil, getDeadlineColor, getStatusColor } from '@/lib/utils'
import { buildPncpEditalUrl } from '@/lib/pncp'

export default function OpportunityCard({ item }: { item: any }) {
  const days = getDaysUntil(item.dataEncerramento)
  const href = buildPncpEditalUrl(item)

  return (
    <div className="card card-hover p-5 flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-3">
        <ScoreBadge score={item.score || 0} size="sm" />
        <div className="flex items-center gap-1.5">
          {item.situacao && (
            <Badge variant="accent" className={getStatusColor(item.situacao)}>
              {item.situacao}
            </Badge>
          )}
          <FavoriteButton pncpId={item.id} />
        </div>
      </div>

      <Link href={`/oportunidades/${item.id}`} className="group">
        <h3 className="font-semibold text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-primary transition-colors mb-2">
          {item.objeto}
        </h3>
      </Link>

      <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mb-1">
        <Building2 className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{item.orgao}</span>
      </div>
      <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mb-4">
        <MapPin className="w-3.5 h-3.5 shrink-0" />
        <span>{item.municipio || '—'}/{item.uf || '—'}</span>
        {item.modalidade && (
          <span className="ml-auto px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300">
            {item.modalidade}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 mt-auto border-t border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
            <Coins className="w-4 h-4 text-success" />
            {item.valor ? formatCurrency(item.valor) : 'A definir'}
          </div>
          {item.dataEncerramento && (
            <div className={`flex items-center gap-1.5 text-xs font-medium ${getDeadlineColor(days)}`}>
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(item.dataEncerramento)}
            </div>
          )}
        </div>
        <Link
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-hover transition-colors"
        >
          Ver no PNCP
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}
