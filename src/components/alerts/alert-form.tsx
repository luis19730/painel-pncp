'use client'

import { useState } from 'react'
import { Bell, Mail, Send, CalendarClock, Power } from 'lucide-react'
import Input from '@/components/ui/input'
import Button from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  DIAS_SEMANA,
  FREQUENCIA_LABELS,
  type Frequencia,
  type NewAlertInput,
  type Canal,
} from '@/lib/alerts/types'

const UF_OPTIONS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']
const MODALIDADES = ['Pregão Eletrônico', 'Pregão Presencial', 'Dispensa de Licitação', 'Concorrência']

export interface FormState {
  nome: string
  keyword: string
  modalidade: string
  uf: string
  municipio: string
  orgao: string
  valorMin: string
  valorMax: string
  dataInicial: string
  dataFinal: string
  ativo: boolean
  email: string
  telegram: string
  useEmail: boolean
  useTelegram: boolean
  modo: 'imediato' | 'programado'
  frequencia: Frequencia
  horario: string
  diasSemana: number[]
}

const EMPTY: FormState = {
  nome: '',
  keyword: '',
  modalidade: '',
  uf: '',
  municipio: '',
  orgao: '',
  valorMin: '',
  valorMax: '',
  dataInicial: '',
  dataFinal: '',
  ativo: true,
  email: '',
  telegram: '',
  useEmail: false,
  useTelegram: false,
  modo: 'imediato',
  frequencia: 'imediato',
  horario: '08:00',
  diasSemana: [1, 2, 3, 4, 5],
}

export function emptyForm(defaultEmail: string): FormState {
  return { ...EMPTY, email: defaultEmail }
}

export function formToInput(f: FormState): NewAlertInput {
  return {
    nome: f.nome,
    keyword: f.keyword,
    modalidade: f.modalidade,
    uf: f.uf,
    municipio: f.municipio,
    orgao: f.orgao,
    valorMin: f.valorMin,
    valorMax: f.valorMax,
    dataInicial: f.dataInicial,
    dataFinal: f.dataFinal,
    ativo: f.ativo,
    useEmail: f.useEmail,
    useTelegram: f.useTelegram,
    email: f.email,
    telegram: f.telegram,
    modo: f.modo,
    frequencia: f.frequencia,
    horario: f.horario,
    diasSemana: f.diasSemana,
  }
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</label>
      {children}
    </div>
  )
}

export default function AlertForm({
  initial,
  defaultEmail,
  onSave,
  onCancel,
  saving,
}: {
  initial: FormState | null
  defaultEmail: string
  onSave: (input: NewAlertInput) => void
  onCancel: () => void
  saving: boolean
}) {
  const [f, setF] = useState<FormState>(initial || emptyForm(defaultEmail))
  const set = (patch: Partial<FormState>) => setF((p) => ({ ...p, ...patch }))

  const channelsChosen = f.useEmail || f.useTelegram

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.nome.trim() || !channelsChosen) return
    onSave(formToInput(f))
  }

  return (
    <form onSubmit={submit} className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-5 space-y-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
        <Bell className="w-4 h-4 text-primary" />
        {initial ? 'Editar alerta' : 'Novo alerta'}
      </div>

      {/* Identificação + filtros */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">O que monitorar</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nome do alerta">
            <Input value={f.nome} onChange={(e) => set({ nome: e.target.value })} placeholder="Ex: Ambulância em SP" required />
          </Field>
          <Field label="Palavra-chave">
            <Input value={f.keyword} onChange={(e) => set({ keyword: e.target.value })} placeholder="Ex: ambulância, veículo" />
          </Field>
          <Field label="Modalidade">
            <select
              value={f.modalidade}
              onChange={(e) => set({ modalidade: e.target.value })}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="">Todas</option>
              {MODALIDADES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="UF">
            <select
              value={f.uf}
              onChange={(e) => set({ uf: e.target.value })}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="">Todas</option>
              {UF_OPTIONS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </Field>
          <Field label="Município">
            <Input value={f.municipio} onChange={(e) => set({ municipio: e.target.value })} placeholder="Ex: São Paulo" />
          </Field>
          <Field label="Órgão">
            <Input value={f.orgao} onChange={(e) => set({ orgao: e.target.value })} placeholder="Ex: Secretaria da Saúde" />
          </Field>
          <Field label="Valor mínimo (R$)">
            <Input type="number" min="0" value={f.valorMin} onChange={(e) => set({ valorMin: e.target.value })} placeholder="0" />
          </Field>
          <Field label="Valor máximo (R$)">
            <Input type="number" min="0" value={f.valorMax} onChange={(e) => set({ valorMax: e.target.value })} placeholder="0" />
          </Field>
          <Field label="Data inicial">
            <Input type="date" value={f.dataInicial} onChange={(e) => set({ dataInicial: e.target.value })} />
          </Field>
          <Field label="Data final">
            <Input type="date" value={f.dataFinal} onChange={(e) => set({ dataFinal: e.target.value })} />
          </Field>
        </div>
      </div>

      {/* Canais */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Como deseja receber os alertas?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className={cn('flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors', f.useEmail ? 'border-primary bg-primary-soft dark:bg-blue-500/10' : 'border-slate-200 dark:border-slate-700')}>
            <input type="checkbox" checked={f.useEmail} onChange={(e) => set({ useEmail: e.target.checked })} className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
                <Mail className="w-4 h-4 text-primary" /> E-mail
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Envie para seu e-mail cadastrado ou outro de sua escolha.</p>
              {f.useEmail && (
                <Input
                  type="email"
                  className="mt-2"
                  value={f.email}
                  onChange={(e) => set({ email: e.target.value })}
                  placeholder="seu@email.com"
                />
              )}
            </div>
          </label>

          <label className={cn('flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors', f.useTelegram ? 'border-primary bg-primary-soft dark:bg-blue-500/10' : 'border-slate-200 dark:border-slate-700')}>
            <input type="checkbox" checked={f.useTelegram} onChange={(e) => set({ useTelegram: e.target.checked })} className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
                <Send className="w-4 h-4 text-sky-500" /> Telegram
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Chat ID numérico (ex.: 123456789) ou @username público do bot.</p>
              {f.useTelegram && (
                <Input
                  className="mt-2"
                  value={f.telegram}
                  onChange={(e) => set({ telegram: e.target.value })}
                  placeholder="@meu_username ou 123456789"
                />
              )}
            </div>
          </label>
        </div>
        {!channelsChosen && (
          <p className="text-xs text-amber-600 dark:text-amber-400">Selecione ao menos um canal (E-mail e/ou Telegram).</p>
        )}
      </div>

      {/* Frequência / modo */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Quando enviar</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Frequência">
            <select
              value={f.frequencia}
              onChange={(e) => {
                const freq = e.target.value as Frequencia
                set({ frequencia: freq, modo: freq === 'imediato' ? 'imediato' : 'programado' })
              }}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="imediato">{FREQUENCIA_LABELS.imediato}</option>
              <option value="diario">{FREQUENCIA_LABELS.diario}</option>
              <option value="semanal">{FREQUENCIA_LABELS.semanal}</option>
            </select>
          </Field>
          <Field label="Horário" className={f.modo === 'imediato' ? 'opacity-40 pointer-events-none' : ''}>
            <Input type="time" value={f.horario} onChange={(e) => set({ horario: e.target.value })} />
            <p className="text-[11px] text-slate-400">Horário de Brasília</p>
          </Field>
        </div>

        {f.modo === 'programado' && (
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <CalendarClock className="w-4 h-4 text-primary" />
              Dias da semana (envio programado)
            </div>
            <div className="flex flex-wrap gap-2">
              {DIAS_SEMANA.map((d) => {
                const on = f.diasSemana.includes(d.value)
                return (
                  <button
                    type="button"
                    key={d.value}
                    onClick={() =>
                      set({
                        diasSemana: on
                          ? f.diasSemana.filter((x) => x !== d.value)
                          : [...f.diasSemana, d.value],
                      })
                    }
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                      on
                        ? 'bg-primary text-white border-primary'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-primary/50'
                    )}
                  >
                    {d.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Ativo */}
      <label className="inline-flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={f.ativo} onChange={(e) => set({ ativo: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" />
        <span className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
          <Power className="w-4 h-4 text-emerald-500" /> Alerta ativo
        </span>
      </label>

      <div className="flex gap-2 pt-1">
        <Button type="submit" variant="primary" loading={saving}>{initial ? 'Salvar alterações' : 'Criar alerta'}</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  )
}
