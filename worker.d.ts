// ============================================================================
// Declarações de tipos para o runtime do Cloudflare Workers (usado pelo Vinext).
//
// Em produção (Workers) o módulo `cloudflare:workers` existe nativamente;
// estas declarações são apenas para o typecheck/build local (TS não o conhece).
// ============================================================================

interface KVNamespaceLike {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
}

interface WorkerAIJSLike {
  run(model: string, input: unknown): Promise<{ response?: string; result?: string }>
  toMarkdown?(input: unknown): Promise<unknown>
}

interface WorkersEnvLike {
  EDITAIS_KV?: KVNamespaceLike
  AI?: WorkerAIJSLike
  [key: string]: unknown
}

declare module 'cloudflare:workers' {
  export const env: WorkersEnvLike
}
