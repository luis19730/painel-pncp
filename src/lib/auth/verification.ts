// ============================================================================
// Confirmação de e-mail por TOKEN PRÓPRIO (KV).
//
// Por que não usar o Supabase para isso? O projeto está com "Confirm email"
// DESLIGADO: o `signUp` público confirma o e-mail na hora e retorna sessão,
// deixando o usuário entrar no painel sem verificar o endereço. Este módulo
// cria um token aleatório de uso único (32 bytes) e guarda SOMENTE o hash
// SHA-256 no KV (namespace EDITAIS_KV, prefixos próprios), junto com validade
// (24h) e marca de uso. Só quem possui o token (link do e-mail) consegue
// confirmar.
//
// O binding do KV é o mesmo `env.EDITAIS_KV` já exposto pelo worker em
// globalThis (ver src/lib/ia/kv-edital.ts). Nenhuma migração de banco é
// necessária.
// ============================================================================

import { getEditaisKV } from '@/lib/ia/kv-edital'

const TOKEN_PREFIX = 'auth_verif:'
const EMAIL_PREFIX = 'auth_verif_email:'

/** Validade do link de confirmação. */
export const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000
/** TTL físico no KV (48h) — folga para exibir "expirado"/"usado". */
const KV_TTL_S = 48 * 60 * 60

export interface StoredVerification {
  uid: string
  email: string
  expiresAt: number
  usedAt: number | null
}

interface EmailPointer {
  uid: string
  hash: string
}

type KVStore = {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
}

async function store(): Promise<KVStore | null> {
  return ((await getEditaisKV()) as KVStore | null) ?? null
}

/** Gera um token aleatório de 32 bytes codificado em base64url (uso único). */
export function gerarToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Hash SHA-256 hex — é isso que é persistido, nunca o token em claro. */
export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function readToken(hash: string): Promise<StoredVerification | null> {
  const kv = await store()
  if (!kv) return null
  try {
    const raw = await kv.get(TOKEN_PREFIX + hash)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredVerification>
    if (!parsed?.uid || !parsed?.email || typeof parsed.expiresAt !== 'number') return null
    return {
      uid: parsed.uid,
      email: parsed.email,
      expiresAt: parsed.expiresAt,
      usedAt: typeof parsed.usedAt === 'number' ? parsed.usedAt : null,
    }
  } catch {
    return null
  }
}

async function writeToken(hash: string, data: StoredVerification): Promise<boolean> {
  const kv = await store()
  if (!kv) return false
  try {
    await kv.put(TOKEN_PREFIX + hash, JSON.stringify(data), { expirationTtl: KV_TTL_S })
    return true
  } catch {
    return false
  }
}

async function deleteToken(hash: string): Promise<void> {
  const kv = await store()
  if (!kv) return
  try {
    await kv.delete(TOKEN_PREFIX + hash)
  } catch {
    // tolerado: TTL cuida da limpeza
  }
}

async function readEmailPointer(email: string): Promise<EmailPointer | null> {
  const kv = await store()
  if (!kv) return null
  try {
    const raw = await kv.get(EMAIL_PREFIX + email)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<EmailPointer>
    if (!parsed?.uid || !parsed?.hash) return null
    return { uid: parsed.uid, hash: parsed.hash }
  } catch {
    return null
  }
}

async function writeEmailPointer(email: string, pointer: EmailPointer): Promise<boolean> {
  const kv = await store()
  if (!kv) return false
  try {
    await kv.put(EMAIL_PREFIX + email, JSON.stringify(pointer), { expirationTtl: KV_TTL_S })
    return true
  } catch {
    return false
  }
}

/**
 * Cria um novo token de verificação para o usuário, INVALIDANDO o token
 * anterior do mesmo e-mail (de uso único). Retorna o token em claro (para
 * montar o link do e-mail) ou null se o KV estiver indisponível.
 */
export async function criarVerificacao(uid: string, email: string): Promise<string | null> {
  const prev = await readEmailPointer(email)
  if (prev?.hash) await deleteToken(prev.hash)

  const token = gerarToken()
  const hash = await sha256Hex(token)
  const data: StoredVerification = {
    uid,
    email,
    expiresAt: Date.now() + VERIFICATION_TTL_MS,
    usedAt: null,
  }
  const okTok = await writeToken(hash, data)
  const okPtr = await writeEmailPointer(email, { uid, hash })
  if (!okTok || !okPtr) return null
  return token
}

export type ConfirmStatus = 'ok' | 'usado' | 'expirado' | 'invalido'

export interface ConfirmResult {
  status: ConfirmStatus
  uid?: string
  email?: string
}

/**
 * Valida o token: existência, uso único e expiração. Não altera nada — a rota
 * decide confirmar depois (marcarUsado + admin.updateUserById).
 */
export async function confirmarToken(token: string): Promise<ConfirmResult> {
  const hash = await sha256Hex(token)
  const rec = await readToken(hash)
  if (!rec) return { status: 'invalido' }
  if (rec.usedAt) return { status: 'usado', uid: rec.uid, email: rec.email }
  if (Date.now() > rec.expiresAt) return { status: 'expirado', uid: rec.uid, email: rec.email }
  return { status: 'ok', uid: rec.uid, email: rec.email }
}

/** Marca o token como utilizado (impede reutilização). */
export async function marcarUsado(token: string): Promise<void> {
  const hash = await sha256Hex(token)
  const rec = await readToken(hash)
  if (!rec) return
  await writeToken(hash, { ...rec, usedAt: Date.now() })
}

/** Retorna o uid do usuário associado a um e-mail (para reenvio). */
export async function encontrarUidPorEmail(email: string): Promise<string | null> {
  const pointer = await readEmailPointer(email)
  return pointer?.uid ?? null
}

/** Remove a ponta de rastreio do e-mail (após confirmação bem-sucedida). */
export async function limparEmailPointer(email: string): Promise<void> {
  const kv = await store()
  if (!kv) return
  try {
    await kv.delete(EMAIL_PREFIX + email)
  } catch {
    // tolerado
  }
}