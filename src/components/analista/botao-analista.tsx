'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calculator, Check, Kanban, Loader2, Plus, X } from 'lucide-react'
import Button from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { apiAnalista, jsonInit } from '@/lib/analista/client'
import { PRIORIDADES } from '@/lib/analista/kanban'
import type { ColunaKanban, Prioridade } from '@/lib/analista/types'

export interface EditalAnalistaInput {
  numero_controle_pncp: string
  orgao?: string | null
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
 * Ações do Analista de Licitações na tela de oportunidades:
 * - "Analisar viabilidade": abre a calculadora já com o número PNCP.
 * - "Adicionar ao Kanban": cria o cartão com os dados do edital.
 * Reaproveita as APIs do analista (sessão + RLS) — nada é gravado sem login.
 */
export default function BotaoAnalista({
  item,
  compacto = false,
  kanban = true,
}: {
  item: EditalAnalistaInput
  compacto?: boolean
  kanban?: boolean
}) {
  const [modal, setModal] = useState(false)
  const [colunas, setColunas] = useState<ColunaKanban[]>([])
  const [colunaId, setColunaId] = useState('')
  const [prioridade, setPrioridade] = useState<Prioridade>('media')
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [criado, setCriado] = useState(false)

  const href = `/analista?pncp=${encodeURIComponent(item.numero_controle_pncp)}`

  const abrirKanban = async () => {
    setErro('')
    setCriado(false)
    setCarregando(true)
    setModal(true)
    try {
      const j = await apiAnalista<{ colunas: ColunaKanban[] }>('/api/analista/kanban/colunas')
      setColunas(j.colunas || [])
      setColunaId((c) => c || j.colunas?.[0]?.id || '')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar as colunas do Kanban.')
    } finally {
      setCarregando(false)
    }
  }

  const criarCartao = async () => {
    if (!colunaId) {
      setErro('Escolha a coluna de destino.')
      return
    }
    setSalvando(true)
    setErro('')
    try {
      await apiAnalista('/api/analista/kanban/cartoes', jsonInit('POST', {
        coluna_id: colunaId,
        titulo: item.objeto || `Edital ${item.numero_controle_pncp}`,
        orgao: item.orgao || null,
        edital_ref: item.numero_controle_pncp || null,
        modalidade: item.modalidade || null,
        uf: item.uf || null,
        valor_referencia: item.valor_estimado ?? null,
        data_sessao: item.data_abertura || null,
        prazo_proposta: item.data_encerramento_proposta || null,
        prioridade,
        link_edital: item.link_pncp || null,
      }))
      setCriado(true)
      setTimeout(() => setModal(false), 900)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível criar o cartão.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <>
      <div className={cn('flex flex-wrap items-center gap-2', compacto && 'gap-1.5')}>
        <Link
          href={href}
          title="Abrir a calculadora de viabilidade com este edital"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 font-semibold text-primary transition-colors hover:bg-primary/10',
            compacto ? 'px-2.5 py-1.5 text-[11px]' : 'px-3.5 py-2 text-sm'
          )}
        >
          <Calculator className={compacto ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
          Analisar viabilidade
        </Link>
        {kanban && (
          <button
            type="button"
            onClick={abrirKanban}
            title="Adicionar este edital ao Kanban do Analista"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
              compacto ? 'px-2.5 py-1.5 text-[11px]' : 'px-3.5 py-2 text-sm'
            )}
          >
            <Kanban className={compacto ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
            Adicionar ao Kanban
          </button>
        )}
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-add-kanban"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(false)
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="titulo-add-kanban" className="flex items-center gap-2 font-display text-base font-bold text-slate-900 dark:text-white">
                <Kanban className="h-4 w-4 text-primary" /> Adicionar ao Kanban
              </h2>
              <button
                type="button"
                onClick={() => setModal(false)}
                aria-label="Fechar"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {criado ? (
              <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                <Check className="h-4 w-4" /> Cartão criado no Kanban.
              </p>
            ) : (
              <>
                <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                  O cartão será criado com órgão, modalidade, UF, valores e datas deste edital. Você poderá editar depois.
                </p>
                {carregando ? (
                  <p className="flex items-center gap-2 py-6 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando colunas...
                  </p>
                ) : colunas.length === 0 ? (
                  <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                    Nenhuma coluna encontrada. Abra o Kanban do Analista para criar a primeira.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Coluna
                      <select
                        value={colunaId}
                        onChange={(e) => setColunaId(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      >
                        {colunas.map((c) => (
                          <option key={c.id} value={c.id}>{c.nome}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Prioridade
                      <select
                        value={prioridade}
                        onChange={(e) => setPrioridade(e.target.value as Prioridade)}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      >
                        {PRIORIDADES.map((p) => (
                          <option key={p.id} value={p.id}>{p.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}

                {erro && <p className="mt-3 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{erro}</p>}

                <div className="mt-4 flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setModal(false)}>Cancelar</Button>
                  <Button
                    type="button"
                    size="sm"
                    loading={salvando}
                    disabled={carregando || !colunaId}
                    onClick={criarCartao}
                    icon={<Plus className="h-3.5 w-3.5" />}
                  >
                    Criar cartão
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
