'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Bell, Zap, Send, X } from 'lucide-react'
import PageHeader from '@/components/ui/page-header'
import DemoNotice from '@/components/ui/demo-notice'
import EmptyState from '@/components/ui/empty-state'
import Button from '@/components/ui/button'
import Input from '@/components/ui/input'
import AlertForm, { type FormState } from '@/components/alerts/alert-form'
import AlertList, { type RowAlert } from '@/components/alerts/alert-list'
import DeliveryHistory from '@/components/alerts/delivery-history'
import { createClient } from '@/lib/supabase/client'
import { alertKey as alertStorageKey } from '@/lib/storage-keys'
import type { Canal, DeliveryRecord, NewAlertInput } from '@/lib/alerts/types'
import {
  listAlerts,
  listChannels,
  getSchedule,
  listDeliveries,
  insertAlert,
  updateAlert,
  deleteAlert,
  setAlertActive,
  replaceChannels,
  upsertSchedule,
} from '@/lib/alerts/db'

// ---------------------------------------------------------------------------
// LocalStorage fallback (usado quando deslogado OU tabelas Supabase ausentes)
// ---------------------------------------------------------------------------
interface LocalAlert extends NewAlertInput {
  id: string
  createdAt: string
}

function localToRow(a: LocalAlert): RowAlert {
  return {
    id: a.id,
    nome: a.nome,
    keyword: a.keyword,
    modalidade: a.modalidade,
    uf: a.uf,
    municipio: a.municipio,
    orgao: a.orgao,
    ativo: a.ativo,
    canais: [a.useEmail && 'email', a.useTelegram && 'telegram'].filter(Boolean) as Canal[],
    frequencia: a.frequencia,
    horario: a.horario || null,
    modoCalendario: a.modo === 'programado',
  }
}

export default function AlertasPage() {
  const supabase = createClient()
  const [rows, setRows] = useState<RowAlert[]>([])
  const [history, setHistory] = useState<DeliveryRecord[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [defaultEmail, setDefaultEmail] = useState('')
  const [ready, setReady] = useState(false)
  const [dbAvailable, setDbAvailable] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editing, setEditing] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [tgTestOpen, setTgTestOpen] = useState(false)
  const [tgTestDestino, setTgTestDestino] = useState('')

  const localKey = userId ? alertStorageKey(userId) : alertStorageKey('')

  /* ------------------------------- loading ------------------------------- */

  const loadLocal = useCallback((uid: string | null) => {
    try {
      const key = alertStorageKey(uid ?? '')
      const raw = localStorage.getItem(key)
      const arr = raw ? (JSON.parse(raw) as LocalAlert[]) : []
      const localRows = arr.filter((a) => !String(a.id).startsWith('sync-')).map(localToRow)
      setRows(localRows)
    } catch {
      setRows([])
    }
  }, [])

  // Mantém o contador "Alertas ativos" do Dashboard funcionando (lê localStorage).
  const mirrorToLocal = useCallback((nomes: string[]) => {
    try {
      const key = alertStorageKey(userId ?? '')
      const arr = nomes.map((nome) => ({
        id: `sync-${nome}`,
        keyword: nome,
        uf: '',
        status: '',
        createdAt: new Date().toISOString(),
      }))
      localStorage.setItem(key, JSON.stringify(arr))
    } catch {
      /* ignore */
    }
  }, [userId])

  const loadDb = useCallback(
    async (uid: string) => {
      const alerts = await listAlerts(supabase, uid)
      const resolved: ResolvedRow[] = []
      for (const al of alerts) {
        const channels = await listChannels(supabase, al.id).catch(() => [])
        const schedule = await getSchedule(supabase, al.id).catch(() => null)
        resolved.push({
          id: al.id,
          nome: al.nome,
          keyword: al.keyword,
          modalidade: al.modalidade,
          uf: al.uf,
          municipio: al.municipio,
          orgao: al.orgao,
          ativo: al.ativo,
          canais: channels.filter((c) => c.ativo).map((c) => c.canal),
          frequencia: schedule?.frequencia ?? 'imediato',
          horario: schedule?.horario ?? null,
          modoCalendario: (schedule?.modo ?? 'imediato') === 'programado',
        })
      }
      setRows(resolved)
      try {
        const deliveries = await listDeliveries(supabase, uid, undefined, 30)
        setHistory(deliveries)
      } catch {
        setHistory([])
      }
      mirrorToLocal(alerts.map((al) => al.nome))
    },
    [supabase, mirrorToLocal]
  )


  useEffect(() => {
    let mounted = true
    supabase.auth.getUser().then(async ({ data }) => {
      if (!mounted) return
      const uid = data.user?.id ?? null
      setUserId(uid)
      setDefaultEmail(data.user?.email ?? '')
      if (!uid) {
        setDbAvailable(false)
        loadLocal(null)
        setReady(true)
        return
      }
      try {
        await loadDb(uid)
        setDbAvailable(true)
      } catch {
        setDbAvailable(false)
        loadLocal(uid)
      }
      setReady(true)
    })
    return () => {
      mounted = false
    }
  }, [supabase, loadDb, loadLocal])

  const refresh = useCallback(async () => {
    if (!userId) {
      loadLocal(userId)
      return
    }
    if (dbAvailable) {
      try {
        await loadDb(userId)
      } catch {
        loadLocal(userId)
      }
    } else {
      loadLocal(userId)
    }
  }, [userId, dbAvailable, loadDb, loadLocal])

  /* ------------------------------- write -------------------------------- */

  const writeLocal = (next: LocalAlert[]) => {
    localStorage.setItem(localKey, JSON.stringify(next))
  }

  const readLocal = (): LocalAlert[] => {
    try {
      const raw = localStorage.getItem(localKey) || '[]'
      const arr = (JSON.parse(raw) as LocalAlert[]) || []
      return arr.filter((a) => !String(a.id).startsWith('sync-'))
    } catch {
      return []
    }
  }

  const handleSave = async (input: NewAlertInput) => {
    setError('')
    setSaving(true)
    try {
      if (dbAvailable && userId) {
        const channels: { canal: Canal; destino: string; ativo: boolean }[] = []
        if (input.useEmail) channels.push({ canal: 'email', destino: input.email, ativo: true })
        if (input.useTelegram) channels.push({ canal: 'telegram', destino: input.telegram, ativo: true })

        if (editingId) {
          await updateAlert(supabase, editingId, {
            nome: input.nome,
            keyword: input.keyword || null,
            modalidade: input.modalidade || null,
            uf: input.uf || null,
            municipio: input.municipio || null,
            orgao: input.orgao || null,
            valor_min: input.valorMin ? Number(input.valorMin) : null,
            valor_max: input.valorMax ? Number(input.valorMax) : null,
            data_inicial: input.dataInicial || null,
            data_final: input.dataFinal || null,
            ativo: input.ativo,
          })
          await replaceChannels(supabase, userId, editingId, channels)
          await upsertSchedule(supabase, userId, editingId, {
            modo: input.modo,
            frequencia: input.frequencia,
            horario: input.modo === 'programado' ? input.horario : null,
            dias_semana: input.modo === 'programado' ? input.diasSemana : null,
          })
        } else {
          const inserted = await insertAlert(supabase, userId, {
            nome: input.nome,
            keyword: input.keyword || null,
            modalidade: input.modalidade || null,
            uf: input.uf || null,
            municipio: input.municipio || null,
            orgao: input.orgao || null,
            valor_min: input.valorMin ? Number(input.valorMin) : null,
            valor_max: input.valorMax ? Number(input.valorMax) : null,
            data_inicial: input.dataInicial || null,
            data_final: input.dataFinal || null,
            ativo: input.ativo,
          })
          await replaceChannels(supabase, userId, inserted.id, channels)
          await upsertSchedule(supabase, userId, inserted.id, {
            modo: input.modo,
            frequencia: input.frequencia,
            horario: input.modo === 'programado' ? input.horario : null,
            dias_semana: input.modo === 'programado' ? input.diasSemana : null,
          })
        }
      } else {
        const arr = readLocal()
        const local: LocalAlert = {
          ...input,
          id: editingId ?? `${Date.now()}`,
          createdAt: editingId
            ? (arr.find((a) => a.id === editingId)?.createdAt ?? new Date().toISOString())
            : new Date().toISOString(),
        }
        if (editingId) {
          writeLocal(arr.map((a) => (a.id === editingId ? local : a)))
        } else {
          writeLocal([...arr, local])
        }
      }
      setShowForm(false)
      setEditing(null)
      setEditingId(null)
      await refresh()
    } catch (e) {
      setError((e as Error)?.message || 'Não foi possível salvar o alerta.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (a: RowAlert) => {
    if (!confirm(`Excluir o alerta "${a.nome}"?`)) return
    setError('')
    try {
      if (dbAvailable && userId) {
        await deleteAlert(supabase, a.id)
      } else {
        writeLocal(readLocal().filter((x) => x.id !== a.id))
      }
      await refresh()
    } catch (e) {
      setError((e as Error)?.message || 'Não foi possível excluir o alerta.')
    }
  }

  const handleToggle = async (a: RowAlert) => {
    setError('')
    try {
      if (dbAvailable && userId) {
        await setAlertActive(supabase, a.id, !a.ativo)
      } else {
        writeLocal(
          readLocal().map((x) => (x.id === a.id ? { ...x, ativo: !a.ativo } : x))
        )
      }
      await refresh()
    } catch (e) {
      setError((e as Error)?.message || 'Não foi possível alterar o alerta.')
    }
  }

  const handleEdit = (a: RowAlert) => {
    const local = dbAvailable ? null : readLocal().find((x) => x.id === a.id)
    setEditingId(a.id)
    setEditing({
      nome: a.nome,
      keyword: a.keyword ?? '',
      modalidade: a.modalidade ?? '',
      uf: a.uf ?? '',
      municipio: a.municipio ?? '',
      orgao: a.orgao ?? '',
      valorMin: local?.valorMin ? String(local.valorMin) : '',
      valorMax: local?.valorMax ? String(local.valorMax) : '',
      dataInicial: local?.dataInicial ?? '',
      dataFinal: local?.dataFinal ?? '',
      ativo: a.ativo,
      email: a.canais.includes('email') ? local?.email || defaultEmail : defaultEmail,
      telegram: a.canais.includes('telegram') ? local?.telegram || '' : '',
      useEmail: a.canais.includes('email'),
      useTelegram: a.canais.includes('telegram'),
      modo: a.modoCalendario ? 'programado' : 'imediato',
      frequencia: a.frequencia,
      horario: a.horario || '08:00',
      diasSemana: local?.diasSemana ?? [1, 2, 3, 4, 5],
    })
    setShowForm(true)
  }

  /* ------------------------------- actions ------------------------------- */

  const telegramTestDestino = (): string => {
    if (!dbAvailable) {
      return readLocal().find((a) => a.useTelegram && a.telegram)?.telegram || ''
    }
    return ''
  }

  const openTgTest = () => {
    setTgTestDestino(telegramTestDestino())
    setFeedback(null)
    setError('')
    setTgTestOpen(true)
  }

  const sendTest = async (canal: Canal, telegramDestino?: string) => {
    setFeedback(null)
    setError('')
    const destino = canal === 'email' ? defaultEmail : telegramDestino || telegramTestDestino()
    if (!destino && canal === 'telegram') {
      openTgTest()
      return
    }
    if (!destino && canal === 'email') {
      setError('Não foi possível obter seu e-mail. Entre na conta para testar.')
      return
    }
    try {
      const res = await fetch('/api/alerts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canal, destino, nomeAlerta: 'Teste' }),
      })
      const data = await res.json()
      if (data.ok) {
        setFeedback({ ok: true, msg: canal === 'email' ? 'E-mail de teste enviado com sucesso.' : 'Mensagem de teste enviada com sucesso.' })
      } else if (data.notConfigured) {
        setError(`Envio de ${canal === 'email' ? 'e-mail' : 'Telegram'} não está configurado (falta credencial do provedor no servidor).`)
      } else {
        setError(data.erro || 'Falha ao enviar o teste.')
      }
    } catch {
      setError('Não foi possível enviar o teste.')
    }
  }

  const processNow = async () => {
    setProcessing(true)
    setFeedback(null)
    setError('')
    try {
      const res = await fetch('/api/alerts/process', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setFeedback({ ok: true, msg: `Processamento concluído: ${data.total} envio(s) disparado(s) dos alertas ativos.` })
        await refresh()
      } else {
        setError(data.erro || 'Falha ao processar os alertas.')
      }
    } catch {
      setError('Não foi possível processar os alertas.')
    } finally {
      setProcessing(false)
    }
  }

  const isEmpty = ready && rows.length === 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alertas"
        description="Receba novas oportunidades por e-mail e Telegram, na hora ou em horário programado."
      >
        <Button
          onClick={() => { setEditingId(null); setEditing(null); setShowForm(!showForm) }}
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
        >
          {showForm ? 'Fechar' : 'Novo Alerta'}
        </Button>
      </PageHeader>

      {(!userId || (userId && !dbAvailable)) && (
        <DemoNotice>
          Os alertas são processados na nuvem (Cloudflare) a cada minuto e enviados por e-mail/Telegram. Para o envio
          funcionar de verdade é preciso: estar logado, aplicar a migração SQL no Supabase e configurar a chave de
          serviço + credenciais (provedor de e-mail Brevo/Resend + Telegram Bot) no servidor — sem elas nenhum envio ocorre e o erro real é exibido.
        </DemoNotice>
      )}

      {!ready && (
        <div className="flex items-center justify-center py-10 text-sm text-slate-400">Carregando seus alertas...</div>
      )}

      {ready && !userId && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-500 dark:text-slate-400">
          Você não está conectado. Os alertas são salvos apenas neste navegador e o envio automático (e-mail/Telegram)
          fica indisponível até que você entre na conta.
        </div>
      )}

      {ready && userId && !dbAvailable && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-700 dark:text-amber-400">
          As tabelas de alertas ainda não foram configuradas no banco de dados. Os alertas estão salvos temporariamente
          neste navegador. Aplique a migração SQL do Supabase para persistir e habilitar o envio real.
        </div>
      )}

      {!isEmpty && (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" icon={<Zap className="w-4 h-4" />} onClick={processNow} loading={processing}>
            Processar alertas agora
          </Button>
          <Button variant="ghost" size="sm" icon={<Send className="w-4 h-4" />} onClick={() => sendTest('email')}>
            Testar e-mail
          </Button>
          <Button variant="ghost" size="sm" icon={<Send className="w-4 h-4" />} onClick={() => sendTest('telegram')}>
            Testar Telegram
          </Button>
        </div>
      )}

      {tgTestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 dark:border dark:border-slate-700">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Testar Telegram</h3>
              <button onClick={() => setTgTestOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors" aria-label="Fechar">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              Digite o chat_id ou @username do Telegram para onde o teste será enviado (o bot precisa ter recebido /start deste usuário — ou estar no grupo).
            </p>
            <Input
              label="Destino do Telegram"
              placeholder="@meu_username ou 123456789"
              value={tgTestDestino}
              onChange={(e) => setTgTestDestino(e.target.value)}
              autoFocus
            />
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setTgTestOpen(false)}>Cancelar</Button>
              <Button
                size="sm"
                onClick={() => {
                  const n = tgTestDestino.trim()
                  if (!n) { setError('Informe um destino do Telegram para o teste.'); return }
                  setTgTestOpen(false)
                  sendTest('telegram', n)
                }}
              >
                Enviar teste
              </Button>
            </div>
          </div>
        </div>
      )}

      {feedback && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-700 dark:text-emerald-400">
          {feedback.msg}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {showForm && (
        <AlertForm
          initial={editing}
          defaultEmail={defaultEmail}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditing(null); setEditingId(null) }}
          saving={saving}
        />
      )}

      {!showForm && ready && rows.length > 0 && (
        <AlertList alerts={rows} onEdit={handleEdit} onDelete={handleDelete} onToggle={handleToggle} />
      )}

      {!showForm && ready && dbAvailable && <DeliveryHistory deliveries={history} />}

      {isEmpty && (
        <EmptyState
          icon={<Bell className="w-8 h-8" />}
          title="Nenhum alerta configurado"
          description="Clique em 'Novo Alerta' para definir filtros, escolher como deseja receber (e-mail ou Telegram) e quando quer ser notificado."
          className="border border-dashed border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900"
        />
      )}
    </div>
  )
}

interface ResolvedRow {
  id: string
  nome: string
  keyword: string | null
  modalidade: string | null
  uf: string | null
  municipio: string | null
  orgao: string | null
  ativo: boolean
  canais: Canal[]
  frequencia: 'imediato' | 'diario' | 'semanal'
  horario: string | null
  modoCalendario: boolean
}
