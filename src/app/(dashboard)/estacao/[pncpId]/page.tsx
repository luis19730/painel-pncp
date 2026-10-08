'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import FichaEdital from '@/components/estacao/ficha'
import { decodePncpId } from '@/lib/estacao/encode'
import { apiEstacao } from '@/lib/estacao/client'

export default function EstacaoFichaPage() {
  const params = useParams()
  const router = useRouter()
  const slug = String(params.pncpId || '')
  const numero = decodePncpId(slug)

  const [itemId, setItemId] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [naoEncontrado, setNaoEncontrado] = useState(false)

  useEffect(() => {
    let ativo = true
    ;(async () => {
      try {
        const j = await apiEstacao<{ existente: { id: string } | null }>(
          `/api/estacao/itens?pncp=${encodeURIComponent(numero)}`
        )
        if (!ativo) return
        if (j?.existente?.id) setItemId(j.existente.id)
        else setNaoEncontrado(true)
      } catch {
        if (ativo) setNaoEncontrado(true)
      } finally {
        if (ativo) setCarregando(false)
      }
    })()
    return () => {
      ativo = false
    }
  }, [numero])

  if (carregando) {
    return (
      <div className="flex items-center gap-2 text-slate-400 py-16 justify-center">
        <Loader2 className="w-5 h-5 animate-spin" /> Carregando ficha...
      </div>
    )
  }

  if (naoEncontrado || !itemId) {
    return (
      <div className="text-center py-20 space-y-4">
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">Esta licitação não está na sua estação</h1>
        <p className="text-sm text-slate-500">Adicione-a a partir da busca de editais para acompanhá-la aqui.</p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/oportunidades" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">Buscar editais</Link>
          <Link href="/estacao" className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">Minha Estação</Link>
        </div>
      </div>
    )
  }

  return <FichaEdital itemId={itemId} onRemovido={() => router.push('/estacao')} />
}
