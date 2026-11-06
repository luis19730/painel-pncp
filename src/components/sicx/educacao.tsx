'use client'

import { useMemo, useState } from 'react'
import {
  AlertTriangle, BookOpen, Building2, CheckCircle2, ExternalLink, FileText,
  HelpCircle, Landmark, Scale, Search, Sparkles, Trophy, Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import Preparo from '@/components/sicx/preparo'
import type { SicxNorma, SicxStatus } from '@/lib/sicx/types'
import {
  COMPARATIVO, ESFERAS, FAQ, FONTES_OFICIAIS, GLOSSARIO, GUIA_ORGAO,
  NOTA_ESFERAS, PASSOS, RANKING, RESUMO_60S, SICX_URLS, TEXTO_BASE, TIMELINE,
} from '@/lib/sicx/conteudo'
import { dataBR } from '@/lib/sicx/calc'
import { cn } from '@/lib/utils'

interface Aba {
  id: string
  label: string
  icone: typeof Zap
}

const ABAS: Aba[] = [
  { id: 'oque', label: 'O que é o SICX', icone: Sparkles },
  { id: 'passos', label: 'Passo a passo', icone: FileText },
  { id: 'documentos', label: 'Documentos e preparo', icone: CheckCircle2 },
  { id: 'faq', label: 'Perguntas frequentes', icone: HelpCircle },
  { id: 'links', label: 'Links e legislação', icone: Scale },
  { id: 'glossario', label: 'Glossário', icone: BookOpen },
]

export default function EducacaoSicx({
  normas,
  status,
}: {
  normas: SicxNorma[]
  status: SicxStatus | null
}) {
  const [aba, setAba] = useState<string | null>(null)

  return (
    <section aria-label="Guia do SICX" className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className="flex flex-wrap gap-1.5 p-3" role="tablist" aria-label="Conteúdo educativo do SICX">
        {ABAS.map((a) => {
          const Icone = a.icone
          const ativo = aba === a.id
          return (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={ativo}
              onClick={() => setAba(ativo ? null : a.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors',
                ativo
                  ? 'border-primary bg-primary text-white'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary'
              )}
            >
              <Icone className="w-3.5 h-3.5" /> {a.label}
            </button>
          )
        })}
      </div>

      {aba && (
        <div className="border-t border-slate-100 dark:border-slate-800 p-4">
          {aba === 'oque' && <AbaOQueE status={status} />}
          {aba === 'passos' && <AbaPassos />}
          {aba === 'documentos' && <Preparo />}
          {aba === 'faq' && <AbaFaq />}
          {aba === 'links' && <AbaLinks normas={normas} />}
          {aba === 'glossario' && <AbaGlossario />}
        </div>
      )}
    </section>
  )
}

function AbaOQueE({ status }: { status: SicxStatus | null }) {
  return (
    <div className="space-y-4">
      {status && (
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 text-xs text-slate-600 dark:text-slate-300">
          <p className="font-semibold text-slate-800 dark:text-slate-100 inline-flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-primary" /> Status: {status.titulo}</p>
          {status.descricao && <p className="mt-1 leading-relaxed">{status.descricao}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {RESUMO_60S.map((r) => (
          <div key={r.titulo} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
            <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{r.titulo}</h4>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{r.texto}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        {TEXTO_BASE.map((t) => <p key={t.slice(0, 40)} className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{t}</p>)}
        <p className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {NOTA_ESFERAS}
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full min-w-[720px] text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60">
            <tr>
              <th className="p-2 text-left font-semibold text-slate-700 dark:text-slate-200">Critério</th>
              {COMPARATIVO.colunas.map((c) => <th key={c} className="p-2 text-left font-semibold text-slate-700 dark:text-slate-200">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {COMPARATIVO.linhas.map((l) => (
              <tr key={l.criterio} className="border-t border-slate-100 dark:border-slate-800">
                <td className="p-2 font-semibold text-slate-700 dark:text-slate-200 align-top">{l.criterio}</td>
                <td className="p-2 text-slate-500 dark:text-slate-400 align-top">{l.pregao}</td>
                <td className="p-2 text-slate-500 dark:text-slate-400 align-top">{l.arp}</td>
                <td className="p-2 text-slate-500 dark:text-slate-400 align-top">{l.almoxarifado}</td>
                <td className="p-2 text-slate-700 dark:text-slate-200 align-top bg-primary-soft/40 dark:bg-primary/5">{l.sicx}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <h4 className="font-semibold text-slate-900 dark:text-white inline-flex items-center gap-1.5"><Trophy className="w-4 h-4 text-primary" /> {RANKING.titulo}</h4>
        {RANKING.paragrafos.map((p) => <p key={p.slice(0, 30)} className="mt-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{p}</p>)}
        <div className="mt-2 rounded-lg border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {RANKING.aviso}
        </div>
      </div>
    </div>
  )
}

function AbaPassos() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {PASSOS.map((p) => (
          <div key={p.numero} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center shrink-0">{p.numero}</span>
                <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{p.titulo}</h4>
              </div>
              <Badge variant={p.disponivel === 'sim' ? 'success' : 'warning'}>{p.disponivel === 'sim' ? 'Disponível' : 'Aguardando'}</Badge>
            </div>
            <dl className="mt-2 space-y-1.5 text-xs">
              <div><dt className="font-semibold text-slate-600 dark:text-slate-300">O que preciso</dt><dd className="text-slate-500 dark:text-slate-400">{p.oQuePreciso}</dd></div>
              <div><dt className="font-semibold text-slate-600 dark:text-slate-300">Onde faço</dt><dd className="text-slate-500 dark:text-slate-400">{p.ondeFaco} {p.ondeLink && <a href={p.ondeLink} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">Abrir <ExternalLink className="inline w-3 h-3" /></a>}</dd></div>
              <div><dt className="font-semibold text-slate-600 dark:text-slate-300">Erro comum</dt><dd className="text-slate-500 dark:text-slate-400">{p.errosComuns}</dd></div>
            </dl>
          </div>
        ))}
      </div>

      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Visão por esfera de governo</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {ESFERAS.map((e) => (
          <div key={e.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
            <p className="font-semibold text-slate-900 dark:text-white inline-flex items-center gap-1.5"><Landmark className="w-4 h-4 text-primary" /> {e.label}</p>
            <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{e.regulado}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{e.texto}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400"><strong className="text-slate-600 dark:text-slate-300">Onde procurar:</strong> {e.ondeProcurar}</p>
            {'link' in e && e.link && <a href={e.link} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Fonte oficial <ExternalLink className="w-3 h-3" /></a>}
          </div>
        ))}
      </div>

      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Visão do órgão comprador</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {GUIA_ORGAO.map((g) => (
          <div key={g.titulo} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
            <p className="font-semibold text-slate-900 dark:text-white inline-flex items-center gap-1.5"><Building2 className="w-4 h-4 text-primary" /> {g.titulo}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{g.texto}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function AbaFaq() {
  const [busca, setBusca] = useState('')
  const termo = busca.trim().toLowerCase()
  const perguntas = useMemo(
    () => (termo ? FAQ.filter((f) => `${f.pergunta} ${f.resposta}`.toLowerCase().includes(termo)) : FAQ),
    [termo]
  )

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar nas perguntas..."
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Buscar nas perguntas frequentes"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {perguntas.map((f) => (
          <details key={f.pergunta} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 group">
            <summary className="flex cursor-pointer items-start justify-between gap-2 text-sm font-semibold text-slate-900 dark:text-white list-none">
              <span>{f.pergunta}</span>
              <span className="text-slate-400 group-open:rotate-45 transition-transform text-lg leading-none shrink-0">+</span>
            </summary>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{f.resposta}</p>
          </details>
        ))}
      </div>
      {perguntas.length === 0 && <p className="text-sm text-slate-400">Nenhuma pergunta encontrada para “{busca}”.</p>}
    </div>
  )
}

function AbaLinks({ normas }: { normas: SicxNorma[] }) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Linha do tempo</h4>
        <ol className="space-y-3 border-l border-slate-200 dark:border-slate-700 ml-2 pl-4">
          {TIMELINE.map((m) => (
            <li key={m.titulo}>
              <p className="text-xs font-bold uppercase tracking-wide text-primary">{m.data}</p>
              <p className="font-semibold text-slate-900 dark:text-white text-sm">{m.titulo}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{m.texto}</p>
              {m.url && m.fonte && <a href={m.url} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">{m.fonte} <ExternalLink className="w-3 h-3" /></a>}
            </li>
          ))}
        </ol>
      </div>

      <div>
        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Normas e leituras</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {normas.map((n) => {
            const verificado = n.status_link === 'verificado' && !!n.url
            return (
              <div key={n.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{n.titulo}</p>
                  <Badge variant={verificado ? 'success' : 'warning'}>{verificado ? 'Verificado' : 'A verificar'}</Badge>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{n.orgao || '—'}{n.data_publicacao ? ` · ${dataBR(n.data_publicacao)}` : ''}</p>
                {verificado ? (
                  <a href={n.url as string} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Abrir fonte <ExternalLink className="w-3 h-3" /></a>
                ) : (
                  <p className="mt-1 text-[11px] text-slate-400">Link ainda não validado.</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Fontes oficiais</h4>
        <ul className="space-y-1.5">
          {FONTES_OFICIAIS.map((f) => (
            <li key={f.label} className="text-sm">
              {f.url === SICX_URLS.pncp ? (
                <span className="text-slate-400">{f.label} — link a verificar</span>
              ) : (
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">{f.label} <ExternalLink className="w-3 h-3" /></a>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function AbaGlossario() {
  return (
    <dl className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {GLOSSARIO.map((g) => (
        <div key={g.termo} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
          <dt className="font-semibold text-slate-900 dark:text-white text-sm">{g.termo}</dt>
          <dd className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{g.definicao}</dd>
        </div>
      ))}
    </dl>
  )
}
