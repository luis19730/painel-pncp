import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/alerts/notifications/email'
import { criarVerificacao, encontrarUidPorEmail } from '@/lib/auth/verification'
import { siteBaseUrl } from '@/lib/auth/site-url'
import { confirmationEmailHtml, confirmationEmailText } from '@/lib/auth/confirm-email'

const COOLDOWN_MS = 60_000
const MAX_ATTEMPTS = 5

const MEMORY = new Map<string, number[]>()

function clientIp(req: Request): string {
  const cf = req.headers.get('cf-connecting-ip')
  if (cf) return cf
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return 'unknown'
}

function tooMany(ip: string, email: string): boolean {
  const now = Date.now()
  const key = `${ip}:${email}`
  const hits = (MEMORY.get(key) || []).filter((t) => now - t < COOLDOWN_MS)
  MEMORY.set(key, [...hits, now])
  return hits.length >= MAX_ATTEMPTS
}

/**
 * POST /api/auth/resend
 *
 * Gera um NOVO token de confirmação (o anterior é invalidado — uso único) para
 * um e-mail já cadastrado e NÃO confirmado, e envia o link por e-mail. Nunca
 * cria conta; tem rate limit por IP+e-mail.
 */
export async function POST(req: Request) {
  const raw: unknown = await req.json().catch(() => null)
  if (!raw || typeof raw !== 'object') {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido.' }, { status: 400 })
  }
  const email = String((raw as Record<string, unknown>)?.email || '').trim().toLowerCase()
  if (!email) {
    return NextResponse.json({ ok: false, erro: 'E-mail obrigatório.' }, { status: 400 })
  }

  const ip = clientIp(req)
  if (tooMany(ip, email)) {
    return NextResponse.json(
      { ok: false, erro: 'Você tentou reenviar muitas vezes. Aguarde alguns minutos.' },
      { status: 429 }
    )
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json(
      { ok: false, erro: 'Serviço temporariamente indisponível. Tente novamente em instantes.' },
      { status: 503 }
    )
  }

  // O e-mail precisa existir (nunca criamos outra conta aqui).
  const uid = await encontrarUidPorEmail(email)
  if (!uid) {
    return NextResponse.json(
      { ok: false, erro: 'Este e-mail ainda não está cadastrado. Crie uma conta primeiro.' },
      { status: 404 }
    )
  }

  // Contas já confirmadas não precisam de reenvio.
  const { data: userData } = await admin.auth.admin.getUserById(uid)
  if (userData?.user?.email_confirmed_at) {
    return NextResponse.json(
      { ok: false, erro: 'Este e-mail já está confirmado. Faça login para continuar.' },
      { status: 409 }
    )
  }

  try {
    const token = await criarVerificacao(uid, email)
    if (!token) {
      return NextResponse.json(
        { ok: false, erro: 'Não foi possível gerar o novo link. Tente novamente em instantes.' },
        { status: 503 }
      )
    }

    const name = String(userData?.user?.user_metadata?.name ?? '')
    const base = siteBaseUrl(req)
    const link = `${base}/auth/confirm?token=${encodeURIComponent(token)}`
    const html = confirmationEmailHtml(name || email.split('@')[0] || 'lá', link)
    const result = await sendEmail({
      to: email,
      subject: 'Confirme seu e-mail — Painel PNCP',
      html,
      text: confirmationEmailText(name, link),
    })

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, erro: result.erro || 'Não foi possível enviar o e-mail. Tente novamente.' },
        { status: result.notConfigured ? 502 : 500 }
      )
    }
  } catch {
    return NextResponse.json(
      { ok: false, erro: 'Não foi possível enviar o e-mail. Tente novamente em instantes.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}