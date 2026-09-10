// ============================================================================
// Persistência do edital importado por usuário (KV namespace `EDITAIS_KV`).
//
// Em produção (Vinext/Cloudflare Workers) o binding é acessado diretamente via
// `import { env } from "cloudflare:workers"` — o caminho recomendado e o único
// que funciona no worker gerado pelo Vinext (não há mais um custom `worker.ts`
// fazendo `exposeEditaisKV`). Em dev (Next.js puro) não há binding; as chamadas
// retornam null e o sistema degrada sem persistência no servidor.
// ============================================================================

export interface EditalSalvo {
  conteudo: string
  origem: 'texto' | 'pdf'
  nomeArquivo: string | null
  chars: number
  atualizadoEm: string
  ocr?: boolean
}

const KV_GLOBAL = '__PAINEL_PNCP_EDITAIS_KV__'

/** Retorna o binding do KV, ou null se indisponível (ex.: dev Next). */
export async function getEditaisKV(): Promise<unknown> {
  try {
    const cf = await import('cloudflare:workers')
    const kv = (cf as unknown as { env?: Record<string, unknown> })?.env?.EDITAIS_KV
    if (kv) return kv
  } catch {
    // sem cloudflare:workers (ex.: dev Next) — tenta o fallback legado
  }
  return (globalThis as Record<string, unknown>)[KV_GLOBAL] ?? null
}

/** Fallback legado: guarda o binding em globalThis (usado por worker custom). */
export function exposeEditaisKV(kv: unknown): void {
  ;(globalThis as Record<string, unknown>)[KV_GLOBAL] = kv
}

const keyFor = (userId: string) => `edital:${userId}`

export async function salvarEdital(
  kv: unknown,
  userId: string,
  edital: Omit<EditalSalvo, 'atualizadoEm'>
): Promise<boolean> {
  try {
    const store = kv as {
      put(key: string, value: string): Promise<void>
    } | null
    if (!store) return false
    await store.put(keyFor(userId), JSON.stringify({ ...edital, atualizadoEm: new Date().toISOString() } satisfies EditalSalvo))
    return true
  } catch {
    return false
  }
}

export async function carregarEdital(kv: unknown, userId: string): Promise<EditalSalvo | null> {
  try {
    const store = kv as {
      get(key: string): Promise<string | null>
    } | null
    if (!store) return null
    const val = await store.get(keyFor(userId))
    if (!val) return null
    const parsed = JSON.parse(val) as Partial<EditalSalvo>
    if (!parsed?.conteudo) return null
    return {
      conteudo: parsed.conteudo,
      origem: parsed.origem === 'pdf' ? 'pdf' : 'texto',
      nomeArquivo: typeof parsed.nomeArquivo === 'string' ? parsed.nomeArquivo : null,
      chars: typeof parsed.chars === 'number' ? parsed.chars : parsed.conteudo.length,
      atualizadoEm: typeof parsed.atualizadoEm === 'string' ? parsed.atualizadoEm : '',
      ocr: typeof parsed.ocr === 'boolean' ? parsed.ocr : false,
    }
  } catch {
    return null
  }
}

export async function removerEdital(kv: unknown, userId: string): Promise<boolean> {
  try {
    const store = kv as {
      delete(key: string): Promise<void>
    } | null
    if (!store) return false
    await store.delete(keyFor(userId))
    return true
  } catch {
    return false
  }
}