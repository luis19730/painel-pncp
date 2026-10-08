'use client'

import { useEffect, useState } from 'react'
import { Calendar } from 'lucide-react'
import PageHeader from '@/components/ui/page-header'
import PrazosLista, { type PrazoComItem } from '@/components/estacao/prazos-lista'
import { apiEstacao } from '@/lib/estacao/client'

export default function EstacaoPrazosPage() {
  const [prazos, setPrazos] = useState<PrazoComItem[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const j = await apiEstacao<{ prazos: PrazoComItem[] }>('/api/estacao/prazos')
        setPrazos(j.prazos || [])
      } catch (e) {
        setErro((e as Error).message)
      } finally {
        setCarregando(false)
      }
    })()
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prazos da minha estação"
        description="Todos os prazos pendentes das suas licitações, agrupados por dia."
        badge={<Calendar className="w-3.5 h-3.5" />}
      />
      {erro && <div className="card bg-white dark:bg-slate-900 p-4 text-sm text-danger">{erro}</div>}
      <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-5">
        {carregando ? (
          <p className="text-sm text-slate-400 py-8 text-center">Carregando prazos...</p>
        ) : (
          <PrazosLista prazos={prazos} />
        )}
      </div>
    </div>
  )
}
