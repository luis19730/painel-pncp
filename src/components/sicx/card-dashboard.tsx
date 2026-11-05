'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, ListChecks, Loader2, Store, Zap } from 'lucide-react'
import { CHECKLIST_PREPARO } from '@/lib/sicx/conteudo'
import { progressoChecklist } from '@/lib/sicx/calc'
import { apiSicxOpcional } from '@/lib/sicx/client'

interface ItemSalvo {
  item_key: string
  feito: boolean
  validade: string | null
}

/**
 * Cartão do SICX no dashboard: mostra o progresso do checklist "Meu preparo".
 * Se a consulta falhar, o cartão continua útil (0 de N) e nunca bloqueia a tela.
 */
export default function CardSicxDashboard() {
  const [itens, setItens] = useState<ItemSalvo[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true
    const id = window.setTimeout(() => {
      ;(async () => {
        try {
          const r = await apiSicxOpcional<{ itens: ItemSalvo[] }>('/api/sicx/preparo')
          if (ativo && r?.itens) setItens(r.itens)
        } catch {
          // sem dados: o cartão segue com o progresso zerado
        } finally {
          if (ativo) setCarregando(false)
        }
      })()
    }, 0)
    return () => {
      ativo = false
      window.clearTimeout(id)
    }
  }, [])

  const progresso = useMemo(() => progressoChecklist(CHECKLIST_PREPARO, itens), [itens])

  return (
    <section
      aria-labelledby="titulo-sicx-dashboard"
      className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 shadow-sm dark:border-emerald-500/30 dark:from-emerald-500/10 dark:via-slate-900 dark:to-teal-500/10"
    >
      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              <Zap className="h-3 w-3" /> Nova lei
            </span>
            <h2 id="titulo-sicx-dashboard" className="font-display text-base font-extrabold text-slate-900 dark:text-white">
              SICX · Lei nº 15.266/2025
            </h2>
          </div>
          <p className="mt-1 max-w-xl text-sm text-slate-600 dark:text-slate-300">
            Comércio eletrônico e compras expressas: veja onde sua empresa já pode se credenciar, o diretório de
            almoxarifados virtuais e o checklist de preparo.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <div
              className="h-2 w-40 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-500/20"
              role="progressbar"
              aria-valuenow={progresso.pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progresso do checklist de credenciamento no SICX"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                style={{ width: `${progresso.pct}%` }}
              />
            </div>
            {carregando ? (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <Loader2 className="h-3 w-3 animate-spin" /> carregando
              </span>
            ) : (
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                {progresso.feitos} de {progresso.total} itens
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href="/credenciamento-sicx#sec-preparo"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <ListChecks className="h-4 w-4" /> Meu preparo
          </Link>
          <Link
            href="/credenciamento-sicx#sec-almoxarifados"
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/40 dark:bg-transparent dark:text-emerald-300 dark:hover:bg-emerald-500/10"
          >
            <Store className="h-4 w-4" /> Almoxarifados
          </Link>
          <Link
            href="/credenciamento-sicx"
            className="inline-flex items-center gap-1.5 px-2 py-2.5 text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
          >
            Guia completo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-emerald-100 px-5 py-2 text-[11px] text-slate-500 dark:border-emerald-500/20 dark:text-slate-400">
        <span className="inline-flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          Checklist com validade de certidões
        </span>
        <span className="inline-flex items-center gap-1">
          <Store className="h-3 w-3 text-emerald-500" />
          Diretório com links verificados
        </span>
        <span>Conteúdo informativo, não substitui o texto oficial.</span>
      </div>
    </section>
  )
}
