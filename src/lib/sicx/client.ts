'use client'

/**
 * Helper de chamadas do SICX no cliente.
 * - `cache: 'no-store'` para nunca servir dado velho;
 * - sessão expirada (401) redireciona para o login;
 * - erros em português.
 */
export async function apiSicx<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, { cache: 'no-store', ...init })
  if (r.status === 401) {
    if (typeof window !== 'undefined') {
      const vol = window.location.pathname + window.location.search
      // Redirect completo é intencional: renova a sessão no servidor antes de voltar.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = `/login?redirect=${encodeURIComponent(vol)}`
    }
    throw new Error('Sua sessão expirou. Redirecionando para o login...')
  }
  const j = (await r.json().catch(() => null)) as (T & { ok?: boolean; erro?: string }) | null
  if (!r.ok || !j?.ok) {
    throw new Error(j?.erro || 'Não foi possível concluir a operação. Tente novamente.')
  }
  return j
}

/** Versão para formulários públicos: não redireciona em 401. */
export async function apiSicxPublico<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, { cache: 'no-store', ...init })
  const j = (await r.json().catch(() => null)) as (T & { ok?: boolean; erro?: string }) | null
  if (!r.ok || !j?.ok) {
    throw new Error(j?.erro || 'Não foi possível concluir o envio. Tente novamente.')
  }
  return j
}

/**
 * Chamada de ferramenta em página PÚBLICA: se a sessão não existir, devolve
 * `null` (a UI mostra o convite para entrar) em vez de redirecionar o visitante.
 */
export async function apiSicxOpcional<T = unknown>(path: string, init?: RequestInit): Promise<T | null> {
  const r = await fetch(path, { cache: 'no-store', ...init })
  if (r.status === 401) return null
  const j = (await r.json().catch(() => null)) as (T & { ok?: boolean; erro?: string }) | null
  if (!r.ok || !j?.ok) {
    throw new Error(j?.erro || 'Não foi possível concluir a operação. Tente novamente.')
  }
  return j
}

export function jsonInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }
}
