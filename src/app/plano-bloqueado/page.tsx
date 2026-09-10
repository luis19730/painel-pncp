import Link from 'next/link'
import { Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export const metadata = {
  title: 'Acesso bloqueado — Painel PNCP',
  description: 'Seu período de teste expirou.',
}

export default function PlanoBloqueadoPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-danger-soft dark:bg-red-500/10 flex items-center justify-center mx-auto mb-5 text-danger">
            <Lock className="w-8 h-8" />
          </div>
          <Badge variant="danger" className="mb-4">Acesso bloqueado</Badge>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Seu período de teste expirou
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            O teste gratuito de 15 dias terminou. Para continuar utilizando o
            Painel PNCP, escolha um dos planos pagos (Pro ou Business).
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/planos"
              className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
            >
              Ver planos
            </Link>
            <Link
              href="/"
              className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Voltar ao início
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
