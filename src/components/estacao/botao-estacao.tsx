'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Check, Loader2, FolderPlus, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { encodePncpId } from '@/lib/estacao/encode'
import { cn } from '@/lib/utils'

export interface EditalEstacaoInput {
  numero_controle_pncp: string
  orgao?: string | null
  cnpj_orgao?: string | null
  uf?: string | null
  municipio?: string | null
  objeto?: string | null
  modalidade?: string | null
  valor_estimado?: number | null
  data_abertura?: string | null
  data_encerramento_proposta?: string | null
  link_pncp?: string | null
}

/**
 * Botão "Adicionar à minha estação" / "Na sua estação".
 * - Deslogado: manda para /login e volta ao edital depois (redirect).
 * - Já adicionado: vira link para a ficha (evita duplicidade).
 * - Limite do plano gratuito: mostra a mensagem de upgrade.
 */
export default function BotaoEstacao({
  item,
  compacto = false,
  className,
}: {
  item: EditalEstacaoInput
  compacto?: boolean
  className?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const numero = item.numero_controle_pncp
  const slug = encodePncpId(numero)

  const [logado, setLogado] = useState<boolean | null>(null)
  const [existente, setExistente] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!numero) return
    let ativo = true
    const supabase = createClient()
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      if (!ativo) return
      const isLogado = !!data.user
      setLogado(isLogado)
      if (isLogado) {
        try {
          const r = await fetch(`/api/estacao/itens?pncp=${encodeURIComponent(numero)}`, { cache: 'no-store' })
          const j = await r.json().catch(() => null)
          if (ativo) setExistente(!!j?.existente)
        } catch {
          /* silencioso */
        }
      }
    })()
    return () => {
      ativo = false
    }
  }, [numero])

  const adicionar = async () => {
    if (!numero) return
    if (!logado) {
      const vol = typeof window !== 'undefined' ? window.location.pathname + window.location.search : pathname
      router.push(`/login?redirect=${encodeURIComponent(vol)}`)
      return
    }
    setCarregando(true)
    setMsg('')
    try {
      const r = await fetch('/api/estacao/itens', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(item),
      })
      const j = await r.json().catch(() => null)
      if (r.status === 401) {
        const vol = typeof window !== 'undefined' ? window.location.pathname + window.location.search : pathname
        router.push(`/login?redirect=${encodeURIComponent(vol)}`)
        return
      }
      if (r.status === 402 && j?.limite) {
        setMsg(j.erro || 'Limite do plano gratuito atingido.')
        return
      }
      if (!r.ok || !j?.ok) {
        setMsg(j?.erro || 'Não foi possível adicionar.')
        return
      }
      setExistente(true)
      router.push(`/estacao/${slug}`)
    } catch {
      setMsg('Falha de conexão.')
    } finally {
      setCarregando(false)
    }
  }

  if (existente) {
    return (
      <Link
        href={`/estacao/${slug}`}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors',
          compacto ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2 text-sm',
          className
        )}
        title="Abrir a ficha na sua estação"
      >
        <Check className={compacto ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        Na sua estação
      </Link>
    )
  }

  return (
    <div className={cn('inline-flex flex-col items-start gap-1', className)}>
      <button
        type="button"
        onClick={adicionar}
        disabled={carregando || logado === null}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50',
          compacto ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2 text-sm'
        )}
        title="Adicionar à minha estação de trabalho"
      >
        {carregando ? (
          <Loader2 className={compacto ? 'w-3.5 h-3.5 animate-spin' : 'w-4 h-4 animate-spin'} />
        ) : logado === false ? (
          <ArrowRight className={compacto ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        ) : (
          <FolderPlus className={compacto ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        )}
        {logado === false ? 'Entrar e adicionar' : 'Adicionar à minha estação'}
      </button>
      {msg && <span className="text-[11px] text-amber-600 dark:text-amber-400 max-w-[260px]">{msg}</span>}
    </div>
  )
}
