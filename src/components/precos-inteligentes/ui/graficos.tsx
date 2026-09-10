'use client'

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  type TooltipItem,
  type ChartType,
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import { cn } from '@/lib/utils'
import type { PrecoRecord } from '@/lib/precos-inteligentes'
import { dadosDistribuicao, dadosEvolucao, dadosPorEstado } from '@/lib/precos-inteligentes/derivados'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend, Filler)

const AZUL = 'rgba(37, 96, 219, 0.85)'
const AZUL_CLARO = 'rgba(37, 96, 219, 0.15)'

export default function ChartsSection({ precos }: { precos: PrecoRecord[] }) {
  const distribuicao = dadosDistribuicao(precos)
  const evolucao = dadosEvolucao(precos)
  const porEstado = dadosPorEstado(precos)

  const semDados = distribuicao.length === 0

  if (semDados) return null

  return (
    <section className="card p-5">
      <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Análise visual</h2>
      <p className="text-xs text-slate-400 mb-4">Entenda rapidamente onde os preços se concentram.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição */}
        <ChartBox titulo="Distribuição dos preços" subtitulo="Onde os valores estão concentrados">
          <Bar
            data={{
              labels: distribuicao.map((d) => d.label),
              datasets: [{
                label: 'Quantidade de registros',
                data: distribuicao.map((d) => d.value),
                backgroundColor: AZUL_CLARO,
                borderColor: AZUL,
                borderWidth: 2,
                borderRadius: 6,
                maxBarThickness: 34,
              }],
            }}
            options={baseOptions('Quantidade')}
          />
        </ChartBox>

        {/* Evolução */}
        <ChartBox titulo="Evolução dos preços" subtitulo="Mediana ao longo do tempo" vazio={evolucao.length === 0}>
          <Line
            data={{
              labels: evolucao.map((e) => e.label),
              datasets: [{
                label: 'Preço mediano',
                data: evolucao.map((e) => e.mediana),
                borderColor: AZUL,
                backgroundColor: AZUL_CLARO,
                fill: true,
                tension: 0.3,
                pointRadius: 3,
              }],
            }}
            options={baseOptions('Mediana (R$)')}
          />
        </ChartBox>

        {/* Por estado */}
        <ChartBox titulo="Preços por estado" subtitulo="Diferenças geográficas" vazio={porEstado.length === 0}>
          <Bar
            data={{
              labels: porEstado.map((e) => e.uf),
              datasets: [{
                label: 'Preço mediano',
                data: porEstado.map((e) => e.mediana),
                backgroundColor: AZUL_CLARO,
                borderColor: AZUL,
                borderWidth: 2,
                borderRadius: 6,
                maxBarThickness: 34,
              }],
            }}
            options={baseOptions('Mediana (R$)')}
          />
        </ChartBox>

        {/* Volume */}
        <ChartBox titulo="Volume de dados" subtitulo="Registros por período" vazio={evolucao.length === 0}>
          <Line
            data={{
              labels: evolucao.map((e) => e.label),
              datasets: [{
                label: 'Registros coletados',
                data: evolucao.map((e) => e.count),
                borderColor: 'rgba(16, 185, 129, 0.85)',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                fill: true,
                tension: 0.3,
                pointRadius: 3,
              }],
            }}
            options={baseOptions('Registros')}
          />
        </ChartBox>
      </div>
    </section>
  )
}

function baseOptions(tooltipLabel: string) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<ChartType>) => {
            const val = ctx.parsed.y ?? 0
            const label = (typeof ctx.dataset.label === 'string' ? ctx.dataset.label : tooltipLabel)
            if (label === 'Preço mediano' || label === 'Preço unitário') {
              return `${label}: ${val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
            }
            return `${label}: ${val}`
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148, 163, 184, 0.15)' },
        ticks: {
          font: { size: 10 },
          callback: (v: string | number) => {
            const n = Number(v)
            return n >= 1000 ? (n / 1000).toFixed(0) + 'k' : String(n)
          },
        },
      },
    },
  }
}

function ChartBox({ titulo, subtitulo, children, vazio }: { titulo: string; subtitulo: string; children: React.ReactNode; vazio?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-100 dark:border-slate-800 p-4">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{titulo}</h3>
      <p className="text-xs text-slate-400 mb-3">{subtitulo}</p>
      <div className={cn('h-52', vazio && 'flex items-center justify-center')}>
        {vazio ? <span className="text-xs text-slate-400">Dados insuficientes para esse gráfico.</span> : children}
      </div>
    </div>
  )
}