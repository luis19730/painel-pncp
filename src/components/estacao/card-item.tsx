'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Building2, MapPin, Calendar, Clock, Coins, ExternalLink } from 'lucide-react'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { encodePncpId } from '@/lib/estacao/encode'
import { buildPncpEditalUrl } from '@/lib/pncp'
import { ETAPAS, labelEtapa } from '@/lib/estacao/config'

interface PrazoMini {
  id: string
  data_hora: string
  concluido: boolean
  titulo?: string | null
  tipo?: string
}

export interface BoardItem {
  id: string
  numero_controle_pncp: string
  orgao: string | null
  uf: string | null
  municipio: string | null
  objeto: string | null
  modalidade: string | null
  valor_estimado: number | null
  data_abertura: string | null
  etapa: string
  ordem?: number
  workspace_prazos?: PrazoMini[]
}

/** Menor data_hora pendente (futura se houver; senão a mais antiga em atraso). */
export function proximoPrazo(prazos?: PrazoMini[]): PrazoMini | null {
  if (!prazos || prazos.length === 0) return null
  const pendentes = prazos.filter((p) => !p.concluido)
  if (pendentes.length === 0) return null
  const agora = Date.now()
  const futuros = pendentes
    .filter((p) => new Date(p.data_hora).getTime() >= agora)
    .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())
  if (futuros.length) return futuros[0]
  return pendentes.sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())[0]
}

export function countdown(iso: string): { texto: string; urgente: boolean; atrasado: boolean } {
  const diff = new Date(iso).getTime() - Date.now()
  const atrasado = diff < 0
  const abs = Math.abs(diff)
  const horas = Math.floor(abs / 3_600_000)
  const dias = Math.floor(horas / 24)
  let texto: string
  if (atrasado) texto = dias >= 1 ? `atrasado ${dias}d` : `atrasado ${horas}h`
  else if (dias >= 1) texto = `em ${dias}d ${horas % 24}h`
  else texto = `em ${horas}h`
  const urgente = !atrasado && diff <= 48 * 3_600_000
  return { texto, urgente, atrasado }
}

export default function CardItem({
  item,
  onMover,
  onDragStart,
  onDragEnd,
}: {
  item: BoardItem
  onMover: (itemId: string, etapa: string) => void
  onDragStart: (itemId: string) => void
  onDragEnd: () => void
}) {
  const prazo = proximoPrazo(item.workspace_prazos)
  const cd = prazo ? countdown(prazo.data_hora) : null
  const router = useRouter()
  const fichaHref = `/estacao/${encodePncpId(item.numero_controle_pncp)}`
  const pncpUrl = buildPncpEditalUrl({ id: item.numero_controle_pncp })

  const abrir = () => router.push(fichaHref)

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', item.id)
        onDragStart(item.id)
      }}
      onDragEnd={onDragEnd}
      onClick={abrir}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') abrir()
      }}
      title="Abrir a ficha desta licitação"
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer active:cursor-grabbing"
    >
      <Link href={fichaHref} onClick={(e) => e.stopPropagation()} className="block group">
        <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {item.objeto || item.numero_controle_pncp}
        </p>
      </Link>

      <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{item.orgao || '—'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span>{item.municipio || '—'}/{item.uf || '—'}</span>
          {item.modalidade && (
            <span className="ml-auto px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">{item.modalidade}</span>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
          <Coins className="w-3.5 h-3.5 text-success" />
          {item.valor_estimado ? formatCurrency(item.valor_estimado) : 'A definir'}
        </span>
        {item.data_abertura && (
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
            <Calendar className="w-3 h-3" />
            {formatDate(item.data_abertura)}
          </span>
        )}
      </div>

      {cd && (
        <div
          className={cn(
            'mt-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold',
            cd.atrasado
              ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
              : cd.urgente
                ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                : 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
          )}
          title={prazo ? new Date(prazo.data_hora).toLocaleString('pt-BR') : ''}
        >
          <Clock className="w-3 h-3" />
          {prazo?.titulo || 'Prazo'} · {cd.texto}
        </div>
      )}

      {/* Seletor de etapa (mobile / alternativa ao arrastar) */}
      <div className="mt-3 lg:hidden">
        <select
          value={item.etapa}
          onChange={(e) => onMover(item.id, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs"
          aria-label="Mover para etapa"
        >
          {ETAPAS.map((e) => (
            <option key={e.id} value={e.id}>{e.label}</option>
          ))}
          <option value="descartada">{labelEtapa('descartada')}</option>
        </select>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            abrir()
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Abrir ficha
        </button>
        <a
          href={pncpUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-primary hover:bg-slate-50 dark:hover:bg-slate-800"
          title="Abrir o edital no PNCP"
        >
          PNCP <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}
