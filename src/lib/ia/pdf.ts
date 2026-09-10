// ============================================================================
// Extração de texto de PDFs — via `unpdf` (compatível com Workers/serverless).
//
// Limites defensivos para não estourar o free tier do Workers AI e da CPU:
//   - tamanho máximo do arquivo (bytes)
//   - número máximo de páginas processadas
//   - número máximo de caracteres de texto extraído (o que exceder é cortado)
// ============================================================================

import { getDocumentProxy, extractText } from 'unpdf'
import { getWorkerAI } from './ai-global'

export const MAX_PDF_BYTES = 8 * 1024 * 1024 // 8 MB
export const MAX_PDF_PAGES = 60
export const MAX_EXTRACTED_CHARS = 40_000 // ~ entrada do modelo

// Abaixo desse número de caracteres o texto do `unpdf` é considerado insuficiente
// (PDF escaneado sem camada de texto útil) — então tentamos OCR via Workers AI.
export const MIN_PDF_TEXT_CHARS = 200

export interface ExtractPdfResult {
  ok: boolean
  text?: string
  error?: string
}

export function validatePdfBytes(size: number): string | null {
  if (size <= 0) return 'O arquivo PDF está vazio.'
  if (size > MAX_PDF_BYTES) {
    return `O PDF tem ${(size / 1024 / 1024).toFixed(1)} MB. O limite é ${MAX_PDF_BYTES / 1024 / 1024} MB.`
  }
  return null
}

const LIMITS_ERROR = /exceeded|limit|too (many|large)/i

export async function extractPdfText(
  bytes: Uint8Array
): Promise<ExtractPdfResult> {
  try {
    const proxy = await getDocumentProxy(bytes)
    const pageCount = typeof proxy?.numPages === 'number' ? proxy.numPages : 0

    if (pageCount > MAX_PDF_PAGES) {
      return {
        ok: false,
        error: `O PDF tem ${pageCount} páginas. O limite é ${MAX_PDF_PAGES} páginas para análise.`,
      }
    }

    const { text } = await extractText(proxy, { mergePages: true })
    let content = String(text || '').trim()

    if (!content) {
      return {
        ok: false,
        error:
          'Não foi possível extrair texto deste PDF. Ele pode ser digitalizado (imagem), protegido por senha ou sem camada de texto.',
      }
    }

    if (content.length > MAX_EXTRACTED_CHARS) {
      content = content.slice(0, MAX_EXTRACTED_CHARS)
    }

    return { ok: true, text: content }
  } catch (e) {
    const msg = (e as Error)?.message || 'erro desconhecido'
    if (LIMITS_ERROR.test(msg)) {
      return { ok: false, error: `PDF muito grande ou páginas demais: ${msg}` }
    }
    return {
      ok: false,
      error:
        'Não foi possível processar este PDF. Envie um PDF com camada de texto (não digitalizado) e formato válido.',
    }
  }
}

// ---------------------------------------------------------------------------
// OCR via Workers AI (`env.AI.toMarkdown`), para PDFs escaneados (imagem) que o
// `unpdf` não consegue extrair. Converte o documento em Markdown usando o
// modelo de visão da Cloudflare. Exige a binding `ai` configurada no worker.
// ---------------------------------------------------------------------------

interface MarkdownConversionInput {
  name: string
  blob: Blob
}

interface MarkdownConversionResult {
  id?: string
  name?: string
  format?: 'markdown' | 'text' | 'error'
  data?: string
  error?: string
}

export async function extractPdfTextOcr(bytes: Uint8Array, name: string): Promise<ExtractPdfResult> {
  const ai = (await getWorkerAI()) as
    | { toMarkdown?: (input: MarkdownConversionInput) => Promise<MarkdownConversionResult | MarkdownConversionResult[]> }
    | null
  if (!ai) {
    return { ok: false, error: 'Workers AI não configurado. Adicione a binding `ai` para ler PDFs escaneados.' }
  }
  if (typeof ai.toMarkdown !== 'function') {
    return { ok: false, error: 'O binding do Workers AI não suporta OCR (toMarkdown) neste ambiente.' }
  }

  try {
    // Cópia defensiva: usamos `Uint8Array.from()` para materializar um buffer
    // NOVO e independente, garantindo que o buffer do `bytes` de entrada (que
    // pode chegar "detached" após um `unpdf` em etapa anterior) nunca vire caso
    // de "detached or out-of-bounds ArrayBuffer" ao montar o Blob do OCR.
    const fresh = Uint8Array.from(bytes)
    const pdfBuf = fresh.buffer.slice(fresh.byteOffset, fresh.byteOffset + fresh.byteLength)
    const results = await ai.toMarkdown({ name, blob: new Blob([pdfBuf], { type: 'application/pdf' }) })
    const arr = Array.isArray(results) ? results : [results]

    let content = ''
    let erroOcr: string | null = null
    for (const r of arr) {
      if (!r) continue
      if (r.format === 'error') {
        erroOcr = r.error || erroOcr
        continue
      }
      if (r.data) content += `${r.data}\n`
    }

    content = content.trim()
    if (!content) {
      return {
        ok: false,
        error: erroOcr || 'O OCR não conseguiu extrair texto deste PDF escaneado. Verifique a qualidade do arquivo.',
      }
    }
    if (content.length > MAX_EXTRACTED_CHARS) {
      content = content.slice(0, MAX_EXTRACTED_CHARS)
    }
    return { ok: true, text: content }
  } catch (e) {
    const msg = (e as Error)?.message || 'erro desconhecido'
    if (LIMITS_ERROR.test(msg)) {
      return { ok: false, error: `PDF muito grande ou páginas demais: ${msg}` }
    }
    return { ok: false, error: `OCR falhou: ${msg}` }
  }
}

/**
 * Extrai o texto de um PDF, com fallback automático para OCR quando o arquivo
 * for escaneado (imagem, sem camada de texto). Retorna o texto do `unpdf`
 * quando houver conteúdo suficiente; senão, tenta o OCR do Workers AI.
 */
export async function extractPdfTextWithOcr(bytes: Uint8Array, name: string): Promise<ExtractPdfResult & { ocr?: boolean }> {
  // O `unpdf` (pdf.js) TRANSFERE/DETACH o ArrayBuffer do `Uint8Array` que recebe
  // durante `getDocumentProxy`/`extractText`, deixando-o inutilizável para o OCR
  // que roda depois. Por isso NÃO podemos reutilizar o mesmo buffer nas duas
  // etapas. Criamos DUAS cópias totalmente independentes: uma para o `unpdf`,
  // outra mantida intacta e não-detached exclusivamente para o OCR.
  const bytesForUnpdf = Uint8Array.from(bytes)
  const bytesForOcr = Uint8Array.from(bytes)

  const base = await extractPdfText(bytesForUnpdf)
  const baseText = base.ok ? (base.text || '').trim() : ''

  // Já tem camada de texto suficiente: não gasta tokens com OCR.
  if (baseText.length >= MIN_PDF_TEXT_CHARS) {
    return { ok: true, text: baseText, ocr: false }
  }

  // Texto insuficiente ou nenhum: assume PDF escaneado e tenta OCR. Aqui o
  // `bytesForOcr` é um buffer independente e não foi tocado pelo unpdf, então o
  // `bytes.slice()` interno do OCR nunca cai em buffer "detached".
  const ocr = await extractPdfTextOcr(bytesForOcr, name)
  if (ocr.ok && ocr.text) {
    return { ok: true, text: ocr.text, ocr: true }
  }

  // Se nem o unpdf nem o OCR funcionaram, reporta o motivo mais útil.
  if (base.ok && baseText.length > 0) {
    return { ok: true, text: baseText, ocr: false }
  }
  return { ok: false, error: ocr.error || base.error || 'Não foi possível extrair texto do PDF.' }
}
