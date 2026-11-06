import type { Metadata } from 'next'
import {
  AlertTriangle, Clock, ExternalLink, ListChecks, Scale, ShieldCheck,
  Sparkles, Store, Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import Diretorio, { type Filtros } from '@/components/sicx/diretorio'
import EducacaoSicx from '@/components/sicx/educacao'
import FerramentasApoio from '@/components/sicx/ferramentas-apoio'
import Interesse from '@/components/sicx/interesse'
import ReportarPagina from '@/components/sicx/reportar-pagina'
import { carregarConteudoSicx, ultimaAtualizacao } from '@/lib/sicx/server'
import { estatisticasDiretorio, dataHoraBR } from '@/lib/sicx/calc'
import {
  AVISO_JURIDICO, FONTES_OFICIAIS, HERO_SUBTITULO, SICX_ATUALIZADO_LABEL,
  SICX_URLS, STATUS_PADRAO,
} from '@/lib/sicx/conteudo'

export const metadata: Metadata = {
  title: 'Credenciamento SICX — almoxarifados virtuais e compras expressas',
  description:
    'Diretório de almoxarifados virtuais e órgãos credenciadores do SICX (Lei 15.266/2025). Filtre por UF, esfera e tipo, e veja como se credenciar.',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

function um(valor: string | string[] | undefined): string {
  return Array.isArray(valor) ? (valor[0] || '') : (valor || '')
}

export default async function CredenciamentoSicxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const conteudo = await carregarConteudoSicx()
  const stats = estatisticasDiretorio(conteudo.almoxarifados)
  const status = conteudo.status || {
    id: 'status',
    ...STATUS_PADRAO,
    fonte_url: STATUS_PADRAO.fonte_url,
  }
  const atualizadoEm = ultimaAtualizacao(conteudo)

  const inicial: Filtros = {
    busca: um(sp.q),
    ufs: um(sp.uf) ? um(sp.uf).split(',').map((s) => s.trim().toUpperCase()).filter(Boolean) : [],
    esfera: um(sp.esfera),
    tipo: um(sp.tipo),
    situacao: um(sp.situacao),
    ordenar: um(sp.ordenar) || 'recentes',
    soNovos: um(sp.novos) === '1',
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho compacto */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-primary-soft/60 via-white to-secondary-soft/40 dark:from-primary/10 dark:via-slate-900 dark:to-secondary/10 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="premium" icon={<Sparkles className="w-3.5 h-3.5" />}>Lei 15.266 · Novidade</Badge>
              <Badge variant="primary">Lei nº 15.266/2025</Badge>
              <Badge variant="accent">Decreto nº 13.106/2026</Badge>
            </div>
            <h1 className="mt-2 text-2xl md:text-3xl font-extrabold font-display text-slate-900 dark:text-white">
              Credenciamento SICX
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 max-w-2xl">{HERO_SUBTITULO}</p>
          </div>

          <div className="flex flex-col items-stretch sm:items-end gap-2">
            <div className="flex flex-wrap gap-2">
              <a href="#diretorio" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
                <Store className="w-4 h-4" /> Ver almoxarifados
              </a>
              <a href="#guia-sicx" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800">
                <ListChecks className="w-4 h-4" /> Como se credenciar
              </a>
              <a href="#receber-alertas" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800">
                <Zap className="w-4 h-4" /> Receber alertas
              </a>
            </div>
            <a href={SICX_URLS.decreto13106} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              Decreto nº 13.106/2026 (texto oficial) <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-500" />
          {AVISO_JURIDICO} O Painel PNCP é uma plataforma independente, sem vínculo com o SICX, o PNCP ou órgãos do Governo Federal.
        </p>
      </section>

      {/* Dados + filtros + grade de UFs */}
      <Diretorio almoxarifados={conteudo.almoxarifados} stats={stats} inicial={inicial} />

      {/* Guia educativo (abas, recolhido) */}
      <div id="guia-sicx" className="scroll-mt-20">
        <EducacaoSicx normas={conteudo.normas} status={status} />
      </div>

      {/* Ferramentas de apoio (recolhido) */}
      <FerramentasApoio normas={conteudo.normas} />

      {/* Receber alertas */}
      <section id="receber-alertas" className="scroll-mt-20">
        <Interesse />
      </section>

      {/* Rodapé compacto */}
      <footer className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5"><Scale className="w-3.5 h-3.5" /> Fontes oficiais</p>
            <ul className="space-y-0.5 text-[11px]">
              {FONTES_OFICIAIS.map((f) => (
                <li key={f.label}>
                  {f.url === SICX_URLS.pncp ? (
                    <span className="text-slate-400">{f.label} — link a verificar</span>
                  ) : (
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-slate-500 hover:text-primary dark:text-slate-400 hover:underline">{f.label} <ExternalLink className="w-3 h-3" /></a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
            <p className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Conteúdo revisado em {SICX_ATUALIZADO_LABEL}.</p>
            <p>Última verificação: {dataHoraBR(atualizadoEm)}.</p>
            <p className="text-slate-400">{AVISO_JURIDICO}</p>
          </div>

          <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
            <p className="inline-flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-300"><AlertTriangle className="w-3.5 h-3.5" /> Encontrou um erro?</p>
            <ReportarPagina />
          </div>
        </div>
      </footer>
    </div>
  )
}
