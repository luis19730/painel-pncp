'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log para diagnóstico (não expõe dados ao usuário).
    console.error('[app error]', error?.message)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-8 text-center max-w-md">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Algo deu errado</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
          Não foi possível carregar esta página. Tente novamente.
        </p>
        <button
          onClick={reset}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}
