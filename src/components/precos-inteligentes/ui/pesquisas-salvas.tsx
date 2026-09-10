'use client'

import { Star, Trash2, RefreshCcw } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import Button from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export type PesquisaSalva = {
  id: string
  nome: string
  termo: string
  tipo: 'material' | 'servico'
  criadaEm: string
}

export default function SavedSearches({
  salvas,
  onExecutar,
  onRemover,
  onSalvarAtual,
  termoAtual,
  podeSalvar,
}: {
  salvas: PesquisaSalva[]
  onExecutar: (s: PesquisaSalva) => void
  onRemover: (id: string) => void
  onSalvarAtual: (nome: string) => void
  termoAtual: string
  podeSalvar: boolean
}) {
  const [aberto, setAberto] = useState(false)
  const [nome, setNome] = useState('')

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-primary transition-colors"
        >
          <Star className="w-4 h-4" /> Minhas pesquisas
          {salvas.length > 0 && <Badge variant="primary">{salvas.length}</Badge>}
        </button>
        {podeSalvar && termoAtual && (
          <div className="flex items-center gap-2">
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && nome.trim()) { onSalvarAtual(nome.trim()); setNome('') } }}
              placeholder="Nome da pesquisa..."
              className="w-44 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <Button size="sm" onClick={() => { if (nome.trim()) { onSalvarAtual(nome.trim()); setNome('') } }}>
              <Star className="w-3.5 h-3.5" /> Salvar
            </Button>
          </div>
        )}
      </div>

      {aberto && (
        <div className="mt-4">
          {salvas.length === 0 ? (
            <p className="text-sm text-slate-400">Você ainda não salvou nenhuma pesquisa. Pesquise um produto e clique em "Salvar" para guardar e refazer rápido.</p>
          ) : (
            <ul className="space-y-2">
              {salvas.map((s) => (
                <li key={s.id} className="flex items-center gap-3 rounded-lg border border-slate-100 dark:border-slate-800 p-3 hover:border-primary/40 transition-colors">
                  <button type="button" onClick={() => onExecutar(s)} className="flex-1 text-left">
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{s.nome}</div>
                    <div className="text-xs text-slate-400">{s.termo} · {s.tipo === 'material' ? 'Material' : 'Serviço'}</div>
                  </button>
                  <button type="button" onClick={() => onExecutar(s)} className="text-slate-400 hover:text-primary" title="Atualizar / executar pesquisa" aria-label="Executar pesquisa">
                    <RefreshCcw className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => onRemover(s.id)} className="text-slate-400 hover:text-red-600" title="Remover pesquisa" aria-label="Remover pesquisa">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}