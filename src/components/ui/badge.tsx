import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

type Variant = 'success' | 'info' | 'warning' | 'danger' | 'primary' | 'secondary' | 'premium' | 'accent'

const styles: Record<Variant, string> = {
  success: 'bg-success-soft text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30',
  info: 'bg-accent-soft text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/30',
  warning: 'bg-warning-soft text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30',
  danger: 'bg-danger-soft text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30',
  primary: 'bg-primary-soft text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30',
  secondary: 'bg-secondary-soft text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/30',
  premium: 'bg-gradient-to-r from-secondary to-accent text-white border-transparent',
  accent: 'bg-neutral-100 text-slate-600 border-neutral-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
}

export function Badge({
  children,
  variant = 'accent',
  className,
  icon,
}: {
  children: ReactNode
  variant?: Variant
  className?: string
  icon?: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        styles[variant],
        className
      )}
    >
      {icon}
      {children}
    </span>
  )
}
