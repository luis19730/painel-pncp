'use client'

import { useMemo, useState } from 'react'
import {
  AlertTriangle, Building2, Download, ExternalLink, FileText, Landmark,
  Link2, MapPin, Plus, Scale, Search, ShieldCheck, Store,
} from 'lucide-react'
import type { SicxAlmoxarifado } from '@/lib/sicx/types'
import { apiSicxPublico } from '@/lib/sicx/client'
import { dataBR, paraCSV } from '@/lib/sicx/calc'
import { cn } from '@/lib/utils'

const ESFERA_LABEL: Record<string, string> = {
  federal: 'Federal',
  estadual: 'Estadual',
  municipal: 'Municipal',
  autarquia: 'Autarquia',
  entidade: 'Entidade',
}

const TIPO_LABEL: Record<string, string> = {
  almoxarifado_virtual: 'Almoxarifado virtual',
  catalogo_eletronico: 'Catálogo eletrônico',
  marketplace_publico: 'Marketplace público',
  compras_expressas: 'Compras expressas',
}

const SITUACAO_LABEL: Record<string, { label: string; classe: string }> = {
  ativo: { label: 'Ativo', classe: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  em_implantacao: { label: 'Em implantação', classe: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  a_verificar: { label: 'A verificar', classe: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  em_revisao: { label: 'Em revisão', classe: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' },
}

const INPUT =
  'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary'

function agora(): string {
  return new Date().toLocaleDateString('pt-BR')
}

export default function Diretorio({ almoxarifados }: { almoxarifados: SicxAlmoxarifado[] }) {
  const [busca, setBusca] = useState('')
  const [esfera, setEsfera] = useState('todas')
  const [uf, setUf] = useState('todas')
  const [tipo, setTipo] = useState('todos')
  const [situacao, setSituacao] = useState('todas')
  const [reportando, setReportando] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const [sugerindo, setSugerindo] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [sugestao, setSugestao] = useState({ nome: '', orgao: '', uf: '', esfera: 'estadual', url: '', observacao: '' })

  const ufs = useMemo(
    () => [...new Set(almoxarifados.map((a) => a.uf).filter(Boolean) as string[])].sort(),
    [almoxarifados]
  )
  const tipos = useMemo(
    () => [...new Set(almoxarifados.map((a) => a.tipo).filter(Boolean))],
    [almoxarifados]
  )

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return almoxarifados.filter((a) => {
      if (esfera !== 'todas' && a.esfera !== esfera) return false
      if (uf !== 'todas' && a.uf !== uf) return false
      if (tipo !== 'todos' && a.tipo !== tipo) return false
      if (situacao !== 'todas' && a.situacao !== situacao) return false
      if (!termo) return true
      return `${a.nome} ${a.orgao || ''} ${a.descricao || ''} ${a.uf || ''}`
        .toLowerCase()
        .includes(termo)
    })
  }, [almoxarifados, busca, esfera, uf, tipo, situacao])

  function exportar() {
    const csv = paraCSV(
      ['Nome', 'Órgão', 'Esfera', 'UF', 'Tipo', 'Situação', 'Site oficial', 'Norma', 'Edital', 'Link verificado em'],
      filtrados.map((a) => [
        a.nome,
        a.orgao || '',
        ESFERA_LABEL[a.esfera] || a.esfera,
        a.uf || '',
        TIPO_LABEL[a.tipo] || a.tipo,
        SITUACAO_LABEL[a.situacao]?.label || a.situacao,
        a.status_link === 'verificado' ? a.url_site || '' : 'a verificar',
        a.status_link === 'verificado' ? a.url_norma || '' : 'a verificar',
        a.status_link === 'verificado' ? a.url_edital || '' : 'a verificar',
        a.verificado_em ? dataBR(a.verificado_em) : '',
      ])
    )
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `almoxarifados-sicx-${agora().replace(/\//g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function enviarReport() {
    if (!reportando || !motivo.trim()) return
    setErro('')
    try {
      await apiSicxPublico('/api/sicx/reportar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ almoxarifado_id: reportando, motivo }),
      })
      setMensagem('Relato enviado. Obrigado — nossa equipe vai revisar o link.')
      setReportando(null)
      setMotivo('')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar o relato.')
    }
  }

  async function enviarSugestao() {
    setErro('')
    if (!sugestao.nome.trim()) {
      setErro('Informe o nome do almoxarifado ou catálogo.')
      return
    }
    try {
      await apiSicxPublico('/api/sicx/sugestoes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(sugestao),
      })
      setMensagem('Sugestão recebida. Obrigado pela contribuição!')
      setSugerindo(false)
      setSugestao({ nome: '', orgao: '', uf: '', esfera: 'estadual', url: '', observacao: '' })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar a sugestão.')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar almoxarifado, órgão ou UF..."
            className={`${INPUT} pl-9`}
            aria-label="Buscar almoxarifado"
          />
        </div>
        <select value={esfera} onChange={(e) => setEsfera(e.target.value)} className={`${INPUT} w-auto`} aria-label="Esfera">
          <option value="todas">Todas as esferas</option>
          {Object.entries(ESFERA_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={uf} onChange={(e) => setUf(e.target.value)} className={`${INPUT} w-auto`} aria-label="UF">
          <option value="todas">Todas as UFs</option>
          {ufs.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={`${INPUT} w-auto`} aria-label="Tipo">
          <option value="todos">Todos os tipos</option>
          {tipos.map((t) => <option key={t} value={t}>{TIPO_LABEL[t] || t}</option>)}
        </select>
        <select value={situacao} onChange={(e) => setSituacao(e.target.value)} className={`${INPUT} w-auto`} aria-label="Situação">
          <option value="todas">Todas as situações</option>
          {Object.entries(SITUACAO_LABEL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button
          type="button"
          onClick={exportar}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <Download className="w-4 h-4" /> CSV
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span>{filtrados.length} de {almoxarifados.length} registro(s)</span>
        <button type="button" onClick={() => setSugerindo((v) => !v)} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
          <Plus className="w-3.5 h-3.5" /> Sugerir almoxarifado
        </button>
      </div>

      {mensagem && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
          {mensagem}
        </div>
      )}
      {erro && (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
          {erro}
        </div>
      )}

      {sugerindo && (
        <div className="card p-5 dark:bg-slate-900 dark:border-slate-800">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Sugerir almoxarifado ou catálogo</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className={INPUT} placeholder="Nome *" value={sugestao.nome} onChange={(e) => setSugestao((s) => ({ ...s, nome: e.target.value }))} />
            <input className={INPUT} placeholder="Órgão responsável" value={sugestao.orgao} onChange={(e) => setSugestao((s) => ({ ...s, orgao: e.target.value }))} />
            <input className={INPUT} placeholder="UF (ex.: SP)" maxLength={2} value={sugestao.uf} onChange={(e) => setSugestao((s) => ({ ...s, uf: e.target.value.toUpperCase() }))} />
            <select className={INPUT} value={sugestao.esfera} onChange={(e) => setSugestao((s) => ({ ...s, esfera: e.target.value }))}>
              {Object.entries(ESFERA_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input className={`${INPUT} md:col-span-2`} placeholder="Site oficial (https://...)" value={sugestao.url} onChange={(e) => setSugestao((s) => ({ ...s, url: e.target.value }))} />
            <textarea className={`${INPUT} md:col-span-2`} rows={2} placeholder="Observações" value={sugestao.observacao} onChange={(e) => setSugestao((s) => ({ ...s, observacao: e.target.value }))} />
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={enviarSugestao} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">Enviar sugestão</button>
            <button type="button" onClick={() => setSugerindo(false)} className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Cancelar</button>
          </div>
        </div>
      )}

      {filtrados.length === 0 ? (
        <div className="card p-8 text-center dark:bg-slate-900 dark:border-slate-800">
          <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="font-semibold text-slate-900 dark:text-white">Nenhum registro com esses filtros</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Tente limpar a busca ou escolher outra esfera/UF.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtrados.map((a) => {
            const verified = a.status_link === 'verificado'
            const situacaoInfo = SITUACAO_LABEL[a.situacao] || SITUACAO_LABEL.a_verificar
            return (
              <article key={a.id} className="card p-5 dark:bg-slate-900 dark:border-slate-800 flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary-soft dark:bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      {a.esfera === 'federal' ? <Landmark className="w-4 h-4" /> : <Store className="w-4 h-4" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white leading-snug">{a.nome}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{a.orgao || 'Órgão não informado'}</p>
                    </div>
                  </div>
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', situacaoInfo.classe)}>
                    {situacaoInfo.label}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{ESFERA_LABEL[a.esfera] || a.esfera}{a.uf ? ` · ${a.uf}` : ''}</span>
                  <span>·</span>
                  <span>{TIPO_LABEL[a.tipo] || a.tipo}</span>
                </div>

                {a.descricao && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{a.descricao}</p>}
                {a.como_participar && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    <strong className="text-slate-600 dark:text-slate-300">Como participar:</strong> {a.como_participar}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {verified && a.url_site ? (
                    <a href={a.url_site} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover">
                      <ExternalLink className="w-3.5 h-3.5" /> Site oficial
                    </a>
                  ) : (
                    <span title="Link ainda não validado — não é exibido como ativo" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500">
                      <Link2 className="w-3.5 h-3.5" /> Site a verificar
                    </span>
                  )}
                  {verified && a.url_norma && (
                    <a href={a.url_norma} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                      <Scale className="w-3.5 h-3.5" /> Norma
                    </a>
                  )}
                  {verified && a.url_edital && (
                    <a href={a.url_edital} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                      <FileText className="w-3.5 h-3.5" /> Edital
                    </a>
                  )}
                  <button type="button" onClick={() => { setReportando(reportando === a.id ? null : a.id); setMensagem('') }} className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-rose-500">
                    <AlertTriangle className="w-3 h-3" /> Reportar link
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                  {verified ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                  {verified ? `Link verificado em ${dataBR(a.verificado_em)}` : 'Link ainda não verificado nesta página'}
                </div>

                {reportando === a.id && (
                  <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                    <textarea
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      rows={2}
                      placeholder="O que está errado? (link quebrado, órgão extinto, endereço mudou...)"
                      className={INPUT}
                    />
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={enviarReport} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700">Enviar relato</button>
                      <button type="button" onClick={() => setReportando(null)} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">Cancelar</button>
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
        <ShieldCheck className="inline w-3.5 h-3.5 text-emerald-500 mr-1" />
        Só exibimos como ativo o link validado por HTTP 200. Registros com duas falhas seguidas na
        verificação automática entram em revisão e saem da lista pública. Datas de verificação ficam
        visíveis em cada card.
      </p>
    </div>
  )
}
