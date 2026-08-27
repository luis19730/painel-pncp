import Link from 'next/link'
import Footer from '@/components/layout/footer'
import Logo from '@/components/layout/logo'
import ThemeToggle from '@/components/layout/theme-toggle'
import Button from '@/components/ui/button'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0b1120]">
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0b1120]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Logo href="/" />

          <nav className="hidden md:flex items-center gap-8">
            <NavLink href="/#como-funciona">Como funciona</NavLink>
            <NavLink href="/precos">Mapa de Preços</NavLink>
            <NavLink href="/planos">Planos</NavLink>
            <NavLink href="/sobre">Sobre</NavLink>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:inline-flex text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
              Entrar
            </Link>
            <ThemeToggle />
            <Link href="/cadastro">
              <Button size="sm">Começar agora</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <Footer />
    </div>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
      {children}
    </Link>
  )
}
