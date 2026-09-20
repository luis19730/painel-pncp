import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, GraduationCap, Shield, BookOpen } from 'lucide-react'
import { GUIAS, getGuia, GUIA_AVISO, GUIA_ATUALIZADO_EM_LABEL } from '@/content/guias'

export function generateStaticParams() {
  return GUIAS.map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const guia = getGuia(slug)
  if (!guia) return { title: 'Guia não encontrado' }
  return {
    title: `${guia.titulo} — Ajuda`,
    description: guia.resumo,
  }
}

export default async function GuiaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const guia = getGuia(slug)
  if (!guia) notFound()

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/ajuda" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-primary">
        <ArrowLeft className="w-4 h-4" /> Central de Ajuda
      </Link>

      <header>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 dark:bg-primary/15 flex items-center justify-center text-primary">
            <GraduationCap className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Guia prático</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold font-display text-slate-900 dark:text-white mb-3">
          {guia.titulo}
        </h1>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{guia.resumo}</p>
      </header>

      {/* CTA para a ferramenta correspondente */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 dark:bg-primary/10 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">
          Quer aplicar isso agora? Use a ferramenta do Painel PNCP.
        </p>
        <Link
          href={guia.cta.href}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-hover transition-colors shrink-0"
        >
          {guia.cta.label} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Conteúdo */}
      <div className="space-y-6">
        {guia.secoes.map((sec) => (
          <section key={sec.titulo} className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-primary" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{sec.titulo}</h2>
            </div>
            <ul className="space-y-2">
              {sec.itens.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  <span className="text-primary mt-0.5">•</span> {item}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* Relacionados */}
      {guia.relacionados && guia.relacionados.length > 0 && (
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Continue aprendendo</h2>
          <ul className="space-y-2">
            {guia.relacionados.map((r) => (
              <li key={r.href}>
                <Link href={r.href} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                  {r.label} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Aviso informativo */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-5">
        <div className="flex items-start gap-2">
          <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{GUIA_AVISO}</p>
        </div>
        <p className="text-[11px] text-slate-400 mt-2 ml-6">Última atualização: {GUIA_ATUALIZADO_EM_LABEL}.</p>
      </div>
    </div>
  )
}
