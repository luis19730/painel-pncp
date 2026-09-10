'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Check, ChevronLeft, ChevronRight, Save, FileText, Download, Printer,
  Plus, Trash2, Copy, ArrowUp, ArrowDown, AlertTriangle,
  ShieldAlert, ClipboardList, LayoutList, Calculator, Table2, DollarSign,
} from 'lucide-react'
import PageHeader from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'
import EmptyState from '@/components/ui/empty-state'
import { cn, formatCurrency } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  insertProcesso, updateProcesso, getProcesso,
  replaceItens, listItens, replacePrecos, listPrecos, replaceRiscos, listRiscos,
  replaceDocumentos, listDocumentos, addHistorico,
  listSinapiCabecalhos, searchSinapiItens,
} from '@/lib/contratacoes/db'
import type { SinapiItem } from '@/lib/contratacoes/types'
import {
  TIPOS_OBJETO, NATUREZAS_DESPESA, sugerirEnquadramento, documentacaoAplicavel, validarProcesso,
} from '@/lib/contratacoes/regras'
import {
  exportarWord, exportarExcelPlanilhaOrcamento, exportarExcelPesquisaPrecos, abrirImpressaoProcesso,
  escapeHtml, brl,
} from '@/lib/contratacoes/export'

const ETAPAS = [
  'Identificação', 'Classificação', 'Enquadramento', 'Documentos', 'DFD', 'ETP',
  'Pesquisa de Preços', 'SINAPI', 'Orçamento', 'BDI', 'TR', 'Análise de Riscos',
  'Checklist Final', 'Validações', 'Gerar Processo',
]

const SELECT_CLS =
  'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white'
const INPUT_CLS =
  'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary'
const TEXTAREA_CLS =
  'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white min-h-[90px] focus:outline-none focus:ring-2 focus:ring-primary'

interface ItemRow {
  id?: string
  codigo?: string
  descricao: string
  unidade?: string
  quantidade: number
  unitario: number
  total: number
  fonte?: string
  competencia?: string
  tipo?: string
}

interface PrecoRow {
  id?: string
  fonte?: string
  fornecedor?: string
  cnpj?: string
  data?: string
  descricao?: string
  unidade?: string
  quantidade: number
  preco_unit: number
  preco_total: number
  link?: string
  obs?: string
}

export default function MontagemProcessoPage() {
  return (
    <Suspense fallback={null}>
      <MontagemProcessoConteudo />
    </Suspense>
  )
}

function MontagemProcessoConteudo() {
  const params = useSearchParams()
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [processoId, setProcessoId] = useState<string | null>(params.get('id') || null)
  const [etapa, setEtapa] = useState(0)
  const [salvando, setSalvando] = useState(false)
  const [aviso, setAviso] = useState('')
  const [erro, setErro] = useState('')

  // Dados do processo
  const [numero, setNumero] = useState('')
  const [unidade, setUnidade] = useState('')
  const [setor, setSetor] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [objeto, setObjeto] = useState('')
  const [descricao, setDescricao] = useState('')
  const [finalidade, setFinalidade] = useState('')
  const [justificativa, setJustificativa] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [unidadeMedida, setUnidadeMedida] = useState('')
  const [valorEstimado, setValorEstimado] = useState('')
  const [prazo, setPrazo] = useState('')

  const [tipoObjeto, setTipoObjeto] = useState('')
  const [nd, setNd] = useState('')
  const [ndCostumizada, setNdCostumizada] = useState('')

  // Documentos (checklist)
  const [documentos, setDocumentos] = useState<Array<{ nome: string; status: string; obrigatorio: boolean; justificativa: string }>>([])

  // DFD / ETP / TR (conteúdos gerados)
  const [dfd, setDfd] = useState<Record<string, string>>({})
  const [etp, setEtp] = useState<Record<string, string>>({})
  const [tr, setTr] = useState<Record<string, string>>({})

  // Orçamento
  const [itens, setItens] = useState<ItemRow[]>([])
  // Preços
  const [precos, setPrecos] = useState<PrecoRow[]>([])
  // Riscos
  const [riscos, setRiscos] = useState<Array<{ id?: string; risco: string; probabilidade: string; impacto: string; consequencia: string; tratamento: string; responsavel: string; nivel: string }>>([])
  // BDI
  const [bdiPercent, setBdiPercent] = useState('')
  const [bdiAplicavel, setBdiAplicavel] = useState<boolean | null>(null)

  // SINAPI
  const [bases, setBases] = useState<Array<{ id: string; uf: string | null; competencia: string | null; total_itens: number }>>([])
  const [baseSel, setBaseSel] = useState('')
  const [termoSin, setTermoSin] = useState('')
  const [sinRes, setSinRes] = useState<SinapiItem[]>([])

  const [percentual, setPercentual] = useState(0)
  const [status, setStatus] = useState('rascunho')
  const emElaboracao = true

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null))
  }, [supabase])

  const formulaPercentual = () => {
    // Percentual de conclusão do processo (transparente, por agrupamento de etapas).
    const it = itens
    const pr = precos
    const doc = documentos
    let pts = 0
    let max = 0
    if (numero || objeto) { pts += 1 }
    max += 1
    if (tipoObjeto && nd) { pts += 1 }
    max += 1
    if (doc.length > 0 && doc.some((x) => x.status === 'completo')) { pts += 1 }
    max += 1
    if (Object.keys(dfd).length > 0) { pts += 1 }
    max += 1
    if (Object.keys(etp).length > 0) { pts += 1 }
    max += 1
    if (pr.length > 0) { pts += 1 }
    max += 1
    if (it.length > 0) { pts += 1 }
    max += 1
    if (Object.keys(tr).length > 0) { pts += 1 }
    max += 1
    if (riscos.length > 0) { pts += 1 }
    max += 1
    const pct = max ? Math.round((pts / max) * 100) : 0
    setPercentual(pct)
    return pct
  }

  // Carregar processo existente
  useEffect(() => {
    if (!userId || !processoId) return
    const load = async () => {
      const p = await getProcesso(supabase, userId, processoId)
      if (!p) { setErro('Processo não encontrado.'); return }
      setNumero(p.numero || '')
      setUnidade(p.unidade || '')
      setSetor(p.setor || '')
      setResponsavel(p.responsavel || '')
      setObjeto(p.objeto || '')
      setDescricao(p.descricao || '')
      setFinalidade(p.finalidade || '')
      setJustificativa(p.justificativa || '')
      setQuantidade(p.quantidade != null ? String(p.quantidade) : '')
      setUnidadeMedida(p.unidade_medida || '')
      setValorEstimado(p.valor_estimado != null ? String(p.valor_estimado) : '')
      setPrazo(p.prazo || '')
      setTipoObjeto(p.tipo_objeto || '')
      setNd(p.nd || '')
      setStatus(p.status)
      setPercentual(p.percentual || 0)
      if (p.dfd) setDfd(p.dfd as Record<string, string>)
      if (p.etp) setEtp(p.etp as Record<string, string>)
      if (p.tr) setTr(p.tr as Record<string, string>)
      if (p.bdi && typeof p.bdi === 'object') {
        const b = p.bdi as { percentual?: number; aplicavel?: boolean }
        if (b.percentual != null) setBdiPercent(String(b.percentual))
        if (b.aplicavel != null) setBdiAplicavel(b.aplicavel)
      }
      const [its, prs, rsk, doc] = await Promise.all([
        listItens(supabase, userId, processoId),
        listPrecos(supabase, userId, processoId),
        listRiscos(supabase, userId, processoId),
        listDocumentos(supabase, userId, processoId),
      ])
      setItens(its.map((x) => ({ id: x.id, codigo: x.codigo || '', descricao: x.descricao, unidade: x.unidade || '', quantidade: Number(x.quantidade), unitario: Number(x.unitario), total: Number(x.total), fonte: x.fonte || '', competencia: x.competencia || '', tipo: x.tipo })))
      setPrecos(prs.map((x) => ({ id: x.id, fonte: x.fonte || '', fornecedor: x.fornecedor || '', cnpj: x.cnpj || '', data: x.data || '', descricao: x.descricao || '', unidade: x.unidade || '', quantidade: Number(x.quantidade), preco_unit: Number(x.preco_unit), preco_total: Number(x.preco_total), link: x.link || '', obs: x.obs || '' })))
      setRiscos(rsk.map((x) => ({ id: x.id, risco: x.risco, probabilidade: x.probabilidade || '', impacto: x.impacto || '', consequencia: x.consequencia || '', tratamento: x.tratamento || '', responsavel: x.responsavel || '', nivel: x.nivel || '' })))
      setDocumentos(doc.map((x) => ({ nome: x.nome, status: x.status, obrigatorio: x.obrigatorio, justificativa: x.justificativa || '' })))
    }
    load().catch((e) => setErro(`Erro ao carregar: ${(e as Error)?.message}`))
  }, [supabase, userId, processoId])

  // Carregar bases SINAPI
  useEffect(() => {
    if (!userId) return
    listSinapiCabecalhos(supabase, userId).then((b) => { setBases(b); if (b.length) setBaseSel(b[0].id) }).catch(() => {})
  }, [supabase, userId])

  const salvar = async () => {
    if (!userId) { setErro('Você precisa estar autenticado.'); return }
    setSalvando(true)
    setAviso('')
    setErro('')
    try {
      const dados = {
        numero: numero || null,
        unidade: unidade || null,
        setor: setor || null,
        responsavel: responsavel || null,
        objeto: objeto || null,
        descricao: descricao || null,
        finalidade: finalidade || null,
        justificativa: justificativa || null,
        quantidade: quantidade ? Number(quantidade) : null,
        unidade_medida: unidadeMedida || null,
        valor_estimado: valorEstimado ? Number(valorEstimado) : null,
        prazo: prazo || null,
        tipo_objeto: tipoObjeto || null,
        nd: nd || ndCostumizada || null,
        dfd: Object.keys(dfd).length ? dfd : null,
        etp: Object.keys(etp).length ? etp : null,
        tr: Object.keys(tr).length ? tr : null,
        bdi: bdiAplicavel != null ? { aplicavel: bdiAplicavel, percentual: bdiPercent ? Number(bdiPercent) : null, custo_direto: totalOrcamento, preco_final: precoFinal } : null,
        status: emElaboracao ? 'em_instrucao' : status,
        percentual: formulaPercentual(),
      }
      let pid = processoId
      if (pid) {
        await updateProcesso(supabase, userId, pid, dados)
        await addHistorico(supabase, userId, pid, 'edicao', { etapa, data: new Date().toISOString() })
      } else {
        const novo = await insertProcesso(supabase, userId, dados)
        pid = novo.id
        setProcessoId(novo.id)
        await addHistorico(supabase, userId, novo.id, 'criacao', { data: new Date().toISOString() })
      }
      // Persistir subobjetos (itens, preços, riscos, documentos)
      await replaceItens(supabase, userId, pid, itens.map((x) => ({ codigo: x.codigo || null, descricao: x.descricao, unidade: x.unidade || null, quantidade: x.quantidade, unitario: x.unitario, total: x.total, fonte: x.fonte || null, competencia: x.competencia || null, tipo: x.tipo || 'orcamento' })))
      await replacePrecos(supabase, userId, pid, precos.map((x) => ({ fonte: x.fonte || null, fornecedor: x.fornecedor || null, cnpj: x.cnpj || null, data: x.data || null, descricao: x.descricao || null, unidade: x.unidade || null, quantidade: x.quantidade, preco_unit: x.preco_unit, preco_total: x.preco_total, link: x.link || null, obs: x.obs || null })))
      await replaceRiscos(supabase, userId, pid, riscos.map((x) => ({ risco: x.risco, probabilidade: x.probabilidade || null, impacto: x.impacto || null, consequencia: x.consequencia || null, tratamento: x.tratamento || null, responsavel: x.responsavel || null, nivel: x.nivel || null })))
      if (documentos.length) {
        await replaceDocumentos(supabase, userId, pid, documentos.map((x) => ({ nome: x.nome, status: x.status as never, obrigatorio: x.obrigatorio, justificativa: x.justificativa || null })))
      }
      setAviso('Processo salvo.')
    } catch (e) {
      setErro(`Erro ao salvar: ${(e as Error)?.message}`)
    } finally {
      setSalvando(false)
    }
  }

  const totalOrcamento = useMemo(() => itens.reduce((a, x) => a + (x.total || 0), 0), [itens])
  const custoDireto = totalOrcamento
  const bdiVal = bdiAplicavel && bdiPercent ? Number(bdiPercent) : 0
  const precoFinal = bdiAplicavel ? custoDireto * (1 + bdiVal / 100) : custoDireto

  const enquadramento = useMemo(
    () => sugerirEnquadramento({ tipoObjeto, valor: valorEstimado ? Number(valorEstimado) : null, continuado: tipoObjeto === 'Serviço continuado' }),
    [tipoObjeto, valorEstimado]
  )

  const estadoDocs = useMemo(() => {
    const statuses = documentos.map((d) => d.status)
    const completo = statuses.filter((s) => s === 'completo').length
    const pendente = statuses.filter((s) => s === 'pendente').length
    return { total: statuses.length, completo, pendente, emElaboracao: statuses.filter((s) => s === 'elaboracao').length, naoAplicavel: statuses.filter((s) => s === 'nao_aplicavel').length }
  }, [documentos])

  const validacoes = useMemo(
    () => validarProcesso({
      objeto, nd: nd || ndCostumizada, itens: itens.length,
      quantidade: quantidade ? Number(quantidade) : 0,
      valorEstimado: valorEstimado ? Number(valorEstimado) : null,
      precos: precos.length,
      temCompetenciaSinapi: itens.some((x) => x.competencia),
      tipoObjeto,
    }),
    [objeto, nd, ndCostumizada, itens, quantidade, valorEstimado, precos, tipoObjeto]
  )

  const carregarSin = async () => {
    if (!userId || !baseSel) return
    const res = await searchSinapiItens(supabase, userId, { cabecalhoId: baseSel, termo: termoSin || undefined, limit: 100 })
    setSinRes(res)
  }

  const adicionarItemSinapi = (s: SinapiItem) => {
    setItens((prev) => {
      const nm: ItemRow[] = [...prev, {
        codigo: s.codigo || undefined,
        descricao: s.descricao,
        unidade: s.unidade || '',
        quantidade: 1,
        unitario: Number(s.custo_nao_deson || 0),
        total: Number(s.custo_nao_deson || 0),
        fonte: `SINAPI (${bases.find((b) => b.id === baseSel)?.uf || ''} · ${bases.find((b) => b.id === baseSel)?.competencia || ''})`,
        competencia: bases.find((b) => b.id === baseSel)?.competencia || undefined,
        tipo: 'sinapi',
      }]
      return nm
    })
  }

  const calcularItens = (list: ItemRow[]): ItemRow[] =>
    list.map((x) => ({ ...x, total: Number(((x.quantidade || 0) * (x.unitario || 0)).toFixed(2)) }))

  const precoStats = useMemo(() => {
    const vals = precos.filter((p) => p.preco_unit > 0).map((p) => p.preco_unit)
    if (vals.length === 0) return null
    const sort = [...vals].sort((a, b) => a - b)
    const med = sort.length % 2 ? sort[Math.floor(sort.length / 2)] : (sort[sort.length / 2 - 1] + sort[sort.length / 2]) / 2
    const media = vals.reduce((a, b) => a + b, 0) / vals.length
    return { n: vals.length, media, mediana: med, menor: sort[0], maior: sort[sort.length - 1] }
  }, [precos])

  const gdfd = () => setDfd({ 'IDENTIFICAÇÃO': objeto, 'NECESSIDADE': descricao, 'PROBLEMA': '', 'SOLUÇÃO PRETENDIDA': '', 'QUANTIDADE': `${quantidade} ${unidadeMedida}`.trim(), 'JUSTIFICATIVA': justificativa, 'RESULTADOS PRETENDIDOS': finalidade, 'RESPONSÁVEL': responsavel })
  const getp = () => setEtp({ 'DESCRIÇÃO DA NECESSIDADE': descricao, 'PROBLEMA': '', 'REQUISITOS': '', 'MERCADO': '', 'SOLUÇÕES': '', 'ANÁLISE': '', 'DESCRIÇÃO DA SOLUÇÃO': objeto, 'QUANTITATIVOS': `${quantidade} ${unidadeMedida}`.trim(), 'ESTIMATIVA DE PREÇOS': precos.length ? brl(precoStats?.media ?? 0) : '', 'JUSTIFICATIVA': justificativa, 'RESULTADOS': finalidade, 'CONCLUSÃO': '' })
  const gtr = () => setTr({ 'OBJETO': objeto, 'FUNDAMENTAÇÃO': '', 'DESCRIÇÃO': descricao, 'REQUISITOS': '', 'EXECUÇÃO': '', 'GESTÃO': '', 'FISCALIZAÇÃO': '', 'MEDIÇÃO': '', 'PAGAMENTO': '', 'CRITÉRIOS DE SELEÇÃO': '', 'OBRIGAÇÕES DA ADMINISTRAÇÃO': '', 'OBRIGAÇÕES DA CONTRATADA': '', 'SANÇÕES': '', 'GARANTIA': '', 'ESTIMATIVA DE VALOR': precoFinal ? brl(precoFinal) : '', 'ADEQUAÇÃO ORÇAMENTÁRIA': '' })

  const exportarPdf = () => {
    const linhasOrc = itens.map((x, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(x.codigo || '')}</td><td>${escapeHtml(x.descricao)}</td><td>${escapeHtml(x.unidade || '')}</td><td>${x.quantidade}</td><td>${brl(x.unitario)}</td><td style="text-align:right">${brl(x.total)}</td></tr>`).join('')
    const orcHtml = `<h2>Orçamento</h2><table><tr><th>#</th><th>Cód.</th><th>Descrição</th><th>Unid.</th><th>Qtd</th><th>Unit.</th><th>Total</th></tr>${linhasOrc}<tr><td colspan="6" style="text-align:right"><strong>Total</strong></td><td style="text-align:right"><strong>${brl(totalOrcamento)}</strong></td></tr></table>`
    const precosHtml = `<h2>Pesquisa de Preços</h2><table><tr><th>Amostra</th><th>Fornecedor</th><th>Unid.</th><th>Qtd</th><th>Unit.</th><th>Total</th></tr>${precos.map((p, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(p.fornecedor || p.fonte || '')}</td><td>${escapeHtml(p.unidade || '')}</td><td>${p.quantidade}</td><td>${brl(p.preco_unit)}</td><td>${brl(p.preco_total)}</td></tr>`).join('')}</table>`
    const docsHtml = `<h2>Checklist de Documentos</h2><table><tr><th>Documento</th><th>Status</th><th>Obrigatório</th></tr>${documentos.map((d) => `<tr><td>${escapeHtml(d.nome)}</td><td>${d.status}</td><td>${d.obrigatorio ? 'Sim' : 'Não'}</td></tr>`).join('')}</table>`
    const dfdHtml = `<h2>DFD</h2>` + Object.entries(dfd).map(([k, v]) => `<p><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</p>`).join('')
    const riscosHtml = `<h2>Análise de Riscos</h2><table><tr><th>Risco</th><th>Prob.</th><th>Impacto</th><th>Nível</th></tr>${riscos.map((r) => `<tr><td>${escapeHtml(r.risco)}</td><td>${r.probabilidade}</td><td>${r.impacto}</td><td>${r.nivel}</td></tr>`).join('')}</table>`
    abrirImpressaoProcesso(
      { numero, objeto, nd: nd || ndCostumizada } as never,
      `Processo de Contratação${numero ? ` ${numero}` : ''}`,
      dfdHtml + precosHtml + orcHtml + docsHtml + riscosHtml
    )
  }

  const baixarTodosDocs = () => {
    exportarWord('DFD', Object.entries(dfd).map(([k, v]) => ({ titulo: k, corpo: v })), `DFD-${numero || 'processo'}`)
    exportarWord('ETP', Object.entries(etp).map(([k, v]) => ({ titulo: k, corpo: v })), `ETP-${numero || 'processo'}`)
    exportarWord('Termo de Referência', Object.entries(tr).map(([k, v]) => ({ titulo: k, corpo: v })), `TR-${numero || 'processo'}`)
  }

  const gerarChecklist = () => {
    const docs = documentacaoAplicavel(tipoObjeto)
    setDocumentos(docs.map((d) => ({ nome: d.nome, status: 'pendente', obrigatorio: d.obrigatorio, justificativa: d.justificativa })))
  }

  const novoRisco = () => {
    setRiscos((prev) => [...prev, { risco: '', probabilidade: 'media', impacto: 'medio', consequencia: '', tratamento: '', responsavel: '', nivel: 'medio' }])
  }

  const nivelRisco = (prob: string, imp: string): string => {
    const pmap: Record<string, number> = { baixa: 1, baixo: 1, media: 2, medio: 2, alta: 3, alto: 3 }
    const s = (pmap[prob] || 2) + (pmap[imp] || 2)
    if (s >= 6) return 'critico'
    if (s >= 5) return 'alto'
    if (s >= 3) return 'medio'
    return 'baixo'
  }

  const novoItem = () => {
    setItens((prev) => calcularItens([...prev, { descricao: '', quantidade: 1, unitario: 0, total: 0 }]))
  }
  const atualizarItem = (i: number, patch: Partial<ItemRow>) => {
    setItens((prev) => calcularItens(prev.map((x, idx) => (idx === i ? { ...x, ...patch } : x))))
  }
  const duplicarItem = (i: number) => {
    setItens((prev) => calcularItens([...prev.slice(0, i), { ...prev[i] }, ...prev.slice(i)]))
  }
  const moverItem = (i: number, dir: -1 | 1) => {
    setItens((prev) => {
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const arr = [...prev]
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return arr
    })
  }

  const passo = (n: number) => setEtapa(Math.max(0, Math.min(ETAPAS.length - 1, n)))

  return (
    <div className="space-y-6">
      <PageHeader title="Montagem de Processo" description="Assistente passo a passo para instrução de contratações públicas (Lei 14.133/2021)">
        {processoId && <Badge variant="accent">Processo {numero || processoId.slice(0, 8)}</Badge>}
      </PageHeader>

      {/* Barra de progresso / etapas */}
      <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calculator className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-slate-900 dark:text-white">Etapa {etapa + 1} de {ETAPAS.length}: {ETAPAS[etapa]}</span>
          <Badge variant="accent">{percentual}% concluído</Badge>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500" style={{ width: `${percentual}%` }} />
        </div>
        <div className="flex flex-wrap gap-1.5 mt-4">
          {ETAPAS.map((e, i) => (
            <button
              key={e}
              onClick={() => passo(i)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors',
                i === etapa ? 'bg-primary text-white' : i < etapa ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              {i < etapa ? <Check className="w-3 h-3 inline" /> : null} {i + 1}. {e}
            </button>
          ))}
        </div>
      </div>

      {aviso && <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 px-3.5 py-2.5 text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2"><Check className="w-4 h-4" /> {aviso}</div>}
      {erro && <div className="rounded-xl border border-danger/20 bg-danger-soft dark:bg-red-500/10 px-3.5 py-2.5 text-sm text-danger flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {erro}</div>}

      {/* ===================== ETAPA 1 — IDENTIFICAÇÃO ===================== */}
      {etapa === 0 && (
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Número do processo" value={numero} onChange={setNumero} />
          <Field label="Unidade / OM" value={unidade} onChange={setUnidade} />
          <Field label="Setor requisitante" value={setor} onChange={setSetor} />
          <Field label="Responsável" value={responsavel} onChange={setResponsavel} />
          <div className="md:col-span-2"><Area label="Objeto" value={objeto} onChange={setObjeto} /></div>
          <div className="md:col-span-2"><Area label="Descrição detalhada" value={descricao} onChange={setDescricao} /></div>
          <div className="md:col-span-2"><Area label="Finalidade" value={finalidade} onChange={setFinalidade} /></div>
          <div className="md:col-span-2"><Area label="Justificativa da necessidade" value={justificativa} onChange={setJustificativa} /></div>
          <Field label="Quantidade" value={quantidade} onChange={setQuantidade} type="number" />
          <Field label="Unidade de medida" value={unidadeMedida} onChange={setUnidadeMedida} />
          <Field label="Valor estimado (R$)" value={valorEstimado} onChange={setValorEstimado} type="number" />
          <Field label="Prazo pretendido" value={prazo} onChange={setPrazo} />
        </div>
      )}

      {/* ===================== ETAPA 2 — CLASSIFICAÇÃO ===================== */}
      {etapa === 1 && (
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6 space-y-5">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 block">Tipo de objeto</span>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {TIPOS_OBJETO.map((t) => (
                <button
                  key={t}
                  onClick={() => setTipoObjeto(t)}
                  className={cn(
                    'rounded-xl border px-3 py-2.5 text-sm text-left transition-colors',
                    tipoObjeto === t ? 'border-primary/50 bg-primary/10 text-primary font-semibold' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 block">Natureza da Despesa (ND)</span>
            <div className="flex flex-wrap gap-2 mb-3">
              {NATUREZAS_DESPESA.map((n) => (
                <button
                  key={n}
                  onClick={() => { setNd(n); setNdCostumizada('') }}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 font-mono text-sm transition-colors',
                    nd === n && !ndCostumizada ? 'border-primary/50 bg-primary/10 text-primary font-semibold' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <input
              value={ndCostumizada}
              onChange={(e) => { setNdCostumizada(e.target.value); setNd('') }}
              placeholder="Ou digite outra ND (ex.: 33.90.36)..."
              className={INPUT_CLS + ' max-w-sm font-mono'}
            />
            <p className="text-xs text-slate-400 mt-2">A lista de NDs é parametrizada e pode ser ampliada conforme a classificação orçamentária.</p>
          </div>
        </div>
      )}

      {/* ===================== ETAPA 3 — ENQUADRAMENTO ===================== */}
      {etapa === 2 && (
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Indicações de hipóteses de contratação</h3>
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 px-3.5 py-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-300">Enquadramento sugerido pelo sistema — requer validação do responsável pelo processo e da assessoria jurídica. O sistema não afirma, apenas por valores, que a contratação é legal.</p>
          </div>
          {enquadramento.sugestoes.length ? (
            <div className="flex flex-wrap gap-2">
              {enquadramento.sugestoes.map((s) => <Badge key={s} variant="primary">{s}</Badge>)}
            </div>
          ) : (
            <EmptyState icon={<LayoutList className="w-8 h-8" />} title="Preencha o objeto e o tipo" description="Complete as etapas de Identificação e Classificação para gerar as indicações." className="border border-dashed bg-slate-50/50" />
          )}
          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            {enquadramento.avisos.map((a, i) => <p key={i}>• {a}</p>)}
          </div>
          <p className="text-[11px] text-slate-400">Base: Lei nº 14.133/2021. As regras de enquadramento são parametrizadas e podem ser atualizadas conforme mudanças legislativas.</p>
        </div>
      )}

      {/* ===================== ETAPA 4 — DOCUMENTOS ===================== */}
      {etapa === 3 && (
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Checklist inteligente de documentos</h3>
            <button onClick={gerarChecklist} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-hover">
              <ClipboardList className="w-4 h-4" /> Gerar estrutura com base no objeto
            </button>
          </div>
          {documentos.length === 0 ? (
            <EmptyState icon={<ClipboardList className="w-8 h-8" />} title="Nenhum documento gerado" description="Informe o tipo de objeto na Etapa 2 e clique em 'Gerar estrutura' para montar o checklist. Nada é marcado obrigatório sem base na regra." className="border border-dashed bg-slate-50/50" />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-left">
                  <tr>
                    <th className="px-3 py-2 font-semibold text-slate-500">Documento</th>
                    <th className="px-3 py-2 font-semibold text-slate-500">Obrigatório</th>
                    <th className="px-3 py-2 font-semibold text-slate-500">Status</th>
                    <th className="px-3 py-2 font-semibold text-slate-500">Justificativa</th>
                  </tr>
                </thead>
                <tbody>
                  {documentos.map((d, i) => (
                    <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2.5 font-medium">{d.nome}</td>
                      <td className="px-3 py-2.5"><Badge variant={d.obrigatorio ? 'danger' : 'accent'}>{d.obrigatorio ? 'Obrigatório' : 'Opcional'}</Badge></td>
                      <td className="px-3 py-2.5">
                        <select value={d.status} onChange={(e) => setDocumentos((prev) => prev.map((x, xi) => xi === i ? { ...x, status: e.target.value } : x))} className={SELECT_CLS + ' max-w-[150px]'}>
                          <option value="pendente">🔴 Pendente</option>
                          <option value="elaboracao">🟡 Em elaboração</option>
                          <option value="completo">🟢 Completo</option>
                          <option value="nao_aplicavel">⚪ Não aplicável</option>
                        </select>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400">{d.justificativa}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===================== ETAPA 5 — DFD ===================== */}
      {etapa === 4 && (
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Documento de Formalização da Demanda (DFD)</h3>
            <button onClick={gdfd} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white">Gerar do processo</button>
          </div>
          <DocKeyValue campos={['IDENTIFICAÇÃO', 'NECESSIDADE', 'PROBLEMA', 'SOLUÇÃO PRETENDIDA', 'QUANTIDADE', 'JUSTIFICATIVA', 'RESULTADOS PRETENDIDOS', 'RESPONSÁVEL']} valores={dfd} setValores={setDfd} />
          <div className="flex flex-wrap gap-2">
            <button onClick={() => exportarWord('DFD', Object.entries(dfd).filter(([, v]) => v).map(([k, v]) => ({ titulo: k, corpo: v })), `DFD-${numero || 'processo'}`)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold"><Download className="w-4 h-4" /> Exportar Word</button>
            <button onClick={salvar} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white"><Save className="w-4 h-4" /> Salvar</button>
          </div>
        </div>
      )}

      {/* ===================== ETAPA 6 — ETP ===================== */}
      {etapa === 5 && (
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Estudo Técnico Preliminar (ETP)</h3>
            <button onClick={getp} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white">Gerar do processo</button>
          </div>
          <DocKeyValue campos={['DESCRIÇÃO DA NECESSIDADE', 'PROBLEMA', 'REQUISITOS', 'MERCADO', 'SOLUÇÕES EXISTENTES', 'ANÁLISE DAS ALTERNATIVAS', 'DESCRIÇÃO DA SOLUÇÃO', 'QUANTITATIVOS', 'ESTIMATIVA DE PREÇOS', 'JUSTIFICATIVA', 'RESULTADOS PRETENDIDOS', 'CONCLUSÃO']} valores={etp} setValores={setEtp} />
          <div className="flex flex-wrap gap-2">
            <button onClick={() => exportarWord('ETP', Object.entries(etp).filter(([, v]) => v).map(([k, v]) => ({ titulo: k, corpo: v })), `ETP-${numero || 'processo'}`)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold"><Download className="w-4 h-4" /> Exportar Word</button>
            <button onClick={salvar} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white"><Save className="w-4 h-4" /> Salvar</button>
          </div>
        </div>
      )}

      {/* ===================== ETAPA 7 — PESQUISA DE PREÇOS ===================== */}
      {etapa === 6 && (
        <PesquisaPrecos precos={precos} setPrecos={setPrecos} precoStats={precoStats} />
      )}

      {/* ===================== ETAPA 8 — SINAPI ===================== */}
      {etapa === 7 && (
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Adicionar itens SINAPI ao orçamento</h3>
          {bases.length === 0 ? (
            <EmptyState icon={<FileText className="w-8 h-8" />} title="Nenhuma base SINAPI importada" description="Importe a planilha oficial da Caixa em /sinapi antes de adicionar itens. Se não houver base, nada é inventado." className="border border-dashed bg-slate-50/50" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="block">
                <span className="text-xs text-slate-500 mb-1 block">Base (UF · Competência)</span>
                <select value={baseSel} onChange={(e) => setBaseSel(e.target.value)} className={SELECT_CLS}>
                  {bases.map((b) => <option key={b.id} value={b.id}>{b.uf} · {b.competencia} · {b.total_itens} itens</option>)}
                </select>
              </label>
              <label className="block md:col-span-2">
                <span className="text-xs text-slate-500 mb-1 block">Buscar composição/insumo</span>
                <input value={termoSin} onChange={(e) => setTermoSin(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && carregarSin()} placeholder="Ex.: execução de concreto, alvenaria..." className={INPUT_CLS} />
              </label>
            </div>
          )}
          {bases.length > 0 && (
            <button onClick={carregarSin} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white"><FileText className="w-4 h-4" /> Buscar</button>
          )}
          {sinRes.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 max-h-80">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-left">
                  <tr><th className="px-3 py-2 font-semibold">Cód.</th><th className="px-3 py-2 font-semibold">Descrição</th><th className="px-3 py-2 font-semibold">Unid.</th><th className="px-3 py-2 font-semibold text-right">Custo</th><th></th></tr>
                </thead>
                <tbody>
                  {sinRes.map((s) => (
                    <tr key={s.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2 font-mono text-xs">{s.codigo || '—'}</td>
                      <td className="px-3 py-2">{s.descricao}</td>
                      <td className="px-3 py-2">{s.unidade || '—'}</td>
                      <td className="px-3 py-2 text-right">{s.custo_nao_deson != null ? formatCurrency(s.custo_nao_deson) : '—'}</td>
                      <td className="px-3 py-2 text-right"><button onClick={() => adicionarItemSinapi(s)} className="text-xs font-semibold text-secondary hover:underline"><Plus className="w-4 h-4 inline" /> Adicionar (qtd 1)</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===================== ETAPA 9 — PLANILHA ORÇAMENTÁRIA ===================== */}
      {etapa === 8 && (
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Planilha Orçamentária</h3>
            <div className="flex gap-2">
              <button onClick={() => exportarExcelPlanilhaOrcamento(itens as never, `orçamento-${numero || 'processo'}.xlsx`)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold"><Download className="w-4 h-4" /> Excel</button>
              <button onClick={novoItem} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white"><Plus className="w-4 h-4" /> Adicionar</button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-left">
                <tr>
                  <th className="px-2 py-2"></th>
                  <th className="px-2 py-2 font-semibold text-slate-500">Código</th>
                  <th className="px-2 py-2 font-semibold text-slate-500">Descrição</th>
                  <th className="px-2 py-2 font-semibold text-slate-500">Unid.</th>
                  <th className="px-2 py-2 font-semibold text-slate-500 text-right">Quantidade</th>
                  <th className="px-2 py-2 font-semibold text-slate-500 text-right">Unitário</th>
                  <th className="px-2 py-2 font-semibold text-slate-500 text-right">Total</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {itens.length === 0 ? (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-400">Nenhum item. Adicione manualmente ou via SINAPI (Etapa 8).</td></tr>
                ) : itens.map((x, i) => (
                  <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-2 py-1.5">
                      <div className="flex flex-col">
                        <button onClick={() => moverItem(i, -1)} className="text-slate-400 hover:text-primary"><ArrowUp className="w-3.5 h-3.5" /></button>
                        <button onClick={() => moverItem(i, 1)} className="text-slate-400 hover:text-primary"><ArrowDown className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                    <td className="px-2 py-1.5"><input value={x.codigo || ''} onChange={(e) => atualizarItem(i, { codigo: e.target.value })} className="w-20 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs" /></td>
                    <td className="px-2 py-1.5"><input value={x.descricao} onChange={(e) => atualizarItem(i, { descricao: e.target.value })} className="w-56 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs" /></td>
                    <td className="px-2 py-1.5"><input value={x.unidade || ''} onChange={(e) => atualizarItem(i, { unidade: e.target.value })} className="w-14 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs" /></td>
                    <td className="px-2 py-1.5 text-right"><input type="number" value={x.quantidade} onChange={(e) => atualizarItem(i, { quantidade: Number(e.target.value) })} className="w-20 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-right" /></td>
                    <td className="px-2 py-1.5 text-right"><input type="number" value={x.unitario} onChange={(e) => atualizarItem(i, { unitario: Number(e.target.value) })} className="w-24 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-right" /></td>
                    <td className="px-2 py-1.5 text-right font-semibold">{formatCurrency(x.total)}</td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">
                      <button onClick={() => duplicarItem(i)} className="text-slate-400 hover:text-primary mx-1"><Copy className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setItens((prev) => prev.filter((_, idx) => idx !== i))} className="text-danger mx-1"><Trash2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                ))}
                {itens.length > 0 && (
                  <tr className="border-t-2 border-slate-200 dark:border-slate-700">
                    <td colSpan={6} className="px-3 py-2 text-right font-semibold">Total (custo direto)</td>
                    <td className="px-2 py-2 text-right font-bold">{formatCurrency(totalOrcamento)}</td>
                    <td></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== ETAPA 10 — BDI ===================== */}
      {etapa === 9 && (
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6 space-y-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">BDI (Benefícios e Despesas Indiretas)</h3>
          {/obra|engenharia/i.test(tipoObjeto) ? (
            <>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => { setBdiAplicavel(true); setBdiPercent('') }} className={cn('rounded-xl border px-4 py-2.5 text-sm', bdiAplicavel === true ? 'border-primary/50 bg-primary/10 text-primary font-semibold' : 'border-slate-200')}>Aplicar BDI</button>
                <button onClick={() => setBdiAplicavel(false)} className={cn('rounded-xl border px-4 py-2.5 text-sm', bdiAplicavel === false ? 'border-primary/50 bg-primary/10 text-primary font-semibold' : 'border-slate-200')}>Não aplicar</button>
              </div>
              {bdiAplicavel === true && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="BDI (%)" value={bdiPercent} onChange={setBdiPercent} type="number" />
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-4"><span className="text-xs text-slate-500 block">Custo direto</span><span className="text-lg font-bold">{formatCurrency(custoDireto)}</span></div>
                  <div className="rounded-xl bg-primary/10 p-4"><span className="text-xs text-slate-500 block">Preço final</span><span className="text-lg font-bold text-primary">{formatCurrency(precoFinal)}</span></div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 px-3.5 py-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">BDI não é aplicado automaticamente a este tipo de objeto (não é obra/serviço de engenharia). O preço final é o custo direto.</p>
            </div>
          )}
        </div>
      )}

      {/* ===================== ETAPA 11 — TR ===================== */}
      {etapa === 10 && (
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Termo de Referência (TR)</h3>
            <button onClick={gtr} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white">Gerar do processo</button>
          </div>
          <DocKeyValue campos={['OBJETO', 'FUNDAMENTAÇÃO', 'DESCRIÇÃO', 'REQUISITOS', 'EXECUÇÃO', 'GESTÃO', 'FISCALIZAÇÃO', 'MEDIÇÃO', 'PAGAMENTO', 'CRITÉRIOS DE SELEÇÃO', 'OBRIGAÇÕES DA ADMINISTRAÇÃO', 'OBRIGAÇÕES DA CONTRATADA', 'SANÇÕES', 'GARANTIA', 'ESTIMATIVA DE VALOR', 'ADEQUAÇÃO ORÇAMENTÁRIA']} valores={tr} setValores={setTr} />
          <button onClick={() => exportarWord('Termo de Referência', Object.entries(tr).filter(([, v]) => v).map(([k, v]) => ({ titulo: k, corpo: v })), `TR-${numero || 'processo'}`)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold"><Download className="w-4 h-4" /> Exportar Word</button>
        </div>
      )}

      {/* ===================== ETAPA 12 — ANÁLISE DE RISCOS ===================== */}
      {etapa === 11 && (
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Matriz de riscos</h3>
            <button onClick={novoRisco} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white"><Plus className="w-4 h-4" /> Adicionar risco</button>
          </div>
          <P className="text-xs text-slate-500">A classificação (baixo/médio/alto/crítico) é derivada da probabilidade + impacto e é editável/transparente.</P>
          {riscos.length === 0 ? (
            <EmptyState icon={<ShieldAlert className="w-8 h-8" />} title="Nenhum risco cadastrado" description="Adicione os riscos relevantes à contratação." className="border border-dashed bg-slate-50/50" />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-left">
                  <tr><th className="px-3 py-2 font-semibold">Risco</th><th className="px-3 py-2 font-semibold">Probabilidade</th><th className="px-3 py-2 font-semibold">Impacto</th><th className="px-3 py-2 font-semibold">Consequência</th><th className="px-3 py-2 font-semibold">Tratamento</th><th className="px-3 py-2 font-semibold">Nível</th><th></th></tr>
                </thead>
                <tbody>
                  {riscos.map((r, i) => (
                    <tr key={i} className="border-t border-slate-100 dark:border-slate-800 align-top">
                      <td className="px-3 py-2"><input value={r.risco} onChange={(e) => setRiscos((prev) => prev.map((x, xi) => xi === i ? { ...x, risco: e.target.value } : x))} className={INPUT_CLS} /></td>
                      <td className="px-3 py-2"><SelectRisco v={r.probabilidade} set={(v) => { const nv = nivelRisco(v, r.impacto); setRiscos((prev) => prev.map((x, xi) => xi === i ? { ...x, probabilidade: v, nivel: nv } : x)) }} /></td>
                      <td className="px-3 py-2"><SelectRisco v={r.impacto} set={(v) => { const nv = nivelRisco(r.probabilidade, v); setRiscos((prev) => prev.map((x, xi) => xi === i ? { ...x, impacto: v, nivel: nv } : x)) }} /></td>
                      <td className="px-3 py-2"><input value={r.consequencia} onChange={(e) => setRiscos((prev) => prev.map((x, xi) => xi === i ? { ...x, consequencia: e.target.value } : x))} className={INPUT_CLS} /></td>
                      <td className="px-3 py-2"><input value={r.tratamento} onChange={(e) => setRiscos((prev) => prev.map((x, xi) => xi === i ? { ...x, tratamento: e.target.value } : x))} className={INPUT_CLS} /></td>
                      <td className="px-3 py-2"><RiscoBadge nivel={r.nivel} /></td>
                      <td className="px-3 py-2"><button onClick={() => setRiscos((prev) => prev.filter((_, xi) => xi !== i))} className="text-danger"><Trash2 className="w-4 h-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===================== ETAPA 13 — CHECKLIST FINAL ===================== */}
      {etapa === 12 && (
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Status do processo</h3>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-primary">{percentual}%</div>
            <div className="flex-1 h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full bg-gradient-to-r from-primary to-secondary transition-all" style={{ width: `${percentual}%` }} /></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat label="Completo" value={estadoDocs.completo} color="text-emerald-600" />
            <MiniStat label="Em elaboração" value={estadoDocs.emElaboracao} color="text-amber-600" />
            <MiniStat label="Pendente" value={estadoDocs.pendente} color="text-red-600" />
            <MiniStat label="Não aplicável" value={estadoDocs.naoAplicavel} color="text-slate-500" />
          </div>
          {estadoDocs.pendente > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 px-3.5 py-3 text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>O processo não está pronto para conclusão. Faltam {estadoDocs.pendente} documento(s) em status pendente.</span>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-500/10 px-3.5 py-3 text-sm text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Nenhum documento pendente. Revise as validações na etapa seguinte antes de gerar.</span>
            </div>
          )}
        </div>
      )}

      {/* ===================== ETAPA 14 — VALIDAÇÕES ===================== */}
      {etapa === 13 && (
        <MValidation validacoes={validacoes} salvar={salvar} salvando={salvando} />
      )}

      {/* ===================== ETAPA 15 — GERAR PROCESSO ===================== */}
      {etapa === 14 && (
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6 space-y-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Gerar processo consolidado</h3>
          <p className="text-xs text-slate-500">Os documentos serão organizados na sequência padrão. A ordem é configurável na estrutura do sistema.</p>
          <ol className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
            {['01 — Capa', '02 — DFD', '03 — ETP', '04 — Análise de Riscos', '05 — Pesquisa de Preços', '06 — Mapa de Preços', '07 — TR', '08 — Projeto Básico (quando aplicável)', '09 — Orçamento', '10 — Memória de Cálculo', '11 — Cronograma (quando aplicável)', '12 — Disponibilidade Orçamentária', '13 — Justificativas', '14 — Documentação complementar', '15 — Demais documentos aplicáveis'].map((x) => <li key={x} className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> {x}</li>)}
          </ol>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button onClick={exportarPdf} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover"><Printer className="w-4 h-4" /> PDF (imprimir)</button>
            <button onClick={baixarTodosDocs} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-semibold hover:bg-slate-50"><Download className="w-4 h-4" /> Word (documentos)</button>
            <button onClick={() => exportarExcelPlanilhaOrcamento(itens as never, `orçamento-${numero || 'processo'}.xlsx`)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-semibold hover:bg-slate-50"><Table2 className="w-4 h-4" /> Excel (orçamento)</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button onClick={() => exportarExcelPesquisaPrecos(precos as never, `pesquisa-${numero || 'processo'}.xlsx`)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-semibold hover:bg-slate-50"><Table2 className="w-4 h-4" /> Excel (pesquisa de preços)</button>
            <button onClick={salvar} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"><Save className="w-4 h-4" /> Salvar processo</button>
          </div>
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 px-3.5 py-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-300">Este sistema é uma ferramenta de apoio à instrução processual. Não substitui a análise do agente público, setor técnico, autoridade competente ou assessoria jurídica.</p>
          </div>
        </div>
      )}

      {/* Navegação */}
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => passo(etapa - 1)} disabled={etapa === 0} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /> Anterior</button>
        <div className="flex gap-2">
          <button onClick={salvar} disabled={salvando} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300"><Save className="w-4 h-4" /> {salvando ? 'Salvando...' : 'Salvar'}</button>
          <button onClick={() => passo(etapa + 1)} disabled={etapa === ETAPAS.length - 1} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-40">Próxima <ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  )
}

// ---- Componentes auxiliares ----

function Field({ label, value, onChange, type, className }: { label: string; value: string; onChange: (v: string) => void; type?: string; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">{label}</span>
      <input type={type || 'text'} value={value} onChange={(e) => onChange(e.target.value)} className={INPUT_CLS} />
    </label>
  )
}
function Area({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} className={TEXTAREA_CLS} />
    </label>
  )
}
function P({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('text-xs text-slate-500 dark:text-slate-400', className)}>{children}</p>
}
function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-4">
      <p className={cn('text-2xl font-bold', color)}>{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  )
}
function RiscoBadge({ nivel }: { nivel: string }) {
  const map: Record<string, string> = {
    baixo: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10',
    medio: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10',
    alto: 'text-orange-600 bg-orange-50 dark:bg-orange-500/10',
    critico: 'text-red-600 bg-red-50 dark:bg-red-500/10',
  }
  return <Badge className={map[nivel] || ''} variant="accent">{nivel}</Badge>
}
function SelectRisco({ v, set }: { v: string; set: (v: string) => void }) {
  return (
    <select value={v} onChange={(e) => set(e.target.value)} className={SELECT_CLS}>
      {['baixa', 'media', 'alta', 'baixo', 'medio', 'alto'].map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}
function DocKeyValue({ campos, valores, setValores }: { campos: string[]; valores: Record<string, string>; setValores: (v: Record<string, string>) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {campos.map((c) => (
        <label key={c} className="block">
          <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">{c}</span>
          <textarea value={valores[c] || ''} onChange={(e) => setValores({ ...valores, [c]: e.target.value })} className={TEXTAREA_CLS} />
        </label>
      ))}
    </div>
  )
}
function PesquisaPrecos({ precos, setPrecos, precoStats }: { precos: PrecoRow[]; setPrecos: React.Dispatch<React.SetStateAction<PrecoRow[]>>; precoStats: { n: number; media: number; mediana: number; menor: number; maior: number } | null }) {
  const adicionar = () => setPrecos((prev) => [...prev, { quantidade: 1, preco_unit: 0, preco_total: 0 }])
  const atualizar = (i: number, patch: Partial<PrecoRow>) => setPrecos((prev) => prev.map((x, xi) => {
    if (xi !== i) return x
    const nx = { ...x, ...patch }
    nx.preco_total = Number(((nx.quantidade || 0) * (nx.preco_unit || 0)).toFixed(2))
    return nx
  }))
  const cols: Array<{ k: keyof PrecoRow; label: string; w?: string }> = [
    { k: 'fonte', label: 'Fonte', w: 'w-28' },
    { k: 'fornecedor', label: 'Fornecedor', w: 'w-40' },
    { k: 'cnpj', label: 'CNPJ', w: 'w-32' },
    { k: 'data', label: 'Data', w: 'w-28' },
    { k: 'descricao', label: 'Descrição', w: 'w-56' },
    { k: 'quantidade', label: 'Qtd', w: 'w-16' },
    { k: 'preco_unit', label: 'Unit.', w: 'w-24' },
    { k: 'link', label: 'Link', w: 'w-40' },
  ]
  return (
    <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Pesquisa de preços</h3>
        <div className="flex gap-2">
          <button onClick={() => exportarExcelPesquisaPrecos(precos as never)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold"><Download className="w-4 h-4" /> Excel</button>
          <button onClick={adicionar} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white"><Plus className="w-4 h-4" /> Amostra</button>
        </div>
      </div>
      {precoStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <MiniStat label={`Amostras (${precoStats.n})`} value={precoStats.n} color="text-primary" />
          <StatCardMini label="Menor" value={brl(precoStats.menor)} />
          <StatCardMini label="Média" value={brl(precoStats.media)} />
          <StatCardMini label="Mediana" value={brl(precoStats.mediana)} />
          <StatCardMini label="Maior" value={brl(precoStats.maior)} />
        </div>
      )}
      <p className="text-xs text-slate-500">Metodologia: estatística descritiva simples (média, mediana, menor e maior) sobre os preços unitários das amostras cadastradas com valor &gt; 0.</p>
      {precos.length === 0 ? (
        <EmptyState icon={<DollarSign className="w-8 h-8" />} title="Nenhuma amostra" description="Cadastre fontes de preço reais (fornecedor, painel, contratações similares). Não há dados fictícios." className="border border-dashed bg-slate-50/50" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-left">
              <tr>{cols.map((c) => <th key={c.label} className="px-2 py-2 font-semibold text-slate-500">{c.label}</th>)}<th className="px-2 py-2 font-semibold text-slate-500 text-right">Total</th><th></th></tr>
            </thead>
            <tbody>
              {precos.map((p, i) => (
                <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                  {cols.map((c) => c.k === 'data' ? (
                    <td key={c.k} className={cn('px-2 py-1.5', c.w)}><input type="date" value={String(p.data || '')} onChange={(e) => atualizar(i, { data: e.target.value })} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs" /></td>
                  ) : c.k === 'quantidade' || c.k === 'preco_unit' ? (
                    <td key={c.k} className={cn('px-2 py-1.5', c.w)}><input type="number" value={Number(p[c.k])} onChange={(e) => atualizar(i, { [c.k]: Number(e.target.value) })} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-right" /></td>
                  ) : (
                    <td key={c.k} className={cn('px-2 py-1.5', c.w)}><input value={String(p[c.k] || '')} onChange={(e) => atualizar(i, { [c.k]: e.target.value })} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs" /></td>
                  ))}
                  <td className="px-2 py-1.5 text-right font-semibold">{brl(p.preco_total)}</td>
                  <td className="px-2 py-1.5"><button onClick={() => setPrecos((prev) => prev.filter((_, xi) => xi !== i))} className="text-danger"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
function StatCardMini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-4"><p className="text-lg font-bold">{value}</p><p className="text-xs text-slate-500">{label}</p></div>
}
function MValidation({ validacoes, salvar, salvando }: { validacoes: Array<{ nivel: 'erro' | 'alerta'; mensagem: string }>; salvar: () => void; salvando: boolean }) {
  const erros = validacoes.filter((v) => v.nivel === 'erro')
  return (
    <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6 space-y-4">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Validações antes de finalizar</h3>
      {validacoes.length === 0 ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 px-3.5 py-3 text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2"><Check className="w-4 h-4" /> Nenhuma pendência de validação detectada.</div>
      ) : (
        <div className="space-y-2">
          {validacoes.map((v, i) => (
            <div key={i} className={cn('rounded-xl border px-3.5 py-2.5 text-sm flex items-start gap-2', v.nivel === 'erro' ? 'border-danger/20 bg-danger-soft dark:bg-red-500/10 text-danger' : 'border-amber-200 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300')}>
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {v.mensagem}
            </div>
          ))}
        </div>
      )}
      <button onClick={salvar} disabled={salvando || erros.length > 0} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-40">
        <Save className="w-4 h-4" /> {salvando ? 'Salvando...' : 'Salvar'}
      </button>
      {erros.length > 0 && <p className="text-xs text-danger">Corrija os erros destacados antes de salvar/finalizar.</p>}
    </div>
  )
}
