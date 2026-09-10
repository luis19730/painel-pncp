'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/button'
import Input from '@/components/ui/input'
import GoogleAuthButton from '@/components/auth/google-auth-button'
import { cooldownRemaining, setCooldown, messageForCooldown } from '@/lib/auth-cooldown'
import { track } from '@/lib/analytics'

function readUrlError(): string {
  if (typeof window === 'undefined') return ''
  const params = new URLSearchParams(window.location.search)
  return params.get('error') ?? ''
}

function readRedirect(): string {
  if (typeof window === 'undefined') return '/dashboard'
  const params = new URLSearchParams(window.location.search)
  const target = params.get('redirect') || params.get('next')
  if (!target) return '/dashboard'
  if (!target.startsWith('/') || target.startsWith('//')) return '/dashboard'
  return target
}

function isUnconfirmedError(msg: string): boolean {
  return /not confirmed|n[ií]o confirmado|confirmar|verifiqu/i.test(msg)
}

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  // "Salvar login": restaura credenciais salvas deste navegador.
  const readSaved = () => {
    try {
      const raw = localStorage.getItem('pncp:login:saved')
      if (!raw) return null
      const parsed = JSON.parse(raw) as { email?: string; password?: string; remember?: boolean }
      if (!parsed) return null
      return {
        email: parsed.email || '',
        password: parsed.password || '',
        remember: Boolean(parsed.remember),
      }
    } catch {
      return null
    }
  }

  const saved = readSaved()

  const [email, setEmail] = useState(saved?.email || '')
  const [password, setPassword] = useState(saved?.password || '')
  const [error, setError] = useState(readUrlError)
  const [loading, setLoading] = useState(false)

  const [remember, setRemember] = useState(Boolean(saved?.remember))

  const persistSaved = () => {
    try {
      if (remember && email.trim()) {
        localStorage.setItem(
          'pncp:login:saved',
          JSON.stringify({ email: email.trim(), password, remember: true })
        )
      } else {
        localStorage.removeItem('pncp:login:saved')
      }
    } catch {}
  }

  const [unconfirmed, setUnconfirmed] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setResent(false)
    setLoading(true)

    try {
      const { error: authError, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        if (isUnconfirmedError(authError.message)) {
          setUnconfirmed(true)
        } else {
          setError(
            authError.message === 'Invalid login credentials'
              ? 'E-mail ou senha inválidos.'
              : authError.message
          )
        }
        setLoading(false)
        return
      }

      // Caso o login seja liberado mesmo sem confirmação configurada,
      // garantir que o e-mail confirmado seja exigido apenas se aplicável.
      const user = data.user
      if (user && user.email_confirmed_at == null && user.app_metadata?.provider !== 'google') {
        await supabase.auth.signOut()
        setUnconfirmed(true)
        setLoading(false)
        return
      }

      router.push(readRedirect())
      persistSaved()
      try {
        track({ event: 'login', page: 'login' })
      } catch {}
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.')
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resending) return
    const remaining = cooldownRemaining(email.trim().toLowerCase())
    if (remaining > 0) {
      setError(messageForCooldown(remaining))
      return
    }
    setError('')
    setResent(false)
    setResending(true)

    try {
      const res = await fetch('/api/auth/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        setError(data?.erro || 'Não foi possível reenviar. Tente novamente.')
        setResending(false)
        return
      }

      setCooldown(email.trim().toLowerCase())
      setResent(true)
      setResending(false)
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.')
      setResending(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 shadow-xl shadow-slate-200/40 dark:shadow-none">
      <h1 className="text-2xl font-extrabold font-display text-slate-900 dark:text-white mb-1">Entrar</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Acesse sua conta para gerenciar suas licitações.
      </p>

      {unconfirmed ? (
        <div>
          <div className="mb-4 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm text-amber-700 dark:text-amber-400">
            <p className="font-semibold mb-1">Seu e-mail ainda não foi confirmado.</p>
            <p>Envie um novo link de confirmação para <strong>{email}</strong> e verifique sua caixa de entrada (e também o spam).</p>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-danger-soft dark:bg-red-500/10 border border-danger/20 text-sm text-danger">
              {error}
            </div>
          )}
          {resent && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-success-soft dark:bg-emerald-500/10 border border-success/20 text-sm text-success">
              Novo link de confirmação enviado. Verifique sua caixa de entrada e também o spam.
            </div>
          )}

          <div className="space-y-3">
            <Button className="w-full" onClick={handleResend} disabled={resending} loading={resending}>
              {resending ? 'Enviando...' : 'REENVIAR E-MAIL DE CONFIRMAÇÃO'}
            </Button>
            <button
              onClick={() => {
                setUnconfirmed(false)
                setEmail('')
                setPassword('')
                setError('')
              }}
              className="block w-full text-sm text-slate-500 dark:text-slate-400 font-medium hover:text-primary transition-colors"
            >
              Tentar com outro e-mail
            </button>
          </div>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-danger-soft dark:bg-red-500/10 border border-danger/20 text-sm text-danger">
              {error}
            </div>
          )}

          <GoogleAuthButton mode="login" />

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">ou</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Senha"
              type="password"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <label className="flex items-center gap-2.5 select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary dark:border-slate-600"
              />
              <span className="text-sm text-slate-600 dark:text-slate-300">
                Salvar o login neste navegador
              </span>
            </label>
            <Button type="submit" className="w-full" disabled={loading} loading={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </>
      )}

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Não tem conta?{' '}
        <Link href="/cadastro" className="text-primary hover:text-primary-hover font-semibold">
          Criar conta
        </Link>
      </p>
    </div>
  )
}
