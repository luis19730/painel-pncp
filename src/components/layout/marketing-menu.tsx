'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { href: '/#como-funciona', label: 'Como funciona' },
  { href: '/precos', label: 'Mapa de Preços' },
  { href: '/planos', label: 'Planos' },
  { href: '/sobre', label: 'Sobre' },
]

/**
 * Menu hambúrguer do site público (marketing).
 *
 * Renderizado via portal em `document.body`: o `backdrop-blur-md` do header
 * cria um containing block e faria `position: fixed` virar relativo ao header
 * (menu vira "aba de rolagem"). No body, o drawer é um overlay de tela cheia.
 *
 * O overlay fica sempre montado e alterna apenas classes de transição CSS
 * (sem timers em JS): fechar nunca re-renderiza/desmonta de forma assíncrona,
 * então links, backdrop, X e Escape sempre fecham o menu de forma confiável.
 */
export default function MarketingMenu() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Trava o scroll da página enquanto o menu está aberto.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // Fecha com a tecla Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Nunca deve rodar em SSR (sem `document`): pool dos hooks acima e, fora
  // deles, apenas o retorno usa createPortal.
  if (typeof document === 'undefined') return null

  const active = (href: string) =>
    pathname === href || (href !== '/#como-funciona' && pathname.startsWith(href))

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="md:hidden p-2 -mr-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
        aria-label="Abrir menu de páginas"
        aria-expanded={open}
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {createPortal(
        <div
          className={cn(
            'fixed inset-0 z-50 md:hidden',
            open ? 'pointer-events-auto' : 'pointer-events-none'
          )}
          inert={!open}
          aria-hidden={!open}
        >
          <div
            className={cn(
              'absolute inset-0 bg-black/50 dark:bg-black/70 transition-opacity duration-300',
              open ? 'opacity-100' : 'opacity-0'
            )}
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu de páginas"
            className={cn(
              'absolute right-0 top-0 bottom-0 w-72 max-w-[85vw] h-[100dvh] min-h-[100dvh] bg-white dark:bg-[#0b1120] shadow-xl p-4 overflow-y-auto overscroll-contain flex flex-col transition-transform duration-300 ease-out',
              open ? 'translate-x-0' : 'translate-x-full'
            )}
          >
            <div className="flex items-center justify-between mb-6 shrink-0">
              <span className="text-sm font-bold text-slate-900 dark:text-white">Páginas</span>
              <button
                onClick={() => setOpen(false)}
                className="p-2 -mr-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                aria-label="Fechar menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="space-y-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    active(link.href)
                      ? 'bg-primary-soft dark:bg-primary/10 text-primary dark:text-primary'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid gap-2 shrink-0">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                onClick={() => setOpen(false)}
                className="block px-3 py-2.5 rounded-lg bg-primary text-center text-sm font-semibold text-white hover:bg-primary-hover"
              >
                Começar agora
              </Link>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}