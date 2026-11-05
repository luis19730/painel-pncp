// Helpers de validação/normalização para as rotas do SICX.

export function texto(valor: unknown, max = 500): string | null {
  const s = String(valor ?? '').trim()
  return s ? s.slice(0, max) : null
}

export function textoObrigatorio(valor: unknown, max = 500): string {
  return texto(valor, max) || ''
}

export function numero(valor: unknown, casas = 2): number | null {
  const n = Number(String(valor ?? '').replace(',', '.'))
  if (!Number.isFinite(n)) return null
  const fator = 10 ** casas
  return Math.round(n * fator) / fator
}

export function inteiro(valor: unknown): number | null {
  const n = Number(valor)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

export function objeto(valor: unknown): Record<string, unknown> {
  return valor && typeof valor === 'object' && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {}
}

export function lista<T>(valor: unknown): T[] {
  return Array.isArray(valor) ? (valor as T[]) : []
}

export function booleano(valor: unknown): boolean {
  return valor === true || valor === 'true' || valor === 1 || valor === '1'
}

/** Data ISO (YYYY-MM-DD) ou null. */
export function dataISO(valor: unknown): string | null {
  const s = texto(valor, 32)
  if (!s) return null
  const d = new Date(s.length <= 10 ? `${s}T00:00:00` : s)
  if (Number.isNaN(d.getTime())) return null
  return s.slice(0, 10)
}

/** Normaliza CNPJ para 14 dígitos. */
export function cnpjDigitos(valor: unknown): string {
  return String(valor ?? '').replace(/\D/g, '').slice(0, 14)
}

/** Formata CNPJ para exibição. */
export function formatarCnpj(cnpj: string): string {
  const d = cnpjDigitos(cnpj)
  if (d.length !== 14) return cnpj
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

export function emailValido(valor: unknown): string | null {
  const s = texto(valor, 160)?.toLowerCase()
  if (!s) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) return null
  return s
}

/** Só aceita http(s) e devolve null para javascript:, data: etc. */
export function urlSegura(valor: unknown): string | null {
  const s = texto(valor, 1200)
  if (!s) return null
  try {
    const u = new URL(s)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u.toString()
  } catch {
    return null
  }
}
