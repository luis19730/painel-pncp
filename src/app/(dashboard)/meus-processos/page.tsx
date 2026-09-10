'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FolderOpen, PlusCircle, Trash2, Copy, FileSearch, Download,
  AlertTriangle, ChevronRight,
} from 'lucide-react'
import PageHeader from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'
import EmptyState from '@/components/ui/empty-state'
import { formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  listProcessos, deleteProcesso, insertProcesso,
} from '@/lib/contratacoes/db'
import type { ProcessoInstrucao } from '@/lib/contratacoes/types'

const statusLabel: Record<string, { label: string; cls: string }> = {
  rascunho: { label: 'Rascunho', cls: 'text-slate-600 bg-slate-100 dark:bg-slate-700' },
  em_instrucao: { label: 'Em instrução', cls: 'text-amber-600 bg-amber-100 dark:bg-amber-500/20' },
  concluido: { label: 'Concluído', cls: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20' },
}

export default function MeusProcessosPage() {
  const supabase = createClient()
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [processos, setProcessos] = useState<ProcessoInstrucao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null))
  }, [supabase])

  const carregar = useCallback(async () => {
    if (!userId) return
    try {
      setProcessos(await listProcessos(supabase, userId))
    } catch (e) {
      setErro(`Erro ao carregar: ${(e as Error)?.message}`)
    } finally {
      setCarregando(false)
    }
  }, [supabase, userId])

  useEffect(() => { carregar() }, [carregar])

  const excluir = async (id: string) => {
    if (!confirm('Excluir este processo e todos os seus itens, preços, riscos e documentos? Esta ação não pode ser desfeita.')) return
    try {
      await deleteProcesso(supabase, userId!, id)
      await carregar()
    } catch (e) {
      alert(`Erro: ${(e as Error)?.message}`)
    }
  }

  const duplicar = async (p: ProcessoInstrucao) => {
    if (!userId) return
    try {
      const novo = await insertProcesso(supabase, userId, {
        numero: p.numero ? `${p.numero} (cópia)` : null,
        unidade: p.unidade, setor: p.setor, responsavel: p.responsavel,
        objeto: p.objeto, descricao: p.descricao, finalidade: p.finalidade, justificativa: p.justificativa,
        quantidade: p.quantidade, unidade_medida: p.unidade_medida, valor_estimado: p.valor_estimado, prazo: p.prazo,
        tipo_objeto: p.tipo_objeto, nd: p.nd,
        dfd: p.dfd, etp: p.etp, tr: p.tr, bdi: p.bdi,
        status: 'rascunho', percentual: 0,
      })
      router.push(`/montagem-processo?id=${novo.id}`)
    } catch (e) {
      alert(`Erro ao duplicar: ${(e as Error)?.message}`)
    }
  }

  const exportarDados = (p: ProcessoInstrucao) => {
    const dados = {
      processo: p,
      exportado_em: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `processo-${p.numero || p.id.slice(0, 8)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 3000)
  }

  if (carregando) return <div className="animate-pulse space-y-4"><div className="h-8 w-64 rounded bg-slate-100 dark:bg-slate-800" /><div className="h-64 rounded bg-slate-100 dark:bg-slate-800" /></div>

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meus Processos"
        description="Visualize, continue, duplique, exclua e exporte os processos de contratação"
        badge={<Badge variant="accent">{processos.length} processo(s)</Badge>}
      >
        <Link href="/montagem-processo" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover">
          <PlusCircle className="w-4 h-4" /> Novo processo
        </Link>
      </PageHeader>

      {erro && (
        <div className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger-soft dark:bg-red-500/10 px-3.5 py-3 text-sm text-danger">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {erro}
        </div>
      )}

      {processos.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="w-8 h-8" />}
          title="Nenhum processo criado"
          description="Crie um novo processo de contratação usando o assistente de montagem inteligente."
          action="Criar processo"
          actionHref="/montagem-processo"
        />
      ) : (
        <div className="space-y-3">
          {processos.map((p) => {
            const st = statusLabel[p.status] || statusLabel.rascunho
            return (
              <div key={p.id} className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 dark:text-white truncate">{p.objeto || 'Processo sem objeto definido'}</span>
                      <Badge className={st.cls} variant="accent">{st.label}</Badge>
                      <Badge variant="accent">{p.percentual}%</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-400">
                      {p.numero && <span>Processo: {p.numero}</span>}
                      {p.tipo_objeto && <span>{p.tipo_objeto}</span>}
                      {p.nd && <span className="font-mono">ND {p.nd}</span>}
                      {p.unidade && <span>{p.unidade}</span>}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">Atualizado em {formatDate(p.updated_at)}</p>
                    <div className="mt-2 h-1.5 w-full max-w-xs rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${p.percentual}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <Link href={`/montagem-processo?id=${p.id}`} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-white hover:bg-primary-hover">
                      <FileSearch className="w-4 h-4" /> Continuar
                    </Link>
                    <button onClick={() => duplicar(p)} title="Duplicar" className="rounded-xl border border-slate-200 dark:border-slate-700 p-2 text-slate-500 hover:text-primary"><Copy className="w-4 h-4" /></button>
                    <button onClick={() => exportarDados(p)} title="Exportar dados" className="rounded-xl border border-slate-200 dark:border-slate-700 p-2 text-slate-500 hover:text-primary"><Download className="w-4 h-4" /></button>
                    <button onClick={() => excluir(p.id)} title="Excluir" className="rounded-xl border border-danger/20 p-2 text-danger hover:bg-danger-soft"><Trash2 className="w-4 h-4" /></button>
                    <Link href={`/montagem-processo?id=${p.id}`} className="text-slate-300 hover:text-primary"><ChevronRight className="w-5 h-5" /></Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
