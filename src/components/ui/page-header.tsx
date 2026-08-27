import { ReactNode } from 'react'

export default function PageHeader({
  title,
  description,
  children,
  badge,
}: {
  title: string
  description?: string
  children?: ReactNode
  badge?: ReactNode
}) {
  return (
    <div className="mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold font-display text-slate-900 dark:text-white">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
          )}
        </div>
        {children && <div className="flex items-center gap-3">{children}</div>}
      </div>
    </div>
  )
}
