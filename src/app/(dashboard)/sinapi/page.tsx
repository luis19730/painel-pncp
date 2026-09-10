'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Upload, Search, Database, Trash2, Download,
  Table2, CheckCircle2, AlertCircle, Eye, PlusCircle, FolderOpen,
} from 'lucide-react'
import PageHeader from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'
import EmptyState from '@/components/ui/empty-state'
import { cn, formatCurrency } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  listSinapiCabecalhos, importSinapiBase, deleteSinapiBase, searchSinapiItens,
  listProcessos, saveItem,
  type SinapiImportInput,
} from '@/lib/contratacoes/db'
import type { SinapiCabecalho, SinapiItem, ProcessoInstrucao } from '@/lib/contratacoes/types'
import {
  readWorkbook, parseSheet, type SinapiRawItem,
} from '@/lib/contratacoes/sinapi-parse'
import { exportarExcelSINAPI } from '@/lib/contratacoes/export'
import { UF_SIGLAS } from '@/lib/contratacoes/ufs'

export default function SinapiPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [bases, setBases] = useState<SinapiCabecalho[]>([])
  const [carregando, setCarregando] = useState(true)

  // Upload
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [ufUpload, setUfUpload] = useState('')
  const [competenciaUpload, setCompetenciaUpload] = useState('')
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [sheetSel, setSheetSel] = useState('')
  const [preview, setPreview] = useState<SinapiRawItem[]>([])
  const [headerNames, setHeaderNames] = useState<string[]>([])
  const [importando, setImportando] = useState(false)
  const [erroUpload, setErroUpload] = useState('')
  const [sucessoUpload, setSucessoUpload] = useState('')

  // Consulta
  const [baseSel, setBaseSel] = useState('')
  const [termo, setTermo] = useState('')
  const [codigo, setCodigo] = useState('')
  const [tipo, setTipo] = useState('')
  const [resultados, setResultados] = useState<SinapiItem[]>([])
  const [buscando, setBuscando] = useState(false)
  const [busquei, setBusquei] = useState(false)
  const [erroBusca, setErroBusca] = useState('')

  // Ver composição (detalhe)
  const [verItem, setVerItem] = useState<SinapiItem | null>(null)

  // Adicionar ao processo
  const [processos, setProcessos] = useState<ProcessoInstrucao[]>([])
  const [destinoId, setDestinoId] = useState('')
  const [qtdAdd, setQtdAdd] = useState('1')
  const [addMsg, setAddMsg] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null))
  }, [supabase])

  const carregarBases = useCallback(async () => {
    if (!userId) return
    try {
      const list = await listSinapiCabecalhos(supabase, userId)
      setBases(list)
      setBaseSel((prev) => prev || (list.length ? list[0].id : ''))
      const plist = await listProcessos(supabase, userId, 100)
      setProcessos(plist)
      setDestinoId((prev) => prev || (plist.length ? plist[0].id : ''))
    } catch {
      setErroBusca('Não foi possível carregar as bases SINAPI.')
    } finally {
      setCarregando(false)
    }
  }, [supabase, userId])

  useEffect(() => {
    carregarBases()
  }, [carregarBases])

  const handleFile = async (f: File | null) => {
    setArquivo(f)
    setSucessoUpload('')
    setErroUpload('')
    setPreview([])
    setSheetNames([])
    if (!f) return
    try {
      const buf = await f.arrayBuffer()
      const wb = readWorkbook(buf)
      const names = wb.SheetNames
      setSheetNames(names)
      setSheetSel(names[0] || '')
    } catch {
      setErroUpload('Não foi possível ler o arquivo. Envie uma planilha .xlsx válida.')
    }
  }

  // Carrega prévia da planilha (detecção automática de colunas)
  useEffect(() => {
    if (!arquivo || !sheetSel) return
    const run = async () => {
      try {
        const buf = await arquivo.arrayBuffer()
        const wb = readWorkbook(buf)
        const ws = wb.Sheets[sheetSel]
        if (!ws) return
        const { preview, headerNames } = parseSheet(ws)
        setPreview(preview)
        setHeaderNames(headerNames)
      } catch {
        setErroUpload('Falha ao pré-visualizar a planilha.')
      }
    }
    run()
  }, [arquivo, sheetSel])

  const importar = async () => {
    if (!userId || !arquivo) return
    if (!ufUpload || !competenciaUpload) {
      setErroUpload('Informe a UF e a competência (mês/ano) da base.')
      return
    }
    setImportando(true)
    setErroUpload('')
    setSucessoUpload('')
    try {
      const buf = await arquivo.arrayBuffer()
      const wb = readWorkbook(buf)
      const ws = wb.Sheets[sheetSel]
      if (!ws) throw new Error('Aba selecionada inválida')
      const { rawRows } = parseSheet(ws)
      const itens = rawRows
        .map((row) => {
          const item: SinapiImportInput['itens'][number] = {
            codigo: String(row[0] || '').trim() || null,
            descricao: String(row[1] || '').trim(),
            unidade: String(row[2] || '').trim() || null,
            tipo: String(row[3] || '').trim() || null,
            custo_nao_deson: toNum(row[4]),
            custo_deson: toNum(row[5]),
            origem_insumo: null,
          }
          return item
        })
        .filter((it) => it.descricao)

      const input: SinapiImportInput = {
        nome_arquivo: arquivo.name,
        competencia: competenciaUpload,
        uf: ufUpload,
        deson_base: null,
        itens,
      }
      await importSinapiBase(supabase, userId, input)
      setSucessoUpload(`Base importada com ${itens.length.toLocaleString('pt-BR')} itens reais da planilha.`)
      setArquivo(null)
      setUfUpload('')
      setCompetenciaUpload('')
      setPreview([])
      await carregarBases()
    } catch (e) {
      setErroUpload(`Erro ao importar: ${(e as Error)?.message || 'desconhecido'}`)
    } finally {
      setImportando(false)
    }
  }

  const buscar = useCallback(async () => {
    if (!userId || !baseSel) return
    setBuscando(true)
    setErroBusca('')
    setBusquei(true)
    try {
      const res = await searchSinapiItens(supabase, userId, {
        cabecalhoId: baseSel,
        termo: termo || undefined,
        codigo: codigo || undefined,
        tipo: tipo || undefined,
        limit: 200,
      })
      setResultados(res)
    } catch {
      setErroBusca('Erro na consulta SINAPI.')
    } finally {
      setBuscando(false)
    }
  }, [supabase, userId, baseSel, termo, codigo, tipo])

  const removerBase = async (id: string) => {
    if (!userId) return
    if (!confirm('Remover esta base SINAPI? Isso apaga todos os itens importados dela.')) return
    try {
      await deleteSinapiBase(supabase, userId, id)
      await carregarBases()
    } catch (e) {
      alert(`Erro: ${(e as Error)?.message}`)
    }
  }

  const baseAtual = useMemo(() => bases.find((b) => b.id === baseSel), [bases, baseSel])

  const adicionarProcesso = async (s: SinapiItem) => {
    if (!userId) return
    if (!destinoId) {
      setAddMsg('Selecione um processo de destino antes de adicionar.')
      return
    }
    const qtd = Math.max(1, Number(qtdAdd) || 1)
    const unitario = Number(s.custo_nao_deson ?? 0)
    try {
      await saveItem(supabase, userId, {
        processo_id: destinoId,
        codigo: s.codigo,
        descricao: s.descricao,
        unidade: s.unidade,
        quantidade: qtd,
        unitario,
        total: Number((qtd * unitario).toFixed(2)),
        fonte: baseAtual ? `SINAPI (${baseAtual.uf} · ${baseAtual.competencia})` : 'SINAPI',
        competencia: baseAtual?.competencia || null,
        tipo: 'sinapi',
      })
      setAddMsg(`Item adicionado ao processo.`)
      setVerItem(null)
      setDestinoId(destinoId)
    } catch (e) {
      setAddMsg(`Erro ao adicionar: ${(e as Error)?.message || 'desconhecido'}`)
    }
  }

  const exportarResultados = () => {
    exportarExcelSINAPI(
      resultados.map((r) => ({
        codigo: r.codigo || '',
        descricao: r.descricao,
        unidade: r.unidade || '',
        tipo: r.tipo || '',
        custo: r.custo_nao_deson,
      })),
      'sinapi-consulta.xlsx'
    )
  }

  if (carregando) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-64 rounded bg-slate-100 dark:bg-slate-800" />
        <div className="h-40 rounded bg-slate-100 dark:bg-slate-800" />
        <div className="h-64 rounded bg-slate-100 dark:bg-slate-800" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="SINAPI"
        description="Consulte composições e insumos a partir da planilha oficial de preços da Caixa"
        badge={<Badge variant="success">Dados reais</Badge>}
      />

      <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10 px-3.5 py-2.5">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed text-emerald-700 dark:text-emerald-300">
          O SINAPI oficial distribui uma API restrita (com credencial). Aqui você carrega a{' '}
          <strong>planilha oficial</strong> baixada no portal da Caixa para o seu estado e competência. Nenhum valor é
          inventado — os preços vêm exatamente do arquivo. A fonte (Caixa/SINAPI), UF e competência ficam registradas.
        </p>
      </div>

      {/* Upload */}
      <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Upload className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Importar base SINAPI (planilha oficial)</h3>
        </div>

        {bases.length > 0 && (
          <div className="mb-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 p-3 flex flex-wrap items-center gap-3 text-xs">
            <Database className="w-4 h-4 text-primary" />
            <span className="font-semibold text-slate-600 dark:text-slate-300">{bases.length} base(s) importada(s):</span>
            {bases.map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  setBaseSel(b.id)
                  setVerItem(null)
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors',
                  baseSel === b.id
                    ? 'border-primary/40 bg-primary/10 text-primary font-semibold'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                <Table2 className="w-3.5 h-3.5" />
                {b.uf || 'UF'} · {b.competencia || '—'} · {b.total_itens} itens
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="block">
            <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">UF</span>
            <select value={ufUpload} onChange={(e) => setUfUpload(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm">
              <option value="">Selecione a UF</option>
              {UF_SIGLAS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Competência (mês/ano)</span>
            <input
              type="month"
              value={competenciaUpload}
              onChange={(e) => setCompetenciaUpload(e.target.value)}
              placeholder="2026-07"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Arquivo .xlsx (oficial Caixa)</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-white file:text-xs"
            />
          </label>
        </div>

        {sheetNames.length > 0 && (
          <label className="block mt-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Aba da planilha</span>
            <select value={sheetSel} onChange={(e) => setSheetSel(e.target.value)} className="w-full max-w-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm">
              {sheetNames.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        )}

        {preview.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
              Prévia ({headerNames.length} colunas detectadas — {preview.length} primeiras linhas):
            </p>
            <div className="overflow-x-auto max-h-64 rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-left">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Código</th>
                    <th className="px-3 py-2 font-semibold">Descrição</th>
                    <th className="px-3 py-2 font-semibold">Unid.</th>
                    <th className="px-3 py-2 font-semibold">Tipo</th>
                    <th className="px-3 py-2 font-semibold text-right">Custo</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((it, i) => (
                    <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-1.5">{it.codigo}</td>
                      <td className="px-3 py-1.5">{it.descricao}</td>
                      <td className="px-3 py-1.5">{it.unidade}</td>
                      <td className="px-3 py-1.5">{it.tipo}</td>
                      <td className="px-3 py-1.5 text-right">{it.custo_nao_deson != null ? formatCurrency(it.custo_nao_deson) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Se o layout não for esse, o arquivo pode ter colunas em ordem diferente — a importação usará as colunas
              Código / Descrição / Unidade / Tipo / Custo (não desonerado) / Custo (desonerado), padrão das planilhas
              do SINAPI.
            </p>
          </div>
        )}

        {erroUpload && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-danger/20 bg-danger-soft dark:bg-red-500/10 px-3 py-2.5 text-sm text-danger">
            <AlertCircle className="w-4 h-4 shrink-0" /> {erroUpload}
          </div>
        )}
        {sucessoUpload && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {sucessoUpload}
          </div>
        )}

        <button
          onClick={importar}
          disabled={importando || !arquivo || !ufUpload || !competenciaUpload}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors disabled:opacity-40"
        >
          <Upload className="w-4 h-4" /> {importando ? 'Importando...' : 'Importar base'}
        </button>
      </div>

      {/* Consulta */}
      <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block flex-1 min-w-[200px]">
            <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Descrição / palavra-chave</span>
            <input
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && buscar()}
              placeholder="Ex.: concreto, brita, mão de obra pedreiro..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block w-40">
            <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Código SINAPI</span>
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Ex.: 87496"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block w-40">
            <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Tipo</span>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm">
              <option value="">Todos</option>
              <option value="insumo">Insumo</option>
              <option value="mao_de_obra">Mão de obra</option>
              <option value="equipamento">Equipamento</option>
              <option value="composicao">Composição</option>
            </select>
          </label>
          <button
            onClick={buscar}
            disabled={!baseSel || buscando}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors disabled:opacity-40"
          >
            <Search className="w-4 h-4" /> {buscando ? 'Buscando...' : 'Consultar'}
          </button>
          {resultados.length > 0 && (
            <button onClick={exportarResultados} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <Download className="w-4 h-4" /> Exportar
            </button>
          )}
        </div>

        {baseAtual && (
          <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
            <Badge variant="info">UF: {baseAtual.uf || '—'}</Badge>
            <Badge variant="info">Competência: {baseAtual.competencia || '—'}</Badge>
            <Badge variant="info">Fonte: {baseAtual.fonte}</Badge>
            <Badge variant="info">{baseAtual.total_itens} itens</Badge>
            <Badge variant="info">Importada: {new Date(baseAtual.criado_em).toLocaleDateString('pt-BR')}</Badge>
            <button
              onClick={() => removerBase(baseAtual.id)}
              className="inline-flex items-center gap-1 rounded-full border border-danger/30 px-2 py-0.5 text-danger hover:bg-danger-soft"
            >
              <Trash2 className="w-3 h-3" /> remover
            </button>
          </div>
        )}

        {/* Destino: adicionar ao processo */}
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-3.5 py-3">
          <FolderOpen className="w-4 h-4 text-secondary" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Adicionar itens SINAPI ao processo:
          </span>
          <select
            value={destinoId}
            onChange={(e) => setDestinoId(e.target.value)}
            className="min-w-52 flex-1 max-w-md rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          >
            <option value="">Selecione o processo...</option>
            {processos.map((p) => (
              <option key={p.id} value={p.id}>{p.numero || p.objeto || 'Processo em instrução'}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            Qtd
            <input
              type="number"
              min={1}
              value={qtdAdd}
              onChange={(e) => setQtdAdd(e.target.value)}
              className="w-20 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-2 text-sm"
            />
          </label>
          {destinoId && (
            <Link href={`/montagem-processo?id=${destinoId}`} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              Abrir processo →
            </Link>
          )}
          {!destinoId && (
            <span className="text-[11px] text-danger">Nenhum processo criado ainda — monte um em “Montar Processo”.</span>
          )}
        </div>
        {addMsg && (
          <div className={cn('mt-3 text-xs', addMsg.startsWith('Erro') ? 'text-danger' : 'text-emerald-600 dark:text-emerald-400')}>
            {addMsg}
          </div>
        )}

        {/* Resultados */}
        <div className="mt-5">
          {bases.length === 0 ? (
            <EmptyState
              icon={<Database className="w-8 h-8" />}
              title="Nenhuma base SINAPI importada"
              description="Importe a planilha oficial da Caixa acima para consultar composições e insumos reais. Se não houver base, a consulta não é realizada."
            />
          ) : buscando ? (
            <div className="animate-pulse space-y-2 py-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 rounded bg-slate-100 dark:bg-slate-800" />
              ))}
            </div>
          ) : busquei && resultados.length === 0 && !erroBusca ? (
            <EmptyState
              icon={<Search className="w-8 h-8" />}
              title="Nenhum item encontrado"
              description="Ajuste os filtros e tente novamente. Só aparecem dados reais da base importada."
            />
          ) : erroBusca ? (
            <div className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger-soft dark:bg-red-500/10 px-3 py-2.5 text-sm text-danger">
              <AlertCircle className="w-4 h-4 shrink-0" /> {erroBusca}
            </div>
          ) : resultados.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-left">
                  <tr>
                    <th className="px-3 py-2 font-semibold text-slate-500 dark:text-slate-400">Código</th>
                    <th className="px-3 py-2 font-semibold text-slate-500 dark:text-slate-400">Descrição</th>
                    <th className="px-3 py-2 font-semibold text-slate-500 dark:text-slate-400">Unid.</th>
                    <th className="px-3 py-2 font-semibold text-slate-500 dark:text-slate-400">Tipo</th>
                    <th className="px-3 py-2 font-semibold text-slate-500 dark:text-slate-400 text-right">Custo unit.</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2.5 font-mono text-xs">{r.codigo || '—'}</td>
                      <td className="px-3 py-2.5">{r.descricao}</td>
                      <td className="px-3 py-2.5">{r.unidade || '—'}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant={r.tipo === 'composicao' ? 'primary' : 'accent'}>{r.tipo?.replace('_', ' ') || '—'}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold">{r.custo_nao_deson != null ? formatCurrency(r.custo_nao_deson) : '—'}</td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <button onClick={() => setVerItem(r)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                          <Eye className="w-3.5 h-3.5" /> Ver
                        </button>
                        <button onClick={() => adicionarProcesso(r)} className="inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:underline ml-3">
                          <PlusCircle className="w-3.5 h-3.5" /> Adicionar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-400 py-4">
              Digite um termo (ou código) e clique em Consultar para buscar itens reais na base selecionada.
            </p>
          )}
        </div>
      </div>

      {/* Modal ver item */}
      {verItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setVerItem(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Detalhe do item</h3>
              <button onClick={() => setVerItem(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <dl className="space-y-3 text-sm">
              <Row label="Código" value={verItem.codigo || '—'} />
              <Row label="Descrição" value={verItem.descricao} />
              <Row label="Unidade" value={verItem.unidade || '—'} />
              <Row label="Tipo" value={verItem.tipo || '—'} />
              <Row label="Custo (não desonerado)" value={verItem.custo_nao_deson != null ? formatCurrency(verItem.custo_nao_deson) : '—'} />
              <Row label="Custo (desonerado)" value={verItem.custo_deson != null ? formatCurrency(verItem.custo_deson) : '—'} />
              <Row label="Fonte" value={baseAtual?.fonte || '—'} />
              <Row label="Competência" value={baseAtual?.competencia || '—'} />
              <Row label="UF" value={baseAtual?.uf || '—'} />
              <Row label="Referência" value={verItem.cabecalho_id} mono />
            </dl>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Fonte identificável (planilha oficial SINAPI).
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-2">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className={cn('text-right text-slate-800 dark:text-slate-100 font-medium', mono && 'font-mono text-xs')}>{value}</dd>
    </div>
  )
}

function toNum(v: unknown): number | null {
  if (v == null || v === '') return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const s = String(v).trim()
  if (!s) return null
  const n = Number(s.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
