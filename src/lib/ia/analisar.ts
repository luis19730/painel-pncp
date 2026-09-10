// ============================================================================
// Orquestrador da análise de licitações com IA.
//
// Recebe o conteúdo de um edital (texto puro já extraído) e retorna uma análise
// executiva estruturada em markdown, produzida pelo Workers AI (com fallback
// opcional para Gemini). Nunca inventa dados: o sistema pede explicitamente que
// o modelo diga "não informado no documento".
//
// LEITURA COMPLETA: editais longos não são truncados. Quando o documento passa
// de um limite seguro para um único contexto, ele é dividido em trechos, cada
// trecho é resumido (map-reduce) e a análise final é feita sobre os resumos —
// assim a IA "lê" o edital inteiro. No chat, além disso, apenas os trechos mais
// relevantes à pergunta são enviados (retrieval simples por sobreposição de
// palavras), mantendo as respostas ancoradas no documento.
// ============================================================================

import { SYSTEM_PROMPT, SYSTEM_PROMPT_CHAT, CHUNK_SUMMARY_PROMPT, mountChatMessages } from './prompt'
import {
  DEFAULT_MODEL,
  GEMINI_FALLBACK_MODEL,
  runChatCompletion,
  runGeminiFallback,
  aiConfigured,
  type WorkersAIMessage,
} from './workers-ai'

export const MAX_INPUT_CHARS = 40_000

/** Teto absoluto do que a IA consegue ler (via chunking) de um edital. */
export const EDITAL_MAX_CHARS = 600_000

/** Abaixo disso, o modelo lê o documento inteiro de uma vez. */
const FULL_PASS_MAX_CHARS = 80_000

/** Tamanho de cada trecho na leitura por chunks (map-reduce / retrieval). */
const CHUNK_MAX_CHARS = 40_000

/** Máximo de trechos incluídos no contexto do chat para documentos extensos. */
const RETRIEVAL_MAX_CHUNKS = 3

const TOKEN_STOP = new Set([
  'para', 'sobre', 'entre', 'até', 'ate', 'após', 'depois', 'antes', 'sendo', 'ser', 'são', 'foram',
  'quando', 'quando', 'onde', 'qual', 'quais', 'quanto', 'como', 'neste', 'nesta', 'nesse', 'nessa',
  'este', 'esta', 'esses', 'essas', 'seus', 'suas', 'não', 'mais', 'menos', 'muito', 'toda', 'todo',
  'todos', 'todas', 'pelos', 'pelas', 'pelo', 'pela', 'deste', 'desta', 'desses', 'outro', 'outra',
  'outros', 'outras', 'também', 'ainda', 'sempre', 'durante', 'segundo', 'terceiro', 'procedimento',
  'processo', 'documento', 'edital', 'licitação', 'licitacao', 'contrato', 'contudo', 'porém', 'assim',
])

/** Limita o texto enviado ao modelo (proteção de free tier). */
export function limitInput(texto: string): string {
  const t = (texto || '').trim()
  return t.length > MAX_INPUT_CHARS ? t.slice(0, MAX_INPUT_CHARS) : t
}

/** Limita o documento completo ao teto legível pela IA (via chunking). */
export function limitDoc(texto: string): string {
  const t = (texto || '').trim()
  return t.length > EDITAL_MAX_CHARS ? t.slice(0, EDITAL_MAX_CHARS) : t
}

export interface AnalisarResult {
  ok: boolean
  markdown?: string
  modelo?: string
  error?: string
}

/**
 * Divide o texto em trechos de até `maxChars`, preferindo quebras de parágrafo
 * e linha (não corta palavras no meio).
 */
export function splitIntoChunks(texto: string, maxChars: number = CHUNK_MAX_CHARS): string[] {
  const t = (texto || '').trim()
  if (!t) return []
  if (t.length <= maxChars) return [t]

  const out: string[] = []
  let resto = t
  while (resto.length > maxChars) {
    const fatia = resto.slice(0, maxChars)
    let corte = Math.max(fatia.lastIndexOf('\n\n'), fatia.lastIndexOf('\n'))
    if (corte < maxChars * 0.5) {
      corte = Math.max(fatia.lastIndexOf(' '), fatia.lastIndexOf('.'))
    }
    if (corte <= 0) corte = maxChars
    const pedaco = fatia.slice(0, corte).trim()
    if (pedaco) out.push(pedaco)
    resto = resto.slice(corte).trim()
  }
  if (resto) out.push(resto)
  return out
}

function buildUserMessage(alvo: string): string {
  return `Analise o edital/licitação abaixo e produza a análise executiva conforme suas instruções.\n\n--- INÍCIO DO DOCUMENTO ---\n${alvo}\n--- FIM DO DOCUMENTO ---`
}

/**
 * Gera o resumo de um trecho usando o Workers AI. Lança erro quando falha
 * (o chamador decide como reportar).
 */
async function resumirTrecho(trecho: string): Promise<string> {
  const r = await runChatCompletion(
    DEFAULT_MODEL,
    [
      { role: 'system', content: CHUNK_SUMMARY_PROMPT },
      { role: 'user', content: `--- TRECHO DO EDITAL ---\n${trecho}\n--- FIM DO TRECHO ---` },
    ],
    { maxTokens: 1400, temperature: 0.2 }
  )
  if (!(r.ok && r.text)) {
    throw new Error(r.error || 'Falha ao resumir o edital.')
  }
  return r.text
}

/**
 * Map-reduce: se o documento passar do limite de contexto único, resumimos
 * cada trecho e voltamos a analisar sobre os resumos (recursivamente se ainda
 * for grande). Garante que o edital inteiro (até EDITAL_MAX_CHARS) seja lido.
 */
async function comprimirParaAnalise(
  content: string
): Promise<{ texto: string; trechos: number }> {
  if (content.length <= FULL_PASS_MAX_CHARS) return { texto: content, trechos: 1 }
  const chunks = splitIntoChunks(content)
  const resumos: string[] = []
  for (const ch of chunks) {
    resumos.push(await resumirTrecho(ch))
  }
  const unido = resumos.join('\n\n')
  if (unido.length > FULL_PASS_MAX_CHARS) {
    const reduzido = await comprimirParaAnalise(unido)
    return { texto: reduzido.texto, trechos: reduzido.trechos + chunks.length }
  }
  return { texto: unido, trechos: chunks.length }
}

/**
 * Analisa o conteúdo de um edital e devolve a análise em markdown.
 */
export async function analisarEdital(texto: string): Promise<AnalisarResult> {
  const content = limitDoc(texto)
  if (!content) {
    return { ok: false, error: 'Nenhum conteúdo fornecido para análise.' }
  }

  // 1) Tenta Workers AI (nativo, sem custo no free tier).
  if (await aiConfigured()) {
    try {
      const { texto: alvo } = await comprimirParaAnalise(content)
      const r = await runChatCompletion(
        DEFAULT_MODEL,
        [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserMessage(alvo) },
        ],
        { maxTokens: 2048, temperature: 0.3 }
      )
      if (r.ok && r.text) {
        return { ok: true, markdown: r.text, modelo: DEFAULT_MODEL }
      }
      // Workers AI ESTÁ conectado, mas esta chamada falhou: reportar o erro REAL
      // em vez de mascará-lo com o fallback (que pode nem estar configurado).
      if (r.error) {
        return { ok: false, error: `Workers AI: ${r.error}` }
      }
      // Se não veio erro, tenta o Gemini como fallback (não configurado -> aviso).
    } catch (e) {
      return { ok: false, error: `Workers AI: ${(e as Error)?.message || 'erro inesperado'}` }
    }
  }

  // 2) Fallback opcional: Gemini (lê documentos longos sem chunking).
  const g = await runGeminiFallback(SYSTEM_PROMPT, buildUserMessage(limitDoc(content)))
  if (g.ok && g.text) {
    return { ok: true, markdown: g.text, modelo: GEMINI_FALLBACK_MODEL }
  }
  if (g.error) {
    return { ok: false, error: g.error }
  }

  return {
    ok: false,
    error:
      'IA não configurada. Adicione a binding `ai` do Workers AI (ou GEMINI_API_KEY) no worker e faça deploy.',
  }
}

// ============================================================================
// Assistente de perguntas sobre o edital carregado (chat em /ia-licitacoes)
// ============================================================================

export interface ChatMensagem {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatResult {
  ok: boolean
  resposta?: string
  modelo?: string
  error?: string
}

function tokensDe(texto: string): string[] {
  const norm = (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  const raw = norm.split(/[^a-z0-9]+/).filter((p) => p.length >= 3)
  const vistos = new Set<string>()
  const unicos: string[] = []
  for (const p of raw) {
    if (!TOKEN_STOP.has(p) && !vistos.has(p)) {
      vistos.add(p)
      unicos.push(p)
    }
  }
  return unicos
}

/**
 * Para documentos extensos: seleciona os trechos com maior sobreposição de
 * palavras com a pergunta e os monta como contexto (retrieval simples).
 */
function trechosRelevantes(content: string, pergunta: string): string {
  const chunks = splitIntoChunks(content)
  if (chunks.length <= RETRIEVAL_MAX_CHUNKS) return content

  const alvo = tokensDe(pergunta)
  const pontuados = chunks.map((ch, idx) => {
    const tokens = new Set(tokensDe(ch))
    let score = 0
    for (const tk of alvo) if (tokens.has(tk)) score++
    // Quem inclui o início do documento (objeto, órgão, valor) sempre ajuda.
    if (idx === 0) score += 1
    return { idx, score }
  })
  pontuados.sort((a, b) => b.score - a.score)
  const top = pontuados.slice(0, RETRIEVAL_MAX_CHUNKS).sort((a, b) => a.idx - b.idx)

  const partes = top.map(
    (t) => `--- TRECHO ${t.idx + 1} de ${chunks.length} ---\n${chunks[t.idx]}\n--- FIM DO TRECHO ---`
  )
  return (
    '(O edital é extenso e foi dividido em trechos; abaixo apenas os trechos mais relevantes ' +
    'à pergunta do usuário. Se a informação não estiver neles, responda "não informado no documento".)\n\n' +
    partes.join('\n\n')
  )
}

/**
 * Responde a uma pergunta do usuário com base no edital carregado e no
 * histórico da conversa. Reutiliza a mesma infraestrutura do Workers AI
 * (com fallback opcional para Gemini).
 */
export async function chatSobreEdital(
  edital: string,
  historico: ChatMensagem[]
): Promise<ChatResult> {
  const content = limitDoc(edital)
  const pergunta = [...historico].reverse().find((m) => m.role === 'user')?.content || ''

  const contexto =
    content.length <= FULL_PASS_MAX_CHARS || !(await aiConfigured())
      ? content
      : trechosRelevantes(content, pergunta)

  const mensagens = mountChatMessages({
    edital: contexto,
    historico: historico.filter((m) => m.content && m.content.trim()).slice(-10),
  })

  // 1) Workers AI (nativo, sem custo no free tier).
  if (await aiConfigured()) {
    const r = await runChatCompletion(
      DEFAULT_MODEL,
      mensagens as WorkersAIMessage[],
      { maxTokens: 1024, temperature: 0.3 }
    )
    if (r.ok && r.text) {
      return { ok: true, resposta: r.text, modelo: DEFAULT_MODEL }
    }
    // Workers AI ESTÁ conectado, mas esta chamada falhou: reportar o erro REAL
    // em vez de mascará-lo com o fallback (que pode nem estar configurado).
    if (r.error) {
      return { ok: false, error: `Workers AI: ${r.error}` }
    }
    // Se não veio erro, tenta o Gemini como fallback (não configurado -> aviso).
  }

  // 2) Fallback opcional: Gemini.
  const userLast = [...historico].reverse().find((m) => m.role === 'user')
  const g = await runGeminiFallback(
    SYSTEM_PROMPT_CHAT,
    `Contexto (edital carregado):\n${limitInput(edital) || '(nenhum edital carregado)'}\n\nPergunta do usuário:\n${userLast?.content || '(pergunta)'}`
  )
  if (g.ok && g.text) {
    return { ok: true, resposta: g.text, modelo: GEMINI_FALLBACK_MODEL }
  }
  if (g.error) {
    return { ok: false, error: g.error }
  }

  return {
    ok: false,
    error:
      'IA não configurada. Adicione a binding `ai` do Workers AI (ou GEMINI_API_KEY) no worker e faça deploy.',
  }
}