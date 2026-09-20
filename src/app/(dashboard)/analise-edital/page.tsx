'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  FileText,
  Upload,
  ScanText,
  Calendar,
  Banknote,
  Clipboard,
  ClipboardList,
  Link2,
  Sparkles,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  History,
  Clock,
  Building2,
  Globe,
  Download,
  RotateCcw,
  InfoIcon,
  X,
} from 'lucide-react'
import PageHeader from '@/components/ui/page-header'
import DemoNotice from '@/components/ui/demo-notice'
import StatCard from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'
import Button from '@/components/ui/button'
import { cn, formatCurrency, formatDate, formatDateTime } from '@/lib/utils'

type Modo = 'texto' | 'pdf' | 'pncp'

interface Meta {
  objeto?: string | null
  orgao?: string | null
  unidade?: string | null
  modalidade?: string | null
  cnpj?: string | null
  numero?: string | null
  uf?: string | null
  municipio?: string | null
  valor?: number | null
  data_publicacao?: string | null
  data_encerramento?: string | null
  link_edital?: string | null
}

interface AnaliseRecord {
  id: string
  pncp_id?: string | null
  objeto?: string | null
  orgao?: string | null
  modalidade?: string | null
  uf?: string | null
  valor?: number | null
  data_encerramento?: string | null
  origem?: 'texto' | 'pdf' | 'pncp'
  nome_arquivo?: string | null
  status?: 'concluida' | 'erro'
  modelo?: string | null
  tempo_ms?: number | null
  markdown?: string | null
  erro?: string | null
  link_edital?: string | null
  classificacao_correta?: boolean | null
  avaliada_em?: string | null
  created_at?: string
}

interface Metricas {
  editais_processados: number
  concluidas: number
  com_erro: number
  total_tempo_ms: number
  avaliadas: number
  corretas: number
  precisao: number | null
}

interface Resultado {
  markdown: string
  modelo?: string
  origem?: 'texto' | 'pdf' | 'pncp'
  nomeArquivo?: string | null
  tempo_ms: number
  meta?: Meta | null
  analiseId?: string | null
  reutilizado?: boolean
  avaliacao?: boolean | null
}

// ---------------------------------------------------------------------------
// Mini renderizador de markdown (títulos ##, bullets, negrito, parágrafos)
// ---------------------------------------------------------------------------
function renderInline(texto: string): React.ReactNode[] {
  const partes = texto.split(/(\*\*[^*]+\*\*)/g)
  return partes.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**') && p.length > 4) {
      return (
        <strong key={i} className="font-semibold text-slate-900 dark:text-white">
          {p.slice(2, -2)}
        </strong>
      )
    }
    if (p.includes('http')) {
      return (
        <a
          key={i}
          href={p}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline decoration-primary/40"
        >
          {p}
        </a>
      )
    }
    return <span key={i}>{p}</span>
  })
}

function MarkdownCorpo({ markdown }: { markdown: string }) {
  const linhas = markdown.split('\n')
  const blocos: React.ReactNode[] = []
  let i = 0
  let buffer: string[] = []
  let listas: string[] = []

  const flushParagrafo = (key: React.Key) => {
    if (buffer.length) {
      blocos.push(
        <p key={key} className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {renderInline(buffer.join(' '))}
        </p>
      )
      buffer = []
    }
  }
  const flushLista = (key: React.Key) => {
    if (listas.length) {
      blocos.push(
        <ul key={key} className="space-y-1.5">
          {listas.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      )
      listas = []
    }
  }

  while (i < linhas.length) {
    const linha = linhas[i]
    const t = linha.trim()

    if (t.startsWith('## ')) {
      flushParagrafo(`p${i}`)
      flushLista(`l${i}`)
      blocos.push(
        <h3 key={`h${i}`} className="mt-4 first:mt-0 text-sm font-bold text-slate-900 dark:text-white">
          {t.slice(3)}
        </h3>
      )
    } else if (t.startsWith('- ') || t.startsWith('* ')) {
      listas.push(t.replace(/^[-*]\s+/, ''))
    } else if (t === '') {
      flushParagrafo(`p${i}`)
      flushLista(`l${i}`)
    } else {
      buffer.push(linha)
    }
    i++
  }
  flushParagrafo(9001)
  flushLista(9002)

  return <div className="space-y-1.5">{blocos}</div>
}

// ---------------------------------------------------------------------------
// Componentes pequenos
// ---------------------------------------------------------------------------

function Info({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
        {icon} {label}
      </div>
      <div className="text-sm font-bold text-slate-900 dark:text-white">{value}</div>
    </div>
  )
}

const ORIGEM_LABEL: Record<string, string> = {
  texto: 'Texto colado',
  pdf: 'PDF',
  pncp: 'Link PNCP',
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

const METRICAS_VAZIAS: Metricas = {
  editais_processados: 0,
  concluidas: 0,
  com_erro: 0,
  total_tempo_ms: 0,
  avaliadas: 0,
  corretas: 0,
  precisao: null,
}

export default function AnaliseEditalPage() {
  const [modo, setModo] = useState<Modo>('texto')
  const [texto, setTexto] = useState('')
  const [link, setLink] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [buscandoHistorico, setBuscandoHistorico] = useState(true)
  const [historico, setHistorico] = useState<AnaliseRecord[]>([])
  const [metricas, setMetricas] = useState<Metricas>(METRICAS_VAZIAS)

  const [analisando, setAnalisando] = useState(false)
  const [erro, setErro] = useState('')
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [iaConfigurada, setIaConfigurada] = useState<boolean | null>(null)

  const carregarHistorico = useCallback(async () => {
    try {
      const res = await fetch('/api/analise-edital')
      const json = await res.json().catch(() => null)
      if (!json?.ok) return
      setHistorico(json.historico || [])
      setMetricas(json.metricas || METRICAS_VAZIAS)
    } catch {
      // histórico indisponível — a página continua funcionando sem ele
    } finally {
      setBuscandoHistorico(false)
    }
  }, [])

  useEffect(() => {
    let cancelado = false
    fetch('/api/analise-edital')
      .then((r) => r.json().catch(() => null))
      .then((json) => {
        if (cancelado || !json?.ok) return
        setHistorico(json.historico || [])
        setMetricas(json.metricas || METRICAS_VAZIAS)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelado) setBuscandoHistorico(false)
      })
    fetch('/api/ia/analisar')
      .then((r) => r.json().catch(() => null))
      .then((d) => setIaConfigurada(Boolean(d?.configurada)))
      .catch(() => setIaConfigurada(false))
    return () => {
      cancelado = true
    }
  }, [])

  const removerArquivo = () => {
    setArquivo(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const analisar = async () => {
    setErro('')
    setResultado(null)

    if (modo === 'texto' && !texto.trim()) {
      setErro('Cole o texto do edital antes de analisar.')
      return
    }
    if (modo === 'pdf' && !arquivo) {
      setErro('Selecione um arquivo PDF antes de analisar.')
      return
    }
    if (modo === 'pncp' && !link.trim()) {
      setErro('Cole o link ou o número do PNCP antes de analisar.')
      return
    }

    setAnalisando(true)
    try {
      let res: Response
      if (modo === 'pdf') {
        const fd = new FormData()
        fd.append('arquivo', arquivo as File)
        res = await fetch('/api/analise-edital', { method: 'POST', body: fd })
      } else if (modo === 'pncp') {
        res = await fetch('/api/analise-edital', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ link: link.trim() }),
        })
      } else {
        res = await fetch('/api/analise-edital', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texto: texto.trim() }),
        })
      }

      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        setErro(json?.error || json?.erro || 'Não foi possível analisar o edital. Tente novamente.')
        if (json?.historico || json?.metricas) {
          setHistorico(json.historico || historico)
          setMetricas(json.metricas || metricas)
        }
        return
      }

      setResultado({
        markdown: json.markdown,
        modelo: json.modelo,
        origem: json.origem,
        nomeArquivo: json.nomeArquivo,
        tempo_ms: json.tempo_ms,
        meta: json.meta,
        analiseId: json.analiseId,
        reutilizado: Boolean(json.reutilizado),
      })
      if (json.historico || json.metricas) {
        setHistorico(json.historico || historico)
        setMetricas(json.metricas || metricas)
      } else {
        await carregarHistorico()
      }
    } catch {
      setErro('Não foi possível conectar ao servidor. Tente novamente.')
    } finally {
      setAnalisando(false)
    }
  }

  const removerAnalise = async (id: string) => {
    try {
      const res = await fetch(`/api/analise-edital?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      const json = await res.json().catch(() => null)
      if (json?.ok) {
        setHistorico(json.historico || historico.filter((h) => h.id !== id))
        setMetricas(json.metricas || metricas)
      }
    } catch {
      // ignore
    }
  }

  // Avaliação da classificação -> alimenta a "Taxa de precisão" real.
  const avaliar = async (id: string, correta: boolean) => {
    try {
      const res = await fetch('/api/analise-edital/avaliacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, correta }),
      })
      const json = await res.json().catch(() => null)
      if (!json?.ok) return
      setHistorico(json.historico || historico)
      setMetricas(json.metricas || metricas)
      setResultado((prev) => (prev && prev.analiseId === id ? { ...prev, avaliacao: correta } : prev))
    } catch {
      // ignore
    }
  }

  const abrirAnalise = (a: AnaliseRecord) => {
    setResultado({
      markdown: a.markdown || '',
      modelo: a.modelo || undefined,
      origem: a.origem,
      nomeArquivo: a.nome_arquivo,
      tempo_ms: a.tempo_ms || 0,
      meta: {
        objeto: a.objeto,
        orgao: a.orgao,
        modalidade: a.modalidade,
        uf: a.uf,
        valor: a.valor,
        data_publicacao: undefined,
        data_encerramento: a.data_encerramento,
        link_edital: a.link_edital,
      },
      analiseId: a.id,
      avaliacao:
        typeof a.classificacao_correta === 'boolean' ? a.classificacao_correta : undefined,
    })
  }

  const mostrarAvisoIa = iaConfigurada === false

  // Tempo médio real = soma dos tempos / quantidade de análises concluídas.
  const mediaMs =
    metricas.concluidas > 0
      ? Math.round(metricas.total_tempo_ms / metricas.concluidas)
      : 0
  const tempoMedioLabel =
    metricas.concluidas > 0 ? `${(mediaMs / 1000).toFixed(1)}s` : 'Aguardando processamento'

  // Precisão real = corretas / avaliadas × 100 (só com dados suficientes).
  const precisaoLabel =
    metricas.precisao == null
      ? 'Aguardando dados suficientes'
      : `${metricas.precisao.toFixed(1).replace('.', ',')}%`

  return (
    <div className="space-y-6">
      <PageHeader
        title="Análise de Edital"
        description="Envie o edital (PDF ou texto) ou cole o link do PNCP para extrair uma análise executiva com IA."
        badge={
          iaConfigurada === true
            ? <Badge variant="premium" icon={<Sparkles className="w-3 h-3" />}>IA CONECTADA</Badge>
            : undefined
        }
      />

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Gostou da oportunidade?</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Agora organize a instrução do seu processo de contratação passo a passo.
          </p>
        </div>
        <Link
          href="/montagem-processo"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
        >
          <ClipboardList className="w-4 h-4" /> Montar Processo
        </Link>
      </div>

      <DemoNotice>
        Análise com IA (Cloudflare Workers AI — llama-3.1-8b-instruct-fast). O resultado é produzido pelo motor real
        de análise e segue a Lei nº 14.133/2021 e o PNCP. Dados ausentes são marcados como “não informado no
        documento” — a IA nunca inventa valores.
      </DemoNotice>

      {mostrarAvisoIa && (
        <div className="flex items-start gap-2.5 rounded-xl border border-danger/20 bg-danger-soft dark:bg-red-500/10 px-3.5 py-2.5">
          <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed text-danger">
            A IA ainda não está ativa neste ambiente: a binding <strong>ai</strong> do Workers AI não foi detectada.
            Adicione a binding no <code className="font-mono">wrangler.jsonc</code> e faça deploy para habilitar a análise.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Editais processados"
          value={buscandoHistorico ? '…' : metricas.editais_processados.toLocaleString('pt-BR')}
          icon={<FileText className="w-5 h-5" />}
          accent="primary"
          hint={
            metricas.editais_processados > 0
              ? 'análises concluídas com sucesso (sem duplicidade)'
              : 'concluído somente após processamento bem-sucedido'
          }
        />
        <StatCard
          label="Taxa de precisão"
          value={buscandoHistorico ? '…' : precisaoLabel}
          icon={<ScanText className="w-5 h-5" />}
          accent={metricas.precisao == null ? 'accent' : metricas.precisao >= 70 ? 'success' : 'warning'}
          hint={
            metricas.avaliadas > 0
              ? `${metricas.corretas.toLocaleString('pt-BR')} de ${metricas.avaliadas.toLocaleString('pt-BR')} avaliações corretas`
              : 'avalie as análises para medir a precisão'
          }
        />
        <StatCard
          label="Tempo médio"
          value={buscandoHistorico ? '…' : tempoMedioLabel}
          icon={<Clock className="w-5 h-5" />}
          accent="accent"
          hint={
            metricas.concluidas > 0
              ? `baseado em ${metricas.concluidas.toLocaleString('pt-BR')} análise(s) concluída(s)`
              : 'medido entre o início e a conclusão de cada análise'
          }
        />
      </div>

      {/* Entrada */}
      <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Upload className="w-4 h-4 text-primary" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Carregar documento</h3>
        </div>

        <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-800/60 mb-5 flex-wrap">
          <TabButton active={modo === 'texto'} onClick={() => setModo('texto')} icon={<Clipboard className="w-4 h-4" />} title="Cole o texto do edital: a IA extrai objeto, exigências de habilitação, prazos, riscos e documentos necessários.">Colar texto</TabButton>
          <TabButton active={modo === 'pdf'} onClick={() => setModo('pdf')} icon={<FileText className="w-4 h-4" />} title="Envie o PDF do edital (com camada de texto, até 8 MB / 60 páginas). PDFs escaneados usam OCR.">Enviar PDF</TabButton>
          <TabButton active={modo === 'pncp'} onClick={() => setModo('pncp')} icon={<Link2 className="w-4 h-4" />} title="Informe o link/número do PNCP; a IA analisa os dados oficiais disponíveis no portal.">Link do PNCP</TabButton>
        </div>

        {modo === 'texto' && (
          <div>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={9}
              placeholder="Cole aqui o texto do edital de licitação (objeto, condições, prazos, habilitação etc.)..."
              title="Texto do edital: quanto mais completo, melhor a análise (objeto, habilitação, prazos, riscos, anexos)."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            />
            <p className="mt-1.5 text-[11px] text-slate-400">
              {texto.length.toLocaleString('pt-BR')} caracteres · limite de 40.000.
            </p>
          </div>
        )}

        {modo === 'pdf' && (
          <div>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const f = e.dataTransfer.files?.[0]
                if (f) setArquivo(f)
              }}
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 px-4 py-8 text-center transition-colors hover:border-primary hover:bg-primary-soft/40"
            >
              <Upload className="w-7 h-7 text-primary/70" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {arquivo ? arquivo.name : 'Arraste o PDF ou clique para selecionar'}
              </p>
              <p className="text-xs text-slate-400">
                {arquivo ? `${(arquivo.size / 1024 / 1024).toFixed(1)} MB` : 'PDF com camada de texto · até 8 MB · até 60 páginas'}
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => setArquivo(e.target.files?.[0] || null)}
            />
            {arquivo && (
              <button
                onClick={removerArquivo}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-danger hover:underline"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remover arquivo
              </button>
            )}
          </div>
        )}

        {modo === 'pncp' && (
          <div>
            <div className="flex gap-2">
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://pncp.gov.br/app/compras/... ou CNPJ-1-999999/2026"
                title="Cole o link do PNCP ou o número de controle (CNPJ-1-SEQ/ANO)."
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              A IA analisa os dados oficiais disponíveis no PNCP. O PDF integral do edital exige login gov.br no portal
              e não é baixável automaticamente.
            </p>
          </div>
        )}

        {erro && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-danger/20 bg-danger-soft dark:bg-red-500/10 px-3.5 py-2.5">
            <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            <p className="text-sm text-danger">{erro}</p>
          </div>
        )}

        <Button
          onClick={analisar}
          disabled={
            analisando ||
            (modo === 'texto' ? !texto.trim() : modo === 'pdf' ? !arquivo : !link.trim())
          }
          loading={analisando}
          className="mt-4 w-full"
          icon={<Sparkles className="w-4 h-4" />}
        >
          {analisando
            ? modo === 'pdf'
              ? 'Lendo o PDF e analisando...'
              : 'Analisando com IA...'
            : 'Analisar edital'}
        </Button>
      </div>

      {/* Resultado */}
      {resultado && (
        <div className="space-y-6">
          <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6">
            <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-secondary to-accent flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Análise executiva</h3>
                  <p className="text-xs text-slate-400">
                    {resultado.meta?.objeto || resultado.nomeArquivo || 'Edital analisado'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="success" icon={<CheckCircle2 className="w-3 h-3" />}>Concluída</Badge>
                {resultado.reutilizado && (
                  <Badge variant="info" icon={<RotateCcw className="w-3 h-3" />}>Já analisado</Badge>
                )}
                {resultado.origem && (
                  <Badge variant="info">{ORIGEM_LABEL[resultado.origem] || resultado.origem}</Badge>
                )}
              </div>
            </div>

            {resultado.meta?.orgao && (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 mb-5">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{resultado.meta.orgao}</p>
                {resultado.meta.unidade && (
                  <p className="text-xs text-slate-400 mt-0.5">{resultado.meta.unidade}</p>
                )}
              </div>
            )}

            <div
              className={cn(
                'grid gap-4 mb-6',
                resultado.meta
                  ? 'grid-cols-2 md:grid-cols-4'
                  : 'grid-cols-2 md:grid-cols-2'
              )}
            >
              {resultado.meta?.modalidade && (
                <Info label="Modalidade" value={resultado.meta.modalidade} icon={<FileText className="w-4 h-4" />} />
              )}
              {resultado.meta?.uf && (
                <Info label="UF" value={resultado.meta.uf} icon={<Globe className="w-4 h-4" />} />
              )}
              {resultado.meta?.valor != null && (
                <Info label="Valor estimado" value={formatCurrency(Number(resultado.meta.valor))} icon={<Banknote className="w-4 h-4" />} />
              )}
              {resultado.meta?.data_encerramento ? (
                <Info label="Encerramento" value={formatDate(resultado.meta.data_encerramento)} icon={<Calendar className="w-4 h-4" />} />
              ) : (
                <Info label="Tempo de análise" value={`${(resultado.tempo_ms / 1000).toFixed(1)}s`} icon={<Clock className="w-4 h-4" />} />
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/40 px-4 py-4">
              <MarkdownCorpo markdown={resultado.markdown} />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {resultado.meta?.link_edital && (
                <a
                  href={resultado.meta.link_edital}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
                >
                  <Globe className="w-4 h-4" /> Ver no PNCP
                </a>
              )}
              <a
                href={`data:text/markdown;charset=utf-8,${encodeURIComponent(resultado.markdown)}`}
                download={`analise-edital-${resultado.analiseId || 'resultado'}.md`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Download className="w-4 h-4" /> Exportar (.md)
              </a>
              {resultado.modelo && (
                <p className="text-[11px] text-slate-400">{resultado.modelo}</p>
              )}
            </div>

            {resultado.reutilizado && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-info/20 bg-info-soft dark:bg-sky-500/10 px-3.5 py-2.5">
                <InfoIcon className="w-4 h-4 text-info shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed text-info">
                  Este edital já havia sido analisado. Mostramos o resultado salvo sem reprocessar nem
                  contar novamente nos indicadores.
                </p>
              </div>
            )}

            {resultado.analiseId && (
              <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 p-3.5">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">
                  A classificação da IA está correta?
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => avaliar(resultado.analiseId!, true)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors border',
                      resultado.avaliacao === true
                        ? 'bg-success text-white border-success'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-success/10'
                    )}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Correta
                  </button>
                  <button
                    onClick={() => avaliar(resultado.analiseId!, false)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors border',
                      resultado.avaliacao === false
                        ? 'bg-danger text-white border-danger'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-danger/10'
                    )}
                  >
                    <X className="w-3.5 h-3.5" /> Incorreta
                  </button>
                  {typeof resultado.avaliacao === 'boolean' && (
                    <span className="text-[11px] text-slate-400">
                      Avaliação registrada — influencia a Taxa de precisão.
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Histórico */}
      <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-primary" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Histórico de análises</h3>
        </div>

        {buscandoHistorico ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando histórico...
          </div>
        ) : historico.length === 0 ? (
          <p className="text-sm text-slate-400">
            Nenhuma análise realizada ainda. Faça sua primeira análise acima — ela ficará salva aqui.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {historico.map((a) => (
              <li
                key={a.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 px-4 py-3"
              >
                <button
                  onClick={() => abrirAnalise(a)}
                  className="min-w-0 flex-1 text-left group"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {a.objeto || a.nome_arquivo || ORIGEM_LABEL[a.origem || 'texto']}
                    </span>
                    <Badge variant={a.status === 'concluida' ? 'success' : 'danger'}>
                      {a.status === 'concluida' ? 'Concluída' : 'Erro'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                    <span>{formatDateTime(a.created_at || '')}</span>
                    {a.orgao && (
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> {a.orgao}
                      </span>
                    )}
                    {a.modelo && <span>{a.modelo}</span>}
                  </p>
                </button>
                {a.status === 'concluida' ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => avaliar(a.id, true)}
                      className={cn(
                        'p-1.5 rounded-lg transition-colors',
                        a.classificacao_correta === true
                          ? 'text-success bg-success/10'
                          : 'text-slate-400 hover:text-success hover:bg-success/10'
                      )}
                      title="Marcar classificação correta"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => avaliar(a.id, false)}
                      className={cn(
                        'p-1.5 rounded-lg transition-colors',
                        a.classificacao_correta === false
                          ? 'text-danger bg-danger/10'
                          : 'text-slate-400 hover:text-danger hover:bg-danger/10'
                      )}
                      title="Marcar classificação incorreta"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : null}
                <button
                  onClick={() => removerAnalise(a.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-danger hover:bg-danger-soft/40 transition-colors shrink-0"
                  title="Excluir análise"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
  icon,
  title,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  icon: React.ReactNode
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors',
        active
          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
      )}
    >
      {icon} {children}
    </button>
  )
}
