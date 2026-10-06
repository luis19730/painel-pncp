// ============================================================================
// Extração de contatos (e-mail) do PDF do edital.
//
// Pipeline de UMA unidade (edital):
//   1. localiza os arquivos do edital na API do PNCP (endpoint `arquivos`);
//   2. baixa o PDF do edital (com fallback de proxy opcional);
//   3. extrai o texto (unpdf — mesma lib usada na Análise de Edital);
//   4. aplica regex de e-mail e filtra falsos positivos;
//   5. persiste: 1 linha por edital em `edital_extracoes` (cache/estado) e,
//      por órgão+e-mail, 1 linha em `edital_contatos` com a lista de editais
//      de origem (deduplicação).
//
// NUNCA lança: qualquer falha vira um `status` registrado, sem quebrar o
// pipeline principal de ingestão. PDF corrompido/sem texto é marcado como
// pdf_invalido; PDF de imagem (escaneado) idem (o OCR é opcional e desligado
// aqui para não gastar tokens de IA em lote).
// ============================================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import { extractPdfText, MAX_PDF_BYTES } from '@/lib/ia/pdf'

type AnyClient = SupabaseClient<any, 'public', any>

const PNCP_BASE = process.env.NEXT_PUBLIC_PNCP_BASE || 'https://pncp.gov.br/api'
// Proxy público do projeto (mesmo usado pelo app): evita o WAF do PNCP quando a
// chamada parte do datacenter (Cloudflare Worker).
const PNCP_PROXY =
  process.env.NEXT_PUBLIC_PNCP_PROXY || 'https://pncp-proxy.luis19730.workers.dev'

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  Accept: 'application/json, application/pdf, */*',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
  Referer: 'https://pncp.gov.br/',
}

// Regex robusta de e-mail (padrão do prompt).
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

// Falsos positivos comuns em editais/modelos.
const EMAILS_FALSOS =
  /(example\.|exemplo|dominio\.com|dominio\.|seuemail|seu-email|seuemail|nome@|email@|teste@|usuario@|usuario@|xxx@|aaaa|@dominio|@email\.com|@exemplo|@teste\.|@seu)/i

export type StatusExtracao = 'ok' | 'sem_contato' | 'sem_arquivo' | 'pdf_invalido' | 'falha'

export interface EditalAlvo {
  pncp_id: string
  orgao_cnpj: string
  orgao_nome: string
  uf: string
  municipio: string
  numero: string
  data_publicacao: string | null
}

export interface ResultadoExtracao {
  pncp_id: string
  status: StatusExtracao
  emails: string[]
  motivo?: string
  cache?: boolean
}

interface ArquivoPncp {
  url?: string
  titulo?: string
  tipoDocumentoNome?: string
  dataPublicacaoPncp?: string
}

/** Validação final de um e-mail (usada na extração E no envio). */
export function emailEhValido(email: string): boolean {
  const e = String(email || '').trim().toLowerCase()
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,24}$/.test(e)) return false
  if (EMAILS_FALSOS.test(e)) return false
  const dominio = e.split('@')[1] || ''
  if (/\.\./.test(dominio) || dominio.startsWith('.') || dominio.endsWith('.')) return false
  const tld = dominio.split('.').pop() || ''
  // TLD improvável (ex.: "corrlbr" — 3+ consoantes seguidas): provável truncamento do PDF.
  if (/[bcdfghjklmnpqrstvwxz]{3,}/.test(tld)) return false
  return true
}

/** Extrai e normaliza e-mails do texto, removendo duplicados e falsos positivos. */
export function extrairEmails(texto: string): string[] {
  if (!texto) return []
  const achados = texto.match(EMAIL_RE) || []
  const set = new Set<string>()
  for (const bruto of achados) {
    const e = bruto.trim().toLowerCase().replace(/[.,;:]+$/, '')
    if (!emailEhValido(e)) continue
    set.add(e)
  }
  return Array.from(set)
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  try {
    const digest = await crypto.subtle.digest('SHA-256', bytes as unknown as ArrayBuffer)
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  } catch {
    return ''
  }
}

/** `99999999999999-1-999999/9999` → { cnpj, seq, ano }. */
function parsePncpId(pncpId: string): { cnpj: string; seq: string; ano: string } | null {
  const m = /^(\d{14})-\d+-(\d+)\/(\d{4})$/.exec(String(pncpId || '').trim())
  if (!m) return null
  return { cnpj: m[1], seq: m[2], ano: m[3] }
}

async function listarArquivos(cnpj: string, ano: string, seq: string): Promise<ArquivoPncp[]> {
  const path = `/pncp/v1/orgaos/${cnpj}/compras/${ano}/${seq}/arquivos`
  // Direto pode dar timeout a partir do datacenter (WAF); o proxy público do
  // projeto costuma responder — por isso tentamos as duas fontes.
  const urls = [ `${PNCP_BASE}${path}`, `${PNCP_PROXY.replace(/\/$/, '')}${path}` ]
  for (const url of urls) {
    try {
      const resp = await fetch(url, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(20000) })
      if (!resp.ok) continue
      const data = await resp.json()
      const arr = Array.isArray(data) ? data : data?.data || []
      if (Array.isArray(arr) && arr.length > 0) return arr as ArquivoPncp[]
    } catch {
      /* tenta a próxima fonte */
    }
  }
  return []
}

/** Ordena os arquivos priorizando o documento "Edital". */
function ordenarArquivos(arquivos: ArquivoPncp[]): ArquivoPncp[] {
  const comUrl = arquivos.filter((a) => !!a.url)
  const texto = (a: ArquivoPncp) => `${a.tipoDocumentoNome || ''} ${a.titulo || ''}`.toLowerCase()
  return [
    ...comUrl.filter((a) => texto(a).includes('edital')),
    ...comUrl.filter((a) => !texto(a).includes('edital')),
  ]
}

// ZIP pode embalar o edital (PDF). Limite conservador para não estourar a
// memória/CPU do Worker (o parse de PDF é caro).
const MAX_ZIP_BYTES = 8 * 1024 * 1024
// Dentro de um ZIP, lê no máximo estes PDFs e ignora PDFs internos grandes.
const MAX_PDFS_ZIP = 3
const MAX_PDF_INTERNO = 2 * 1024 * 1024

async function baixarArquivo(url: string): Promise<{ bytes?: Uint8Array; erro?: string }> {
  const tentativas = [url]
  const proxy = process.env.PNCP_ARQUIVO_PROXY
  if (proxy) {
    tentativas.push(url.replace('https://pncp.gov.br/pncp-api', proxy.replace(/\/$/, '')))
  }
  for (const u of tentativas) {
    try {
      const resp = await fetch(u, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(30000) })
      if (!resp.ok) continue
      const buf = new Uint8Array(await resp.arrayBuffer())
      if (buf.length === 0) continue
      const isPdf = buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46
      const isZip = buf[0] === 0x50 && buf[1] === 0x4b
      if (isPdf) {
        if (buf.length > MAX_PDF_BYTES) return { erro: 'pdf_grande' }
        return { bytes: buf }
      }
      if (isZip) {
        if (buf.length > MAX_ZIP_BYTES) return { erro: 'zip_grande' }
        return { bytes: buf }
      }
      return { erro: 'nao_pdf' }
    } catch {
      // tenta a próxima alternativa
    }
  }
  return { erro: 'download_falhou' }
}

/**
 * Lê um ZIP em memória (sem dependências) e devolve o texto dos PDFs internos.
 * Implementação mínima: localiza o EOCD, percorre o diretório central, infla
 * cada entrada `.pdf` com `DecompressionStream('deflate-raw')` e extrai o texto.
 * ZIP64 não é suportado (raro nos editais).
 */
async function extrairTextoDeZip(bytes: Uint8Array): Promise<{ texto: string; erro?: string }> {
  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const minEocd = Math.max(0, bytes.length - 65557)
    let eocd = -1
    for (let i = bytes.length - 22; i >= minEocd; i--) {
      if (view.getUint32(i, true) === 0x06054b50) {
        eocd = i
        break
      }
    }
    if (eocd < 0) return { texto: '', erro: 'zip_sem_eocd' }

    const total = view.getUint16(eocd + 10, true)
    let off = view.getUint32(eocd + 16, true)
    const dec = new TextDecoder('utf-8')
    const textos: string[] = []
    let lidos = 0

    for (let n = 0; n < total; n++) {
      if (off + 46 > bytes.length || view.getUint32(off, true) !== 0x02014b50) break
      const method = view.getUint16(off + 10, true)
      const compSize = view.getUint32(off + 20, true)
      const nameLen = view.getUint16(off + 28, true)
      const extraLen = view.getUint16(off + 30, true)
      const commentLen = view.getUint16(off + 32, true)
      const localOff = view.getUint32(off + 42, true)
      const name = dec.decode(bytes.subarray(off + 46, off + 46 + nameLen))
      off += 46 + nameLen + extraLen + commentLen
      if (!/\.pdf$/i.test(name)) continue
      if (lidos >= MAX_PDFS_ZIP) break
      if (localOff + 30 > bytes.length || view.getUint32(localOff, true) !== 0x04034b50) continue
      const lNameLen = view.getUint16(localOff + 26, true)
      const lExtraLen = view.getUint16(localOff + 28, true)
      const dataStart = localOff + 30 + lNameLen + lExtraLen
      const comp = bytes.subarray(dataStart, dataStart + compSize)
      let pdfBytes: Uint8Array
      if (method === 0) {
        pdfBytes = comp
      } else if (method === 8) {
        const stream = new Blob([new Uint8Array(comp)]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
        pdfBytes = new Uint8Array(await new Response(stream).arrayBuffer())
      } else {
        continue
      }
      // PDF interno grande é ignorado (protege CPU/memória do Worker).
      if (pdfBytes.length > MAX_PDF_INTERNO) continue
      lidos++
      const ex = await extractPdfText(pdfBytes)
      if (ex.ok && ex.text) {
        textos.push(ex.text)
        // Achou e-mail já no primeiro documento? para aqui (economiza CPU).
        if (extrairEmails(textos.join('\n')).length > 0) break
      }
    }
    if (textos.length === 0) return { texto: '', erro: 'zip_sem_pdf_texto' }
    return { texto: textos.join('\n') }
  } catch (e) {
    return { texto: '', erro: (e as Error)?.message || 'zip_erro' }
  }
}

async function registrarExtracao(
  client: AnyClient,
  alvo: EditalAlvo,
  dados: {
    status: StatusExtracao
    emails: string[]
    motivo?: string
    arquivo_url?: string | null
    arquivo_titulo?: string | null
    arquivo_hash?: string | null
  }
): Promise<void> {
  try {
    await client.from('edital_extracoes').upsert(
      {
        pncp_id: alvo.pncp_id,
        orgao_cnpj: alvo.orgao_cnpj || null,
        orgao_nome: alvo.orgao_nome || null,
        uf: alvo.uf || null,
        municipio: alvo.municipio || null,
        numero: alvo.numero || null,
        data_publicacao: alvo.data_publicacao || null,
        arquivo_url: dados.arquivo_url ?? null,
        arquivo_titulo: dados.arquivo_titulo ?? null,
        arquivo_hash: dados.arquivo_hash ?? null,
        status: dados.status,
        emails: dados.emails,
        motivo: dados.motivo ?? null,
        processado_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'pncp_id' }
    )
  } catch {
    /* best-effort */
  }
}

/** Grava/atualiza um contato deduplicado por (órgão, e-mail), anexando a origem. */
async function salvarContato(
  client: AnyClient,
  alvo: EditalAlvo,
  email: string
): Promise<void> {
  const origem = {
    pncp_id: alvo.pncp_id,
    numero: alvo.numero || null,
    data: alvo.data_publicacao || null,
    arquivo_url: null as string | null,
  }
  try {
    const { data: existente } = await client
      .from('edital_contatos')
      .select('id, editais_origem')
      .eq('orgao_cnpj', alvo.orgao_cnpj)
      .eq('contato_email', email)
      .maybeSingle()

    if (existente) {
      const origens: unknown[] = Array.isArray(existente.editais_origem) ? existente.editais_origem : []
      const jaExiste = origens.some((o) => (o as { pncp_id?: string })?.pncp_id === alvo.pncp_id)
      if (!jaExiste) origens.push(origem)
      await client
        .from('edital_contatos')
        .update({
          editais_origem: origens,
          orgao_nome: alvo.orgao_nome || null,
          uf: alvo.uf || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existente.id)
      return
    }

    await client.from('edital_contatos').insert({
      orgao_cnpj: alvo.orgao_cnpj,
      orgao_nome: alvo.orgao_nome || null,
      uf: alvo.uf || null,
      contato_email: email,
      editais_origem: [origem],
      contato_extraido_em: new Date().toISOString(),
    })
  } catch {
    /* best-effort */
  }
}

/**
 * Processa UM edital: extrai e-mails do PDF e persiste. Nunca lança.
 * Se já houver resultado em `edital_extracoes`, retorna do cache (não rebaixa).
 */
export async function processarEditalContato(
  client: AnyClient,
  alvo: EditalAlvo,
  opts: { forcar?: boolean } = {}
): Promise<ResultadoExtracao> {
  try {
    if (!opts.forcar) {
      const { data } = await client
        .from('edital_extracoes')
        .select('status, emails, motivo')
        .eq('pncp_id', alvo.pncp_id)
        .maybeSingle()
      if (data) {
        return {
          pncp_id: alvo.pncp_id,
          status: (data.status as StatusExtracao) || 'falha',
          emails: Array.isArray(data.emails) ? (data.emails as string[]) : [],
          motivo: data.motivo || undefined,
          cache: true,
        }
      }
    }

    const parsed = parsePncpId(alvo.pncp_id)
    if (!parsed || !alvo.orgao_cnpj) {
      await registrarExtracao(client, alvo, { status: 'falha', emails: [], motivo: 'sem_identificador' })
      return { pncp_id: alvo.pncp_id, status: 'falha', emails: [], motivo: 'sem_identificador' }
    }

    const arquivos = await listarArquivos(parsed.cnpj, parsed.ano, parsed.seq)
    const candidatos = ordenarArquivos(arquivos)
    if (candidatos.length === 0) {
      await registrarExtracao(client, alvo, { status: 'sem_arquivo', emails: [], motivo: 'sem_arquivo_no_pncp' })
      return { pncp_id: alvo.pncp_id, status: 'sem_arquivo', emails: [], motivo: 'sem_arquivo_no_pncp' }
    }

    // Tenta até 5 arquivos (alguns "arquivos" do processo não são o PDF do
    // edital — ex.: anexos em outro formato). O primeiro PDF com texto vence.
    // Orçamento de ~12s por edital para não estourar o limite de CPU do Worker,
    // e DPIs/scan enormes são rejeitados mais cedo pelo `extractPdfText`.
    const deadline = Date.now() + 8_000
    let escolhido: ArquivoPncp | null = null
    let bytesPdf: Uint8Array | null = null
    let texto = ''
    let ultimoMotivo = 'sem_pdf'
    for (const arquivo of candidatos.slice(0, 5)) {
      if (Date.now() > deadline) {
        ultimoMotivo = 'tempo_esgotado'
        break
      }
      const d = await baixarArquivo(arquivo.url as string)
      if (!d.bytes) {
        ultimoMotivo = d.erro || 'download_falhou'
        continue
      }
      // ZIP (comum no PNCP): extrai o texto dos PDFs internos.
      if (d.bytes[0] === 0x50 && d.bytes[1] === 0x4b) {
        const z = await extrairTextoDeZip(d.bytes)
        if (z.texto) {
          escolhido = arquivo
          bytesPdf = d.bytes
          texto = z.texto
          break
        }
        ultimoMotivo = z.erro || 'zip_sem_pdf_texto'
        continue
      }
      const ex = await extractPdfText(d.bytes)
      if (!ex.ok || !ex.text) {
        ultimoMotivo = ex.error || 'sem_texto'
        continue
      }
      escolhido = arquivo
      bytesPdf = d.bytes
      texto = ex.text
      break
    }

    if (!escolhido || !bytesPdf || !texto) {
      await registrarExtracao(client, alvo, {
        status: 'pdf_invalido',
        emails: [],
        motivo: ultimoMotivo,
        arquivo_url: candidatos[0]?.url || null,
        arquivo_titulo: candidatos[0]?.titulo || null,
      })
      return { pncp_id: alvo.pncp_id, status: 'pdf_invalido', emails: [], motivo: ultimoMotivo }
    }

    const hash = await sha256Hex(bytesPdf)
    const arquivo = escolhido

    const emails = extrairEmails(texto)
    if (emails.length === 0) {
      await registrarExtracao(client, alvo, {
        status: 'sem_contato',
        emails: [],
        motivo: 'regex_sem_resultado',
        arquivo_url: arquivo.url,
        arquivo_titulo: arquivo.titulo || null,
        arquivo_hash: hash,
      })
      return { pncp_id: alvo.pncp_id, status: 'sem_contato', emails: [], motivo: 'regex_sem_resultado' }
    }

    for (const email of emails) {
      await salvarContato(client, alvo, email)
    }

    await registrarExtracao(client, alvo, {
      status: 'ok',
      emails,
      arquivo_url: arquivo.url,
      arquivo_titulo: arquivo.titulo || null,
      arquivo_hash: hash,
    })
    return { pncp_id: alvo.pncp_id, status: 'ok', emails }
  } catch (e) {
    const motivo = (e as Error)?.message || 'erro_desconhecido'
    await registrarExtracao(client, alvo, { status: 'falha', emails: [], motivo })
    return { pncp_id: alvo.pncp_id, status: 'falha', emails: [], motivo }
  }
}

export interface ResumoLote {
  limite: number
  candidatos: number
  processados: number
  emails_extraidos: number
  resumo: Record<string, number>
  resultados: Array<{ pncp_id: string; status: StatusExtracao; emails: string[]; motivo: string | null }>
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

interface SearchItemRaw {
  numero_controle_pncp?: string
  orgao_cnpj?: string
  orgao_nome?: string
  uf?: string
  municipio_nome?: string
  numero_compra?: string
  data_publicacao_pncp?: string
}

// A busca pública devolve ~10 itens por página e ignora `tamanho`, então UMA
// consulta/1 página satura rapidamente. Varremos VÁRIAS consultas × páginas,
// ordenando por data para sempre haver editais novos.
const CONSULTAS = [
  'licitacao',
  'pregao',
  'dispensa',
  'concorrencia',
  'credenciamento',
  'aquisicao',
  'contratacao',
  'registro de precos',
  'obra',
  'servico',
]
const MAX_PAGINAS = 8
// Orçamento de requisições de busca por lote (evita CPU/tempo alto no Worker).
const MAX_FETCHES_BUSCA = 6
// Orçamento TOTAL de tempo por chamada: para antes de estourar o Worker.
const BUDGET_LOTE_MS = 18_000

async function fetchSearch(q: string, pagina: number): Promise<SearchItemRaw[]> {
  const params = new URLSearchParams({
    q,
    tipos_documento: 'edital',
    ordenacao: '-data',
    pagina: String(pagina),
  })
  const urls = [
    `${PNCP_BASE}/search/?${params}`,
    `${PNCP_PROXY.replace(/\/$/, '')}/search/?${params}`,
  ]
  for (const u of urls) {
    try {
      const resp = await fetch(u, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(20000) })
      if (!resp.ok) {
        console.warn(`[contatos] busca HTTP ${resp.status} em ${u.slice(0, 90)}`)
        continue
      }
      const data = await resp.json()
      const arr = Array.isArray(data) ? data : data?.items || data?.data || []
      if (Array.isArray(arr) && arr.length > 0) return arr as SearchItemRaw[]
      console.warn(`[contatos] busca vazia em ${u.slice(0, 90)}`)
    } catch (e) {
      console.warn(`[contatos] busca erro em ${u.slice(0, 90)}: ${(e as Error)?.message}`)
    }
  }
  return []
}

function itemParaAlvo(it: SearchItemRaw): EditalAlvo | null {
  const id = String(it.numero_controle_pncp || '').trim()
  if (!id || !it.orgao_cnpj) return null
  return {
    pncp_id: id,
    orgao_cnpj: it.orgao_cnpj,
    orgao_nome: it.orgao_nome || '',
    uf: it.uf || '',
    municipio: it.municipio_nome || '',
    numero: String(it.numero_compra || id),
    data_publicacao: it.data_publicacao_pncp || null,
  }
}

/**
 * Monta os alvos priorizando editais NUNCA vistos e, só na falta deles, falhas
 * TRANSITÓRIAS (download_falhou / tempo_esgotado / falha). Editais com status
 * definitivo (ok, sem_contato, pdf_invalido de PDF digitalizado, sem_arquivo)
 * nunca se repetem — do contrário consumiriam a fila para sempre.
 */
async function buscarAlvos(
  definitivos: Set<string>,
  jaVistos: Set<string>,
  retrySet: Set<string>,
  lim: number
): Promise<EditalAlvo[]> {
  const pool = Math.max(lim, 12)
  const novos = new Map<string, EditalAlvo>()
  const retries = new Map<string, EditalAlvo>()
  let fetches = 0

  for (const q of CONSULTAS) {
    for (let pagina = 1; pagina <= MAX_PAGINAS; pagina++) {
      if (fetches >= MAX_FETCHES_BUSCA) break
      fetches++
      const items = await fetchSearch(q, pagina)
      if (items.length === 0) break
      for (const it of items) {
        const alvo = itemParaAlvo(it)
        if (!alvo) continue
        if (definitivos.has(alvo.pncp_id)) continue
        if (jaVistos.has(alvo.pncp_id)) {
          if (retrySet.has(alvo.pncp_id) && !retries.has(alvo.pncp_id)) retries.set(alvo.pncp_id, alvo)
        } else if (!novos.has(alvo.pncp_id)) {
          novos.set(alvo.pncp_id, alvo)
        }
      }
      if (novos.size >= pool) break
    }
    if (novos.size >= pool || fetches >= MAX_FETCHES_BUSCA) break
  }

  return [...novos.values(), ...retries.values()].slice(0, lim)
}

/**
 * Executa um LOTE de extração: busca editais ao vivo no PNCP (várias consultas
 * e páginas), pula os já resolvidos (ok/sem_contato), reprocessa falhas
 * transitórias, processa até `limite` editais com pausa entre downloads e
 * devolve o resumo. Nunca lança.
 */
export async function executarLoteExtracao(client: AnyClient, limite: number): Promise<ResumoLote> {
  const lim = Math.min(20, Math.max(1, Math.floor(limite) || 1))

  // `jaVistos` = todo edital com linha em edital_extracoes; `definitivos` = os
  // que NÃO devem repetir (ok, sem_contato, PDF digitalizado/sem texto,
  // sem arquivo); `retrySet` = falhas transitórias que valem nova tentativa.
  const jaVistos = new Set<string>()
  const definitivos = new Set<string>()
  const retrySet = new Set<string>()
  try {
    const { data } = await client.from('edital_extracoes').select('pncp_id,status,motivo').limit(20000)
    for (const r of data || []) {
      const id = String(r.pncp_id || '')
      if (!id) continue
      jaVistos.add(id)
      const motivo = String(r.motivo || '')
      const transitorio =
        r.status === 'falha' || motivo === 'download_falhou' || motivo === 'tempo_esgotado'
      if (transitorio) retrySet.add(id)
      else definitivos.add(id)
    }
  } catch {
    /* segue sem cache */
  }

  const alvos = await buscarAlvos(definitivos, jaVistos, retrySet, lim)
  if (alvos.length === 0) {
    return { limite: lim, candidatos: 0, processados: 0, emails_extraidos: 0, resumo: {}, resultados: [] }
  }

  const resumo: Record<string, number> = { ok: 0, sem_contato: 0, sem_arquivo: 0, pdf_invalido: 0, falha: 0 }
  const resultados: ResumoLote['resultados'] = []

  const inicioLote = Date.now()
  for (const alvo of alvos) {
    // Orçamento global: devolve o que já processou antes de estourar o Worker.
    if (Date.now() - inicioLote > BUDGET_LOTE_MS) break
    // `forcar`: reprocessa mesmo havendo linha anterior (retenta falhas
    // transitórias registradas em edital_extracoes).
    const r = await processarEditalContato(client, alvo, { forcar: true })
    resumo[r.status] = (resumo[r.status] || 0) + 1
    resultados.push({ pncp_id: r.pncp_id, status: r.status, emails: r.emails, motivo: r.motivo || null })
    await sleep(400)
  }

  return {
    limite: lim,
    candidatos: alvos.length,
    processados: resultados.length,
    emails_extraidos: resultados.reduce((a, r) => a + r.emails.length, 0),
    resumo,
    resultados,
  }
}
