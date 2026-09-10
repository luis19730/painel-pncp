'use client'

import { useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/button'
import Input from '@/components/ui/input'
import GoogleAuthButton from '@/components/auth/google-auth-button'
import { MailCheck, Loader2 } from 'lucide-react'
import { cooldownRemaining, setCooldown, messageForCooldown } from '@/lib/auth-cooldown'
import { track } from '@/lib/analytics'
import { validarEmailCadastro } from '@/lib/auth/email-validation'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function CadastroForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Estados do fluxo de confirmação por e-mail
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)
  const [alreadyRegistered, setAlreadyRegistered] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setResent(false)

    // Validação no frontend (o backend repete todas).
    if (!name.trim()) {
      setError('Informe seu nome.')
      return
    }
    if (!EMAIL_RE.test(email.trim().toLowerCase())) {
      setError('Informe um e-mail válido.')
      return
    }
    const resultadoEmail = validarEmailCadastro(email)
    if (!resultadoEmail.permitido) {
      setError(resultadoEmail.erro!)
      return
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)

    try {
      // Criação feita no SERVIDOR (SERVICE_ROLE): nunca gera sessão no cliente,
      // então o usuário NÃO entra automaticamente antes de confirmar o e-mail.
      const res = await fetch('/api/auth/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, confirmPassword }),
      })
      const data = await res.json().catch(() => null)

      if (!data?.ok) {
        if (data?.tentarReenviar && !data?.code) {
          // Falha ao enviar o e-mail: mostra a tela de verificação COM o erro e
          // o botão de reenviar. O usuário NÃO foi marcado como confirmado.
          setAwaitingConfirmation(true)
        } else if (data?.code === 'email-existe') {
          // E-mail duplicado: orienta a fazer login ou reenviar confirmação.
          setAlreadyRegistered(true)
        }
        setError(data?.erro || 'Não foi possível criar a conta. Tente novamente.')
        setLoading(false)
        return
      }

      setAwaitingConfirmation(true)
      setLoading(false)
      try {
        track({ event: 'signup', page: 'cadastro' })
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

  // Tela de verificação de e-mail (após cadastro)
  if (awaitingConfirmation) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 shadow-xl shadow-slate-200/40 dark:shadow-none text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-success-soft dark:bg-emerald-500/10 flex items-center justify-center mb-5">
          <MailCheck className="w-8 h-8 text-success" />
        </div>
        <h1 className="text-2xl font-extrabold font-display text-slate-900 dark:text-white mb-2">
          Cadastro realizado com sucesso!
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Enviamos um link de confirmação para <strong>{email}</strong>. Confirme seu
          endereço para ativar sua conta e acessar o Painel PNCP. Verifique também
          a pasta de spam.
        </p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-danger-soft dark:bg-red-500/10 border border-danger/20 text-sm text-danger text-left">
            {error}
          </div>
        )}
        {resent && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-success-soft dark:bg-emerald-500/10 border border-success/20 text-sm text-success text-left">
            Novo link de confirmação enviado. Verifique sua caixa de entrada e também o spam.
          </div>
        )}

        <div className="space-y-3">
          <Button
            className="w-full"
            onClick={handleResend}
            disabled={resending}
            loading={resending}
          >
            {resending ? 'Enviando...' : 'REENVIAR E-MAIL DE CONFIRMAÇÃO'}
          </Button>
          <Link
            href="/login"
            className="block w-full text-sm text-slate-500 dark:text-slate-400 font-medium hover:text-primary transition-colors"
          >
            Voltar para o login
          </Link>
        </div>
      </div>
    )
  }

  // Já cadastrado (login são bloqueados -> orienta o usuário a logar)
  if (alreadyRegistered) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 shadow-xl shadow-slate-200/40 dark:shadow-none text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-5">
          <Loader2 className="w-8 h-8 text-amber-500" />
        </div>
        <h1 className="text-2xl font-extrabold font-display text-slate-900 dark:text-white mb-2">
          Este e-mail já está cadastrado.
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Para <strong>{email}</strong>. Se você ainda não confirmou seu e-mail,
          use o botão abaixo para reenviar o link de confirmação. Caso já tenha
          confirmado, faça login.
        </p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-danger-soft dark:bg-red-500/10 border border-danger/20 text-sm text-danger text-left">
            {error}
          </div>
        )}
        {resent && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-success-soft dark:bg-emerald-500/10 border border-success/20 text-sm text-success text-left">
            Novo link de confirmação enviado. Verifique sua caixa de entrada e também o spam.
          </div>
        )}

        <div className="space-y-3">
          <Button
            className="w-full"
            onClick={handleResend}
            disabled={resending}
            loading={resending}
          >
            {resending ? 'Enviando...' : 'REENVIAR E-MAIL DE CONFIRMAÇÃO'}
          </Button>
          <Link
            href="/login"
            className="block w-full text-sm text-slate-500 dark:text-slate-400 font-medium hover:text-primary transition-colors"
          >
            Já sei minha senha — entrar
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 shadow-xl shadow-slate-200/40 dark:shadow-none">
      <h1 className="text-2xl font-extrabold font-display text-slate-900 dark:text-white mb-1">Criar minha conta</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Crie sua conta e utilize ferramentas inteligentes para pesquisar preços, analisar referências e gerar relatórios.
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-danger-soft dark:bg-red-500/10 border border-danger/20 text-sm text-danger">
          {error}
        </div>
      )}

      <GoogleAuthButton mode="signup" />

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        <span className="text-xs font-medium text-slate-400 dark:text-slate-500">ou</span>
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nome"
          type="text"
          placeholder="Seu nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
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
          placeholder="Mínimo 6 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Input
          label="Confirmar senha"
          type="password"
          placeholder="Repita a senha"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <Button type="submit" className="w-full" disabled={loading} loading={loading}>
          {loading ? 'Criando conta...' : 'Criar minha conta'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Já tem conta?{' '}
        <Link href="/login" className="text-primary hover:text-primary-hover font-semibold">
          Entrar
        </Link>
      </p>
    </div>
  )
}