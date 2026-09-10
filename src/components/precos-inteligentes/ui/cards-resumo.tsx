'use client'

import { Database, TrendingDown, TrendingUp, DollarSign, Gauge, AlertTriangle } from 'lucide-react'
import StatCard from '@/components/ui/stat-card'
import type { ResumoPrecos } from '@/lib/precos-inteligentes/derivados'
import { fmtBRL } from '@/lib/precos-inteligentes'

export default function SummaryCards({ resumo, total }: { resumo: ResumoPrecos; total: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      <StatCard
        label="Registros encontrados"
        value={String(total)}
        icon={<Database className="w-5 h-5" />}
        accent="primary"
        hint={`${resumo.outliers} fora da curva`}
      />
      <StatCard
        label="Menor preço"
        value={fmtBRL(resumo.menor)}
        icon={<TrendingDown className="w-5 h-5" />}
        accent="success"
        hint="O mais barato"
      />
      <StatCard
        label="Preço médio"
        value={fmtBRL(resumo.media)}
        icon={<Gauge className="w-5 h-5" />}
        accent="accent"
        hint="Média aritmética"
      />
      <StatCard
        label="Preço mediano"
        value={fmtBRL(resumo.mediana)}
        icon={<DollarSign className="w-5 h-5" />}
        accent="primary"
        hint="Referência mais robusta"
      />
      <StatCard
        label="Maior preço"
        value={fmtBRL(resumo.maior)}
        icon={<TrendingUp className="w-5 h-5" />}
        accent="danger"
        hint="O mais caro"
      />
    </div>
  )
}

export function ResumoLinha({ resumo }: { resumo: ResumoPrecos }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
      <span>Coef. de variação: <strong className="text-slate-700 dark:text-slate-200">{resumo.cv.toFixed(1)}%</strong></span>
      {resumo.outliers > 0 && (
        <span className="inline-flex items-center gap-1 text-amber-600"><AlertTriangle className="w-3 h-3" /> {resumo.outliers} registro(s) descartado(s)</span>
      )}
    </div>
  )
}