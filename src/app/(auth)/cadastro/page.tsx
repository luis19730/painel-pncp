'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/button'
import Input from '@/components/ui/input'

export default function CadastroPage() {
  const supabase = createClient()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setLoading(true)

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    })

    if (authError) {
      setError(
        authError.message === 'User already registered'
          ? 'Este e-mail já está cadastrado.'
          : authError.message
      )
      setLoading(false)
      return
    }

    setSuccess('Verifique seu e-mail para confirmar o cadastro.')
    setLoading(false)
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 shadow-xl shadow-slate-200/40 dark:shadow-none">
      <h1 className="text-2xl font-extrabold font-display text-slate-900 dark:text-white mb-1">Criar conta</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Comece a encontrar licitações públicas gratuitamente.
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-danger-soft dark:bg-red-500/10 border border-danger/20 text-sm text-danger">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-success-soft dark:bg-emerald-500/10 border border-success/20 text-sm text-success">
          {success}
        </div>
      )}

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
          {loading ? 'Criando conta...' : 'Criar conta'}
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
