'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/layout/logo'
import Button from '@/components/ui/button'
import Input from '@/components/ui/input'
import { MailCheck, MailX, Clock, Loader2 } from 'lucide-react'
import { cooldownRemaining, setCooldown, messageForCooldown } from '@/lib/auth-cooldown'

function ConfirmationInner() {
  const params = useSearchParams()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [error, setError] = useState('')

  const status = params.get('status') || 'ok'
  const motivo = params.get('motivo') || ''

  const handleResend = async () => {
    if (resending) return
    const key = email.trim().toLowerCase()
    const remaining = cooldownRemaining(key)
    if (remaining > 0) {
      setError(messageForCooldown(remaining))
      return
    }
    setResending(true)
    setError('')
    setResent(false)

    const target = email.trim()
    if (!target) {
      setError('Informe seu e-mail para reenviar o link.')
      setResending(false)
      return
    }

    try {
      // Envio pelo servidor (gera novo token e invalida o anterior).
      const res = await fetch('/api/auth/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: target }),
      })
      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        setError(data?.erro || 'Não foi possível reenviar. Tente novamente.')
        setResending(false)
        return
      }

      setCooldown(key)
      setResent(true)
      setResending(false)
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.')
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-slate-50 dark:bg-[#0b1120]">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Logo size="lg" />
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 shadow-xl shadow-slate-200/40 dark:shadow-none text-center">
          {status === 'ok' ? (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-success-soft dark:bg-emerald-500/10 flex items-center justify-center mb-5">
                <MailCheck className="w-8 h-8 text-success" />
              </div>
              <h1 className="text-2xl font-extrabold font-display text-slate-900 dark:text-white mb-2">
                E-mail confirmado com sucesso!
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Sua conta está ativa. Agora você pode acessar o Painel PNCP.
              </p>
              <Button className="w-full" onClick={() => router.push('/login')}>
                Ir para o Login
              </Button>
            </>
          ) : status === 'expirado' ? (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-5">
                <Clock className="w-8 h-8 text-amber-500" />
              </div>
              <h1 className="text-2xl font-extrabold font-display text-slate-900 dark:text-white mb-2">
                Este link de confirmação expirou.
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Solicite um novo e-mail de confirmação.
              </p>
              <Input
                label="E-mail cadastrado"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {error && <p className="mt-2 text-xs text-danger text-left">{error}</p>}
              {resent && (
                <p className="mt-2 text-xs text-success text-left">
                  Novo link de confirmação enviado. Verifique sua caixa de entrada e também o spam.
                </p>
              )}
              <div className="mt-4 space-y-3">
                <Button className="w-full" onClick={handleResend} disabled={resending} loading={resending}>
                  {resending ? 'Enviando...' : 'ENVIAR NOVO E-MAIL DE CONFIRMAÇÃO'}
                </Button>
              </div>
            </>
          ) : status === 'usado' ? (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-success-soft dark:bg-emerald-500/10 flex items-center justify-center mb-5">
                <MailCheck className="w-8 h-8 text-success" />
              </div>
              <h1 className="text-2xl font-extrabold font-display text-slate-900 dark:text-white mb-2">
                E-mail já confirmado.
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Faça login para continuar.
              </p>
              <Button className="w-full" onClick={() => router.push('/login')}>
                Ir para o Login
              </Button>
            </>
          ) : (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-danger-soft dark:bg-red-500/10 flex items-center justify-center mb-5">
                <MailX className="w-8 h-8 text-danger" />
              </div>
              <h1 className="text-2xl font-extrabold font-display text-slate-900 dark:text-white mb-2">
                Não foi possível confirmar.
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                O link de confirmação é inválido ou já foi utilizado.
              </p>
              {motivo && <p className="text-xs text-slate-400 mb-6 break-words">{motivo}</p>}
              <Input
                label="E-mail cadastrado"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {error && <p className="mt-2 text-xs text-danger text-left">{error}</p>}
              {resent && (
                <p className="mt-2 text-xs text-success text-left">
                  Novo link de confirmação enviado. Verifique sua caixa de entrada e também o spam.
                </p>
              )}
              <div className="mt-4 space-y-3">
                <Button className="w-full" onClick={handleResend} disabled={resending} loading={resending}>
                  {resending ? 'Enviando...' : 'REENVIAR E-MAIL DE CONFIRMAÇÃO'}
                </Button>
              </div>
            </>
          )}

          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
            <Link href="/login" className="text-sm text-primary hover:text-primary-hover font-semibold">
              Voltar para o login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ConfirmadoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0b1120]">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      }
    >
      <ConfirmationInner />
    </Suspense>
  )
}
