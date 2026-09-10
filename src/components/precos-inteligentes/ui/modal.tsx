'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Modal({ aberto, onFechar, titulo, children }: { aberto: boolean; onFechar: () => void; titulo?: string; children: React.ReactNode }) {
  if (!aberto) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onFechar} />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-auto rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">{titulo}</h3>
          <button type="button" onClick={onFechar} className="text-slate-400 hover:text-red-600" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className={cn('p-5')}>{children}</div>
      </div>
    </div>
  )
}