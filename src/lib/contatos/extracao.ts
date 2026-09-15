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
import { searchLiveOpportunities } from '@/lib/pncp-data'

type AnyClient = SupabaseClient<any, 'public', any>

const PNCP_BASE = process.env.NEXT_PUBLIC_PNCP_BASE || 'https://pncp.gov.br/api'

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

/** Extrai e normaliza e-mails do texto, removendo duplicados e falsos positivos. */
export function extrairEmails(texto: string): string[] {
  if (!texto) return []
  const achados = texto.match(EMAIL_RE) || []
  const set = new Set<string>()
  for (const bruto of achados) {
    const e = bruto.trim().toLowerCase().replace(/[.,;:]+$/, '')
    if (!e || e.length > 254) continue
    if (EMAILS_FALSOS.test(e)) continue
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
  const url = `${PNCP_BASE}/pncp/v1/orgaos/${cnpj}/compras/${ano}/${seq}/arquivos`
  try {
    const resp = await fetch(url, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(15000) })
    if (!resp.ok) return []
    const data = await resp.json()
    const arr = Array.isArray(data) ? data : data?.data || []
    return Array.isArray(arr) ? (arr as ArquivoPncp[]) : []
  } catch {
    return []
  }
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

async function baixarArquivo(url: string): Promise<{ bytes?: Uint8Array; erro?: string }> {
  const tentativas = [url]
  const proxy = process.env.PNCP_ARQUIVO_PROXY
  if (proxy) {
    tentativas.push(url.replace('https://pncp.gov.br/pncp-api', proxy.replace(/\/$/, '')))
  }
  for (const u of tentativas) {
    try {
      const resp = await fetch(u, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(25000) })
      if (!resp.ok) continue
      const buf = new Uint8Array(await resp.arrayBuffer())
      if (buf.length === 0) continue
      const isPdf = buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46
      if (!isPdf) return { erro: 'nao_pdf' }
      if (buf.length > MAX_PDF_BYTES) return { erro: 'pdf_grande' }
      return { bytes: buf }
    } catch {
      // tenta a próxima alternativa
    }
  }
  return { erro: 'download_falhou' }
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
    let escolhido: ArquivoPncp | null = null
    let bytesPdf: Uint8Array | null = null
    let texto = ''
    let ultimoMotivo = 'sem_pdf'
    for (const arquivo of candidatos.slice(0, 5)) {
      const d = await baixarArquivo(arquivo.url as string)
      if (!d.bytes) {
        ultimoMotivo = d.erro || 'download_falhou'
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

/**
 * Executa um LOTE de extração: busca editais ao vivo no PNCP, pula os já
 * processados (cache em `edital_extracoes`), processa até `limite` editais com
 * pausa entre downloads (rate limiting) e devolve o resumo. Nunca lança.
 */
export async function executarLoteExtracao(client: AnyClient, limite: number): Promise<ResumoLote> {
  const lim = Math.min(20, Math.max(1, Math.floor(limite) || 1))

  const processados = new Set<string>()
  try {
    const { data } = await client.from('edital_extracoes').select('pncp_id').limit(10000)
    for (const r of data || []) if (r.pncp_id) processados.add(String(r.pncp_id))
  } catch {
    /* segue sem cache */
  }

  const live = await searchLiveOpportunities('licitacao', {}, 1)
  if (!live || live.length === 0) {
    return { limite: lim, candidatos: 0, processados: 0, emails_extraidos: 0, resumo: {}, resultados: [] }
  }

  const vistos = new Set<string>()
  const alvos: EditalAlvo[] = []
  for (const o of live) {
    if (!o.id || !o.cnpj) continue
    if (processados.has(o.id) || vistos.has(o.id)) continue
    vistos.add(o.id)
    alvos.push({
      pncp_id: o.id,
      orgao_cnpj: o.cnpj,
      orgao_nome: o.orgao,
      uf: o.uf,
      municipio: o.municipio,
      numero: o.numero,
      data_publicacao: o.dataAbertura || null,
    })
    if (alvos.length >= lim) break
  }

  const resumo: Record<string, number> = { ok: 0, sem_contato: 0, sem_arquivo: 0, pdf_invalido: 0, falha: 0 }
  const resultados: ResumoLote['resultados'] = []

  for (const alvo of alvos) {
    const r = await processarEditalContato(client, alvo)
    resumo[r.status] = (resumo[r.status] || 0) + 1
    resultados.push({ pncp_id: r.pncp_id, status: r.status, emails: r.emails, motivo: r.motivo || null })
    await sleep(700)
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
