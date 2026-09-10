// ============================================================================
// Acesso ao binding `AI` do Workers AI.
//
// Em produção (Vinext/Cloudflare Workers) o binding é acessado diretamente via
// `import { env } from "cloudflare:workers"` — o caminho recomendado e o único
// que funciona no worker gerado pelo Vinext (não há mais um custom `worker.ts`
// fazendo `exposeAI`). Em dev (Next.js puro) não há binding; getWorkerAI()
// retorna null e o sistema degrada sem o Workers AI nativo.
// ============================================================================

const AI_GLOBAL = '__PAINEL_PNCP_AI__'

export async function getWorkerAI(): Promise<unknown> {
  try {
    const cf = await import('cloudflare:workers')
    const ai = (cf as unknown as { env?: Record<string, unknown> })?.env?.AI
    if (ai) return ai
  } catch {
    // sem cloudflare:workers (ex.: dev Next) — tenta o fallback legado
  }
  return (globalThis as Record<string, unknown>)[AI_GLOBAL] ?? null
}

/** Fallback legado: guarda o binding em globalThis (não usado no Vinext). */
export function exposeAI(ai: unknown): void {
  ;(globalThis as Record<string, unknown>)[AI_GLOBAL] = ai
}
