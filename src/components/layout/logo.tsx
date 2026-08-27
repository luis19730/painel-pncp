import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function Logo({ href = '/', dark = false, size = 'md' }: { href?: string; dark?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const box = size === 'lg' ? 'w-11 h-11 text-xl' : size === 'sm' ? 'w-8 h-8 text-sm' : 'w-9 h-9 text-lg'
  const text = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-lg'

  return (
    <Link href={href} className="flex items-center gap-2.5 group">
      <div
        className={cn(
          box,
          'rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-extrabold shadow-lg shadow-primary/20 group-hover:shadow-xl group-hover:shadow-secondary/20 transition-shadow'
        )}
      >
        P
      </div>
      <span className={cn('font-extrabold font-display tracking-tight', text, dark ? 'text-white' : 'text-slate-900 dark:text-white')}>
        Painel<span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">PNCP</span>
      </span>
    </Link>
  )
}
