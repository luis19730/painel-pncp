import type { Metadata } from 'next'
import Link from 'next/link'
import {
  AlertTriangle, ArrowRight, BookOpen, Building2, CheckCircle2, Clock, ExternalLink,
  GraduationCap, HelpCircle, Landmark, Layers, ListChecks, Scale, ShieldCheck,
  ShoppingCart, Sparkles, Store, Timer, Trophy, Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import SicxFlow from '@/components/sicx/flow'
import Diretorio from '@/components/sicx/diretorio'
import Ferramentas from '@/components/sicx/ferramentas'
import Preparo from '@/components/sicx/preparo'
import Oportunidades from '@/components/sicx/oportunidades'
import Interesse from '@/components/sicx/interesse'
import GeradorCredenciamento from '@/components/sicx/credenciamento-gerador'
import ReportarPagina from '@/components/sicx/reportar-pagina'
import { carregarConteudoSicx, ultimaAtualizacao } from '@/lib/sicx/server'
import {
  ANCORAS, AVISO_JURIDICO, COMPARATIVO, ESFERAS, FAQ,
  FONTES_OFICIAIS, GLOSSARIO, GUIA_ORGAO, HERO_SUBTITULO, NOTA_ESFERAS, PASSOS,
  PERFIS, RANKING, RESUMO_60S, SICX_ATUALIZADO_LABEL, SICX_URLS, STATUS_PADRAO,
  TEXTO_BASE, TIMELINE, cssOrdemSecoes,
} from '@/lib/sicx/conteudo'
import { dataBR } from '@/lib/sicx/calc'
import { cn } from '@/lib/utils'

const URL_PAGINA = 'https://www.painelpncp.com.br/credenciamento-sicx'

const DESCRICAO =
  'SICX (Lei 15.266/2025): guia do fornecedor, diretório de almoxarifados virtuais, checklist e ferramentas de apoio. Conteúdo informativo.'

export const metadata: Metadata = {
  title: 'SICX: guia do fornecedor, almoxarifados e ferramentas',
  description: DESCRICAO,
  alternates: { canonical: '/credenciamento-sicx' },
  openGraph: {
    title: 'SICX: guia do fornecedor, almoxarifados e ferramentas',
    description: DESCRICAO,
    url: URL_PAGINA,
    siteName: 'Painel PNCP',
    locale: 'pt_BR',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SICX: guia do fornecedor, almoxarifados e ferramentas',
    description: DESCRICAO,
  },
}

export const revalidate = 3600

const CSS_FLOW = `
.sicx-flow{display:flex;flex-direction:column;gap:0}
.sicx-flow > section{scroll-margin-top:9.5rem}
`

function jsonLd(conteudo: Awaited<ReturnType<typeof carregarConteudoSicx>>, atualizadoEm: string) {
  const artigo = {
    '@type': 'Article',
    headline: 'SICX: guia do fornecedor, almoxarifados e ferramentas',
    description: DESCRICAO,
    datePublished: '2026-11-05',
    dateModified: atualizadoEm,
    inLanguage: 'pt-BR',
    mainEntityOfPage: { '@type': 'WebPage', '@id': URL_PAGINA },
    author: { '@type': 'Organization', name: 'Painel PNCP' },
    publisher: { '@type': 'Organization', name: 'Painel PNCP', url: 'https://www.painelpncp.com.br' },
    about: [
      { '@type': 'Thing', name: 'Sistema de Compras Expressas (SICX)' },
      { '@type': 'Legislation', name: 'Lei nº 15.266/2025' },
      { '@type': 'Legislation', name: 'Decreto nº 13.106/2026' },
    ],
  }
  const faq = {
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({
      '@type': 'Question',
      name: f.pergunta,
      acceptedAnswer: { '@type': 'Answer', text: f.resposta },
    })),
  }
  return { '@context': 'https://schema.org', '@graph': [artigo, faq], source: conteudo.fonte }
}

export default async function CredenciamentoSicxPage() {
  const conteudo = await carregarConteudoSicx()
  const status = conteudo.status || {
    id: 'status',
    ...STATUS_PADRAO,
    fonte_url: STATUS_PADRAO.fonte_url,
  }
  const atualizadoEm = ultimaAtualizacao(conteudo)
  const dadosEstruturados = JSON.stringify(jsonLd(conteudo, atualizadoEm)).replace(/</g, '\\u003c')

  return (
    <div className="bg-white dark:bg-[#0b1120]">
      <style dangerouslySetInnerHTML={{ __html: `${cssOrdemSecoes()}${CSS_FLOW}` }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: dadosEstruturados }} />

      {/* HERO + QUADRO DE STATUS */}
      <section className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800 bg-gradient-to-br from-primary-soft/70 via-white to-secondary-soft/50 dark:from-primary/10 dark:via-[#0b1120] dark:to-secondary/10">
        <div className="max-w-7xl mx-auto px-4 py-14 md:py-20">
          <div className="grid lg:grid-cols-[1.25fr_0.75fr] gap-10 items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="premium" icon={<Sparkles className="w-3.5 h-3.5" />}>NOVA LEI</Badge>
                <Badge variant="primary">Lei nº 15.266/2025</Badge>
                <Badge variant="accent">Decreto nº 13.106/2026</Badge>
              </div>
              <h1 className="mt-4 text-4xl md:text-5xl font-extrabold font-display leading-tight text-slate-900 dark:text-white">
                SICX: o guia prático para vender ao governo por compras expressas
              </h1>
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                {HERO_SUBTITULO}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <a href="#sec-almoxarifados" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-hover">
                  <Store className="w-4 h-4" /> Ver almoxarifados virtuais
                </a>
                <a href="#sec-preparo" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800">
                  <ListChecks className="w-4 h-4" /> Montar meu checklist
                </a>
              </div>
              <p className="mt-5 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
                {AVISO_JURIDICO} O Painel PNCP é uma plataforma independente, sem vínculo com o SICX, o PNCP ou órgãos do Governo Federal.
              </p>
            </div>

            <aside aria-label="Quadro de status do SICX" className="card p-5 dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5"><Zap className="w-4 h-4 text-primary" /> Status do SICX</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                  <Timer className="w-3 h-3" /> Em acompanhamento
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{status.titulo}</p>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{status.descricao}</p>
              <div className="mt-3 space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <p><strong className="text-slate-600 dark:text-slate-300">Última atualização:</strong> {dataBR(status.atualizado_em || atualizadoEm)}</p>
                {status.fonte_url && (
                  <p>
                    <strong className="text-slate-600 dark:text-slate-300">Fonte:</strong>{' '}
                    <a href={status.fonte_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">{status.fonte_label || 'fonte oficial'} <ExternalLink className="inline w-3 h-3" /></a>
                  </p>
                )}
              </div>
              <p className="mt-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2 text-[11px] text-slate-500 dark:text-slate-400">
                Regulamentado não significa operação plena. A plataforma e as normas complementares ainda dependem da SEGES/MGI.
              </p>
            </aside>
          </div>
        </div>
      </section>

      <SicxFlow>
        {/* 1. SICX EM 60 SEGUNDOS */}
        <Secao id="resumo" eyebrow="SICX em 60 segundos" titulo="O essencial, sem juridiquês" subtitulo="Quatro pontos para entender o que muda — e o que ainda depende de regulamentação.">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {RESUMO_60S.map((r) => (
              <div key={r.titulo} className="card p-5 dark:bg-slate-900 dark:border-slate-800">
                <div className="w-9 h-9 rounded-xl bg-primary-soft dark:bg-primary/10 flex items-center justify-center text-primary mb-3"><CamposIcone nome={r.icone} /></div>
                <h3 className="font-semibold text-slate-900 dark:text-white">{r.titulo}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{r.texto}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            {TEXTO_BASE.map((t) => <p key={t.slice(0, 40)} className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{t}</p>)}
            <p className="flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {NOTA_ESFERAS}
            </p>
          </div>
        </Secao>

        {/* 2. LINHA DO TEMPO */}
        <Secao id="timeline" tone="muted" eyebrow="Linha do tempo" titulo="Da lei à operação" subtitulo="O que já aconteceu, o que está vigente e o que ainda está por vir.">
          <ol className="relative border-l border-slate-200 dark:border-slate-700 ml-3 space-y-6">
            {TIMELINE.map((m) => (
              <li key={m.titulo} className="ml-5">
                <span className={cn('absolute -left-[7px] mt-1.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-[#0b1120]', m.status === 'concluido' ? 'bg-emerald-500' : m.status === 'vigente' ? 'bg-primary' : 'bg-amber-400')} />
                <p className="text-xs font-bold uppercase tracking-wide text-primary">{m.data}</p>
                <h3 className="font-semibold text-slate-900 dark:text-white">{m.titulo}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">{m.texto}</p>
                {m.url && m.fonte && (
                  <a href={m.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">{m.fonte} <ExternalLink className="w-3 h-3" /></a>
                )}
              </li>
            ))}
          </ol>
        </Secao>

        {/* 3. PASSO A PASSO */}
        <Secao id="passos" eyebrow="Passo a passo do fornecedor" titulo="O que fazer, onde e o que costuma dar errado" subtitulo="Seis etapas. As marcadas como “aguardando” dependem da plataforma e das normas complementares da SEGES/MGI.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PASSOS.map((p) => (
              <div key={p.numero} className="card p-5 dark:bg-slate-900 dark:border-slate-800">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center">{p.numero}</span>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{p.titulo}</h3>
                  </div>
                  <Badge variant={p.disponivel === 'sim' ? 'success' : 'warning'}>{p.disponivel === 'sim' ? 'Disponível' : 'Aguardando'}</Badge>
                </div>
                <dl className="mt-3 space-y-2 text-xs">
                  <div><dt className="font-semibold text-slate-600 dark:text-slate-300">O que preciso</dt><dd className="text-slate-500 dark:text-slate-400 leading-relaxed">{p.oQuePreciso}</dd></div>
                  <div><dt className="font-semibold text-slate-600 dark:text-slate-300">Onde faço</dt><dd className="text-slate-500 dark:text-slate-400 leading-relaxed">{p.ondeFaco} {p.ondeLink && <a href={p.ondeLink} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">Abrir <ExternalLink className="inline w-3 h-3" /></a>}</dd></div>
                  <div><dt className="font-semibold text-slate-600 dark:text-slate-300">Erro comum</dt><dd className="text-slate-500 dark:text-slate-400 leading-relaxed">{p.errosComuns}</dd></div>
                </dl>
              </div>
            ))}
          </div>

          <h3 className="mt-10 mb-3 text-lg font-bold text-slate-900 dark:text-white">Visão por esfera de governo</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ESFERAS.map((e) => (
              <div key={e.id} className="card p-5 dark:bg-slate-900 dark:border-slate-800">
                <div className="flex items-center gap-2"><Landmark className="w-4 h-4 text-primary" /><h4 className="font-semibold text-slate-900 dark:text-white">{e.label}</h4></div>
                <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{e.regulado}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{e.texto}</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400"><strong className="text-slate-600 dark:text-slate-300">Onde procurar:</strong> {e.ondeProcurar}</p>
                {'link' in e && e.link && <a href={e.link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Fonte oficial <ExternalLink className="w-3 h-3" /></a>}
              </div>
            ))}
          </div>

          <h3 className="mt-10 mb-3 text-lg font-bold text-slate-900 dark:text-white">Visão do órgão comprador</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {GUIA_ORGAO.map((g) => (
              <div key={g.titulo} className="card p-5 dark:bg-slate-900 dark:border-slate-800">
                <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" /><h4 className="font-semibold text-slate-900 dark:text-white">{g.titulo}</h4></div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{g.texto}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {PERFIS.map((p) => (
              <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 px-3 py-1 text-[11px] text-slate-500 dark:text-slate-400">
                {p.id === 'fornecedor' ? <Store className="w-3 h-3" /> : p.id === 'orgao' ? <Building2 className="w-3 h-3" /> : <GraduationCap className="w-3 h-3" />} {p.label}
              </span>
            ))}
            <span className="text-[11px] text-slate-400">Use o seletor no topo para reordenar o conteúdo.</span>
          </div>
        </Secao>

        {/* 4. COMPARATIVO */}
        <Secao id="comparativo" tone="muted" eyebrow="Comparativo" titulo="Sicx não é pregão — e não substitui as modalidades" subtitulo="Veja como o credenciamento por comércio eletrônico se diferencia na prática.">
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-200">Critério</th>
                  {COMPARATIVO.colunas.map((c) => <th key={c} className="p-3 text-left font-semibold text-slate-700 dark:text-slate-200">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {COMPARATIVO.linhas.map((l) => (
                  <tr key={l.criterio} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="p-3 font-semibold text-slate-700 dark:text-slate-200 align-top">{l.criterio}</td>
                    <td className="p-3 text-slate-500 dark:text-slate-400 align-top">{l.pregao}</td>
                    <td className="p-3 text-slate-500 dark:text-slate-400 align-top">{l.arp}</td>
                    <td className="p-3 text-slate-500 dark:text-slate-400 align-top">{l.almoxarifado}</td>
                    <td className="p-3 text-slate-700 dark:text-slate-200 align-top bg-primary-soft/40 dark:bg-primary/5">{l.sicx}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-400">“Depende do edital/órgão” indica que a BASE LEGAL não fixa uma regra única para aquele ponto.</p>
        </Secao>

        {/* 5. RANKING */}
        <Secao id="ranking" eyebrow="Ranking e escolha da oferta" titulo={RANKING.titulo} subtitulo="Entenda o que o Decreto prevê — e o que ele não garante.">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              {RANKING.paragrafos.map((p) => <p key={p.slice(0, 30)} className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{p}</p>)}
              <div className="rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-4 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {RANKING.aviso}
              </div>
            </div>
            <div className="card p-5 dark:bg-slate-900 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5"><Trophy className="w-4 h-4 text-primary" /> O que ajuda a competir</h3>
              <ul className="mt-3 space-y-2">
                {RANKING.checklist.map((i) => <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> {i}</li>)}
              </ul>
            </div>
          </div>
        </Secao>

        {/* 6. ALMOXARIFADOS */}
        <Secao id="almoxarifados" tone="muted" eyebrow="Diretório" titulo="Almoxarifados virtuais e catálogos públicos" subtitulo="Onde cada ente publica o catálogo e como o fornecedor participa. Filtre, exporte e reporte links desatualizados.">
          <Diretorio almoxarifados={conteudo.almoxarifados} />
        </Secao>

        {/* 7. FERRAMENTAS */}
        <Secao id="ferramentas" eyebrow="Ferramentas de apoio" titulo="Sete ferramentas para sair do discurso e organizar a operação" subtitulo="Pesquise preços, simule sua oferta, organize contratações e acompanhe novidades. As ferramentas que salvam dados exigem login.">
          <Ferramentas normas={conteudo.normas} />
          <div className="mt-8">
            <GeradorCredenciamento />
          </div>
        </Secao>

        {/* 8. MEU PREPARO */}
        <Secao id="preparo" tone="muted" eyebrow="Meu preparo" titulo="Seu checklist de credenciamento" subtitulo="Conta gov.br, SICAF, certidões com validade, catálogo, preços, frete e contato. O progresso fica salvo na sua conta.">
          <Preparo />
        </Secao>

        {/* 9. OPORTUNIDADES */}
        <Secao id="oportunidades" eyebrow="Oportunidades" titulo="Credenciamentos publicados no PNCP" subtitulo="A lista usa dados públicos do PNCP e é apenas informativa. Confira sempre o edital oficial.">
          <Oportunidades />
        </Secao>

        {/* 10. NORMAS E LEITURAS */}
        <Secao id="normas" tone="muted" eyebrow="Normas e leituras" titulo="Fontes oficiais e leituras recomendadas" subtitulo="Só exibimos como ativo o link validado. O que ainda não foi validado aparece marcado como “a verificar”.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {conteudo.normas.map((n) => {
              const verificado = n.status_link === 'verificado' && !!n.url
              return (
                <div key={n.id} className="card p-5 dark:bg-slate-900 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      {n.tipo === 'lei' || n.tipo === 'decreto' ? <Scale className="w-4 h-4 text-primary mt-0.5" /> : n.tipo === 'portal' ? <Landmark className="w-4 h-4 text-primary mt-0.5" /> : <BookOpen className="w-4 h-4 text-primary mt-0.5" />}
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">{n.titulo}</h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{n.orgao || '—'}{n.data_publicacao ? ` · ${dataBR(n.data_publicacao)}` : ''}</p>
                      </div>
                    </div>
                    <Badge variant={verificado ? 'success' : 'warning'}>{verificado ? 'Verificado' : 'A verificar'}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    {verificado ? (
                      <a href={n.url as string} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Abrir fonte oficial <ExternalLink className="w-3 h-3" /></a>
                    ) : (
                      <span className="text-[11px] text-slate-400">Link ainda não validado — não é exibido como ativo.</span>
                    )}
                    {n.verificado_em && <span className="text-[10px] text-slate-400">Verificado em {dataBR(n.verificado_em)}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </Secao>

        {/* 11. FAQ */}
        <Secao id="faq" eyebrow="Perguntas frequentes" titulo="Dúvidas que aparecem primeiro" subtitulo="Respostas apoiadas na BASE LEGAL. Não há promessa de posição, ranking ou venda.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {FAQ.map((f) => (
              <details key={f.pergunta} className="card p-4 dark:bg-slate-900 dark:border-slate-800 group">
                <summary className="flex cursor-pointer items-start justify-between gap-2 text-sm font-semibold text-slate-900 dark:text-white list-none">
                  <span className="flex items-start gap-2"><HelpCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" /> {f.pergunta}</span>
                  <span className="text-slate-400 group-open:rotate-45 transition-transform text-lg leading-none">+</span>
                </summary>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{f.resposta}</p>
              </details>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">{AVISO_JURIDICO} <a href={SICX_URLS.decreto13106} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">Texto oficial do Decreto nº 13.106/2026</a>.</p>
        </Secao>

        {/* 12. INTERESSE */}
        <Secao id="interesse" tone="muted" eyebrow="Fique por dentro" titulo="Avisamos quando o SICX mudar" subtitulo="Cadastro com consentimento (LGPD), sem spam e com saída a qualquer momento.">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-5 items-start">
            <Interesse />
            <div className="card p-5 dark:bg-slate-900 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-300 space-y-2">
              <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-500" /> Privacidade em primeiro lugar</h3>
              <p className="text-xs leading-relaxed">Usamos o e-mail apenas para comunicações sobre o SICX. Você pode cancelar pelo link enviado ou pelo formulário de descadastro.</p>
              <p className="text-xs leading-relaxed">Não vendemos, não alugamos e não compartilhamos sua lista com terceiros. O Painel não envia seus dados a órgãos públicos.</p>
              <Link href="/privacidade" className="inline-flex text-xs font-semibold text-primary hover:underline">Ler a Política de Privacidade <ArrowRight className="w-3 h-3" /></Link>
            </div>
          </div>
        </Secao>

        {/* 13. GLOSSÁRIO */}
        <Secao id="glossario" eyebrow="Glossário" titulo="Termos que aparecem no caminho" subtitulo="Definições curtas, com a fonte legal quando houver.">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {GLOSSARIO.map((g) => (
              <div key={g.termo} className="card p-4 dark:bg-slate-900 dark:border-slate-800">
                <dt className="font-semibold text-slate-900 dark:text-white">{g.termo}</dt>
                <dd className="mt-1 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{g.definicao}</dd>
              </div>
            ))}
          </dl>
        </Secao>
      </SicxFlow>

      {/* RODAPÉ DA PÁGINA */}
      <footer className="border-t border-slate-800 bg-slate-900 text-slate-300">
        <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5"><Scale className="w-4 h-4" /> Fontes oficiais</h3>
            <ul className="mt-3 space-y-1.5 text-xs">
              {FONTES_OFICIAIS.map((f) => (
                <li key={f.label}>
                  {f.url === SICX_URLS.pncp ? (
                    <span className="text-slate-400">{f.label} — link a verificar</span>
                  ) : (
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="hover:text-white hover:underline inline-flex items-center gap-1">{f.label} <ExternalLink className="w-3 h-3" /></a>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5"><Clock className="w-4 h-4" /> Atualização</h3>
            <p className="mt-3 text-xs text-slate-400">Conteúdo revisado em {SICX_ATUALIZADO_LABEL}.</p>
            <p className="mt-1 text-xs text-slate-400">Última verificação de conteúdo: {dataBR(atualizadoEm)}.</p>
            <p className="mt-2 text-xs text-slate-400">{AVISO_JURIDICO}</p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Encontrou um erro?</h3>
            <p className="mt-3 text-xs text-slate-400">Avise a nossa equipe. Corrigimos e registramos a data da revisão.</p>
            <div className="mt-2"><ReportarPagina /></div>
            <div className="mt-4 flex flex-wrap gap-3 text-xs">
              {ANCORAS.slice(0, 6).map((a) => <a key={a.id} href={`#sec-${a.id}`} className="text-slate-400 hover:text-white">{a.label}</a>)}
            </div>
          </div>
        </div>
        <div className="border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
            <span>Painel PNCP — plataforma independente de consulta a dados públicos.</span>
            <span className="inline-flex items-center gap-1"><Layers className="w-3 h-3" /> SICX · Lei nº 15.266/2025 · Decreto nº 13.106/2026</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Secao({
  id,
  eyebrow,
  titulo,
  subtitulo,
  tone = 'default',
  children,
}: {
  id: string
  eyebrow: string
  titulo: string
  subtitulo?: string
  tone?: 'default' | 'muted'
  children: React.ReactNode
}) {
  return (
    <section
      id={`sec-${id}`}
      className={cn(
        'py-14 md:py-16 border-b border-slate-100 dark:border-slate-800/60',
        tone === 'muted' && 'bg-slate-50/70 dark:bg-slate-900/20'
      )}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="max-w-3xl mb-8">
          <p className="text-xs font-bold uppercase tracking-wider text-primary mb-2">{eyebrow}</p>
          <h2 className="text-2xl md:text-3xl font-extrabold font-display text-slate-900 dark:text-white">{titulo}</h2>
          {subtitulo && <p className="mt-2 text-slate-500 dark:text-slate-400">{subtitulo}</p>}
        </div>
        {children}
      </div>
    </section>
  )
}

function CamposIcone({ nome }: { nome: string }) {
  if (nome === 'rede') return <Layers className="w-4 h-4" />
  if (nome === 'caixa') return <ShoppingCart className="w-4 h-4" />
  if (nome === 'balanca') return <Scale className="w-4 h-4" />
  return <ShieldCheck className="w-4 h-4" />
}
