'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import Logo from '@/components/layout/logo'
import {
  Search, Radar, Bell, TrendingUp, Users, FileSearch, Gauge,
  Sparkles, Layers, ShieldAlert,
  ListChecks, FileCheck, FolderOpen,
  Star, FileBarChart, Calendar,
  Building2, Settings, HelpCircle, Type, Zap, Home
} from 'lucide-react'
import { SICX } from '@/content/sicx'

// ============================================================================
// Navegação organizada pela JORNADA de quem trabalha com licitações:
//   ENCONTRAR → ANALISAR → PRECIFICAR → MONTAR PROCESSO → ACOMPANHAR
//   + CONCORRENTES e APRENDER.
// Todas as rotas/funções existentes foram mantidas (apenas reagrupadas e
// renomeadas). Nenhuma rota mudou — não há redirects 301 necessários.
// ============================================================================
const navGroups = [
  {
    label: 'ENCONTRAR',
    items: [
      { href: '/dashboard', label: 'Início', icon: Home },
      { href: '/oportunidades', label: 'Editais abertos', icon: Search },
      { href: '/busca', label: 'Busca avançada', icon: Search },
      { href: '/modalidades', label: 'Modalidades', icon: Layers },
      { href: '/credenciamento-sicx', label: 'SICX / Compras Expressas', icon: Zap, title: SICX.resumo },
      { href: '/score', label: 'Score de oportunidade', icon: Gauge },
    ],
  },
  {
    label: 'ANALISAR',
    items: [
      { href: '/analise-edital', label: 'Análise de Edital (IA)', icon: FileSearch },
      { href: '/ia-licitacoes', label: 'IA para Licitações', icon: Sparkles, premium: true },
      { href: '/estudo-tecnico', label: 'Estudo Técnico', icon: FileSearch },
      { href: '/matriz-riscos', label: 'Matriz de Riscos', icon: ShieldAlert },
    ],
  },
  {
    label: 'PRECIFICAR',
    items: [
      { href: '/precos', label: 'Mapa de Preços', icon: TrendingUp },
      { href: '/precos-inteligentes', label: 'Pesquisa de Preços', icon: TrendingUp },
      { href: '/sinapi', label: 'SINAPI', icon: Layers },
    ],
  },
  {
    label: 'MONTAR PROCESSO',
    items: [
      { href: '/montagem-processo', label: 'Montar Processo', icon: FileCheck },
      { href: '/meus-processos', label: 'Meus Processos', icon: FolderOpen },
      { href: '/checklist', label: 'Checklist', icon: ListChecks },
      { href: '/justificativa', label: 'Justificativa', icon: FileCheck },
      { href: '/documentos', label: 'Documentos', icon: FolderOpen },
    ],
  },
  {
    label: 'ACOMPANHAR',
    items: [
      { href: '/meu-radar', label: 'Meu Radar', icon: Radar },
      { href: '/alertas', label: 'Alertas', icon: Bell },
      { href: '/favoritos', label: 'Favoritos', icon: Star },
      { href: '/calendario', label: 'Calendário de sessões', icon: Calendar },
    ],
  },
  {
    label: 'CONCORRENTES',
    items: [
      { href: '/concorrentes', label: 'Concorrentes', icon: Users },
      { href: '/relatorios', label: 'Relatórios e vencedores', icon: FileBarChart },
    ],
  },
  {
    label: 'APRENDER',
    items: [
      { href: '/ajuda', label: 'Ajuda', icon: HelpCircle },
      { href: '/sicx', label: 'O que é o SICX', icon: Zap },
    ],
  },
]

const bottomNav = [
  { href: '/perfil', label: 'Perfil', icon: Building2 },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
  { href: '/minha-assinatura', label: 'Minha Assinatura', icon: Type },
  { href: '/planos', label: 'Planos', icon: Building2, external: true },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1120] transition-all duration-300 w-60'
      )}
    >
      <div className="h-14 flex items-center px-4 border-b border-slate-100 dark:border-slate-800">
        <Logo href="/dashboard" />
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {navGroups.map((group) => (
          <NavSection key={group.label} title={group.label} items={group.items} pathname={pathname} />
        ))}
        <div className="border-t border-slate-100 dark:border-slate-800 my-3" />
        <NavSection items={bottomNav} pathname={pathname} />
      </nav>
    </aside>
  )
}

function NavSection({
  title,
  items,
  pathname,
}: {
  title?: string
  items: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; premium?: boolean; external?: boolean; title?: string }[]
  pathname: string
}) {
  return (
    <div className="px-3 mb-4">
      {title && (
        <p className="px-3 mb-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          {title}
        </p>
      )}
      <div className="space-y-0.5">
        {items.map(item => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              target={item.external ? '_blank' : undefined}
              rel={item.external ? 'noopener noreferrer' : undefined}
              title={item.title}
              className={cn(
                'group flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-gradient-to-r from-primary/10 to-secondary/10 text-primary dark:text-primary border border-primary/20'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60 border border-transparent'
              )}
            >
              <Icon className={cn('w-[18px] h-[18px] shrink-0', active ? 'text-primary' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600')} />
              <span className="flex-1 truncate">{item.label}</span>
              {item.premium && (
                <span className="text-[9px] font-bold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded">IA</span>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
