import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// ============================================================================
// Padrão visual de SEÇÃO das páginas públicas (marketing).
// Garante espaçamento, largura, cores e títulos consistentes com a home.
// ============================================================================

export function Section({
  id,
  tone = 'default',
  narrow = false,
  className,
  children,
}: {
  id?: string
  tone?: 'default' | 'muted'
  narrow?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      className={cn(
        'py-20 md:py-24',
        tone === 'muted' &&
          'bg-slate-50 dark:bg-slate-900/30 border-y border-slate-100 dark:border-slate-800',
        className
      )}
    >
      <div className={cn('mx-auto px-4', narrow ? 'max-w-4xl' : 'max-w-7xl')}>{children}</div>
    </section>
  )
}

export function SectionHead({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  as: As = 'h2',
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  align?: 'left' | 'center'
  as?: 'h1' | 'h2'
}) {
  return (
    <div className={cn('max-w-2xl mb-10', align === 'center' && 'mx-auto text-center')}>
      {eyebrow && (
        <p className="text-sm font-bold text-primary uppercase tracking-wider mb-3">{eyebrow}</p>
      )}
      <As
        className={cn(
          'font-extrabold font-display text-slate-900 dark:text-white mb-4',
          As === 'h1' ? 'text-4xl md:text-5xl' : 'text-3xl md:text-4xl'
        )}
      >
        {title}
      </As>
      {subtitle && <p className="text-lg text-slate-500 dark:text-slate-400">{subtitle}</p>}
    </div>
  )
}
