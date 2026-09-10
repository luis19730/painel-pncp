'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { trackPageview } from '@/lib/analytics'

/**
 * Componente invisível que registra pageviews em cada navegação (incluindo
 * navegações client-side). Usa usePathname para reagir a mudanças de rota.
 */
export default function PageviewTracker() {
  const pathname = usePathname()
  const lastTracked = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname || pathname === lastTracked.current) return
    lastTracked.current = pathname
    trackPageview(pathname)
  }, [pathname])

  return null
}