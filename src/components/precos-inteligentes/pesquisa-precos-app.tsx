'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Trash2, Eraser, RefreshCcw, Calculator, Info, SearchX, AlertTriangle, RotateCcw, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  API_BASE_URL,
  FONTE_LABEL,
  fmtBRL,
  quartil,
  calcStats,
  type PrecoRecord,
  type ItemCatalogo,
  type MercadoInfo,
  type OrcamentoItem,
} from '@/lib/precos-inteligentes'
import {
  calcularResumo,
  calcularConfianca,
  calcularFaixa,
} from '@/lib/precos-inteligentes/derivados'
import { exportarOrcamentoXlsx } from '@/lib/precos-inteligentes/export'

import SearchHero from './ui/search-hero'
import FiltersPanel, { FILTROS_VAZIO, type FiltrosAtivos } from './ui/filtro-painel'
import SummaryCards, { ResumoLinha } from './ui/cards-resumo'
import PriceRange from './ui/faixa-preco'
import ConfidenceBadge from './ui/confianca'
import ChartsSection from './ui/graficos'
import ResultsTable, { type SortCfg } from './ui/tabela-resultados'
import ComparisonPanel from './ui/comparacao'
import ExportBar from './ui/barra-exportar'
import SavedSearches, { type PesquisaSalva } from './ui/pesquisas-salvas'
import RecordDrawer from './ui/detalhes-registro'
import Modal from './ui/modal'

const STORAGE_KEY = 'painel-precos-orcamento'
const SAVED_KEY = 'painel-precos-salvas'

const btnCls =
  'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors'

export default function PesquisaPrecosApp() {
  const [tipoItem, setTipoItem] = useState<'material' | 'servico'>('material')
  const [codigo, setCodigo] = useState('')
  const [descricao, setDescricao] = useState('')

  const [termo, setTermo] = useState('')
  const [qtd, setQtd] = useState('1')

  const [precos, setPrecos] = useState<PrecoRecord[]>([])
  const [outlierSet, setOutlierSet] = useState<Set<number> | null>(null)
  const [mercado, setMercado] = useState<MercadoInfo | null>(null)

  // Novos estados de UX
  const [filtros, setFiltros] = useState<FiltrosAtivos>(FILTROS_VAZIO)
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set())
  const [colunasOcultas, setColunasOcultas] = useState<Set<string>>(new Set())
  const [registroDetalhe, setRegistroDetalhe] = useState<PrecoRecord | null>(null)
  const [abaOrcamento, setAbaOrcamento] = useState(false)

  // Ordenação / paginação (mantidos)
  const [sort, setSort] = useState<SortCfg>(null)
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(50)

  const [apiStatus, setApiStatus] = useState('')
  const [mostrarInfo, setMostrarInfo] = useState(false)

  // Cálculo (mantido)
  const [calculo, setCalculo] = useState<{
    n: number
    media: number
    mediana: number
    desvio: number
    cv: number
  } | null>(null)
  const [statWarning, setStatWarning] = useState('')
  const [sobreprecoHtml, setSobreprecoHtml] = useState('')
  const [limiteSobrepreco, setLimiteSobrepreco] = useState('25')
  const [ultimoCalculo, setUltimoCalculo] = useState<OrcamentoItem | null>(null)

  const [orcamento, setOrcamento] = useState<OrcamentoItem[]>([])
  const [salvas, setSalvas] = useState<PesquisaSalva[]>([])

  // autocomplete (mantido)
  const [suggestItems, setSuggestItems] = useState<ItemCatalogo[]>([])
  const [suggestIndex, setSuggestIndex] = useState(-1)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [apiEstado, setApiEstado] = useState<'checking' | 'online' | 'offline'>('checking')
  const ultimoCodigoBusca = useRef<string | null>(null)
  const ultimoTipoBusca = useRef<'material' | 'servico'>('material')
  const [buscando, setBuscando] = useState(false)
  const [baixandoCsv, setBaixandoCsv] = useState(false)
  const [erro, setErro] = useState(false)

  // ---- persistência ----
  const orcPersistido = useRef(false)
  const salvasPersistidas = useRef(false)

  // Carrega do localStorage somente no cliente (após a hidratação), para que o
  // HTML renderizado no servidor e no cliente sejam idênticos (evita tela em branco).
  useEffect(() => {
    try {
      const rawOrc = localStorage.getItem(STORAGE_KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- inicialização única a partir do localStorage
      if (rawOrc) setOrcamento(JSON.parse(rawOrc) as OrcamentoItem[])
    } catch {
      /* ignore */
    }
    try {
      const rawSalvas = localStorage.getItem(SAVED_KEY)
      if (rawSalvas) setSalvas(JSON.parse(rawSalvas) as PesquisaSalva[])
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (!orcPersistido.current) {
      orcPersistido.current = true
      return
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orcamento))
    } catch {
      /* ignore */
    }
  }, [orcamento])

  useEffect(() => {
    if (!salvasPersistidas.current) {
      salvasPersistidas.current = true
      return
    }
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(salvas))
    } catch {
      /* ignore */
    }
  }, [salvas])

  // ---- status da API ----
  useEffect(() => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    fetch(`${API_BASE_URL}/api/catalogo?q=resma&tipo=material`, {
      headers: { Accept: 'application/json' },
      signal: ctrl.signal,
    })
      .then((r) => setApiEstado(r.ok ? 'online' : 'offline'))
      .catch(() => setApiEstado('offline'))
      .finally(() => clearTimeout(timer))
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [])

  // ---- identificação por código ----
  const identificaPorCodigo = useCallback(
    async (cod: string, tipo: 'material' | 'servico') => {
      if (!cod) return
      const ehServico = tipo === 'servico'
      if (!(ehServico ? /^\d{4,10}$/ : /^\d{6}$/).test(String(cod))) return
      if (!descricao.trim()) setDescricao('Identificando…')
      try {
        const resp = await fetch(
          `${API_BASE_URL}/api/catalogo/item?codigo=${encodeURIComponent(cod)}&tipo=${tipo}`
        )
        if (!resp.ok) {
          if (descricao === 'Identificando…') setDescricao('')
          return
        }
        const data = await resp.json()
        if (data.descricao) setDescricao(data.descricao)
        else if (descricao === 'Identificando…') setDescricao('')
      } catch {
        if (descricao === 'Identificando…') setDescricao('')
      }
    },
    [descricao]
  )

  // ---- busca do catálogo (autocomplete) ----
  const buscarCatalogo = useCallback(
    (termoQuery: string) => {
      if (suggestTimer.current) clearTimeout(suggestTimer.current)
      if (termoQuery.trim().length < 3) {
        setSuggestOpen(false)
        setSuggestItems([])
        setSuggestIndex(-1)
        return
      }
      suggestTimer.current = setTimeout(async () => {
        try {
          const resp = await fetch(
            `${API_BASE_URL}/api/catalogo?q=${encodeURIComponent(termoQuery)}&tipo=${tipoItem}`
          )
          if (!resp.ok) return
          const data = await resp.json()
          setSuggestItems(data.itens || [])
          setSuggestIndex(-1)
          setSuggestOpen(true)
        } catch {
          setSuggestOpen(false)
        }
      }, 350)
    },
    [tipoItem]
  )

  useEffect(() => {
    return () => {
      if (suggestTimer.current) clearTimeout(suggestTimer.current)
    }
  }, [])

  const selecionaSugestao = (i: number) => {
    const it = suggestItems[i]
    if (!it) return
    setCodigo(String(it.codigo_item))
    setDescricao(it.descricao_item)
    setTermo(it.descricao_item)
    setSuggestOpen(false)
    setSuggestItems([])
    setSuggestIndex(-1)
    identificaPorCodigo(String(it.codigo_item), tipoItem)
  }

  const fetchMercado = useCallback(async (tipo: 'material' | 'servico', cod: string) => {
    const rota = tipo === 'material' ? 'material' : 'servico'
    const url = `${API_BASE_URL}/api/pesquisa-preco/${rota}/mercado?codigo=${encodeURIComponent(cod)}`
    try {
      const resp = await fetch(url, { headers: { Accept: 'application/json' } })
      if (!resp.ok) throw new Error('status ' + resp.status)
      const data = await resp.json()
      if (data && data.medianaMercado != null) setMercado(data)
      else setMercado(null)
    } catch {
      setMercado(null)
    }
  }, [])

  // ---- executa uma pesquisa (busca preços) a partir do termo/código ----
  const executarPesquisa = useCallback(
    async (cod: string, tipo: 'material' | 'servico', desc: string) => {
      const codLimpo = cod.trim()
      if (!codLimpo) {
        setApiStatus('Selecione um dos itens sugeridos na lista para consultar os preços.')
        return
      }
      const rota = tipo === 'material' ? 'material' : 'servico'
      const proxiedUrl = `${API_BASE_URL}/api/pesquisa-preco/${rota}?codigo=${encodeURIComponent(codLimpo)}`
      setApiStatus('')
      setBuscando(true)
      setErro(false)
      try {
        let resp: Response | null = null
        try {
          resp = await fetch(proxiedUrl, { headers: { Accept: 'application/json' } })
        } catch {
          resp = null
        }
        if (resp && resp.ok) {
          const data = await resp.json()
          const lista = data.resultado || data.result || data.resultados || []
          if (lista.length) {
            const novos = lista.map((r: Record<string, unknown>) => ({
              fonte: 'compras_gov_pesquisa_preco',
              orgao: (r.nomeUnidadeGerenciadora || r.nomeOrgao || r.nomeUasg || r.unidadeGestora || r.siglaOrgao || '') as string,
              uf: (r.estado || r.siglaUf || r.ufResultado || r.uf || '') as string,
              data: (r.dataResultado || r.dataCompra || r.dataHomologacao || '') as string,
              fornecedor: (r.nomeFornecedor || r.nomeRazaoSocial || r.fornecedor || '') as string,
              municipio: (r.nomeMunicipio || r.nomeCidade || r.municipio || '') as string,
              modalidade: (r.descricaoModalidade || r.modalidade || r.nomeModalidade || '') as string,
              unidade: (r.unidadeFornecimento || r.descricaoUnidadeMedida || r.siglaUnidadeMedida || r.unidade || '') as string,
              quantidade: (r.quantidadeFornecida || r.quantidade || '') as string,
              valor: Number(r.valorUnitarioResultado ?? r.valorUnitario ?? r.valorUnitarioHomologado ?? r.precoUnitario),
            })).filter((p: PrecoRecord) => p.valor && !isNaN(p.valor) && p.valor > 0)
            if (novos.length) {
              setPrecos(novos)
              setOutlierSet(null)
              setCalculo(null)
              setStatWarning('')
              setSobreprecoHtml('')
              setSelecionados(new Set())
              setSort(null)
              setPagina(1)
              setFiltros(FILTROS_VAZIO)
              setApiStatus(`${novos.length} preço(s) encontrado(s) para ${desc || codLimpo}.`)
              fetchMercado(tipo, codLimpo)
              ultimoCodigoBusca.current = codLimpo
              ultimoTipoBusca.current = tipo
              window.scrollTo({ top: 0, behavior: 'smooth' })
              return
            }
          }
        }
        setApiStatus(`Não encontramos preços praticados para "${desc || codLimpo}". Tente outro termo ou amplie a busca.`)
      } catch {
        setErro(true)
        setApiStatus('Não foi possível carregar os resultados agora. Tente novamente em instantes.')
      } finally {
        setBuscando(false)
      }
    },
    [fetchMercado]
  )

  const buscarTermoPrincipal = () => {
    // Se já há um código sugerido selecionado, busca direto
    if (codigo.trim() && descricao.trim() && descricao === termo.trim()) {
      executarPesquisa(codigo, tipoItem, descricao)
      return
    }
    // Caso contrário abre sugestões para o usuário escolher
    buscarCatalogo(termo)
    if (suggestItems.length === 1 && suggestItems[0]) {
      selecionaSugestao(0)
      executarPesquisa(String(suggestItems[0].codigo_item), tipoItem, suggestItems[0].descricao_item)
    } else if (suggestItems.length > 1) {
      setApiStatus('Encontramos várias opções parecidas. Escolha uma na lista para consultar os preços — e depois clique em "Pesquisar preços".')
    } else {
      setApiStatus('Digite um produto ou serviço e escolha uma das sugestões para consultar os preços.')
    }
  }

  // ---- filtros / ordenação / paginação derivados ----
  const linhasFiltradas = useMemo(() => {
    const textoN = filtros.texto.trim().toLowerCase()
    const fornN = filtros.fornecedor.trim().toLowerCase()
    const munN = filtros.municipio.trim().toLowerCase()
    const minN = parseFloat(filtros.min)
    const maxN = parseFloat(filtros.max)
    const idxs: number[] = []
    precos.forEach((p, i) => {
      if (filtros.uf && (p.uf || '').toUpperCase() !== filtros.uf.toUpperCase()) return
      if (filtros.fonte && p.fonte !== filtros.fonte) return
      if (filtros.modalidade && (p.modalidade || '') !== filtros.modalidade) return
      if (textoN && !(p.orgao || '').toLowerCase().includes(textoN) && !(FONTE_LABEL[p.fonte] || p.fonte || '').toLowerCase().includes(textoN)) return
      if (fornN && !(p.fornecedor || '').toLowerCase().includes(fornN)) return
      if (munN && !(p.municipio || '').toLowerCase().includes(munN)) return
      if (minN && p.valor < minN) return
      if (maxN && p.valor > maxN) return
      idxs.push(i)
    })
    if (sort) {
      const dir = sort.dir
      idxs.sort((a, b) => {
        const va = ordenavelValor(precos[a], sort.chave)
        const vb = ordenavelValor(precos[b], sort.chave)
        if (va == null && vb == null) return a - b
        if (va == null) return 1
        if (vb == null) return -1
        if (sort.chave === 'valor' || sort.chave === 'quantidade') return (Number(va) - Number(vb)) * dir
        const r = String(va).localeCompare(String(vb), 'pt-BR', { numeric: true, sensitivity: 'base' })
        return r * dir
      })
    }
    return idxs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [precos, filtros, sort])

  const ordenavelValor = (p: PrecoRecord, chave: string): number | string | null => {
    if (chave === 'valor') return p.valor
    if (chave === 'quantidade') return p.quantidade != null ? Number(p.quantidade) : null
    if (chave === 'data') return p.data || null
    if (chave === 'fornecedor') return p.fornecedor || p.orgao || ''
    if (chave === 'orgao') return p.orgao || ''
    if (chave === 'uf') return p.uf || ''
    if (chave === 'municipio') return p.municipio || ''
    if (chave === 'modalidade') return p.modalidade || ''
    return ''
  }

  const pages = Math.max(1, Math.ceil(linhasFiltradas.length / porPagina))
  const paginaAtual = Math.min(pagina, pages)
  const visiveisIndices = linhasFiltradas.slice((paginaAtual - 1) * porPagina, paginaAtual * porPagina)
  const visiveis = visiveisIndices.map((i) => precos[i])

  const ufsOpcoes = useMemo(() => [...new Set(precos.map((p) => (p.uf || '').toUpperCase()).filter(Boolean))].sort(), [precos])
  const fontesOpcoes = useMemo(() => [...new Set(precos.map((p) => p.fonte || '').filter(Boolean))], [precos])
  const modalidadesOpcoes = useMemo(() => [...new Set(precos.map((p) => p.modalidade || '').filter(Boolean))].sort(), [precos])
  const fornecedoresOpcoes = useMemo(() => [...new Set(precos.map((p) => p.fornecedor || '').filter(Boolean))].sort(), [precos])
  const municipiosOpcoes = useMemo(() => [...new Set(precos.map((p) => p.municipio || '').filter(Boolean))].sort(), [precos])

  const alternarSort = (chave: string) => {
    setSort((s) => {
      if (s?.chave === chave) return { chave, dir: s.dir === 1 ? -1 : 1 }
      return { chave, dir: 1 }
    })
    setPagina(1)
  }

  // ---- resumo / confiança / faixa (derivados) ----
  const resumo = useMemo(() => calcularResumo(precos), [precos])
  const confianca = useMemo(() => (resumo ? calcularConfianca(resumo) : null), [resumo])
  const faixa = useMemo(() => (resumo ? calcularFaixa(resumo, precos) : null), [resumo, precos])

  const totalOrcamento = useMemo(() => orcamento.reduce((s, item) => s + item.mediana * item.quantidade, 0), [orcamento])

  // alternar seleção para comparação
  const toggleSelecao = (i: number) => {
    setSelecionados((prev) => {
      const n = new Set(prev)
      if (n.has(i)) n.delete(i)
      else n.add(i)
      return n
    })
  }

  const toggleColuna = (chave: string) => {
    setColunasOcultas((prev) => {
      const n = new Set(prev)
      if (n.has(chave)) n.delete(chave)
      else n.add(chave)
      return n
    })
  }

  // ---- salvar pesquisas ----
  const salvarAtual = (nome: string) => {
    if (!termo.trim() || !codigo.trim()) {
      alert('Pesquise e selecione um item antes de salvar.')
      return
    }
    setSalvas((prev) => [
      { id: Date.now() + '-' + Math.random().toString(36).slice(2, 8), nome, termo: termo.trim(), tipo: tipoItem, criadaEm: new Date().toISOString() },
      ...prev,
    ])
  }

  const executarSalva = (s: PesquisaSalva) => {
    setTipoItem(s.tipo)
    setTermo(s.termo)
    // tenta identificar o item para obter o código
    setCodigo('')
    setDescricao(s.termo)
    setSuggestItems([])
    // dispara busca no catálogo
    const timer = setTimeout(() => {
      buscarCatalogo(s.termo.replace(s.tipo === 'material' ? /^\d{6}$/ : /^\d{4,10}$/, ''))
    }, 100)
    // palpite direto: se o termo parecer um código, usa
    if (/^\d+$/.test(s.termo.trim())) {
      setCodigo(s.termo.trim())
      executarPesquisa(s.termo.trim(), s.tipo, s.termo.trim())
      clearTimeout(timer)
    }
  }

  const removerSalva = (id: string) => setSalvas((prev) => prev.filter((s) => s.id !== id))

  // ---- cálculo do preço de referência (mantido) ----
  const calcular = () => {
    if (precos.length < 2) {
      alert('Adicione pelo menos 2 preços para calcular.')
      return
    }
    const stats = calcStats(precos)
    if (!stats) return
    const pontosValidos = precos.map((p, i) => ({ ...p, _i: i })).filter((p) => !stats.outlierSet.has(p._i))
    const valores = pontosValidos.map((p) => p.valor)
    const n = valores.length
    const media = valores.reduce((a, b) => a + b, 0) / n
    const sorted = [...valores].sort((a, b) => a - b)
    const mediana = quartil(sorted, 0.5)
    const variancia = n > 1 ? valores.reduce((a, b) => a + Math.pow(b - media, 2), 0) / (n - 1) : 0
    const desvio = Math.sqrt(variancia)
    const cv = media ? (desvio / media) * 100 : 0

    setCalculo({ n, media, mediana, desvio, cv })
    setOutlierSet(stats.outlierSet)

    if (precos.length < 3) {
      setStatWarning('A IN SEGES/ME 65/2021 recomenda no mínimo 3 fontes de preço. Adicione mais cotações antes de fechar o orçamento.')
    } else if (cv > 25) {
      setStatWarning('Coeficiente de variação alto (' + cv.toFixed(1) + '%). Preferir a mediana como preço de referência e revisar as fontes discrepantes.')
    } else {
      setStatWarning('Dispersão dentro do esperado. Preço de referência calculado com base em ' + n + ' fonte(s) válida(s).')
    }

    const limite = (parseFloat(limiteSobrepreco) || 25) / 100
    const teto = mediana * (1 + limite)
    const sobre = precos.filter((p, i) => !stats.outlierSet.has(i) && p.valor > teto)
    gerarSobreprecoHtml(stats, limite, teto, sobre)

    setUltimoCalculo({
      adicionadoEm: new Date().toISOString(),
      codigo: codigo.trim(),
      descricao: descricao.trim() || termo.trim(),
      unidade: '',
      quantidade: parseFloat(qtd) || 1,
      media,
      mediana,
      desvio,
      cv,
      n,
      fontesValidas: precos.filter((_, i) => !stats.outlierSet.has(i)).length,
      fontesDistintas: new Set(precos.map((p) => p.orgao || p.fonte)).size,
      limiteSobrepreco: limite,
      tetoSobrepreco: teto,
      temSobrepreco: sobre.length > 0,
      qtdSobrepreco: sobre.length,
      referenciaMercado: mercado ? mercado.medianaMercado : null,
      mercadoItens: mercado ? mercado.totalRegistros : null,
      fontes: precos.map((p, i) => ({ ...p, descartado: stats.outlierSet.has(i) })),
    })
  }

  const gerarSobreprecoHtml = (
    stats: { mediana: number; outlierSet: Set<number> } | null,
    limite: number,
    teto: number,
    sobre: PrecoRecord[]
  ) => {
    const baseMediana = stats ? stats.mediana : null
    const mercadoMediana = mercado ? mercado.medianaMercado : null
    let mercadoTeto: number | null = null
    let acimaMercado: PrecoRecord[] = []
    if (mercadoMediana != null && sobre.length) {
      mercadoTeto = mercadoMediana * (1 + limite)
      acimaMercado = sobre.filter((p) => p.valor > (mercadoTeto as number))
    }
    let html = ''
    if (baseMediana != null && baseMediana > 0) {
      const pct = (limite * 100).toFixed(0)
      if (sobre.length) {
        html = '⚠️ <strong>Possível sobrepreço:</strong> ' + sobre.length + ' fonte(s) acima do teto de ' + fmtBRL(teto) + ' (mediana +' + pct + '%). Revisar antes de usar como referência.'
      } else {
        html = 'Nenhuma fonte acima do teto de ' + fmtBRL(teto) + ' (mediana +' + pct + '%). Sem indício de sobrepreço.'
      }
      if (mercadoTeto != null && acimaMercado.length) {
        html = '⬆️ <strong>Acima do mercado externo:</strong> ' + acimaMercado.length + ' fonte(s). ' + html
      }
    }
    setSobreprecoHtml(html)
  }

  const adicionarAoOrcamento = () => {
    if (!ultimoCalculo) return
    setOrcamento((prev) => [...prev, ultimoCalculo])
    setUltimoCalculo(null)
    setAbaOrcamento(true)
  }

  const removerPreco = (idx: number) => {
    setPrecos((prev) => {
      const next = prev.slice()
      next.splice(idx, 1)
      return next
    })
    setOutlierSet(null)
    setCalculo(null)
    setStatWarning('')
    setSobreprecoHtml('')
    setSelecionados((prev) => {
      const n = new Set<number>()
      prev.forEach((i) => (i < idx ? n.add(i) : i > idx ? n.add(i - 1) : null))
      return n
    })
  }

  const adicionarCotacaoManual = () => {
    const valorEl = document.getElementById('preco-valor') as HTMLInputElement | null
    const valor = parseFloat(valorEl?.value || '') || 0
    if (!valor || valor <= 0) {
      alert('Informe um valor de preço válido.')
      return
    }
    const orgao = (document.getElementById('preco-orgao') as HTMLInputElement)?.value || ''
    const uf = ((document.getElementById('preco-uf') as HTMLInputElement)?.value || '').trim().toUpperCase()
    const data = (document.getElementById('preco-data') as HTMLInputElement)?.value || ''
    const fornecedor = (document.getElementById('preco-fornecedor') as HTMLInputElement)?.value || ''
    setPrecos((prev) => [...prev, { fonte: 'manual', orgao, fornecedor, uf, data, valor }])
    const orgaoEl = document.getElementById('preco-orgao') as HTMLInputElement | null
    if (orgaoEl) orgaoEl.value = ''
    if (valorEl) valorEl.value = ''
  }

  const novaPesquisa = () => {
    setPrecos([])
    setUltimoCalculo(null)
    setMercado(null)
    setOutlierSet(null)
    setCalculo(null)
    setStatWarning('')
    setSobreprecoHtml('')
    setFiltros(FILTROS_VAZIO)
    setSort(null)
    setPagina(1)
    setSelecionados(new Set())
    setCodigo('')
    setDescricao('')
    setTermo('')
    setQtd('1')
    setTipoItem('material')
    setSuggestOpen(false)
    setSuggestItems([])
    setSuggestIndex(-1)
    setApiStatus('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetSessao = () => {
    if (!confirm('Limpar todos os dados desta sessão (preços coletados e orçamento)?')) return
    localStorage.removeItem(STORAGE_KEY)
    novaPesquisa()
    setOrcamento([])
  }

  // ---- exportações ----
  const exportarPainelCsv = async () => {
    if (!ultimoCodigoBusca.current) {
      alert('Busque preços na API antes de exportar.')
      return
    }
    setBaixandoCsv(true)
    try {
      const rota = ultimoTipoBusca.current === 'material' ? 'material' : 'servico'
      const resp = await fetch(`${API_BASE_URL}/api/pesquisa-preco/${rota}/csv?codigo=${encodeURIComponent(ultimoCodigoBusca.current)}`)
      if (!resp.ok) throw new Error('status ' + resp.status)
      const blob = await resp.blob()
      downloadBlob(blob, `painel-preco-${rota}-${ultimoCodigoBusca.current}.csv`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      alert('Não foi possível baixar a planilha no padrão do Painel de Preços: ' + msg)
    } finally {
      setBaixandoCsv(false)
    }
  }

  const exportarAnaliticoCsv = () => {
    if (!precos.length) {
      alert('Não há dados coletados para exportar. Busque preços primeiro.')
      return
    }
    const escapa = (v: unknown) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'
    const colunas = ['Fonte', 'Órgão/UASG', 'Fornecedor', 'Município', 'Modalidade', 'Unidade', 'Quantidade', 'UF', 'Data', 'Valor (R$)', 'Situação na análise']
    const linhas = [colunas.join(';')]
    const jaCalculou = outlierSet != null
    precos.forEach((p, i) => {
      const situacao = jaCalculou ? (outlierSet!.has(i) ? 'Descartado (outlier)' : 'Usado no cálculo') : '—'
      linhas.push([
        escapa(FONTE_LABEL[p.fonte] || p.fonte),
        escapa(p.orgao),
        escapa(p.fornecedor),
        escapa(p.municipio),
        escapa(p.modalidade),
        escapa(p.unidade),
        escapa(p.quantidade),
        escapa(p.uf),
        escapa(p.data),
        escapa(p.valor != null ? p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''),
        escapa(situacao),
      ].join(';'))
    })
    const csv = '\uFEFF' + linhas.join('\r\n')
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `dados-coletados-${ultimoCodigoBusca.current || 'sessao'}.csv`)
  }

  const exportarXlsx = () => {
    if (!orcamento.length) {
      alert('Adicione ao menos um item ao orçamento antes de exportar.')
      return
    }
    try {
      exportarOrcamentoXlsx(orcamento)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      alert('Não foi possível gerar o Excel: ' + msg)
    }
  }

  const downloadBlob = (blob: Blob, nome: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nome
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  // ---- helpers de orçamento ----
  const alterarQtdOrcamento = (i: number, valor: string) => {
    const n = parseFloat(valor)
    setOrcamento((prev) => (n > 0 ? prev.map((it, idx) => (idx === i ? { ...it, quantidade: n } : it)) : prev))
  }
  const removerOrcamento = (i: number) => setOrcamento((prev) => prev.filter((_, idx) => idx !== i))
  const esvaziarOrcamento = () => {
    if (!orcamento.length) return
    if (!confirm('Esvaziar todo o orçamento em montagem?')) return
    setOrcamento([])
  }

  const temResultados = precos.length > 0

  return (
    <div className="space-y-6">
      {/* Barra superior */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
            apiEstado === 'online' && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
            apiEstado === 'checking' && 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
            apiEstado === 'offline' && 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
          )}>
            <span className={cn('w-2 h-2 rounded-full', apiEstado === 'online' ? 'bg-emerald-500' : apiEstado === 'checking' ? 'bg-amber-500 animate-pulse' : 'bg-red-500')} />
            {apiEstado === 'online' ? 'Fonte oficial disponível' : apiEstado === 'checking' ? 'Consultando fonte oficial' : 'Fonte oficial indisponível'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {temResultados && (
            <button className={cn(btnCls, 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50')} onClick={novaPesquisa}>
              <RefreshCcw className="w-4 h-4" /> Nova pesquisa
            </button>
          )}
          <button className={cn(btnCls, 'text-slate-500 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800')} onClick={() => setMostrarInfo(true)}>
            <Info className="w-4 h-4" /> Como funciona
          </button>
        </div>
      </div>

      {/* Modal de como funciona */}
      <Modal aberto={mostrarInfo} onFechar={() => setMostrarInfo(false)} titulo="Como funciona a Pesquisa de Preços Inteligente">
        <ol className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <li className="flex gap-3"><Step n={1} /><span><strong>Pesquise</strong> — digite o produto ou serviço e escolha na lista de sugestões.</span></li>
          <li className="flex gap-3"><Step n={2} /><span><strong>Entenda</strong> — veja os preços encontrados, a faixa de preço e a confiabilidade.</span></li>
          <li className="flex gap-3"><Step n={3} /><span><strong>Analise</strong> — compare registros e calcule o preço de referência (mediana).</span></li>
          <li className="flex gap-3"><Step n={4} /><span><strong>Exporte</strong> — gere um relatório profissional (.xlsx) pronto para impressão.</span></li>
        </ol>
        <p className="mt-4 text-xs text-slate-400">
          Os preços vêm ao vivo da API oficial do Módulo Pesquisa de Preço (Compras.gov.br). Base legal: Lei 14.133/2021, Art. 23 e IN SEGES/ME nº 65/2021.
        </p>
      </Modal>

      {/* Estado: antes da pesquisa */}
      {!temResultados ? (
        <div className="space-y-6">
          <SearchHero
            tipoItem={tipoItem}
            onTipoChange={(t) => { setTipoItem(t); setSuggestOpen(false) }}
            termo={termo}
            onTermo={(t) => { setTermo(t); buscarCatalogo(t) }}
            sugestoes={suggestItems}
            suggestOpen={suggestOpen}
            suggestIndex={suggestIndex}
            onSelectSugestao={selecionaSugestao}
            onEnterSugestao={selecionaSugestao}
            onKeyNav={(d) => setSuggestIndex((i) => Math.min(Math.max(i + d, -1), suggestItems.length - 1))}
            buscando={buscando}
            onBuscar={buscarTermoPrincipal}
            onInfo={() => setMostrarInfo(true)}
          />

          {buscando ? (
            <BuscaSkeleton />
          ) : erro ? (
            <section className="card p-8 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-3">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Não foi possível carregar os resultados</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Verifique sua conexão e tente novamente.</p>
              <button className={cn(btnCls, 'mt-4 bg-primary text-white border-primary hover:bg-primary-hover')} onClick={buscarTermoPrincipal}>
                <RotateCcw className="w-4 h-4" /> Tentar novamente
              </button>
            </section>
          ) : apiStatus ? (
            <section className="card p-8 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                <SearchX className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Nenhum resultado encontrado</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{apiStatus}</p>
              <p className="mt-3 text-xs text-slate-400">Dicas: use termos mais simples, remova filtros ou amplie o período.</p>
              <button className={cn(btnCls, 'mt-4 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50')} onClick={novaPesquisa}>
                <RefreshCcw className="w-4 h-4" /> Ampliar pesquisa
              </button>
            </section>
          ) : null}

          {!buscando && !erro && !apiStatus && (
            <>
              <SavedSearches
                salvas={salvas}
                onExecutar={executarSalva}
                onRemover={removerSalva}
                onSalvarAtual={salvarAtual}
                termoAtual={termo}
                podeSalvar={!!codigo}
              />

              {/* Guia rápido inicial */}
              <section className="card p-6">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Pesquisar → Entender → Analisar → Exportar</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Um caminho simples para descobrir o preço praticado e gerar seu relatório em poucos minutos.</p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  {[
                    { t: '1. Pesquise', d: 'Digite um produto ou serviço e escolha uma sugestão.' },
                    { t: '2. Entenda', d: 'Veja a faixa de preço, a média e a confiabilidade em cartões claros.' },
                    { t: '3. Analise', d: 'Compare registros e calcule o preço de referência (mediana).' },
                    { t: '4. Exporte', d: 'Baixe um relatório Excel profissional, pronto para imprimir.' },
                  ].map((s) => (
                    <div key={s.t} className="rounded-xl border border-slate-100 dark:border-slate-800 p-4">
                      <div className="text-sm font-semibold text-primary">{s.t}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{s.d}</div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      ) : (
        /* Estado: com resultados */
        <div className="space-y-6">
          {/* Pesquisa no topo */}
          <div className="card p-4">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">O que você está procurando?</label>
            <div className="relative flex items-center gap-2">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={termo}
                onChange={(e) => { setTermo(e.target.value); buscarCatalogo(e.target.value) }}
                onKeyDown={(e) => { if (e.key === 'Enter') buscarTermoPrincipal() }}
                onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
                placeholder="Refine sua pesquisa — ex.: Notebook i5 16GB"
                className="flex-1 px-2 py-2.5 text-base bg-transparent outline-none placeholder:text-slate-400"
              />
              <button className={cn(btnCls, 'bg-primary text-white border-primary hover:bg-primary-hover')} onClick={buscarTermoPrincipal} disabled={buscando}>
                {buscando ? 'Pesquisando...' : 'Pesquisar preços'}
              </button>
            </div>
            {suggestOpen && suggestItems.length > 0 && (
              <div className="absolute z-30 mt-2 w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl">
                {suggestItems.slice(0, 6).map((it, i) => (
                  <button key={i} type="button" onMouseDown={(e) => { e.preventDefault(); selecionaSugestao(i) }} className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                    {it.descricao_item}
                  </button>
                ))}
              </div>
            )}
            <span className="mt-2 block text-xs text-slate-400 shrink-0">{precos.length} registro(s) coletados</span>
          </div>

          {/* Filtros */}
          <FiltersPanel
            filtros={filtros}
            onChange={(f) => { setFiltros(f); setPagina(1) }}
            ufs={ufsOpcoes}
            fontes={fontesOpcoes}
            modalidades={modalidadesOpcoes}
            fornecedores={fornecedoresOpcoes}
            municipios={municipiosOpcoes}
            count={linhasFiltradas.length}
          />

          {/* Resumo */}
          <SummaryCards resumo={resumo!} total={linhasFiltradas.length} />
          <ResumoLinha resumo={resumo!} />

          {/* Confiança + Faixa */}
          {confianca && <ConfidenceBadge confianca={confianca} />}
          {faixa && <PriceRange faixa={faixa} />}

          {apiStatus && (
            <div className="rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 px-4 py-3 text-sm text-blue-800 dark:text-blue-200">
              {apiStatus}
            </div>
          )}

          {/* Gráficos */}
          {precos.length > 0 && <ChartsSection precos={precos} />}

          {/* Comparação */}
          {selecionados.size > 1 && (
            <ComparisonPanel
              selecionados={selecionados}
              precos={precos}
              precosIndices={linhasFiltradas}
              onFechar={() => setSelecionados(new Set())}
            />
          )}

          {/* Tabela */}
          <ResultsTable
            records={visiveis}
            precosIndices={visiveisIndices}
            precos={precos}
            outlierSet={outlierSet}
            sort={sort}
            onSortToggable={alternarSort}
            selecionados={selecionados}
            onToggleSelecao={toggleSelecao}
            onCopiar={exportarAnaliticoCsv}
            colunasOcultas={colunasOcultas}
            onToggleColuna={toggleColuna}
          />

          {/* Paginação */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-4">
              <button className={cn(btnCls, 'text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700')} disabled={paginaAtual <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))}>‹ Anterior</button>
              <span className="text-xs text-slate-500">Página {paginaAtual} de {pages}</span>
              <button className={cn(btnCls, 'text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700')} disabled={paginaAtual >= pages} onClick={() => setPagina((p) => Math.min(pages, p + 1))}>Próxima ›</button>
            </div>
          )}

          {/* Análise / Orçamento */}
          <section className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-sm font-bold">C</span>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Calcular preço de referência</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button className={cn(btnCls, 'bg-primary text-white border-primary hover:bg-primary-hover')} onClick={calcular}>
                <Calculator className="w-4 h-4" /> Calcular preço de referência
              </button>
              <label className="inline-flex items-center gap-2 text-xs text-slate-500">
                Limite de sobrepreço sobre a mediana (%)
                <input className="w-16 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-right text-sm" type="number" min={0} value={limiteSobrepreco} onChange={(e) => setLimiteSobrepreco(e.target.value)} />
              </label>
            </div>

            {calculo && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
                <MiniStat k="amostras válidas" v={String(calculo.n)} />
                <MiniStat k="média" v={fmtBRL(calculo.media)} />
                <MiniStat k="mediana (referência)" v={fmtBRL(calculo.mediana)} highlight />
                <MiniStat k="desvio padrão" v={fmtBRL(calculo.desvio)} />
                <MiniStat k="coef. de variação" v={calculo.cv.toFixed(1) + '%'} />
                {mercado && mercado.medianaMercado != null && <MiniStat k="referência de mercado externa" v={fmtBRL(mercado.medianaMercado)} market />}
              </div>
            )}

            {statWarning && (
              <div className="mt-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 px-3 py-2 text-sm text-blue-800 dark:text-blue-200">{statWarning}</div>
            )}

            {sobreprecoHtml && (
              <div className={cn('mt-3 rounded-lg px-3 py-2 text-sm', sobreprecoHtml.includes('Possível sobrepreço') || sobreprecoHtml.includes('Acima do mercado') ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-200' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-200')}>
                <span dangerouslySetInnerHTML={{ __html: sobreprecoHtml }} />
              </div>
            )}

            {ultimoCalculo && (
              <button className={cn(btnCls, 'mt-5 bg-success text-white border-success hover:opacity-90')} onClick={adicionarAoOrcamento}>
                <Plus className="w-4 h-4" /> Adicionar item ao orçamento
              </button>
            )}
          </section>

          {/* Exportar */}
          <ExportBar
            habilitado={precos.length > 0}
            orcamentoCount={orcamento.length}
            aoExcel={exportarXlsx}
            aoCsv={exportarPainelCsv}
            aoPdf={() => {}}
            baixandoCsv={baixandoCsv}
          />

          {/* Cotação manual */}
          <details className="card p-5">
            <summary className="cursor-pointer text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary">
              Adicionar cotação manual (telefone, e-mail, orçamento de fornecedor)
            </summary>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mt-4">
              <input className={inputCls} id="preco-fornecedor" type="text" placeholder="Fornecedor" />
              <input className={inputCls} id="preco-orgao" type="text" placeholder="Órgão / UF" />
              <input className={inputCls} id="preco-uf" type="text" maxLength={2} placeholder="UF" />
              <input className={inputCls} id="preco-data" type="date" />
              <input className={inputCls} id="preco-valor" type="number" step={0.01} min={0} placeholder="Preço (R$)" />
              <button className={cn(btnCls, 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50')} onClick={adicionarCotacaoManual}>
                <Plus className="w-4 h-4" /> Adicionar
              </button>
            </div>
          </details>

          {/* Painel do orçamento */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Orçamento em montagem</h2>
                <span className="text-sm text-slate-500">{orcamento.length}{orcamento.length === 1 ? ' item' : ' itens'} · Total {fmtBRL(totalOrcamento)}</span>
              </div>
              {orcamento.length > 0 && (
                <button className={cn(btnCls, 'text-slate-400 hover:text-red-600 border-transparent')} onClick={esvaziarOrcamento}><Eraser className="w-4 h-4" /> Esvaziar</button>
              )}
            </div>

            {orcamento.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhum item ainda. Calcule o preço de referência e adicione ao orçamento.</p>
            ) : (
              <div className="space-y-3">
                {orcamento.map((item, i) => {
                  const subtotal = item.mediana * item.quantidade
                  return (
                    <div key={i} className="rounded-lg border border-slate-100 dark:border-slate-800 p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white flex-1">{item.descricao || item.codigo || 'Item sem descrição'}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{item.fontesValidas} fontes</span>
                        {item.temSobrepreco && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">sobrepreço</span>}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                        <label className="text-xs text-slate-500">Qtde</label>
                        <input className="w-20 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-transparent text-right text-xs font-mono" type="number" min={0.0001} step={0.0001} value={item.quantidade} onChange={(e) => alterarQtdOrcamento(i, e.target.value)} />
                        <span className="text-xs text-slate-500">× {fmtBRL(item.mediana)}</span>
                        <span className="text-xs text-slate-500">= <strong className="text-slate-900 dark:text-white">{fmtBRL(subtotal)}</strong></span>
                        <button className="text-slate-400 hover:text-red-600 ml-auto" title="Remover item" aria-label="Remover item" onClick={() => removerOrcamento(i)}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
                <div className="flex justify-end text-sm text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-3">
                  Total: <strong className="text-slate-900 dark:text-white ml-1">{fmtBRL(totalOrcamento)}</strong>
                </div>
              </div>
            )}
            <span className="block mt-3 text-[11px] text-slate-400">Salvo automaticamente neste navegador.</span>
          </section>

          <div className="flex flex-wrap gap-2">
            <button className={cn(btnCls, 'text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700')} onClick={() => setAbaOrcamento(false)}>Fechar análise</button>
            <button className={cn(btnCls, 'text-red-600 border-red-200 dark:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/10')} onClick={resetSessao}>Limpar sessão</button>
          </div>
        </div>
      )}

      <footer className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
        Os preços de referência vêm ao vivo da API oficial do Módulo Pesquisa de Preço (Compras.gov.br/Ministério da Gestão). Nenhum valor é digitado por padrão — a cotação manual serve para registrar, com rastreabilidade, uma cotação real obtida por telefone, e-mail ou orçamento de fornecedor. Base legal: Lei 14.133/2021, Art. 23 e IN SEGES/ME nº 65/2021.
      </footer>

      {/* Detalhes do registro */}
      <RecordDrawer registro={registroDetalhe} onFechar={() => setRegistroDetalhe(null)} />
    </div>
  )
}

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all'

function MiniStat({ k, v, highlight, market }: { k: string; v: string; highlight?: boolean; market?: boolean }) {
  return (
    <div className={cn('rounded-xl border p-3', highlight ? 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-500/10' : market ? 'border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-500/10' : 'border-slate-100 dark:border-slate-800')}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{k}</div>
      <div className="text-lg font-bold text-slate-900 dark:text-white">{v}</div>
    </div>
  )
}

function Step({ n }: { n: number }) {
  return <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-soft text-primary text-xs font-bold shrink-0">{n}</span>
}

function BuscaSkeleton() {
  return (
    <section className="card p-6">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-3 h-3 rounded-full bg-primary/40 animate-pulse" />
        <div className="h-4 w-64 max-w-full rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Analisando os preços disponíveis nas contratações públicas...</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-100 dark:border-slate-800 p-4">
            <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700 animate-pulse mb-3" />
            <div className="h-6 w-28 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="mt-5 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
        ))}
      </div>
    </section>
  )
}