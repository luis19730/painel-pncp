'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, Sparkles, X } from 'lucide-react'

const CHAVE = 'sicx-banner-nova-lei-dispensado'

/**
 * Faixa global sobre a Lei nº 15.266/2025 (SICX). Pode ser dispensada e a
 * escolha fica no navegador. Toda leitura de localStorage fica em try/catch,
 * porque o armazenamento pode estar bloqueado.
 */
export default function BannerNovaLei() {
  const pathname = usePathname()
  const [visivel, setVisivel] = useState(true)

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        if (localStorage.getItem(CHAVE) === '1') setVisivel(false)
      } catch {
        // armazenamento bloqueado: mantém a faixa visível
      }
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

  function dispensar() {
    setVisivel(false)
    try {
      localStorage.setItem(CHAVE, '1')
    } catch {
      // ignora: a faixa volta na próxima visita
    }
  }

  if (!visivel || pathname?.startsWith('/credenciamento-sicx')) return null

  return (
    <div className="relative border-b border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-50 via-white to-teal-50 dark:from-emerald-500/10 dark:via-[#0b1120] dark:to-teal-500/10">
      <div className="max-w-7xl mx-auto px-4 py-2.5 pr-12 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          <Sparkles className="w-3 h-3" /> Nova lei
        </span>
        <p className="text-xs text-slate-700 dark:text-slate-200">
          <strong className="font-semibold">Nova lei:</strong> o Sicx conecta plataformas de comércio eletrônico aos sistemas do
          governo e simplifica a venda para o setor público.
        </p>
        <Link
          href="/credenciamento-sicx"
          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
        >
          Entenda <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <button
        type="button"
        onClick={dispensar}
        aria-label="Dispensar aviso da nova lei"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-white/60 hover:text-slate-600 dark:hover:bg-slate-800"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
