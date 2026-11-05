'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { numero } from '@/lib/analista/calc'

// ============================================================================
// Campos reutilizáveis do Analista (máscara de moeda pt-BR, tooltips, seções).
// ============================================================================

export function Dica({ texto }: { texto: string }) {
  return (
    <span
      title={texto}
      aria-label={texto}
      tabIndex={0}
      className="inline-flex h-4 w-4 shrink-0 cursor-help items-center justify-center rounded-full text-slate-400 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <Info className="h-3.5 w-3.5" aria-hidden="true" />
    </span>
  )
}

export function Rotulo({
  children,
  dica,
  htmlFor,
}: {
  children: ReactNode
  dica?: string
  htmlFor?: string
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
      <span>{children}</span>
      {dica && <Dica texto={dica} />}
    </label>
  )
}

/** Moeda com máscara de centavos (digite 1234 -> R$ 12,34). */
export function CampoMoeda({
  label,
  valor,
  onChange,
  dica,
  id,
  disabled,
  placeholder = 'R$ 0,00',
  className,
}: {
  label?: string
  valor: number
  onChange: (v: number) => void
  dica?: string
  id?: string
  disabled?: boolean
  placeholder?: string
  className?: string
}) {
  const texto = valor > 0 ? valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''

  return (
    <div className={cn('w-full', className)}>
      {label && <Rotulo htmlFor={id} dica={dica}>{label}</Rotulo>}
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        value={texto}
        placeholder={placeholder}
        onChange={(e) => {
          const digitos = e.target.value.replace(/\D/g, '').slice(0, 15)
          onChange(digitos ? Number(digitos) / 100 : 0)
        }}
        className={cn(
          'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors',
          'focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary',
          'dark:border-slate-700 dark:bg-slate-900 dark:text-white',
          'disabled:opacity-50'
        )}
      />
    </div>
  )
}

/** Número decimal (aceita vírgula). Mantém o texto enquanto o campo está em foco. */
export function CampoNumero({
  label,
  valor,
  onChange,
  dica,
  id,
  sufixo,
  prefixo,
  min,
  max,
  step = 'any',
  disabled,
  placeholder = '0',
  className,
}: {
  label?: string
  valor: number
  onChange: (v: number) => void
  dica?: string
  id?: string
  sufixo?: string
  prefixo?: string
  min?: number
  max?: number
  step?: string | number
  disabled?: boolean
  placeholder?: string
  className?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [texto, setTexto] = useState(valor ? String(valor).replace('.', ',') : '')

  useEffect(() => {
    if (document.activeElement === ref.current) return
    setTexto(valor ? String(valor).replace('.', ',') : '')
  }, [valor])

  return (
    <div className={cn('w-full', className)}>
      {label && <Rotulo htmlFor={id} dica={dica}>{label}</Rotulo>}
      <div className="relative">
        {prefixo && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            {prefixo}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          value={texto}
          placeholder={placeholder}
          aria-describedby={dica ? `${id}-dica` : undefined}
          onChange={(e) => {
            const s = e.target.value
            setTexto(s)
            onChange(numero(s))
          }}
          onBlur={() => {
            setTexto(valor ? String(valor).replace('.', ',') : '')
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault()
              const delta = (e.key === 'ArrowUp' ? 1 : -1) * (Number(step) || 1)
              let novo = Math.round((valor + delta) * 100) / 100
              if (min != null) novo = Math.max(min, novo)
              if (max != null) novo = Math.min(max, novo)
              onChange(novo)
            }
          }}
          className={cn(
            'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors',
            'focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary',
            'dark:border-slate-700 dark:bg-slate-900 dark:text-white',
            'disabled:opacity-50',
            prefixo && 'pl-8',
            sufixo && 'pr-8'
          )}
        />
        {sufixo && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            {sufixo}
          </span>
        )}
      </div>
      {dica && <span id={`${id}-dica`} className="sr-only">{dica}</span>}
    </div>
  )
}

export function CampoTexto({
  label,
  valor,
  onChange,
  dica,
  id,
  placeholder,
  disabled,
  maxLength = 500,
  className,
}: {
  label?: string
  valor: string
  onChange: (v: string) => void
  dica?: string
  id?: string
  placeholder?: string
  disabled?: boolean
  maxLength?: number
  className?: string
}) {
  return (
    <div className={cn('w-full', className)}>
      {label && <Rotulo htmlFor={id} dica={dica}>{label}</Rotulo>}
      <input
        id={id}
        type="text"
        autoComplete="off"
        disabled={disabled}
        value={valor || ''}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors',
          'focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary',
          'dark:border-slate-700 dark:bg-slate-900 dark:text-white',
          'disabled:opacity-50'
        )}
      />
    </div>
  )
}

export function CampoSelect({
  label,
  valor,
  onChange,
  opcoes,
  dica,
  id,
  disabled,
  className,
}: {
  label?: string
  valor: string
  onChange: (v: string) => void
  opcoes: Array<{ value: string; label: string }>
  dica?: string
  id?: string
  disabled?: boolean
  className?: string
}) {
  return (
    <div className={cn('w-full', className)}>
      {label && <Rotulo htmlFor={id} dica={dica}>{label}</Rotulo>}
      <select
        id={id}
        disabled={disabled}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-colors',
          'focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary',
          'dark:border-slate-700 dark:bg-slate-900 dark:text-white',
          'disabled:opacity-50'
        )}
      >
        {opcoes.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

export function CampoData({
  label,
  valor,
  onChange,
  dica,
  id,
  className,
}: {
  label?: string
  valor: string
  onChange: (v: string) => void
  dica?: string
  id?: string
  className?: string
}) {
  // `datetime-local` precisa de "YYYY-MM-DDTHH:mm"; aceitamos data ou ISO.
  const normalizado = valor ? String(valor).slice(0, 16) : ''
  return (
    <div className={cn('w-full', className)}>
      {label && <Rotulo htmlFor={id} dica={dica}>{label}</Rotulo>}
      <input
        id={id}
        type="datetime-local"
        value={normalizado}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-colors',
          'focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary',
          'dark:border-slate-700 dark:bg-slate-900 dark:text-white'
        )}
      />
    </div>
  )
}

export function Secao({
  titulo,
  icone,
  dica,
  children,
  acao,
  className,
  id,
}: {
  titulo: string
  icone?: ReactNode
  dica?: string
  children: ReactNode
  acao?: ReactNode
  className?: string
  id?: string
}) {
  return (
    <section id={id} className={cn('card p-4 sm:p-5', className)}>
      <header className="mb-3 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {icone && (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {icone}
            </span>
          )}
          <h2 className="truncate font-display text-sm font-bold text-slate-900 dark:text-white sm:text-base">{titulo}</h2>
          {dica && <Dica texto={dica} />}
        </div>
        {acao}
      </header>
      {children}
    </section>
  )
}
