'use client'

import {
  AlertTriangle, BadgeCheck, BarChart3, CircleDollarSign, Clock,
  Gauge, Info, LineChart, ShieldAlert, TrendingDown, TrendingUp, Wallet, XCircle,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import type {
  ConfigAnalista, EntradaAnalise, ResultadoAnalise, Sensibilidade, SimulacaoLance, VereditoCalculado,
} from '@/lib/analista/types'
import { CampoNumero } from '@/components/analista/campos'

function pct(v: number | null | undefined, casas = 1): string {
  return `${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`
}

function corMargem(v: number): string {
  if (v < 0) return 'text-rose-600 dark:text-rose-400'
  if (v < 10) return 'text-amber-600 dark:text-amber-400'
  return 'text-emerald-600 dark:text-emerald-400'
}

const CORES_VEREDITO = {
  verde: {
    caixa: 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10',
    titulo: 'text-emerald-800 dark:text-emerald-200',
    barra: 'bg-emerald-500',
    icone: BadgeCheck,
  },
  amarelo: {
    caixa: 'border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10',
    titulo: 'text-amber-800 dark:text-amber-200',
    barra: 'bg-amber-500',
    icone: AlertTriangle,
  },
  vermelho: {
    caixa: 'border-rose-300 bg-rose-50 dark:border-rose-500/40 dark:bg-rose-500/10',
    titulo: 'text-rose-800 dark:text-rose-200',
    barra: 'bg-rose-500',
    icone: XCircle,
  },
} as const

export interface MercadoInfo {
  termo: string
  stats: {
    registros: number
    media: number
    mediana: number
    menor: number
    maior: number
  } | null
}

export default function PainelResultado({
  entrada,
  resultado,
  veredito,
  sensibilidade,
  lances,
  config,
  onDesconto,
  onUsarReferencia,
  mercado,
  comparando,
  onCompararMercado,
}: {
  entrada: EntradaAnalise
  resultado: ResultadoAnalise
  veredito: VereditoCalculado
  sensibilidade: Sensibilidade
  lances: SimulacaoLance[]
  config: ConfigAnalista
  onDesconto: (v: number) => void
  onUsarReferencia: () => void
  mercado: MercadoInfo | null
  comparando: boolean
  onCompararMercado: () => void
}) {
  const cor = CORES_VEREDITO[veredito.nivel]
  const Icone = cor.icone
  const itemMercado = entrada.itens.find((i) => i.descricao.trim()) || entrada.itens[0]
  const quantidade = entrada.itens.reduce((s, i) => s + Math.max(0, i.quantidade), 0)
  const precoMedioVenda = quantidade > 0 ? resultado.receitaBruta / quantidade : 0

  return (
    <div className="space-y-4">
      {/* VEREDITO ---------------------------------------------------------- */}
      <section className={cn('rounded-2xl border p-4 shadow-sm', cor.caixa)} aria-live="polite">
        <div className="flex items-start gap-3">
          <Icone className={cn('mt-0.5 h-7 w-7 shrink-0', cor.titulo)} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className={cn('font-display text-lg font-extrabold', cor.titulo)}>{veredito.titulo}</h2>
              <span className={cn('rounded-full bg-white/70 px-2.5 py-1 text-xs font-bold dark:bg-slate-900/40', cor.titulo)}>
                {veredito.score}/100 de atratividade
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/80 dark:bg-slate-900/50">
              <div className={cn('h-full rounded-full transition-all', cor.barra)} style={{ width: `${Math.max(0, Math.min(100, veredito.score))}%` }} />
            </div>
            <ul className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-200">
              {veredito.motivos.map((m, i) => (
                <li key={i} className="flex gap-1.5">
                  <span aria-hidden="true">•</span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {veredito.alertas.length > 0 && (
          <div className="mt-3 rounded-xl border border-white/60 bg-white/60 p-3 dark:border-slate-700 dark:bg-slate-900/40">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              <ShieldAlert className="h-3.5 w-3.5" /> Alertas
            </p>
            <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
              {veredito.alertas.map((a, i) => (
                <li key={i} className="flex gap-1.5"><span aria-hidden="true">•</span><span>{a}</span></li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* NÚMEROS PRINCIPAIS ------------------------------------------------ */}
      <section className="card p-4">
        <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-bold text-slate-900 dark:text-white">
          <Gauge className="h-4 w-4 text-primary" /> Resultado ao vivo
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Indicador rotulo="Receita bruta" valor={formatCurrency(resultado.receitaBruta)} />
          <Indicador rotulo="Custo total" valor={formatCurrency(resultado.custoTotal)} />
          <Indicador rotulo="Lucro líquido" valor={formatCurrency(resultado.lucroLiquido)} destaque={corMargem(resultado.margemLiquidaPct)} />
          <Indicador rotulo="Margem líquida" valor={pct(resultado.margemLiquidaPct)} destaque={corMargem(resultado.margemLiquidaPct)} />
          <Indicador rotulo="Margem bruta" valor={pct(resultado.margemBrutaPct)} />
          <Indicador rotulo="Markup" valor={pct(resultado.markupPct)} dica="Lucro líquido dividido pelo custo total. Diferente de margem, que é sobre a receita." />
          <Indicador rotulo="Ponto de equilíbrio" valor={resultado.pontoEquilibrio != null ? formatCurrency(resultado.pontoEquilibrio) : '-'} dica="Menor preço de venda que cobre todos os custos, sem lucro nem prejuízo." />
          <Indicador rotulo="Preço mínimo (meta)" valor={resultado.precoMinimoMargem != null ? formatCurrency(resultado.precoMinimoMargem) : '-'} dica={`Preço necessário para atingir a margem desejada de ${pct(entrada.margemMinima)}.`} />
          <Indicador rotulo="Desconto máximo" valor={resultado.descontoMaximoPct != null ? pct(resultado.descontoMaximoPct) : '-'} dica="Desconto máximo sobre o valor de referência mantendo a margem desejada." />
          <Indicador rotulo="ROI" valor={pct(resultado.roiPct)} dica="Lucro líquido sobre o capital investido (custo total)." />
          <Indicador rotulo="Capital de giro" valor={formatCurrency(resultado.capitalGiro)} dica="Dinheiro necessário para bancar compra, frete e impostos até o recebimento." />
          <Indicador rotulo="Frete / receita" valor={pct(resultado.fretePct)} destaque={resultado.fretePct > config.freteMaxPct ? 'text-rose-600 dark:text-rose-400' : undefined} />
        </div>
      </section>

      {/* SIMULADOR DE LANCE ------------------------------------------------ */}
      <section className="card p-4">
        <h2 className="mb-1 flex items-center gap-2 font-display text-sm font-bold text-slate-900 dark:text-white">
          <CircleDollarSign className="h-4 w-4 text-primary" /> Simulador de lance
        </h2>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          Arraste o desconto sobre o valor de referência e veja o lucro e a margem em tempo real.
        </p>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label htmlFor="simulador-desconto" className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Desconto: <span className="text-primary">{pct(entrada.descontoLancePct)}</span>
            </label>
            <input
              id="simulador-desconto"
              type="range"
              min={0}
              max={60}
              step={0.5}
              value={Math.min(60, Math.max(0, entrada.descontoLancePct))}
              onChange={(e) => onDesconto(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
          <CampoNumero
            id="desconto-exato"
            valor={entrada.descontoLancePct}
            onChange={(v) => onDesconto(Math.max(0, Math.min(60, v)))}
            sufixo="%"
            min={0}
            max={60}
            step={0.5}
            className="w-24"
          />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Valor ofertado</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(resultado.receitaBruta)}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Lucro líquido</p>
            <p className={cn('text-sm font-bold', corMargem(resultado.margemLiquidaPct))}>{formatCurrency(resultado.lucroLiquido)}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Margem líquida</p>
            <p className={cn('text-sm font-bold', corMargem(resultado.margemLiquidaPct))}>{pct(resultado.margemLiquidaPct)}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            Menor lance viável (meta {pct(entrada.margemMinima)}):{' '}
            <strong className="text-slate-800 dark:text-slate-100">
              {resultado.menorLanceViavel != null ? formatCurrency(resultado.menorLanceViavel) : 'não calculável'}
            </strong>
          </span>
          <button type="button" onClick={onUsarReferencia} className="font-semibold text-primary hover:underline">
            Usar valor de referência
          </button>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-xs">
            <caption className="sr-only">Simulação de lances de 0 a 60% de desconto</caption>
            <thead className="text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-1 pr-2 font-semibold">Desconto</th>
                <th className="py-1 pr-2 font-semibold">Valor</th>
                <th className="py-1 pr-2 font-semibold">Lucro</th>
                <th className="py-1 font-semibold">Margem</th>
              </tr>
            </thead>
            <tbody>
              {lances.map((l) => (
                <tr key={l.descontoPct} className={cn('border-t border-slate-100 dark:border-slate-800', l.descontoPct === Math.round(entrada.descontoLancePct) && 'bg-primary/5')}>
                  <td className="py-1 pr-2">{pct(l.descontoPct, 0)}</td>
                  <td className="py-1 pr-2">{formatCurrency(l.valorOfertado)}</td>
                  <td className={cn('py-1 pr-2 font-semibold', corMargem(l.margemLiquidaPct))}>{formatCurrency(l.lucroLiquido)}</td>
                  <td className={cn('py-1 font-semibold', corMargem(l.margemLiquidaPct))}>{pct(l.margemLiquidaPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* COMPARATIVO COM REFERÊNCIA --------------------------------------- */}
      <section className="card p-4">
        <h2 className="mb-2 flex items-center gap-2 font-display text-sm font-bold text-slate-900 dark:text-white">
          <BarChart3 className="h-4 w-4 text-primary" /> Comparativo com o valor de referência
        </h2>
        <div className="space-y-1.5 text-sm">
          <Linha rotulo="Valor de referência" valor={formatCurrency(resultado.valorReferenciaTotal)} />
          <Linha rotulo="Seu lance" valor={formatCurrency(resultado.receitaBruta)} />
          <Linha rotulo="Desconto aplicado" valor={pct(entrada.descontoLancePct)} />
          <Linha
            rotulo="Desconto máximo viável"
            valor={resultado.descontoMaximoPct != null ? pct(resultado.descontoMaximoPct) : '-'}
            destaque={resultado.descontoMaximoPct != null && resultado.descontoMaximoPct < 0 ? 'text-rose-600 dark:text-rose-400' : undefined}
          />
        </div>
        {resultado.descontoMaximoPct != null && resultado.descontoMaximoPct < 0 && (
          <p className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            Com os custos atuais não existe desconto viável: o preço mínimo já supera o valor de referência.
          </p>
        )}
      </section>

      {/* SENSIBILIDADE ----------------------------------------------------- */}
      <section className="card p-4">
        <h2 className="mb-1 flex items-center gap-2 font-display text-sm font-bold text-slate-900 dark:text-white">
          <LineChart className="h-4 w-4 text-primary" /> Análise de sensibilidade
        </h2>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">Como a margem líquida reage a variações de frete, custo do produto e desconto.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <MiniTabela titulo="Frete (±20%)" linhas={sensibilidade.frete.map((s) => ({ rotulo: `${s.variacaoPct > 0 ? '+' : ''}${s.variacaoPct}%`, margem: s.margemLiquidaPct, lucro: s.lucroLiquido }))} />
          <MiniTabela titulo="Custo do produto (±10%)" linhas={sensibilidade.custo.map((s) => ({ rotulo: `${s.variacaoPct > 0 ? '+' : ''}${s.variacaoPct}%`, margem: s.margemLiquidaPct, lucro: s.lucroLiquido }))} />
        </div>
        <div className="mt-3">
          <MiniTabela titulo="Desconto no lance" linhas={sensibilidade.desconto.map((s) => ({ rotulo: pct(s.descontoPct, 0), margem: s.margemLiquidaPct, lucro: s.lucroLiquido }))} />
        </div>
      </section>

      {/* FLUXO DE CAIXA ---------------------------------------------------- */}
      <section className="card p-4">
        <h2 className="mb-1 flex items-center gap-2 font-display text-sm font-bold text-slate-900 dark:text-white">
          <Wallet className="h-4 w-4 text-primary" /> Fluxo de caixa simplificado
        </h2>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          Prazo de pagamento informado: {entrada.financeiro.prazoPagamentoDias} dias.
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-2.5 dark:bg-rose-500/10">
            <TrendingDown className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">Hoje — desembolso</p>
              <p className="text-sm font-bold text-rose-700 dark:text-rose-300">{formatCurrency(resultado.custoTotal)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-2.5 dark:bg-emerald-500/10">
            <TrendingUp className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                Em {entrada.financeiro.prazoPagamentoDias} dias — recebimento
              </p>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(resultado.receitaBruta)}</p>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 p-2.5 dark:border-slate-700">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <Clock className="h-4 w-4" /> Necessidade de capital de giro
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(resultado.capitalGiro)}</span>
          </div>
        </div>
      </section>

      {/* MERCADO ----------------------------------------------------------- */}
      {mercado && (
        <section className="card p-4">
          <h2 className="mb-1 flex items-center gap-2 font-display text-sm font-bold text-slate-900 dark:text-white">
            <BarChart3 className="h-4 w-4 text-primary" /> Comparação com o mercado
          </h2>
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">Item: {mercado.termo}</p>
          {mercado.stats ? (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Indicador rotulo="Média" valor={formatCurrency(mercado.stats.media)} />
                <Indicador rotulo="Mediana" valor={formatCurrency(mercado.stats.mediana)} />
                <Indicador rotulo="Mínimo" valor={formatCurrency(mercado.stats.menor)} />
                <Indicador rotulo="Máximo" valor={formatCurrency(mercado.stats.maior)} />
              </div>
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                {mercado.stats.registros} registro(s) de contratações reais do PNCP. Seu custo unitário: {formatCurrency(itemMercado?.custoUnitario || 0)} · seu preço médio de venda: {formatCurrency(precoMedioVenda)}.
              </p>
            </>
          ) : (
            <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              Sem dados de mercado suficientes para este item. O bloco fica oculto quando não há registros.
            </p>
          )}
        </section>
      )}

      {!mercado && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-dashed border-slate-300 p-3 dark:border-slate-700">
          <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Info className="h-4 w-4" /> Quer comparar seu preço com contratações reais?
          </p>
          <button
            type="button"
            onClick={onCompararMercado}
            disabled={comparando || !itemMercado?.descricao?.trim()}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {comparando ? 'Buscando no PNCP...' : 'Comparar com o mercado'}
          </button>
        </div>
      )}

      <p className="rounded-xl bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
        <strong>Aviso:</strong> os valores são estimativas baseadas nos dados informados; confirme tributos e fretes antes de ofertar.
      </p>
    </div>
  )
}

function Indicador({ rotulo, valor, destaque, dica }: { rotulo: string; valor: string; destaque?: string; dica?: string }) {
  return (
    <div className="rounded-xl border border-slate-100 p-2 dark:border-slate-800" title={dica}>
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {rotulo}
        {dica && <Info className="h-3 w-3 shrink-0" aria-label={dica} />}
      </p>
      <p className={cn('mt-0.5 text-sm font-bold text-slate-900 dark:text-white', destaque)}>{valor}</p>
    </div>
  )
}

function Linha({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1 last:border-0 dark:border-slate-800">
      <span className="text-xs text-slate-500 dark:text-slate-400">{rotulo}</span>
      <span className={cn('text-sm font-semibold text-slate-900 dark:text-white', destaque)}>{valor}</span>
    </div>
  )
}

function MiniTabela({ titulo, linhas }: { titulo: string; linhas: Array<{ rotulo: string; margem: number; lucro: number }> }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{titulo}</p>
      <table className="w-full text-left text-xs">
        <thead className="text-slate-500 dark:text-slate-400">
          <tr>
            <th className="py-0.5 font-semibold">Variação</th>
            <th className="py-0.5 font-semibold">Margem</th>
            <th className="py-0.5 font-semibold">Lucro</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.rotulo} className="border-t border-slate-100 dark:border-slate-800">
              <td className="py-0.5">{l.rotulo}</td>
              <td className={cn('py-0.5 font-semibold', corMargem(l.margem))}>{pct(l.margem)}</td>
              <td className="py-0.5">{formatCurrency(l.lucro)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
