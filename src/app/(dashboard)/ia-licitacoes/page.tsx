'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Sparkles,
  FileText,
  Clipboard,
  Upload,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  MessageSquare,
  Send,
  Eraser,
  FileCheck2,
  Info,
} from 'lucide-react'
import PageHeader from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'
import Button from '@/components/ui/button'
import DemoNotice from '@/components/ui/demo-notice'

type Modo = 'texto' | 'pdf'

interface Edital {
  conteudo: string
  origem: 'texto' | 'pdf'
  nomeArquivo: string | null
  chars: number
  salvo?: boolean
  ocr?: boolean
}

interface Msg {
  id: string
  role: 'user' | 'ai'
  content: string
}

// ---------------------------------------------------------------------------
// Mini renderizador de markdown (títulos ##, bullets -, negrito **, parágrafos)
// suficiente para a saída estruturada do modelo. Não adiciona dependência.
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

function MarkdownLinhas({ linhas }: { linhas: string[] }) {
  const blocos: React.ReactNode[] = []
  let i = 0
  let buffer: string[] = []

  const flush = (key: number) => {
    if (buffer.length === 0) return
    blocos.push(
      <p key={key} className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        {renderInline(buffer.join(' '))}
      </p>
    )
    buffer = []
  }

  while (i < linhas.length) {
    const linha = linhas[i]

    if (linha.startsWith('## ')) {
      flush(i)
      blocos.push(
        <h3 key={i} className="mt-4 first:mt-0 text-sm font-bold text-slate-900 dark:text-white">
          {linha.slice(3).trim()}
        </h3>
      )
    } else if (linha.trim().startsWith('- ') || linha.trim().startsWith('* ')) {
      flush(i)
      const item = linha.trim().replace(/^[-*]\s+/, '')
      blocos.push(
        <li key={i} className="ml-2 flex gap-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
          <span>{renderInline(item)}</span>
        </li>
      )
    } else if (linha.trim() === '') {
      flush(i)
    } else {
      buffer.push(linha)
    }
    i++
  }
  flush(i)

  return <div className="space-y-1.5">{blocos}</div>
}

function BubbleAI({ content }: { content: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-secondary to-accent flex items-center justify-center shrink-0">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <div className="max-w-[85%] md:max-w-[75%] rounded-2xl rounded-tl-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
        <MarkdownLinhas linhas={content.split('\n')} />
      </div>
    </div>
  )
}

function BubbleUser({ content }: { content: string }) {
  return (
    <div className="flex items-start justify-end">
      <div className="max-w-[85%] md:max-w-[75%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-sm leading-relaxed text-white">
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  )
}

export default function IALicitacoesPage() {
  // Cache local (mesmo browser): fonte imediata e sem latência. O KV da
  // Cloudflare pode levar até ~60s para visibilizar um write recente em outra
  // colo, então o edital é restaurado primeiro do navegador e depois
  // reconciliado com o servidor (se houver uma versão maior em outro device).
  const LOCAL_KEY = 'pncp:ia:edital'
  const readLocal = (): Edital | null => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY)
      if (!raw) return null
      const d = JSON.parse(raw) as Edital
      if (!d?.conteudo) return null
      return {
        conteudo: d.conteudo,
        origem: d.origem === 'pdf' ? 'pdf' : 'texto',
        nomeArquivo: typeof d.nomeArquivo === 'string' ? d.nomeArquivo : null,
        chars: typeof d.chars === 'number' ? d.chars : d.conteudo.length,
        salvo: Boolean(d.salvo),
        ocr: Boolean(d.ocr),
      }
    } catch {
      return null
    }
  }

  const [modo, setModo] = useState<Modo>('texto')
  const [texto, setTexto] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [edital, setEdital] = useState<Edital | null>(() => readLocal())
  const [restaurando, setRestaurando] = useState(() => !readLocal())
  const [importando, setImportando] = useState(false)
  const [perguntando, setPerguntando] = useState(false)
  const [input, setInput] = useState('')
  const [erro, setErro] = useState('')
  const [iaConfigurada, setIaConfigurada] = useState<boolean | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const aplicarEdital = (d: Edital) => {
    setEdital(d)
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(d))
    } catch {}
  }
  const removerLocal = () => {
    try {
      localStorage.removeItem(LOCAL_KEY)
    } catch {}
  }

  const [mensagens, setMensagens] = useState<Msg[]>([])

  // Ref sempre atualizada com o edital mais recente, para que `enviar` (que
  // roda num handler assíncrono) leia o valor corrente do estado — evitando
  // "stale closure" que fazia o chat ser enviado sem o edital mesmo com o
  // painel mostrando "Edital carregado".
  const editalRef = useRef<Edital | null>(edital)
  useEffect(() => {
    editalRef.current = edital
  }, [edital])

  // Chat scroll ----------
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch('/api/ia/analisar')
      .then((r) => r.json().catch(() => null))
      .then((d) => setIaConfigurada(Boolean(d?.configurada)))
      .catch(() => setIaConfigurada(false))
  }, [])

  // Reconciliação com o servidor (KV): o estado já inicia do localStorage
  // (fonte imediata). Aqui consultamos o KV apenas para pegar uma versão mais
  // nova em outro dispositivo — se falhar/pendurar, o localStorage já basta e
  // o usuário nunca é barrado por "Nenhum edital carregado".
  const restaurouRef = useRef(false)
  useEffect(() => {
    if (restaurouRef.current) return
    restaurouRef.current = true

    let cancelado = false

    fetch('/api/ia/edital')
      .then((r) => r.json().catch(() => null))
      .then((d) => {
        if (cancelado) return
        // Sabemos o estado real do servidor: encerra o estado de "restaurando".
        setRestaurando(false)
        if (!d?.ok || !d?.edital?.conteudo) return
        const novo: Edital = {
          conteudo: d.edital.conteudo,
          origem: d.edital.origem === 'pdf' ? 'pdf' : 'texto',
          nomeArquivo: d.edital.nomeArquivo || null,
          chars: d.edital.chars || d.edital.conteudo.length,
          salvo: true,
          ocr: Boolean(d.edital.ocr),
        }
        // Só sobrescreve o local se o servidor tiver um edital diferente
        // (ex.: conteúdo maior, importado em outro aparelho).
        const localRaw = readLocal()
        if (!localRaw || novo.conteudo.length > localRaw.conteudo.length) {
          aplicarEdital(novo)
        }
      })
      .catch(() => {
        // Falha de rede/KV: sem edital local não há o que restaurar — não deixar
        // o estado "restaurando" preso segurando o botão de enviar.
        if (!cancelado && !readLocal()) setRestaurando(false)
      })

    return () => {
      cancelado = true
    }
  }, [])

  // Auto-scroll: a conversa sempre rola para baixo automaticamente a cada nova
  // mensagem/resposta (exigência do cliente), sem interromper a experiência.
  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [mensagens, perguntando, scrollToBottom])

  useEffect(() => {
    scrollToBottom(false)
  }, [scrollToBottom])

  const importar = async () => {
    setErro('')

    if (modo === 'texto' && !texto.trim()) {
      setErro('Cole o texto do edital antes de importar.')
      return
    }
    if (modo === 'pdf' && !arquivo) {
      setErro('Selecione um arquivo PDF antes de importar.')
      return
    }

    setImportando(true)
    try {
      let res: Response
      if (modo === 'texto') {
        res = await fetch('/api/ia/importar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texto: texto.trim() }),
        })
      } else {
        const fd = new FormData()
        fd.append('arquivo', arquivo as File)
        res = await fetch('/api/ia/importar', { method: 'POST', body: fd })
      }
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        setErro(json?.error || json?.erro || 'Falha ao importar o edital. Tente novamente.')
        return
      }
      aplicarEdital({
        conteudo: json.conteudo,
        origem: json.origem,
        nomeArquivo: json.nomeArquivo || null,
        chars: json.chars || json.conteudo.length,
        salvo: Boolean(json.salvo),
        ocr: Boolean(json.ocr),
      })
      setTexto('')
      setArquivo(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch {
      setErro('Não foi possível conectar ao servidor. Tente novamente.')
    } finally {
      setImportando(false)
    }
  }

  const removerArquivo = () => {
    setArquivo(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const enviar = async () => {
    const pergunta = input.trim()
    if (!pergunta || perguntando) return
    setErro('')
    setInput('')

    // Se o estado local não tem o edital (ex.: depois de recarregar a página),
    // tenta o cache do navegador e, se nada, deixa o servidor buscá-lo no KV
    // automaticamente (a rota /api/ia/chat também faz fallback por usuário).
    const editalAtual = editalRef.current?.conteudo || readLocal()?.conteudo || ''
    const precisaAviso = !editalAtual

    let novo: Msg[] = [...mensagens, { id: `u-${Date.now()}`, role: 'user', content: pergunta }]
    setMensagens(novo)
    setPerguntando(true)
    inputRef.current?.focus()

    try {
      const res = await fetch('/api/ia/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          edital: editalAtual,
          mensagens: novo.map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        const msgErro = json?.error || json?.erro || 'Falha ao obter resposta. Tente novamente.'
        if (json?.semEdital) {
          // Sem edital em lugar nenhum: mensagem clara, sem parecer erro da IA.
          setMensagens((m) => [
            ...m,
            {
              id: `a-${Date.now()}`,
              role: 'ai',
              content: `**Nenhum edital carregado.** Importe um edital (texto ou PDF) no painel à esquerda e então me faça a pergunta novamente.`,
            },
          ])
        } else {
          setMensagens((m) => [
            ...m,
            { id: `a-${Date.now()}`, role: 'ai', content: `**Não consegui responder agora.** ${msgErro}` },
          ])
        }
      } else {
        setMensagens((m) => [...m, { id: `a-${Date.now()}`, role: 'ai', content: json.resposta }])
        // O servidor respondeu com base no edital que ele tinha (local ou KV).
        // Se o estado local estava vazio, sincroniza com o servidor para o
        // usuário ver o edital carregado na tela sem precisar recarregar.
        if (precisaAviso) {
          void fetch('/api/ia/edital')
            .then((r) => r.json().catch(() => null))
            .then((d) => {
              if (!d?.ok || !d?.edital?.conteudo) return
              aplicarEdital({
                conteudo: d.edital.conteudo,
                origem: d.edital.origem === 'pdf' ? 'pdf' : 'texto',
                nomeArquivo: d.edital.nomeArquivo || null,
                chars: d.edital.chars || d.edital.conteudo.length,
                salvo: true,
                ocr: Boolean(d.edital.ocr),
              })
            })
            .catch(() => {})
        }
      }
    } catch {
      setMensagens((m) => [
        ...m,
        { id: `a-${Date.now()}`, role: 'ai', content: '**Não consegui conectar ao servidor.** Tente novamente em instantes.' },
      ])
    } finally {
      setPerguntando(false)
    }
  }

  const recomecar = () => {
    setMensagens([])
    setErro('')
  }

  const removerEdital = async () => {
    await fetch('/api/ia/edital', { method: 'DELETE' }).catch(() => {})
    setEdital(null)
    removerLocal()
    setTexto('')
    setArquivo(null)
    if (fileRef.current) fileRef.current.value = ''
    setMensagens([])
    setInput('')
    setErro('')
  }

  // IA conectada? (avisa quando confirmadamente false; informa quando true)
  const mostrarAvisoIa = iaConfigurada === false
  const mostrarIaConectada = iaConfigurada === true

  return (
    <div className="space-y-6">
      <PageHeader
        title="IA de Licitações"
        description="Assistente especializado em editais de licitação. Importe o edital (texto ou PDF) e faça perguntas sobre ele."
        badge={<Badge variant="premium" icon={<Sparkles className="w-3 h-3" />}>IA GRATUITA</Badge>}
      />

      <DemoNotice>
        Assistente com IA (Cloudflare Workers AI — llama-3.1-8b-instruct-fast). O modelo recebe o conteúdo do
        edital que você importa e segue a Lei nº 14.133/2021 e o PNCP. Dados ausentes são marcados como
        “não informado no documento” — a IA nunca inventa valores.
      </DemoNotice>

      {mostrarIaConectada && (
        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10 px-3.5 py-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed text-emerald-700 dark:text-emerald-400">
            IA conectada: o modelo <strong>Cloudflare Workers AI — llama-3.1-8b-instruct-fast</strong> está ativo e
            pronto para analisar editais e responder suas perguntas.
          </p>
        </div>
      )}

      {mostrarAvisoIa && (
        <div className="flex items-start gap-2.5 rounded-xl border border-danger/20 bg-danger-soft dark:bg-red-500/10 px-3.5 py-2.5">
          <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed text-danger">
            A IA ainda não está ativa: a binding <strong>ai</strong> do Workers AI não foi detectada neste
            ambiente. Adicione a binding no <code className="font-mono">wrangler.jsonc</code> e faça deploy para
            habilitar o assistente.
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Importação do edital */}
        <div className="lg:col-span-4">
          <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-5 space-y-4 lg:sticky lg:top-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Importar edital</h3>
            </div>

            {edital ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10 p-4">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                      Edital carregado com sucesso
                    </p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5 truncate flex items-center gap-1.5">
                      <FileCheck2 className="w-3 h-3 shrink-0" />
                      {edital.origem === 'pdf' ? edital.nomeArquivo : 'Texto colado'} · {edital.chars.toLocaleString('pt-BR')} caracteres
                    </p>
                    <p className="text-[11px] text-emerald-700/70 dark:text-emerald-400/70 mt-1">
                      {edital.salvo
                        ? 'Salvo no servidor: você pode recarregar a página que o edital continua aqui.'
                        : 'ATENÇÃO: não foi possível salvar o edital no servidor. Ele fica só neste navegador — se você recarregar a página ou abrir em outro aparelho, será preciso importar de novo.'}
                    </p>
                    {edital.ocr && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                        PDF escaneado — o texto foi reconhecido por OCR. Confira se a leitura ficou fiel ao documento.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {!edital && (
              <>
                <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-800/60">
                  <button
                    onClick={() => setModo('texto')}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                      modo === 'texto'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    <Clipboard className="w-4 h-4" /> Colar texto
                  </button>
                  <button
                    onClick={() => setModo('pdf')}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                      modo === 'pdf'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    <FileText className="w-4 h-4" /> Enviar PDF
                  </button>
                </div>

                {modo === 'texto' ? (
                  <div>
                    <textarea
                      value={texto}
                      onChange={(e) => setTexto(e.target.value)}
                      rows={9}
                      placeholder="Cole aqui o texto do edital de licitação (objeto, condições, prazos, habilitação etc.)..."
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                    />
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      {texto.length.toLocaleString('pt-BR')} caracteres · limite de 40.000.
                    </p>
                  </div>
                ) : (
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
                        {arquivo
                          ? `${(arquivo.size / 1024 / 1024).toFixed(1)} MB`
                          : 'PDF com camada de texto · até 8 MB · até 60 páginas'}
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

                {erro && (
                  <div className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger-soft dark:bg-red-500/10 px-3.5 py-2.5">
                    <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                    <p className="text-sm text-danger">{erro}</p>
                  </div>
                )}

                <Button
                  onClick={importar}
                  disabled={importando || (modo === 'texto' ? !texto.trim() : !arquivo)}
                  loading={importando}
                  className="w-full"
                  icon={<Upload className="w-4 h-4" />}
                >
                  {importando
                    ? modo === 'pdf'
                      ? 'Extraindo texto do PDF...'
                      : 'Importando texto...'
                    : 'Importar edital'}
                </Button>
              </>
            )}

            {edital && (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={removerEdital} className="flex-1" icon={<Trash2 className="w-4 h-4" />}>
                  Remover
                </Button>
              </div>
            )}

            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5">
              <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                <MessageSquare className="w-3 h-3 inline mr-1" />
                Exemplos de perguntas: “Qual o objeto da licitação?”, “Qual o valor estimado?”, “Quais os prazos
                importantes?”, “Quais documentos de habilitação são exigidos?”, “Esse edital é compatível com o
                CNAE 4751-2/01?”
              </p>
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="lg:col-span-8">
          <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 flex flex-col overflow-hidden" style={{ height: '70vh', minHeight: 480 }}>
            {/* Cabeçalho do chat */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-secondary to-accent flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Assistente de Editais</p>
                  <p className="text-[11px] text-slate-400">
                    {edital
                      ? `Analisando: ${edital.origem === 'pdf' ? edital.nomeArquivo : 'texto colado'}`
                      : restaurando
                        ? 'Restaurando edital salvo...'
                        : 'Nenhum edital carregado'}
                  </p>
                </div>
              </div>
              {mensagens.length > 0 && (
                <button
                  onClick={recomecar}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-danger transition-colors"
                  title="Recomeçar conversa"
                >
                  <Eraser className="w-3.5 h-3.5" /> Recomeçar
                </button>
              )}
            </div>

            {/* Mensagens */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scroll-smooth bg-slate-50/50 dark:bg-slate-950/40"
            >
              {mensagens.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center text-primary mb-3">
                    <MessageSquare className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {restaurando ? 'Restaurando edital salvo...' : 'Comece importando um edital'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Importe um edital (texto ou PDF) no painel à esquerda e depois faça perguntas sobre ele. A IA
                    responde sempre com base no documento carregado.
                  </p>
                </div>
              ) : (
                mensagens.map((m) => (m.role === 'user' ? <BubbleUser key={m.id} content={m.content} /> : <BubbleAI key={m.id} content={m.content} />))
              )}

              {perguntando && (
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-secondary to-accent flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm text-slate-500 dark:text-slate-400">IA digitando...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-slate-100 dark:border-slate-800 p-3 bg-white dark:bg-slate-900">
              {!edital && (
                <p className="px-2 pb-2 text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Info className="w-3 h-3 shrink-0" />
                  {restaurando
                    ? 'Recuperando o edital salvo, um instante...'
                    : 'Nenhum edital carregado. A IA avisará que precisa de um edital até você importar um no painel à esquerda.'}
                </p>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      enviar()
                    }
                  }}
                  rows={1}
                  placeholder={edital ? 'Faça uma pergunta sobre o edital carregado...' : 'Pergunte sobre um edital (importe antes)...'}
                  className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent max-h-32"
                  style={{ minHeight: 44 }}
                />
                <Button
                  onClick={enviar}
                  disabled={!input.trim() || perguntando || restaurando}
                  loading={perguntando}
                  className="shrink-0"
                  icon={<Send className="w-4 h-4" />}
                >
                  Enviar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
