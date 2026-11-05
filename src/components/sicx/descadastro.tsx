'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { apiSicxPublico } from '@/lib/sicx/client'

export default function Descadastro({ token }: { token: string }) {
  const [estado, setEstado] = useState<'inicial' | 'enviando' | 'ok' | 'erro'>('inicial')
  const [erro, setErro] = useState('')

  async function confirmar() {
    setEstado('enviando')
    setErro('')
    try {
      await apiSicxPublico('/api/sicx/descadastrar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      setEstado('ok')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível concluir o descadastro.')
      setEstado('erro')
    }
  }

  if (!token) {
    return (
      <div className="card p-8 text-center dark:bg-slate-900 dark:border-slate-800">
        <XCircle className="w-9 h-9 text-rose-500 mx-auto mb-3" />
        <p className="font-semibold text-slate-900 dark:text-white">Link inválido</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">O endereço não contém um token de descadastro.</p>
        <Link href="/credenciamento-sicx" className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline">Voltar à página do SICX</Link>
      </div>
    )
  }

  return (
    <div className="card p-8 text-center dark:bg-slate-900 dark:border-slate-800">
      {estado === 'ok' ? (
        <>
          <CheckCircle2 className="w-9 h-9 text-emerald-500 mx-auto mb-3" />
          <p className="font-semibold text-slate-900 dark:text-white">Inscrição cancelada</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Você não receberá mais as atualizações do SICX. Obrigado pelo interesse.</p>
          <Link href="/credenciamento-sicx" className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline">Voltar à página do SICX</Link>
        </>
      ) : (
        <>
          <XCircle className="w-9 h-9 text-amber-500 mx-auto mb-3" />
          <p className="font-semibold text-slate-900 dark:text-white">Cancelar a inscrição nas atualizações do SICX?</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Você pode voltar a se inscrever quando quiser.</p>
          <button type="button" onClick={confirmar} disabled={estado === 'enviando'} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
            {estado === 'enviando' && <Loader2 className="w-4 h-4 animate-spin" />} Confirmar cancelamento
          </button>
          {erro && <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-400">{erro}</p>}
        </>
      )}
    </div>
  )
}
