'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Building2, Check, Clock, Copy, Download, ExternalLink,
  FileSpreadsheet, FileText, History, Kanban, Layers, Loader2,
  Package, Percent, Plus, Printer, RotateCcw, Save, Settings2, Sparkles, Target,
  Trash2, Truck, Wallet, X,
} from 'lucide-react'
import Button from '@/components/ui/button'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { UFS_BRASIL } from '@/data/municipios'
import { apiAnalista, jsonInit } from '@/lib/analista/client'
import {
  calcularResultado, calcularSensibilidade, calcularVeredito, numero, round2, simularLances,
} from '@/lib/analista/calc'
import { entradaInicial, normalizarEntrada, novoItem, REGIMES } from '@/lib/analista/config'
import { PRIORIDADES } from '@/lib/analista/kanban'
import type {
  AnaliseSalva, Cenario, ColunaKanban, ConfigAnalista, EntradaAnalise, ItemEntrada,
  Prioridade, Regime,
} from '@/lib/analista/types'
import { CampoData, CampoMoeda, CampoNumero, CampoSelect, CampoTexto, Dica, Secao } from './campos'
import PainelResultado, { type MercadoInfo } from './painel-resultado'
import ModalConfig from './modal-config'
import { exportarCsv, exportarPdf, exportarXlsx } from '@/lib/analista/exportar'

const CENARIOS: Array<{ id: Cenario; label: string; cor: string }> = [
  { id: 'otimista', label: 'Otimista', cor: 'text-emerald-600 dark:text-emerald-400' },
  { id: 'realista', label: 'Realista', cor: 'text-primary' },
  { id: 'pessimista', label: 'Pessimista', cor: 'text-amber-600 dark:text-amber-400' },
]

function pct(v: number | null | undefined): string {
  return `${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

export default function Calculadora({
  config,
  analises,
  colunas,
  onConfigSalva,
  onAnalisesChange,
  onCartaoCriado,
  onIrParaKanban,
  editalInicial,
  analiseInicialId,
  pncpInicial,
  onAnaliseAberta,
}: {
  config: ConfigAnalista
  analises: AnaliseSalva[]
  colunas: ColunaKanban[]
  onConfigSalva: (config: ConfigAnalista) => Promise<void>
  onAnalisesChange: () => void | Promise<void>
  onCartaoCriado: () => void | Promise<void>
  onIrParaKanban: () => void
  editalInicial?: Partial<EntradaAnalise['edital']> | null
  analiseInicialId?: string | null
  pncpInicial?: string | null
  onAnaliseAberta?: () => void
}) {
  const [entrada, setEntrada] = useState<EntradaAnalise>(() => entradaInicial(config, editalInicial || undefined))
  const [titulo, setTitulo] = useState(() => (editalInicial?.objeto || '').slice(0, 120))
  const [cenario, setCenario] = useState<Cenario>('realista')
  const [analiseId, setAnaliseId] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [configAberta, setConfigAberta] = useState(false)
  const [historicoAberto, setHistoricoAberto] = useState(false)
  const [historicoVersoes, setHistoricoVersoes] = useState<Array<Record<string, unknown>>>([])
  const [carregandoAnalise, setCarregandoAnalise] = useState(false)
  const [importarNumero, setImportarNumero] = useState('')
  const [importando, setImportando] = useState(false)
  const [avisoImport, setAvisoImport] = useState('')
  const [mercado, setMercado] = useState<MercadoInfo | null>(null)
  const [comparando, setComparando] = useState(false)
  const [cenarios, setCenarios] = useState<Record<Cenario, EntradaAnalise | null>>({
    otimista: null,
    realista: null,
    pessimista: null,
  })
  const [mostrarCenarios, setMostrarCenarios] = useState(false)
  const [modalKanban, setModalKanban] = useState(false)
  const [colunaDestino, setColunaDestino] = useState(colunas[0]?.id || '')
  const [prioridadeDestino, setPrioridadeDestino] = useState<Prioridade>('media')
  const [enviandoKanban, setEnviandoKanban] = useState(false)

  const resultado = useMemo(() => calcularResultado(entrada, config), [entrada, config])
  const veredito = useMemo(() => calcularVeredito(resultado, entrada, config), [resultado, entrada, config])
  const lances = useMemo(() => simularLances(entrada, config, 5), [entrada, config])
  const sensibilidade = useMemo(() => calcularSensibilidade(entrada, config), [entrada, config])

  const manualAtivo = entrada.valorOfertadoManual != null && entrada.valorOfertadoManual > 0

  const comparacao = useMemo(
    () =>
      CENARIOS.map(({ id, label }) => {
        const e = cenarios[id]
        if (!e) return { id, label, vazio: true as const }
        const r = calcularResultado(e, config)
        const v = calcularVeredito(r, e, config)
        return { id, label, vazio: false as const, r, v }
      }),
    [cenarios, config]
  )

  // -------------------------------------------------------------------------
  // Atualizações
  // -------------------------------------------------------------------------
  const setEdital = (patch: Partial<EntradaAnalise['edital']>) =>
    setEntrada((e) => ({ ...e, edital: { ...e.edital, ...patch } }))
  const setFrete = (patch: Partial<EntradaAnalise['frete']>) =>
    setEntrada((e) => ({ ...e, frete: { ...e.frete, ...patch } }))
  const setCustos = (patch: Partial<EntradaAnalise['custos']>) =>
    setEntrada((e) => ({ ...e, custos: { ...e.custos, ...patch } }))
  const setFinanceiro = (patch: Partial<EntradaAnalise['financeiro']>) =>
    setEntrada((e) => ({ ...e, financeiro: { ...e.financeiro, ...patch } }))
  const setItem = (id: string, patch: Partial<ItemEntrada>) =>
    setEntrada((e) => ({ ...e, itens: e.itens.map((i) => (i.id === id ? { ...i, ...patch } : i)) }))
  const removerItem = (id: string) =>
    setEntrada((e) => ({ ...e, itens: e.itens.filter((i) => i.id !== id) }))
  const adicionarItem = () => setEntrada((e) => ({ ...e, itens: [...e.itens, novoItem()] }))
  const setAliquota = (campo: keyof EntradaAnalise['aliquotas'], v: number) =>
    setEntrada((e) => ({ ...e, aliquotas: { ...e.aliquotas, [campo]: v } }))

  const aviso = (texto: string, tipo: 'ok' | 'erro' = 'ok') => setMensagem({ tipo, texto })

  // -------------------------------------------------------------------------
  // Importação
  // -------------------------------------------------------------------------
  const importar = async (numeroParam?: string) => {
    const numeroPncp = (numeroParam ?? importarNumero).trim()
    if (!numeroPncp) {
      setAvisoImport('Informe o número de controle PNCP (ex.: 00000000000000-1-000001/2026).')
      return
    }
    setImportando(true)
    setAvisoImport('')
    try {
      const j = await apiAnalista<{ edital: EntradaAnalise['edital']; itens: ItemEntrada[]; aviso?: string }>(
        `/api/analista/importar?pncp=${encodeURIComponent(numeroPncp)}`
      )
      setEntrada((e) => ({
        ...e,
        edital: { ...e.edital, ...j.edital },
        frete: {
          ...e.frete,
          destinoUf: j.edital.uf || e.frete.destinoUf,
          destinoCidade: j.edital.municipio || e.frete.destinoCidade,
        },
        itens: j.itens.length ? j.itens : e.itens,
      }))
      if (j.edital.objeto) setTitulo((t) => t || String(j.edital.objeto).slice(0, 120))
      setAnaliseId(null)
      setHistoricoVersoes([])
      setMercado(null)
      setAvisoImport(j.aviso || '')
      aviso('Dados do edital importados do PNCP.')
    } catch (e) {
      setAvisoImport(e instanceof Error ? e.message : 'Não foi possível importar o edital.')
    } finally {
      setImportando(false)
    }
  }

  // -------------------------------------------------------------------------
  // Salvar / duplicar / carregar
  // -------------------------------------------------------------------------
  const salvar = async (silencioso = false): Promise<string | null> => {
    const temDados = entrada.itens.some(
      (i) => i.descricao.trim() || i.custoUnitario > 0 || i.valorReferencia > 0 || i.quantidade > 0
    )
    if (!temDados) {
      if (!silencioso) aviso('Adicione ao menos um item (descrição, quantidade ou valores) antes de salvar.', 'erro')
      return null
    }
    setSalvando(true)
    try {
      const payload = {
        titulo: titulo || entrada.edital.objeto || entrada.edital.numero || 'Análise sem título',
        edital_ref: entrada.edital.numero || null,
        cenario,
        entradas: entrada,
        resultados: resultado,
        veredito: veredito.nivel,
        margem_liquida: resultado.margemLiquidaPct,
        valor_referencia: resultado.valorReferenciaTotal,
        valor_ofertado: resultado.receitaBruta,
      }
      const j = analiseId
        ? await apiAnalista<{ analise: AnaliseSalva }>(`/api/analista/analises/${analiseId}`, jsonInit('PUT', payload))
        : await apiAnalista<{ analise: AnaliseSalva }>('/api/analista/analises', jsonInit('POST', payload))
      setAnaliseId(j.analise.id)
      await onAnalisesChange()
      if (!silencioso) aviso(analiseId ? 'Análise atualizada.' : 'Análise salva no seu histórico.')
      return j.analise.id
    } catch (e) {
      if (!silencioso) aviso(e instanceof Error ? e.message : 'Não foi possível salvar a análise.', 'erro')
      return null
    } finally {
      setSalvando(false)
    }
  }

  const duplicar = async () => {
    if (!analiseId) {
      aviso('Salve a análise antes de duplicar.', 'erro')
      return
    }
    setSalvando(true)
    try {
      const j = await apiAnalista<{ analise: AnaliseSalva }>(`/api/analista/analises/${analiseId}`, jsonInit('POST', {}))
      setAnaliseId(j.analise.id)
      setEntrada(normalizarEntrada(j.analise.entradas, config))
      setTitulo(j.analise.titulo || '')
      setHistoricoVersoes([])
      await onAnalisesChange()
      aviso('Cópia criada. Você está editando a nova análise.')
    } catch (e) {
      aviso(e instanceof Error ? e.message : 'Não foi possível duplicar.', 'erro')
    } finally {
      setSalvando(false)
    }
  }

  const carregarAnalise = async (id: string) => {
    if (!id) return
    setCarregandoAnalise(true)
    try {
      const j = await apiAnalista<{ analise: AnaliseSalva }>(`/api/analista/analises/${id}`)
      setEntrada(normalizarEntrada(j.analise.entradas, config))
      setTitulo(j.analise.titulo || '')
      setAnaliseId(j.analise.id)
      setCenario(j.analise.cenario || 'realista')
      setHistoricoVersoes(Array.isArray(j.analise.historico) ? j.analise.historico : [])
      setMercado(null)
      setHistoricoAberto(false)
      aviso('Análise carregada. Edite e salve para criar uma nova versão.')
    } catch (e) {
      aviso(e instanceof Error ? e.message : 'Não foi possível carregar a análise.', 'erro')
    } finally {
      setCarregandoAnalise(false)
    }
  }

  // Abre automaticamente uma análise (vinda do Kanban) ou importa um edital
  // (vindo do botão "Analisar viabilidade" na tela de oportunidades).
  const processado = useRef<string | null>(null)
  useEffect(() => {
    const chave = analiseInicialId ? `a:${analiseInicialId}` : pncpInicial ? `p:${pncpInicial}` : null
    if (!chave) {
      processado.current = null
      return
    }
    if (processado.current === chave) return
    processado.current = chave
    if (analiseInicialId) {
      void carregarAnalise(analiseInicialId).finally(() => onAnaliseAberta?.())
    } else if (pncpInicial) {
      setImportarNumero(pncpInicial)
      void importar(pncpInicial)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analiseInicialId, pncpInicial])

  const excluirAnalise = async (id: string) => {
    if (typeof window !== 'undefined' && !window.confirm('Excluir esta análise? Essa ação não pode ser desfeita.')) return
    try {
      await apiAnalista(`/api/analista/analises/${id}`, { method: 'DELETE' })
      if (analiseId === id) {
        setAnaliseId(null)
        setHistoricoVersoes([])
      }
      await onAnalisesChange()
      aviso('Análise excluída.')
    } catch (e) {
      aviso(e instanceof Error ? e.message : 'Não foi possível excluir.', 'erro')
    }
  }

  const novaAnalise = () => {
    setEntrada(entradaInicial(config))
    setTitulo('')
    setAnaliseId(null)
    setHistoricoVersoes([])
    setCenario('realista')
    setMercado(null)
    setAvisoImport('')
    aviso('Nova análise em branco. Preencha os dados ou importe do PNCP.')
  }

  // -------------------------------------------------------------------------
  // Cenários
  // -------------------------------------------------------------------------
  const salvarCenario = (c: Cenario) => {
    setCenarios((s) => ({ ...s, [c]: clone(entrada) }))
    setCenario(c)
    setMostrarCenarios(true)
    aviso(`Cenário ${c} salvo com os valores atuais.`)
  }

  const carregarCenario = (c: Cenario) => {
    const e = cenarios[c]
    if (!e) return
    setEntrada(normalizarEntrada(e, config))
    setCenario(c)
    setAnaliseId(null)
    setHistoricoVersoes([])
    aviso(`Cenário ${c} carregado na calculadora.`)
  }

  // -------------------------------------------------------------------------
  // Mercado
  // -------------------------------------------------------------------------
  const compararMercado = async () => {
    const termo = entrada.itens.find((i) => i.descricao.trim())?.descricao?.trim()
    if (!termo) {
      aviso('Descreva ao menos um item para comparar com o mercado.', 'erro')
      return
    }
    setComparando(true)
    try {
      const j = await apiAnalista<{ termo: string; stats: MercadoInfo['stats'] }>(
        `/api/analista/mercado?termo=${encodeURIComponent(termo)}`
      )
      setMercado({ termo: j.termo, stats: j.stats })
    } catch (e) {
      aviso(e instanceof Error ? e.message : 'Não foi possível consultar o mercado.', 'erro')
    } finally {
      setComparando(false)
    }
  }

  // -------------------------------------------------------------------------
  // Kanban
  // -------------------------------------------------------------------------
  const abrirModalKanban = () => {
    if (!colunas.length) {
      aviso('Abra a aba Kanban para criar as colunas antes de enviar.', 'erro')
      return
    }
    setColunaDestino((c) => c || colunas[0].id)
    setModalKanban(true)
  }

  const enviarKanban = async () => {
    if (!colunaDestino) {
      aviso('Escolha a coluna de destino.', 'erro')
      return
    }
    setEnviandoKanban(true)
    try {
      const id = analiseId || (await salvar(true))
      if (!id) {
        aviso('Não foi possível salvar a análise antes de enviar ao Kanban.', 'erro')
        return
      }
      await apiAnalista('/api/analista/kanban/cartoes', jsonInit('POST', {
        coluna_id: colunaDestino,
        titulo: titulo || entrada.edital.objeto || 'Análise de viabilidade',
        orgao: entrada.edital.orgao || null,
        edital_ref: entrada.edital.numero || null,
        modalidade: entrada.edital.modalidade || null,
        uf: entrada.edital.uf || null,
        valor_referencia: resultado.valorReferenciaTotal,
        valor_ofertado: resultado.receitaBruta,
        margem: resultado.margemLiquidaPct,
        analise_id: id,
        data_sessao: entrada.edital.dataSessao || null,
        prazo_proposta: entrada.edital.prazoProposta || null,
        prazo_entrega: entrada.edital.prazoEntrega || null,
        prioridade: prioridadeDestino,
        link_edital: entrada.edital.link || null,
      }))
      setModalKanban(false)
      await onCartaoCriado()
      aviso('Cartão criado no Kanban com os dados desta análise.')
    } catch (e) {
      aviso(e instanceof Error ? e.message : 'Não foi possível enviar ao Kanban.', 'erro')
    } finally {
      setEnviandoKanban(false)
    }
  }

  // -------------------------------------------------------------------------
  // Exportações
  // -------------------------------------------------------------------------
  const dadosExport = { entrada, resultado, veredito, config, titulo }
  const exportar = async (tipo: 'pdf' | 'xlsx' | 'csv') => {
    try {
      if (tipo === 'pdf') exportarPdf(dadosExport)
      else if (tipo === 'xlsx') await exportarXlsx(dadosExport)
      else exportarCsv(dadosExport)
      if (tipo !== 'pdf') aviso('Arquivo gerado. Confira a pasta de downloads.')
    } catch {
      aviso('Não foi possível gerar o arquivo. Tente novamente.', 'erro')
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="space-y-4 pb-24 xl:pb-0">
      {mensagem && (
        <div
          role="status"
          className={cn(
            'flex items-start justify-between gap-3 rounded-xl border p-3 text-sm',
            mensagem.tipo === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
              : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200'
          )}
        >
          <span className="flex items-start gap-2">
            {mensagem.tipo === 'ok' ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : <X className="mt-0.5 h-4 w-4 shrink-0" />}
            {mensagem.texto}
          </span>
          <button type="button" onClick={() => setMensagem(null)} aria-label="Fechar aviso" className="shrink-0 opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* BARRA DE AÇÕES -------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <Button size="sm" loading={salvando} icon={<Save className="h-4 w-4" />} onClick={() => salvar()}>
          {analiseId ? 'Salvar alterações' : 'Salvar análise'}
        </Button>
        <Button size="sm" variant="secondary" icon={<Sparkles className="h-4 w-4" />} onClick={novaAnalise}>
          Nova
        </Button>
        <Button size="sm" variant="secondary" icon={<Copy className="h-4 w-4" />} onClick={duplicar} disabled={!analiseId || salvando}>
          Duplicar
        </Button>
        <Button size="sm" variant="secondary" icon={<History className="h-4 w-4" />} onClick={() => setHistoricoAberto(true)}>
          Histórico
        </Button>
        <Button
          size="sm"
          variant={mostrarCenarios ? 'outline' : 'secondary'}
          icon={<Layers className="h-4 w-4" />}
          onClick={() => setMostrarCenarios((v) => !v)}
        >
          Cenários
        </Button>

        <div className="mx-1 hidden h-6 w-px bg-slate-200 dark:bg-slate-700 sm:block" />

        <div className="flex items-center gap-1">
          <button type="button" onClick={() => exportar('pdf')} title="Exportar PDF (uma página)" aria-label="Exportar PDF" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white">
            <Printer className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => exportar('xlsx')} title="Exportar Excel (.xlsx)" aria-label="Exportar Excel" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white">
            <FileSpreadsheet className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => exportar('csv')} title="Exportar CSV (abre no Excel)" aria-label="Exportar CSV" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white">
            <Download className="h-4 w-4" />
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="secondary" icon={<Kanban className="h-4 w-4" />} onClick={abrirModalKanban}>
            Enviar ao Kanban
          </Button>
          <Button size="sm" variant="ghost" icon={<Settings2 className="h-4 w-4" />} onClick={() => setConfigAberta(true)} title="Configurações do analista">
            <span className="hidden sm:inline">Configurações</span>
          </Button>
        </div>
      </div>

      {/* CENÁRIOS --------------------------------------------------------- */}
      {mostrarCenarios && (
        <section className="card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-display text-sm font-bold text-slate-900 dark:text-white">
              <Layers className="h-4 w-4 text-primary" /> Cenários lado a lado
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Salve até 3 versões e compare lucro, margem e veredito. “Salvar atual” grava os valores de agora no cenário.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {comparacao.map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn('text-xs font-bold uppercase tracking-wide', CENARIOS.find((x) => x.id === c.id)?.cor)}>{c.label}</p>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => salvarCenario(c.id)} className="rounded-md px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10" title="Salvar valores atuais neste cenário">
                      Salvar atual
                    </button>
                    {!c.vazio && (
                      <button type="button" onClick={() => carregarCenario(c.id)} className="rounded-md px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="Carregar este cenário">
                        Carregar
                      </button>
                    )}
                  </div>
                </div>
                {c.vazio ? (
                  <p className="mt-3 text-xs text-slate-400">Ainda não salvo.</p>
                ) : (
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Receita</span><strong className="text-slate-800 dark:text-slate-100">{formatCurrency(c.r.receitaBruta)}</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Custo total</span><strong className="text-slate-800 dark:text-slate-100">{formatCurrency(c.r.custoTotal)}</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Lucro líquido</span><strong className={c.r.lucroLiquido >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>{formatCurrency(c.r.lucroLiquido)}</strong></div>
                    <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Margem</span><strong className={c.r.margemLiquidaPct >= 10 ? 'text-emerald-600 dark:text-emerald-400' : c.r.margemLiquidaPct >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}>{pct(c.r.margemLiquidaPct)}</strong></div>
                    <div className="mt-2 rounded-lg bg-slate-50 p-1.5 text-center text-[11px] font-bold dark:bg-slate-800/60">
                      <span className={c.v.nivel === 'verde' ? 'text-emerald-600 dark:text-emerald-400' : c.v.nivel === 'amarelo' ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}>{c.v.titulo}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,430px)]">
        {/* COLUNA DE ENTRADAS ------------------------------------------- */}
        <div className="space-y-4">
          {/* DADOS DA LICITAÇÃO */}
          <Secao titulo="1. Dados da licitação" icone={<Building2 className="h-4 w-4" />} dica="Importe do PNCP para preencher automaticamente ou digite os dados manualmente.">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 dark:bg-primary/10">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Importar do edital (PNCP)
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <CampoTexto
                  id="importar-pncp"
                  valor={importarNumero}
                  onChange={setImportarNumero}
                  placeholder="00000000000000-1-000001/2026"
                  className="flex-1"
                />
                <Button type="button" size="md" loading={importando} onClick={() => importar()} icon={<Download className="h-4 w-4" />}>
                  Importar
                </Button>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Busca órgão, UF, município, modalidade, objeto, datas, itens e valores de referência. Você pode ajustar tudo depois.
              </p>
              {avisoImport && <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">{avisoImport}</p>}
              {analises.length > 0 && (
                <div className="mt-3">
                  <CampoSelect
                    id="carregar-salva"
                    label="Ou carregue uma análise já salva"
                    valor=""
                    onChange={(id) => carregarAnalise(id)}
                    opcoes={[
                      { value: '', label: 'Selecione uma análise...' },
                      ...analises.map((a) => ({
                        value: a.id,
                        label: `${a.titulo || a.edital_ref || 'Análise'} · ${formatDate(a.atualizado_em)}`,
                      })),
                    ]}
                  />
                </div>
              )}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <CampoTexto id="ed-numero" label="Número de controle PNCP" valor={entrada.edital.numero} onChange={(v) => setEdital({ numero: v })} placeholder="00000000000000-1-000001/2026" />
              <CampoTexto id="ed-orgao" label="Órgão" valor={entrada.edital.orgao} onChange={(v) => setEdital({ orgao: v })} placeholder="Nome do órgão" />
              <div className="grid grid-cols-2 gap-3">
                <CampoSelect id="ed-uf" label="UF" valor={entrada.edital.uf} onChange={(v) => setEdital({ uf: v })} opcoes={[{ value: '', label: 'UF' }, ...UFS_BRASIL.map((uf) => ({ value: uf, label: uf }))]} />
                <CampoTexto id="ed-municipio" label="Município" valor={entrada.edital.municipio} onChange={(v) => setEdital({ municipio: v })} />
              </div>
              <CampoTexto id="ed-modalidade" label="Modalidade" valor={entrada.edital.modalidade} onChange={(v) => setEdital({ modalidade: v })} placeholder="Pregão eletrônico" />
              <CampoTexto id="ed-objeto" label="Objeto" valor={entrada.edital.objeto} onChange={(v) => setEdital({ objeto: v })} className="sm:col-span-2" />
              <CampoMoeda id="ed-valor" label="Valor de referência (se não usar itens)" valor={entrada.edital.valorReferencia} onChange={(v) => setEdital({ valorReferencia: v })} dica="Se os itens tiverem valor de referência, a soma dos itens prevalece." />
              <div className="flex items-end">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Soma dos itens: <strong className="text-slate-800 dark:text-slate-100">{formatCurrency(resultado.valorReferenciaTotal)}</strong>
                </p>
              </div>
              <CampoData id="ed-sessao" label="Data da sessão" valor={entrada.edital.dataSessao} onChange={(v) => setEdital({ dataSessao: v })} />
              <CampoData id="ed-proposta" label="Prazo da proposta" valor={entrada.edital.prazoProposta} onChange={(v) => setEdital({ prazoProposta: v })} />
              <CampoData id="ed-entrega" label="Prazo de entrega" valor={entrada.edital.prazoEntrega} onChange={(v) => setEdital({ prazoEntrega: v })} />
              <CampoTexto id="ed-link" label="Link do edital" valor={entrada.edital.link} onChange={(v) => setEdital({ link: v })} placeholder="https://pncp.gov.br/..." />
            </div>
            {entrada.edital.link && (
              <a href={entrada.edital.link} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                <ExternalLink className="h-3.5 w-3.5" /> Abrir edital no PNCP
              </a>
            )}
            <div className="mt-3">
              <CampoTexto id="analise-titulo" label="Título da análise" valor={titulo} onChange={setTitulo} placeholder="Ex.: Pregão 12/2026 — material de escritório" maxLength={120} />
            </div>
          </Secao>

          {/* ITENS */}
          <Secao
            titulo={`2. Itens (${entrada.itens.length})`}
            icone={<Package className="h-4 w-4" />}
            dica="Informe o custo de compra e o valor de referência de cada item. Peso e volume alimentam o cálculo do frete."
            acao={
              <Button type="button" size="sm" variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={adicionarItem}>
                Item
              </Button>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-xs">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400">
                    <th className="pb-1 pr-2 font-semibold">Descrição</th>
                    <th className="w-16 pb-1 pr-2 font-semibold">Un.</th>
                    <th className="w-24 pb-1 pr-2 font-semibold">Qtd.</th>
                    <th className="w-28 pb-1 pr-2 font-semibold">Valor ref.</th>
                    <th className="w-28 pb-1 pr-2 font-semibold">Custo unit.</th>
                    <th className="w-24 pb-1 pr-2 font-semibold">Peso (kg)</th>
                    <th className="w-24 pb-1 pr-2 font-semibold">Volume (m³)</th>
                    <th className="w-36 pb-1 pr-2 font-semibold">Fornecedor</th>
                    <th className="w-8 pb-1" />
                  </tr>
                </thead>
                <tbody>
                  {entrada.itens.map((item, index) => (
                    <tr key={item.id} className="border-t border-slate-100 align-top dark:border-slate-800">
                      <td className="py-1 pr-2">
                        <input
                          aria-label={`Descrição do item ${index + 1}`}
                          value={item.descricao}
                          onChange={(e) => setItem(item.id, { descricao: e.target.value })}
                          placeholder="Produto ou serviço"
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </td>
                      <td className="py-1 pr-2">
                        <input
                          aria-label={`Unidade do item ${index + 1}`}
                          value={item.unidade}
                          onChange={(e) => setItem(item.id, { unidade: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs uppercase dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </td>
                      <td className="py-1 pr-2">
                        <CampoNumero valor={item.quantidade} onChange={(v) => setItem(item.id, { quantidade: v })} min={0} />
                      </td>
                      <td className="py-1 pr-2">
                        <CampoMoeda valor={item.valorReferencia} onChange={(v) => setItem(item.id, { valorReferencia: v })} />
                      </td>
                      <td className="py-1 pr-2">
                        <CampoMoeda valor={item.custoUnitario} onChange={(v) => setItem(item.id, { custoUnitario: v })} />
                      </td>
                      <td className="py-1 pr-2">
                        <CampoNumero valor={item.pesoKg} onChange={(v) => setItem(item.id, { pesoKg: v })} min={0} />
                      </td>
                      <td className="py-1 pr-2">
                        <CampoNumero valor={item.volumeM3} onChange={(v) => setItem(item.id, { volumeM3: v })} min={0} />
                      </td>
                      <td className="py-1 pr-2">
                        <input
                          aria-label={`Fornecedor do item ${index + 1}`}
                          value={item.fornecedor || ''}
                          onChange={(e) => setItem(item.id, { fornecedor: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </td>
                      <td className="py-1">
                        <button
                          type="button"
                          onClick={() => removerItem(item.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                          aria-label={`Remover item ${index + 1}`}
                          title="Remover item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {entrada.itens.length === 0 && (
              <p className="rounded-lg bg-slate-50 p-3 text-center text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                Nenhum item. Clique em “Item” para adicionar.
              </p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60 sm:grid-cols-4">
              <Resumo rotulo="Custo dos produtos" valor={formatCurrency(resultado.custoProdutos)} />
              <Resumo rotulo="Valor de referência" valor={formatCurrency(resultado.valorReferenciaTotal)} />
              <Resumo rotulo="Peso taxável" valor={calcularPesoText(entrada, config)} />
              <Resumo rotulo="Custo unitário médio" valor={formatCurrency(resultado.custoUnitarioMedio)} />
            </div>
          </Secao>

          {/* FRETE */}
          <Secao titulo="3. Frete" icone={<Truck className="h-4 w-4" />} dica="Frete = maior valor entre peso, peso cubado e mínimo da tabela. CIF inclui o frete no custo; FOB não.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <CampoSelect
                id="frete-modo"
                label="Modo"
                valor={entrada.frete.modo}
                onChange={(v) => setFrete({ modo: v as EntradaAnalise['frete']['modo'] })}
                opcoes={[
                  { value: 'tabela', label: 'Estimativa pela tabela' },
                  { value: 'manual', label: 'Valor informado' },
                  { value: 'cotado', label: 'Frete cotado' },
                ]}
              />
              <CampoSelect
                id="frete-tipo"
                label="Tipo"
                valor={entrada.frete.tipo}
                onChange={(v) => setFrete({ tipo: v as EntradaAnalise['frete']['tipo'] })}
                opcoes={[{ value: 'CIF', label: 'CIF (frete no custo)' }, { value: 'FOB', label: 'FOB (frete por conta do órgão)' }]}
                dica="CIF: você paga o frete. FOB: o frete não entra no seu custo."
              />
              {entrada.frete.modo === 'manual' && (
                <CampoMoeda id="frete-manual" label="Valor do frete" valor={entrada.frete.valorManual} onChange={(v) => setFrete({ valorManual: v })} />
              )}
              {entrada.frete.modo === 'cotado' && (
                <CampoMoeda id="frete-cotado" label="Frete cotado" valor={entrada.frete.valorCotado} onChange={(v) => setFrete({ valorCotado: v })} />
              )}
              {entrada.frete.modo === 'tabela' && (
                <>
                  <CampoSelect id="frete-origem-uf" label="UF de origem" valor={entrada.frete.origemUf} onChange={(v) => setFrete({ origemUf: v })} opcoes={[{ value: '', label: 'UF' }, ...UFS_BRASIL.map((uf) => ({ value: uf, label: uf }))]} />
                  <CampoSelect id="frete-destino-uf" label="UF de destino" valor={entrada.frete.destinoUf} onChange={(v) => setFrete({ destinoUf: v })} opcoes={[{ value: '', label: 'UF' }, ...UFS_BRASIL.map((uf) => ({ value: uf, label: uf }))]} />
                  <CampoNumero id="frete-distancia" label="Distância" sufixo="km" valor={entrada.frete.distanciaKm} onChange={(v) => setFrete({ distanciaKm: v })} min={0} dica="Usada para escolher a faixa da tabela de frete." />
                </>
              )}
              <CampoTexto id="frete-origem-cidade" label="Cidade de origem" valor={entrada.frete.origemCidade} onChange={(v) => setFrete({ origemCidade: v })} />
              <CampoTexto id="frete-destino-cidade" label="Cidade de destino" valor={entrada.frete.destinoCidade} onChange={(v) => setFrete({ destinoCidade: v })} />
              <CampoNumero id="frete-seguro" label="Seguro de carga" sufixo="%" valor={entrada.frete.seguroPct} onChange={(v) => setFrete({ seguroPct: v })} min={0} step={0.1} dica="Percentual sobre o valor dos produtos." />
              <CampoMoeda id="frete-pedagio" label="Pedágio / adicionais" valor={entrada.frete.pedagio} onChange={(v) => setFrete({ pedagio: v })} />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400">
                Frete considerado: <strong className="text-slate-900 dark:text-white">{formatCurrency(resultado.frete)}</strong>
                {entrada.frete.tipo === 'FOB' && <span className="ml-1 text-amber-600 dark:text-amber-400">(FOB: não somado)</span>}
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                Seguro {formatCurrency(resultado.seguro)} · Pedágio {formatCurrency(resultado.pedagio)}
              </span>
            </div>
          </Secao>

          {/* CUSTOS OPERACIONAIS */}
          <Secao titulo="4. Custos operacionais e comerciais" icone={<Wallet className="h-4 w-4" />} dica="Custos fixos do pedido e percentuais aplicados sobre a receita.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <CampoMoeda id="custo-embalagem" label="Embalagem" valor={entrada.custos.embalagem} onChange={(v) => setCustos({ embalagem: v })} />
              <CampoMoeda id="custo-armazenagem" label="Armazenagem" valor={entrada.custos.armazenagem} onChange={(v) => setCustos({ armazenagem: v })} />
              <CampoMoeda id="custo-instalacao" label="Instalação / montagem" valor={entrada.custos.instalacao} onChange={(v) => setCustos({ instalacao: v })} />
              <CampoMoeda id="custo-treinamento" label="Treinamento" valor={entrada.custos.treinamento} onChange={(v) => setCustos({ treinamento: v })} />
              <CampoMoeda id="custo-certidoes" label="Certidões / documentação" valor={entrada.custos.certidoes} onChange={(v) => setCustos({ certidoes: v })} />
              <CampoNumero id="custo-comissao" label="Comissão de representante" sufixo="%" valor={entrada.custos.comissaoPct} onChange={(v) => setCustos({ comissaoPct: v })} min={0} step={0.1} dica="Percentual sobre a receita." />
              <CampoNumero id="custo-despesas" label="Despesas administrativas" sufixo="%" valor={entrada.custos.despesasPct} onChange={(v) => setCustos({ despesasPct: v })} min={0} step={0.1} dica="Rateio da estrutura sobre a receita." />
              <CampoNumero id="custo-garantia" label="Garantia / seguro-garantia" sufixo="%" valor={entrada.custos.garantiaPct} onChange={(v) => setCustos({ garantiaPct: v })} min={0} step={0.1} dica="Percentual do contrato exigido como garantia." />
              <CampoNumero id="custo-risco" label="Risco / contingência" sufixo="%" valor={entrada.custos.riscoPct} onChange={(v) => setCustos({ riscoPct: v })} min={0} step={0.1} dica="Aplicado sobre o custo direto para imprevistos e multas." />
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Outros custos <Dica texto="Lista livre para despesas específicas deste edital." />
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  icon={<Plus className="h-4 w-4" />}
                  onClick={() => setEntrada((e) => ({ ...e, outrosCustos: [...e.outrosCustos, { nome: '', valor: 0 }] }))}
                >
                  Adicionar
                </Button>
              </div>
              {entrada.outrosCustos.length === 0 ? (
                <p className="text-xs text-slate-400">Nenhum custo extra.</p>
              ) : (
                <div className="space-y-2">
                  {entrada.outrosCustos.map((custo, i) => (
                    <div key={i} className="grid grid-cols-[1fr_150px_auto] items-end gap-2">
                      <input
                        aria-label={`Nome do custo extra ${i + 1}`}
                        value={custo.nome}
                        onChange={(e) =>
                          setEntrada((s) => {
                            const outrosCustos = [...s.outrosCustos]
                            outrosCustos[i] = { ...outrosCustos[i], nome: e.target.value }
                            return { ...s, outrosCustos }
                          })
                        }
                        placeholder="Ex.: taxa de plataforma"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                      <CampoMoeda
                        valor={custo.valor}
                        onChange={(v) =>
                          setEntrada((s) => {
                            const outrosCustos = [...s.outrosCustos]
                            outrosCustos[i] = { ...outrosCustos[i], valor: v }
                            return { ...s, outrosCustos }
                          })
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setEntrada((s) => ({ ...s, outrosCustos: s.outrosCustos.filter((_, j) => j !== i) }))}
                        className="mb-0.5 rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                        aria-label={`Remover custo extra ${i + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Secao>

          {/* IMPOSTOS */}
          <Secao titulo="5. Impostos" icone={<Percent className="h-4 w-4" />} dica="As alíquotas incidem sobre a receita bruta. No Simples/MEI use a alíquota efetiva.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <CampoSelect
                id="regime"
                label="Regime tributário"
                valor={entrada.regime}
                onChange={(v) => setEntrada((e) => ({ ...e, regime: v as Regime }))}
                opcoes={REGIMES.map((r) => ({ value: r.id, label: r.label }))}
              />
              {entrada.regime === 'simples' || entrada.regime === 'mei' ? (
                <CampoNumero
                  id="al-simples"
                  label={entrada.regime === 'mei' ? 'Alíquota efetiva MEI' : 'Alíquota efetiva Simples'}
                  sufixo="%"
                  valor={entrada.aliquotas.simples}
                  onChange={(v) => setAliquota('simples', v)}
                  min={0}
                  step={0.1}
                />
              ) : (
                <>
                  <CampoNumero id="al-icms" label="ICMS" sufixo="%" valor={entrada.aliquotas.icms} onChange={(v) => setAliquota('icms', v)} min={0} step={0.01} />
                  <CampoNumero id="al-iss" label="ISS" sufixo="%" valor={entrada.aliquotas.iss} onChange={(v) => setAliquota('iss', v)} min={0} step={0.01} />
                  <CampoNumero id="al-pis" label="PIS" sufixo="%" valor={entrada.aliquotas.pis} onChange={(v) => setAliquota('pis', v)} min={0} step={0.01} />
                  <CampoNumero id="al-cofins" label="COFINS" sufixo="%" valor={entrada.aliquotas.cofins} onChange={(v) => setAliquota('cofins', v)} min={0} step={0.01} />
                  <CampoNumero id="al-irpj" label="IRPJ" sufixo="%" valor={entrada.aliquotas.irpj} onChange={(v) => setAliquota('irpj', v)} min={0} step={0.01} />
                  <CampoNumero id="al-csll" label="CSLL" sufixo="%" valor={entrada.aliquotas.csll} onChange={(v) => setAliquota('csll', v)} min={0} step={0.01} />
                  <CampoNumero id="al-st" label="ST / DIFAL" sufixo="%" valor={entrada.aliquotas.stDifal} onChange={(v) => setAliquota('stDifal', v)} min={0} step={0.01} />
                </>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400">Alíquota efetiva: <strong className="text-slate-900 dark:text-white">{pct(resultado.impostoEfetivoPct)}</strong></span>
              <span className="text-slate-500 dark:text-slate-400">Impostos sobre a receita: <strong className="text-slate-900 dark:text-white">{formatCurrency(resultado.impostos)}</strong></span>
            </div>
          </Secao>

          {/* FINANCEIRO */}
          <Secao titulo="6. Prazo e custo financeiro" icone={<Clock className="h-4 w-4" />} dica="O custo do capital é composto pelo prazo até o pagamento: quanto mais tarde o órgão paga, maior o custo.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <CampoNumero id="prazo-pagamento" label="Prazo de pagamento" sufixo="dias" valor={entrada.financeiro.prazoPagamentoDias} onChange={(v) => setFinanceiro({ prazoPagamentoDias: v })} min={0} />
              <CampoNumero id="custo-capital" label="Custo de capital" sufixo="% a.m." valor={entrada.financeiro.custoCapitalMes} onChange={(v) => setFinanceiro({ custoCapitalMes: v })} min={0} step={0.1} />
              <div className="col-span-2 flex items-end">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Custo financeiro do prazo: <strong className="text-slate-900 dark:text-white">{formatCurrency(resultado.custoFinanceiro)}</strong>
                </p>
              </div>
            </div>
          </Secao>

          {/* MARGEM E LANCE */}
          <Secao titulo="7. Margem desejada e lance" icone={<Target className="h-4 w-4" />} dica="A margem mínima define o preço mínimo e o menor lance viável. O desconto é aplicado sobre o valor de referência.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <CampoNumero id="margem-minima" label="Margem mínima desejada" sufixo="%" valor={entrada.margemMinima} onChange={(v) => setEntrada((e) => ({ ...e, margemMinima: v }))} min={0} max={90} step={0.5} />
              <CampoNumero
                id="desconto-lance"
                label="Desconto sobre a referência"
                sufixo="%"
                valor={entrada.descontoLancePct}
                onChange={(v) => setEntrada((e) => ({ ...e, descontoLancePct: Math.max(0, Math.min(60, v)), valorOfertadoManual: null }))}
                min={0}
                max={60}
                step={0.5}
                disabled={manualAtivo}
                dica="Desconto aplicado sobre o valor de referência para formar o lance."
              />
              <div className="col-span-2 flex items-end">
                <button
                  type="button"
                  onClick={() =>
                    setEntrada((e) => ({
                      ...e,
                      valorOfertadoManual: manualAtivo ? null : round2(resultado.receitaBruta || e.edital.valorReferencia),
                    }))
                  }
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors',
                    manualAtivo
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                  )}
                >
                  <CircleIcon /> {manualAtivo ? 'Usando valor ofertado manual' : 'Informar valor ofertado manualmente'}
                </button>
              </div>
            </div>
            {manualAtivo && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <CampoMoeda
                  id="valor-manual"
                  label="Valor ofertado (manual)"
                  valor={entrada.valorOfertadoManual || 0}
                  onChange={(v) => setEntrada((e) => ({ ...e, valorOfertadoManual: v > 0 ? v : null }))}
                  dica="Quando informado, este valor substitui o cálculo por desconto."
                />
                <div className="flex items-end">
                  <button type="button" onClick={() => setEntrada((e) => ({ ...e, valorOfertadoManual: null }))} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                    <RotateCcw className="h-3.5 w-3.5" /> Voltar ao desconto
                  </button>
                </div>
              </div>
            )}
          </Secao>
        </div>

        {/* COLUNA DE RESULTADO ------------------------------------------ */}
        <div id="painel-resultado" className="xl:sticky xl:top-4 xl:self-start">
          <PainelResultado
            entrada={entrada}
            resultado={resultado}
            veredito={veredito}
            sensibilidade={sensibilidade}
            lances={lances}
            config={config}
            onDesconto={(v) => setEntrada((e) => ({ ...e, descontoLancePct: v, valorOfertadoManual: null }))}
            onUsarReferencia={() => setEntrada((e) => ({ ...e, descontoLancePct: 0, valorOfertadoManual: null }))}
            mercado={mercado}
            comparando={comparando}
            onCompararMercado={compararMercado}
          />
        </div>
      </div>

      {/* BARRA MOBILE --------------------------------------------------- */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 xl:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-2">
          <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', veredito.nivel === 'verde' ? 'bg-emerald-500' : veredito.nivel === 'amarelo' ? 'bg-amber-500' : 'bg-rose-500')} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              {veredito.titulo} · margem {pct(resultado.margemLiquidaPct)}
            </p>
            <p className="text-xs font-bold text-slate-900 dark:text-white">Lucro {formatCurrency(resultado.lucroLiquido)}</p>
          </div>
          <a href="#painel-resultado" className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white">Ver resultado</a>
        </div>
      </div>

      {/* MODAL CONFIG --------------------------------------------------- */}
      <ModalConfig aberto={configAberta} config={config} onFechar={() => setConfigAberta(false)} onSalvar={onConfigSalva} />

      {/* MODAL HISTÓRICO ------------------------------------------------ */}
      {historicoAberto && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="titulo-historico" onMouseDown={(e) => { if (e.target === e.currentTarget) setHistoricoAberto(false) }}>
          <div className="my-4 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <h2 id="titulo-historico" className="font-display text-lg font-bold text-slate-900 dark:text-white">Histórico de análises</h2>
              </div>
              <button type="button" onClick={() => setHistoricoAberto(false)} aria-label="Fechar" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[65vh] space-y-3 overflow-y-auto p-4">
              {carregandoAnalise && <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</p>}
              {analises.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
                  <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Nenhuma análise salva ainda</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Preencha a calculadora e clique em “Salvar análise”.</p>
                </div>
              ) : (
                analises.map((a) => (
                  <div key={a.id} className={cn('rounded-xl border p-3', analiseId === a.id ? 'border-primary/40 bg-primary/5' : 'border-slate-200 dark:border-slate-700')}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{a.titulo || 'Análise sem título'}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {a.edital_ref || 'sem número PNCP'} · {formatDate(a.atualizado_em)} · {a.cenario}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', a.veredito === 'verde' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : a.veredito === 'amarelo' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300')}>
                          {a.veredito || '—'}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{pct(a.margem_liquida || 0)}</span>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="secondary" onClick={() => carregarAnalise(a.id)}>Carregar</Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => excluirAnalise(a.id)} icon={<Trash2 className="h-3.5 w-3.5" />}>Excluir</Button>
                    </div>
                  </div>
                ))
              )}

              {analiseId && historicoVersoes.length > 0 && (
                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Versões anteriores desta análise ({historicoVersoes.length})
                  </p>
                  <div className="space-y-2">
                    {historicoVersoes.map((v, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-2 text-xs dark:bg-slate-800/60">
                        <span className="text-slate-600 dark:text-slate-300">
                          {v.em ? formatDate(String(v.em)) : `Versão ${i + 1}`} · margem {pct(Number(v.margem_liquida) || 0)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (!v.entradas) return
                            setEntrada(normalizarEntrada(v.entradas, config))
                            if (v.titulo) setTitulo(String(v.titulo))
                            setHistoricoAberto(false)
                            aviso('Versão anterior restaurada. Salve para gravá-la como nova versão.')
                          }}
                          className="font-semibold text-primary hover:underline"
                        >
                          Restaurar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL KANBAN --------------------------------------------------- */}
      {modalKanban && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="titulo-enviar-kanban" onMouseDown={(e) => { if (e.target === e.currentTarget) setModalKanban(false) }}>
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="titulo-enviar-kanban" className="flex items-center gap-2 font-display text-base font-bold text-slate-900 dark:text-white">
                <Kanban className="h-4 w-4 text-primary" /> Enviar para o Kanban
              </h2>
              <button type="button" onClick={() => setModalKanban(false)} aria-label="Fechar" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              O cartão será criado com órgão, valores, margem e vínculo com esta análise.
            </p>
            <div className="space-y-3">
              <CampoSelect
                id="kanban-coluna"
                label="Coluna"
                valor={colunaDestino}
                onChange={setColunaDestino}
                opcoes={colunas.map((c) => ({ value: c.id, label: c.nome }))}
              />
              <CampoSelect
                id="kanban-prioridade"
                label="Prioridade"
                valor={prioridadeDestino}
                onChange={(v) => setPrioridadeDestino(v as Prioridade)}
                opcoes={PRIORIDADES.map((p) => ({ value: p.id, label: p.label }))}
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setModalKanban(false)}>Cancelar</Button>
              <Button type="button" loading={enviandoKanban} onClick={enviarKanban} icon={<Kanban className="h-4 w-4" />}>Criar cartão</Button>
            </div>
            <button type="button" onClick={() => { setModalKanban(false); onIrParaKanban() }} className="mt-3 text-xs font-semibold text-primary hover:underline">
              Abrir o Kanban
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Auxiliares de render
// ---------------------------------------------------------------------------
function Resumo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{rotulo}</p>
      <p className="text-sm font-bold text-slate-900 dark:text-white">{valor}</p>
    </div>
  )
}

function CircleIcon() {
  return <span className="inline-block h-2 w-2 rounded-full bg-current" aria-hidden="true" />
}

function calcularPesoText(entrada: EntradaAnalise, config: ConfigAnalista): string {
  const peso = entrada.itens.reduce((s, i) => s + Math.max(0, numero(i.quantidade)) * Math.max(0, numero(i.pesoKg)), 0)
  const volume = entrada.itens.reduce((s, i) => s + Math.max(0, numero(i.quantidade)) * Math.max(0, numero(i.volumeM3)), 0)
  const cubado = volume * Math.max(0, numero(config.fatorCubagem))
  const taxavel = Math.max(peso, cubado)
  return `${taxavel.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg (cubado ${cubado.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg)`
}
