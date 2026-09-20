import type { Metadata } from 'next'
import Link from 'next/link'
import { Zap, Shield, Scale, Workflow, Table2, ListChecks, HelpCircle, ExternalLink } from 'lucide-react'
import Button from '@/components/ui/button'
import { Section, SectionHead } from '@/components/marketing/section'
import { SICX } from '@/content/sicx'

export const metadata: Metadata = {
  title: 'SICX — Sistema de Compras Expressas (Lei 15.266/2025)',
  description:
    'Entenda o SICX (Sistema de Compras Expressas): criado pela Lei nº 15.266/2025, regulamentado pelo Decreto nº 13.106/2026, com credenciamento por comércio eletrônico integrado ao PNCP. Conteúdo informativo, sujeito a atualização normativa.',
}

export default function SicxPage() {
  return (
    <Section narrow>
      <SectionHead
        align="center"
        eyebrow={SICX.eyebrow}
        title="O que é o SICX?"
        subtitle={SICX.subtitulo}
        as="h1"
      />

      {/* O que é */}
      <div className="card p-6 md:p-8 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 dark:bg-primary/15 flex items-center justify-center text-primary">
            <Zap className="w-[18px] h-[18px]" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">O que é</h2>
        </div>
        <ul className="space-y-3">
          {SICX.oQueE.map((p) => (
            <li key={p} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <span className="text-primary mt-0.5">•</span> {p}
            </li>
          ))}
        </ul>
      </div>

      {/* Regulamentação */}
      <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-6 md:p-8 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Scale className="w-[18px] h-[18px] text-amber-600 dark:text-amber-400" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Regulamentação e vigência</h2>
        </div>
        <ul className="space-y-3">
          {SICX.regulamentacao.map((p) => (
            <li key={p} className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{p}</li>
          ))}
        </ul>
      </div>

      {/* Como funciona */}
      <div className="card p-6 md:p-8 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-lg bg-primary/10 dark:bg-primary/15 flex items-center justify-center text-primary">
            <Workflow className="w-[18px] h-[18px]" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Como funciona</h2>
        </div>
        <ol className="space-y-4">
          {SICX.comoFunciona.map((etapa) => (
            <li key={etapa.titulo} className="border-l-2 border-primary/30 pl-4">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{etapa.titulo}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{etapa.detalhe}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* Tabela comparativa */}
      <div className="card p-6 md:p-8 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-lg bg-primary/10 dark:bg-primary/15 flex items-center justify-center text-primary">
            <Table2 className="w-[18px] h-[18px]" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">SICX x Pregão x Dispensa</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[720px]">
            <thead>
              <tr className="text-left bg-slate-50 dark:bg-slate-800/60">
                {SICX.comparativo.colunas.map((c) => (
                  <th key={c} className="p-3 font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SICX.comparativo.linhas.map((l) => (
                <tr key={l.criterio} className="align-top">
                  <td className="p-3 font-semibold text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800">{l.criterio}</td>
                  <td className="p-3 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800">{l.sicx}</td>
                  <td className="p-3 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800">{l.pregao}</td>
                  <td className="p-3 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800">{l.dispensa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Passo a passo */}
      <div className="card p-6 md:p-8 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-lg bg-primary/10 dark:bg-primary/15 flex items-center justify-center text-primary">
            <ListChecks className="w-[18px] h-[18px]" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Passo a passo para o fornecedor</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SICX.passos.map((p) => (
            <div key={p.titulo} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{p.titulo}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{p.detalhe}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="card p-6 md:p-8 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-lg bg-primary/10 dark:bg-primary/15 flex items-center justify-center text-primary">
            <HelpCircle className="w-[18px] h-[18px]" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Perguntas frequentes</h2>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {SICX.faq.map((f) => (
            <details key={f.pergunta} className="py-3 group">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900 dark:text-white flex items-center justify-between gap-3">
                {f.pergunta}
                <span className="text-primary group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{f.resposta}</p>
            </details>
          ))}
        </div>
      </div>

      {/* Aviso + fontes oficiais */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-6 md:p-8">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-[18px] h-[18px] text-primary" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Aviso</h2>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">{SICX.aviso}</p>

        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Fontes oficiais</p>
        <ul className="flex flex-wrap gap-x-5 gap-y-2 mb-4">
          {SICX.fontes.map((f) => (
            <li key={f.url}>
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                {f.label} <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </li>
          ))}
        </ul>

        <p className="text-xs text-slate-400">
          Última atualização: {SICX.atualizadoEmLabel}. Plataforma independente de consulta a dados públicos, sem
          vínculo com o SICX, o PNCP ou órgãos do Governo Federal.
        </p>
      </div>

      <div className="text-center mt-10">
        <h2 className="text-2xl font-extrabold font-display text-slate-900 dark:text-white mb-3">
          Acompanhe as oportunidades do SICX
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          Crie sua conta gratuita e monitore credenciamentos e compras expressas.
        </p>
        <Link href="/cadastro">
          <Button size="lg">Começar agora</Button>
        </Link>
      </div>
    </Section>
  )
}
