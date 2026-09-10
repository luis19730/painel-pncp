// ============================================================================
// Entry point do WORKER (Cloudflare) — LEGADO / INERTE no fluxo Vinext.
//
// ATENÇÃO: Este arquivo é o `main` do `wrangler.jsonc` raiz, mas o deploy
// Vinext (npm run deploy:vinext) usa o entry GERADO `dist/server/index.js`
// (main index.js), que só exporta `fetch` — este arquivo e seu handler
// `scheduled` NÃO são usados em produção.
//
// Acesse os bindings via `import { env } from "cloudflare:workers"` e processe
// os alertas através do endpoint protegido `/api/cron/alertas` (disparado por
// um cron externo com o CRON_SECRET). Ver src/app/api/cron/alertas/route.ts.
// ============================================================================

import vinextHandler from 'vinext/server/fetch-handler'

import { isConfigured } from '../src/lib/alerts/is-configured'
import { runImmediate, runScheduledBatch } from '../src/lib/alerts/processor'
import { exposeAI } from '../src/lib/ia/ai-global'
import { exposeEditaisKV } from '../src/lib/ia/kv-edital'

type KVNamespace = unknown

export interface WorkerEnv {
  VINEXT_KV_CACHE?: KVNamespace
  EDITAIS_KV?: KVNamespace
  IMAGES?: unknown
  ASSETS?: unknown
  // Binding do Workers AI (vem da config `ai` no wrangler.jsonc).
  AI?: unknown
  // Secrets necessários (configurados no worker, NUNCA no frontend):
  SUPABASE_SERVICE_ROLE_KEY?: string
  BREVO_API_KEY?: string
  BREVO_FROM_EMAIL?: string
  BREVO_FROM_NAME?: string
  RESEND_API_KEY?: string
  RESEND_FROM_EMAIL?: string
  TELEGRAM_BOT_TOKEN?: string
  NEXT_PUBLIC_SUPABASE_URL?: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string
  NEXT_PUBLIC_PNCP_BASE?: string
  NEXT_PUBLIC_PNCP_PROXY?: string
  CLOUDFLARE_ACCOUNT_ID?: string
  CLOUDFLARE_API_TOKEN?: string
  GEMINI_API_KEY?: string
  ADMIN_PASSWORD?: string
  ADMIN_DELETE_PASSWORD?: string
  ADMIN_EMAILS?: string
  CRON_SECRET?: string
}

// O binding do Workers AI (`env.AI`) é exposto em globalThis pelo módulo leve
// `src/lib/ia/ai-global` (exposeAI) — ver ai-global.ts.

function exposeEnv(env: WorkerEnv): void {
  const map = env as Record<string, unknown>
  for (const k of [
    'SUPABASE_SERVICE_ROLE_KEY',
    'BREVO_API_KEY',
    'BREVO_FROM_EMAIL',
    'BREVO_FROM_NAME',
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL',
    'TELEGRAM_BOT_TOKEN',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_PNCP_BASE',
    'NEXT_PUBLIC_PNCP_PROXY',
    'GEMINI_API_KEY',
    'ADMIN_PASSWORD',
    'ADMIN_DELETE_PASSWORD',
    'ADMIN_EMAILS',
    'CRON_SECRET',
  ]) {
    if (map[k] !== undefined && typeof process !== 'undefined' && process.env) {
      ;(process.env as Record<string, unknown>)[k] = map[k]
    }
  }
}

type Ctx = { waitUntil(promise: unknown): void }

/**
 * Handler de FETCH (HTTP) padrão do worker.
 *
 * O Vinext expõe as credenciais do servidor (RESEND, TELEGRAM_BOT_TOKEN, SUPABASE_SERVICE_ROLE)
 * unicamente pela binding `env` do worker — NÃO por `process.env` — em chamadas
 * HTTP (como o botão "Testar e-mail"/"Testar Telegram", que passa por /api/alerts/*).
 * Sem isso, o processo de envio vê as credenciais como ausentes e responde
 * "não configurado". Aqui injetamos o `env` em `process.env` — o mesmo exposto já
 * no handler `scheduled` — antes de delegar ao handler do Next.js.
 */
const worker = {
  async fetch(request: Request, env: WorkerEnv, ctx: Ctx): Promise<Response> {
    exposeEnv(env)
    exposeAI(env.AI)
    exposeEditaisKV(env.EDITAIS_KV)
    return (vinextHandler as unknown as { fetch(request: Request, env: WorkerEnv, ctx: Ctx): Promise<Response> }).fetch(request, env, ctx)
  },
}

export default worker

/**
 * Executado pelo Cron Trigger. A cada tick:
 *   1. envia imediatamente os alertas em modo 'imediato';
 *   2. envia o lote dos alertas programados no horário (Brasília).
 *
 * Se as credenciais do serviço (SERVICE_ROLE / provedores) ainda não estiverem
 * configuradas no worker, nada é enviado — nunca há envio "falso".
 */
interface ScheduledController {
  cron?: string
}
interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void
}

export async function scheduled(controller: ScheduledController, env: WorkerEnv, ctx: ExecutionContext): Promise<void> {
  console.log(`[alertas] cron disparado: ${controller?.cron || '?'}`)
  ctx.waitUntil(
    (async () => {
      exposeEnv(env)
      exposeAI(env.AI)
      exposeEditaisKV(env.EDITAIS_KV)
      if (!isConfigured()) {
        console.log('[alertas] SUPABASE_SERVICE_ROLE_KEY não configurada — processamento adiado (dependência de credencial).')
        return
      }
      try {
        const r1 = await runImmediate()
        console.log(`[alertas] imediato → ${r1.executados.length} ação(ões)`)
      } catch (e) {
        console.error('[alertas] erro no imediato:', (e as Error)?.message)
      }
      try {
        const r2 = await runScheduledBatch()
        console.log(`[alertas] programado → ${r2.executados.length} ação(ões)`)
      } catch (e) {
        console.error('[alertas] erro no programado:', (e as Error)?.message)
      }
    })()
  )
}
