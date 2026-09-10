'use client'

import Link from 'next/link'
import { track } from '@/lib/analytics'
import { cn } from '@/lib/utils'

/**
 * Botão de CTA dos planos pagos. Registra a conversão ao clicar.
 */
export default function PlanCtaLink({
  href,
  plano,
  highlighted,
  className,
  children,
}: {
  href: string
  plano: string
  highlighted?: boolean
  className?: string
  children: React.ReactNode
}) {
  const handleClick = () => {
    track({ event: 'conversion', page: 'planos', props: { plano } })
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-bold text-sm px-4 py-3 transition-all duration-200',
        highlighted
          ? 'bg-gradient-to-r from-primary to-secondary text-white hover:opacity-95 shadow-lg shadow-primary/25 hover:scale-[1.02]'
          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700',
        className
      )}
    >
      {children}
    </Link>
  )
}