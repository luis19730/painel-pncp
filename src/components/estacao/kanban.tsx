'use client'

import { useState } from 'react'
import CardItem, { type BoardItem } from '@/components/estacao/card-item'
import { ETAPAS } from '@/lib/estacao/config'
import { cn } from '@/lib/utils'

/**
 * Kanban da estação. Drag&drop nativo (desktop) e seletor de etapa no card
 * (mobile). Não usa nenhuma biblioteca nova.
 */
export default function Kanban({
  itens,
  onMover,
}: {
  itens: BoardItem[]
  onMover: (itemId: string, etapa: string) => void
}) {
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x">
      {ETAPAS.map((col) => {
        const cards = itens
          .filter((i) => i.etapa === col.id)
          .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
        return (
          <section
            key={col.id}
            onDragOver={(e) => {
              e.preventDefault()
              setOver(col.id)
            }}
            onDragLeave={() => setOver((o) => (o === col.id ? null : o))}
            onDrop={(e) => {
              e.preventDefault()
              const id = e.dataTransfer.getData('text/plain') || dragging
              if (id) onMover(id, col.id)
              setOver(null)
              setDragging(null)
            }}
            className={cn(
              'flex-1 min-w-[270px] max-w-[320px] rounded-2xl border p-3 snap-start transition-colors',
              over === col.id
                ? 'border-primary bg-primary/5'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40'
            )}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">{col.label}</h3>
              <span className="text-xs font-semibold text-slate-400 bg-white dark:bg-slate-800 rounded-full px-2 py-0.5">
                {cards.length}
              </span>
            </div>
            <div className="space-y-3 min-h-[60px]">
              {cards.map((i) => (
                <CardItem
                  key={i.id}
                  item={i}
                  onMover={onMover}
                  onDragStart={setDragging}
                  onDragEnd={() => setDragging(null)}
                />
              ))}
              {cards.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-8">Solte um cartão aqui</p>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
