'use client'

import Link from 'next/link'
import { Search, Bell, User, Menu, X, LogOut, Sparkles } from 'lucide-react'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import Button from '@/components/ui/button'
import ThemeToggle from '@/components/layout/theme-toggle'
import Logo from '@/components/layout/logo'

export default function Header() {
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [supabase])

  // O drawer (portal) fica sempre montado e alterna classes de transição CSS
  // (sem timers): fechar nunca depende de re-render assíncrono, então links,
  // backdrop, X e Escape sempre fecham o menu de forma confiável.

  const mobileToggle = () => setMobileOpen((v) => !v)

  // Trava o scroll da página enquanto o menu mobile está aberto.
  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileOpen])

  // Fecha com a tecla Escape.
  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [mobileOpen])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-4 lg:px-6 h-14 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0b1120]/80 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button
          onClick={mobileToggle}
          className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
          aria-label="Abrir menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <div className="hidden lg:block">
          <Logo href="/dashboard" size="sm" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/busca"
          className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-sm transition-colors w-56"
        >
          <Search className="w-4 h-4" />
          <span>Buscar oportunidades...</span>
        </Link>

        <ThemeToggle />

        {user ? (
          <>
            <Link href="/alertas" className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400" aria-label="Alertas">
              <Bell className="w-5 h-5" />
            </Link>

            <Link
              href="/ia-licitacoes"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-secondary to-accent text-white text-xs font-bold hover:opacity-90 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              IA
            </Link>

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Menu do usuário"
                aria-expanded={userMenuOpen}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              </button>
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50">
                    <Link href="/perfil" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">
                      Meu Perfil
                    </Link>
                    <Link href="/configuracoes" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">
                      Configurações
                    </Link>
                    <Link href="/planos" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">
                      Planos
                    </Link>
                    <hr className="my-1 dark:border-slate-700" />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-danger-soft dark:hover:bg-red-500/10 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sair
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <Link href="/login">
            <Button size="sm">Entrar</Button>
          </Link>
        )}
      </div>

      <MobileNav
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        user={user}
        onLogout={handleLogout}
      />
    </header>
  )
}

function MobileNav({
  open,
  onClose,
  user,
  onLogout,
}: {
  open: boolean
  onClose: () => void
  user: SupabaseUser | null
  onLogout: () => void
}) {
  if (typeof document === 'undefined') return null
  const groups = [
    {
      title: 'Encontrar',
      links: [
        { href: '/dashboard', label: 'Oportunidades' },
        { href: '/busca', label: 'Buscar' },
        { href: '/meu-radar', label: 'Meu Radar' },
        { href: '/alertas', label: 'Alertas' },
      ],
    },
    {
      title: 'Analisar',
      links: [
        { href: '/precos', label: 'Mapa de Preços' },
        { href: '/concorrentes', label: 'Concorrentes' },
        { href: '/analise-edital', label: 'Análise de Edital' },
        { href: '/score', label: 'Score' },
      ],
    },
    {
      title: 'Inteligência',
      links: [
        { href: '/ia-licitacoes', label: 'IA' },
        { href: '/modalidades', label: 'Modalidades' },
        { href: '/estudo-tecnico', label: 'Estudo Técnico' },
        { href: '/matriz-riscos', label: 'Matriz de Riscos' },
      ],
    },
    {
      title: 'Preparar',
      links: [
        { href: '/checklist', label: 'Checklist' },
        { href: '/justificativa', label: 'Justificativa' },
        { href: '/documentos', label: 'Documentos' },
      ],
    },
    {
      title: 'Gerenciar',
      links: [
        { href: '/favoritos', label: 'Favoritos' },
        { href: '/relatorios', label: 'Relatórios' },
        { href: '/calendario', label: 'Calendário' },
        { href: '/perfil', label: 'Perfil' },
        { href: '/configuracoes', label: 'Configurações' },
        { href: '/planos', label: 'Planos' },
        { href: '/ajuda', label: 'Ajuda' },
      ],
    },
  ]

  return createPortal(
    <div
      className={`fixed inset-0 z-50 lg:hidden ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      inert={!open}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-black/40 dark:bg-black/60 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
        className={`absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] h-[100dvh] min-h-[100dvh] bg-white dark:bg-[#0b1120] shadow-xl p-4 overflow-y-auto overscroll-contain flex flex-col transition-transform duration-300 ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between mb-6 shrink-0">
          <Logo href="/dashboard" />
          <button
            onClick={onClose}
            className="p-2 -mr-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-5 flex-1">
          {groups.map(group => (
            <div key={group.title}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-3">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.links.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={onClose}
                    className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        {user && (
          <button
            onClick={() => { onLogout(); onClose(); }}
            className="w-full mt-4 shrink-0 px-3 py-2.5 rounded-lg text-sm font-medium text-danger hover:bg-danger-soft dark:hover:bg-red-500/10 text-left flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        )}
      </div>
    </div>,
    document.body
  )
}
