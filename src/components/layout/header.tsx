'use client'

import Link from 'next/link'
import { Search, Bell, User, Menu, X, LogOut, Sparkles } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import Button from '@/components/ui/button'
import ThemeToggle from '@/components/layout/theme-toggle'
import Logo from '@/components/layout/logo'

export default function Header() {
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-4 lg:px-6 h-14 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0b1120]/80 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
          aria-label="Abrir menu"
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
              href="/ia"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-secondary to-accent text-white text-xs font-bold hover:opacity-90 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              IA
            </Link>

            <div className="relative group">
              <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Menu do usuário">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              </button>
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <Link href="/perfil" className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">
                  Meu Perfil
                </Link>
                <Link href="/configuracoes" className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">
                  Configurações
                </Link>
                <Link href="/planos" className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">
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
            </div>
          </>
        ) : (
          <Link href="/login">
            <Button size="sm">Entrar</Button>
          </Link>
        )}
      </div>

      {mobileOpen && (
        <MobileNav onClose={() => setMobileOpen(false)} user={user} onLogout={handleLogout} />
      )}
    </header>
  )
}

function MobileNav({
  onClose,
  user,
  onLogout,
}: {
  onClose: () => void
  user: SupabaseUser | null
  onLogout: () => void
}) {
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
        { href: '/relatorios', label: 'Relatórios' },
        { href: '/calendario', label: 'Calendário' },
      ],
    },
    {
      title: 'Gerenciar',
      links: [
        { href: '/favoritos', label: 'Favoritos' },
        { href: '/perfil', label: 'Perfil' },
        { href: '/configuracoes', label: 'Configurações' },
        { href: '/planos', label: 'Planos' },
      ],
    },
  ]

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={onClose} />
      <div className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-[#0b1120] shadow-xl p-4 overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <Logo href="/dashboard" />
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
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
            className="w-full mt-4 px-3 py-2.5 rounded-lg text-sm font-medium text-danger hover:bg-danger-soft dark:hover:bg-red-500/10 text-left flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        )}
      </div>
    </div>
  )
}
