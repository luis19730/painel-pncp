'use client'

/**
 * Helper de chamadas da Estação no cliente.
 * - `cache: 'no-store'` (nunca serve dado velho);
 * - se a SESSÃO EXPIRAR (HTTP 401), redireciona para o login e volta depois;
 * - devolve erro amigável em português quando algo falha.
 */
export async function apiEstacao<T = any>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const r = await fetch(path, { cache: 'no-store', ...init })
  if (r.status === 401) {
    if (typeof window !== 'undefined') {
      const vol = window.location.pathname + window.location.search
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
