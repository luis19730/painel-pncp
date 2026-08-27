import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const accentStyles: Record<string, string> = {
  primary: 'from-primary to-secondary',
  success: 'from-emerald-500 to-teal-500',
  warning: 'from-amber-500 to-orange-500',
  danger: 'from-rose-500 to-red-500',
  accent: 'from-cyan-500 to-blue-500',
  secondary: 'from-violet-500 to-purple-500',
}

export default function StatCard({
  label,
  value,
  icon,
  accent = 'primary',
  hint,
  className,
}: {
  label: string
  value: ReactNode
  icon?: ReactNode
  accent?: string
  hint?: string
  className?: string
}) {
  return (
    <div className={cn('card p-5 relative overflow-hidden group', className)}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            {label}
          </p>
          <div className="text-xl md:text-2xl font-bold font-display text-slate-900 dark:text-white truncate">
            {value}
          </div>
          {hint && (
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              'w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg',
              accentStyles[accent] || accentStyles.primary
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
