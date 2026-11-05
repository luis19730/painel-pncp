'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardList, Loader2, LogIn, Plus, ShieldCheck } from 'lucide-react'
import { CHECKLIST_PREPARO, GRUPOS_PREPARO } from '@/lib/sicx/conteudo'
import { certidoesEmAlerta, dataBR, progressoChecklist } from '@/lib/sicx/calc'
import { apiSicxOpcional, jsonInit } from '@/lib/sicx/client'
import { cn } from '@/lib/utils'

interface ItemSalvo {
  item_key: string
  feito: boolean
  validade: string | null
}

export default function Preparo() {
  const [itens, setItens] = useState<ItemSalvo[]>([])
  const [dataAlvo, setDataAlvo] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [precisaLogin, setPrecisaLogin] = useState(false)
  const [salvando, setSalvando] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [criandoCartao, setCriandoCartao] = useState(false)

  useEffect(() => {
    let ativo = true
    ;(async () => {
      try {
        const r = await apiSicxOpcional<{ itens: ItemSalvo[]; data_alvo: string | null }>('/api/sicx/preparo')
        if (!ativo) return
        if (!r) {
          setPrecisaLogin(true)
          return
        }
        setItens(r.itens || [])
        setDataAlvo(r.data_alvo || '')
      } catch (e) {
        if (ativo) setErro(e instanceof Error ? e.message : 'Não foi possível carregar o checklist.')
      } finally {
        if (ativo) setCarregando(false)
      }
    })()
    return () => {
      ativo = false
    }
  }, [])

  const progresso = useMemo(() => progressoChecklist(CHECKLIST_PREPARO, itens), [itens])
  const alertas = useMemo(() => certidoesEmAlerta(itens), [itens])

  function itemSalvo(key: string): ItemSalvo {
    return itens.find((i) => i.item_key === key) || { item_key: key, feito: false, validade: null }
  }

  async function salvar(key: string, patch: Partial<ItemSalvo>) {
    const atual = itemSalvo(key)
    const proximo: ItemSalvo = { ...atual, ...patch }
    setItens((lista) => {
      const sem = lista.filter((i) => i.item_key !== key)
      return [...sem, proximo]
    })
    setSalvando(key)
    setErro('')
    try {
      const r = await apiSicxOpcional('/api/sicx/preparo', jsonInit('PUT', { item_key: key, ...patch }))
      if (!r) setPrecisaLogin(true)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar o item.')
    } finally {
      setSalvando(null)
    }
  }

  async function salvarData(valor: string) {
    setDataAlvo(valor)
    try {
      await apiSicxOpcional('/api/sicx/preparo', jsonInit('PUT', { data_alvo: valor || null }))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar a data-alvo.')
    }
  }

  async function criarCartao() {
    setCriandoCartao(true)
    setErro('')
    setAviso('')
    try {
      const r = await apiSicxOpcional<{ cartao: { id: string } }>(
        '/api/sicx/contratacoes',
        jsonInit('POST', {
          item: 'Preparar credenciamento SICX',
          orgao: 'Preparação interna',
          checklist: CHECKLIST_PREPARO.filter((i) => !itemSalvo(i.key).feito).map((i) => ({ item: i.titulo, feito: false })),
        })
      )
      if (!r) {
        setPrecisaLogin(true)
        return
      }
      setAviso('Cartão criado em "Minhas contratações". Abra a aba Ferramentas para acompanhar.')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível criar o cartão.')
    } finally {
      setCriandoCartao(false)
    }
  }

  if (carregando) {
    return (
      <div className="card p-8 flex items-center justify-center dark:bg-slate-900 dark:border-slate-800">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">Carregando seu checklist...</span>
      </div>
    )
  }

  if (precisaLogin) {
    return (
      <div className="card p-8 text-center dark:bg-slate-900 dark:border-slate-800">
        <ClipboardList className="w-9 h-9 text-primary mx-auto mb-3" />
        <h3 className="font-semibold text-slate-900 dark:text-white">Entre para salvar o seu preparo</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
          O checklist, as validades das certidões e a data-alvo ficam vinculados à sua conta. A leitura
          da página continua livre.
        </p>
        <Link href="/login?redirect=%2Fcredenciamento-sicx" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover">
          <LogIn className="w-4 h-4" /> Entrar para usar
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="card p-5 dark:bg-slate-900 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {progresso.feitos} de {progresso.total} itens concluídos
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Atualize sempre que renovar uma certidão ou mudar o catálogo.</p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="data-alvo" className="text-xs font-medium text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
              <CalendarClock className="w-3.5 h-3.5" /> Data-alvo
            </label>
            <input
              id="data-alvo"
              type="date"
              value={dataAlvo}
              onChange={(e) => salvarData(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-200"
            />
          </div>
        </div>
        <div className="mt-3 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden" role="progressbar" aria-valuenow={progresso.pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all" style={{ width: `${progresso.pct}%` }} />
        </div>
        <p className="mt-1 text-right text-xs font-semibold text-primary">{progresso.pct}%</p>
      </div>

      {alertas.length > 0 && (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4" /> Certidões vencidas ou vencendo em até 30 dias
          </p>
          <ul className="mt-2 space-y-1 text-xs text-amber-700/90 dark:text-amber-300/90">
            {alertas.map((a) => {
              const item = CHECKLIST_PREPARO.find((i) => i.key === a.item_key)
              return (
                <li key={a.item_key}>
                  {item?.titulo || a.item_key}: {a.vencida ? `venceu em ${dataBR(a.validade)}` : `vence em ${dataBR(a.validade)} (${a.dias} dia(s))`}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {erro && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{erro}</p>}
      {aviso && <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">{aviso}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {GRUPOS_PREPARO.map((grupo) => (
          <div key={grupo} className="card p-5 dark:bg-slate-900 dark:border-slate-800">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">{grupo}</h3>
            <ul className="space-y-3">
              {CHECKLIST_PREPARO.filter((i) => i.grupo === grupo).map((item) => {
                const salvo = itemSalvo(item.key)
                return (
                  <li key={item.key} className="rounded-xl border border-slate-100 dark:border-slate-800 p-3">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={salvo.feito}
                        onChange={(e) => salvar(item.key, { feito: e.target.checked })}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <span className="flex-1">
                        <span className={cn('block text-sm font-medium', salvo.feito ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-800 dark:text-slate-100')}>
                          {item.titulo}
                        </span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.descricao}</span>
                      </span>
                      {salvando === item.key && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
                      {salvo.feito && salvando !== item.key && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                    </label>
                    <div className="mt-2 flex flex-wrap items-center gap-2 pl-6">
                      {item.temValidade && (
                        <label className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                          Validade
                          <input
                            type="date"
                            value={salvo.validade || ''}
                            onChange={(e) => salvar(item.key, { validade: e.target.value || null })}
                            className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-[11px] text-slate-700 dark:text-slate-200"
                          />
                        </label>
                      )}
                      {item.link && (
                        <a href={item.link.url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-primary hover:underline">
                          {item.link.label}
                        </a>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={criarCartao}
          disabled={criandoCartao}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
        >
          {criandoCartao ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Criar cartão no Kanban
        </button>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          <ShieldCheck className="inline w-3.5 h-3.5 text-emerald-500 mr-1" />
          Seus dados ficam na sua conta. Nada é enviado a órgãos públicos.
        </span>
      </div>
    </div>
  )
}
