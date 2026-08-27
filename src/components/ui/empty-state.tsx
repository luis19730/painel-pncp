import { ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function EmptyState({
  icon,
  title,
  description,
  action,
  actionHref,
  className,
}: {
  icon: ReactNode
  title: string
  description?: string
  action?: string
  actionHref?: string
  className?: string
}) {
  return (
    <div className={cn('card flex flex-col items-center justify-center p-10 text-center', className)}>
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mb-4 text-primary dark:text-primary">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-5">{description}</p>
      )}
      {action && actionHref && (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
        >
          {action}
        </Link>
      )}
    </div>
  )
}
