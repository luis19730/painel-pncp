import { ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const accentStyles: Record<string, string> = {
  primary: 'from-primary to-secondary',
  success: 'from-emerald-500 to-teal-500',
  warning: 'from-amber-500 to-orange-500',
  danger: 'from-rose-500 to-red-500',
  accent: 'from-cyan-500 to-blue-500',
  secondary: 'from-violet-500 to-purple-500',
}

/**
 * Escolhe o tamanho da fonte do valor de forma RESPONSIVA, com base no
 * comprimento do texto. Garante que valores monetários grandes (ex.: R$
 * 20.853.111,11) sejam reduzidos de tamanho em vez de cortados ("...") ou de
 * estourar o card. NUNCA usa truncate/ellipsis/overflow-hidden para esconder
 * parte do número.
 */
function fontSizeFor(value: ReactNode): string {
  const len = value == null ? 0 : String(value).length
  if (len > 22) return 'text-base md:text-lg leading-tight'
  if (len > 17) return 'text-lg leading-tight'
  if (len > 13) return 'text-lg md:text-xl leading-tight'
  if (len > 10) return 'text-xl md:text-2xl leading-tight'
  return 'text-2xl md:text-3xl leading-tight'
}

export default function StatCard({
  label,
  value,
  icon,
  accent = 'primary',
  hint,
  className,
  href,
}: {
  label: string
  value: ReactNode
  icon?: ReactNode
  accent?: string
  hint?: string
  className?: string
  href?: string
}) {
  const body = (
    <>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            {label}
          </p>
          <div
            className={cn(
              'font-bold font-display text-slate-900 dark:text-white whitespace-nowrap min-w-0',
              fontSizeFor(value)
            )}
          >
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
    </>
  )

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          'card p-5 group h-full block cursor-pointer',
          'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:border-primary/40',
          className
        )}
      >
        {body}
      </Link>
    )
  }

  return <div className={cn('card p-5 h-full', className)}>{body}</div>
}
