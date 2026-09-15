'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Download, FileSpreadsheet, Loader2, Mail, RefreshCw, ShieldAlert } from 'lucide-react'
import { UFS_BRASIL } from '@/data/municipios'
import { baixarCsv } from '@/lib/admin/csv'

const ADMIN_OK_KEY = 'painel_admin_sessao'
const ADMIN_PWD_KEY = 'painel_admin_pwd'

interface Origem {
  pncp_id?: string
  numero?: string | null
  data?: string | null
  arquivo_url?: string | null
}
interface Contato {
  orgao_cnpj: string
  orgao_nome: string | null
  uf: string | null
  contato_email: string
  editais_origem: Origem[]
  contato_extraido_em: string | null
}

function dt(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return '—'
  }
}

function origensTexto(origens: Origem[]): string {
  if (!Array.isArray(origens) || origens.length === 0) return '—'
  return origens.map((o) => `${o.numero || o.pncp_id || '—'}${o.data ? ` (${String(o.data).slice(0, 10)})` : ''}`).join(' | ')
}

export default function AdminContatosPage() {
  const [pwd, setPwd] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [erroPwd, setErroPwd] = useState('')
  const [entrando, setEntrando] = useState(false)

  const [uf, setUf] = useState('')
  const [orgao, setOrgao] = useState('')
  const [email, setEmail] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  const [contatos, setContatos] = useState<Contato[]>([])
  const [carregando, setCarregando] = useState(false)
  const [extraindo, setExtraindo] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [emailTeste, setEmailTeste] = useState('')
  const [msgEnvio, setMsgEnvio] = useState('')
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')

  const filtrosQs = useCallback(() => {
    const q = new URLSearchParams()
    if (uf) q.set('uf', uf)
    if (orgao) q.set('orgao', orgao)
    if (email) q.set('email', email)
    if (dataInicio) q.set('dataInicio', dataInicio)
    if (dataFim) q.set('dataFim', dataFim)
    return q.toString()
  }, [uf, orgao, email, dataInicio, dataFim])

  const carregar = useCallback(
    async (senha?: string) => {
      const p = senha ?? pwd
      setCarregando(true)
      setErro('')
      try {
        const res = await fetch(`/api/admin/contatos?${filtrosQs()}`, {
          headers: { 'Content-Type': 'application/json', 'x-admin-password': p },
          cache: 'no-store',
        })
        const data = await res.json()
        if (!res.ok || !data.ok) throw new Error(data.erro || 'Falha ao carregar.')
        setContatos(data.contatos || [])
        setUnlocked(true)
      } catch (e) {
        setErro((e as Error).message || 'Falha ao carregar.')
      } finally {
        setCarregando(false)
      }
    },
    [pwd, filtrosQs]
  )

  useEffect(() => {
    try {
      const ok = sessionStorage.getItem(ADMIN_OK_KEY) === '1'
      const saved = sessionStorage.getItem(ADMIN_PWD_KEY) || ''
      if (ok && saved) {
        setPwd(saved)
        carregar(saved)
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const desbloquear = async (e: React.FormEvent) => {
    e.preventDefault()
    setErroPwd('')
    setEntrando(true)
    try {
      const res = await fetch('/api/admin/contatos', {
        headers: { 'Content-Type': 'application/json', 'x-admin-password': pwd },
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setErroPwd(data.erro || 'Senha inválida.')
        return
      }
      try {
        sessionStorage.setItem(ADMIN_OK_KEY, '1')
        sessionStorage.setItem(ADMIN_PWD_KEY, pwd)
      } catch {
        /* ignore */
      }
      setContatos(data.contatos || [])
      setUnlocked(true)
    } catch {
      setErroPwd('Falha de conexão.')
    } finally {
      setEntrando(false)
    }
  }

  const exportarCsv = () => {
    baixarCsv(
      'contatos-editais',
      ['Órgão', 'E-mail', 'UF', 'Edital de origem', 'Extraído em'],
      contatos.map((c) => [c.orgao_nome || '', c.contato_email, c.uf || '', origensTexto(c.editais_origem), c.contato_extraido_em || ''])
    )
  }

  const exportarExcel = async () => {
    try {
      const XLSX = await import('xlsx')
      const linhas = contatos.map((c) => ({
        Órgão: c.orgao_nome || '',
        'E-mail': c.contato_email,
        UF: c.uf || '',
        'Edital de origem': origensTexto(c.editais_origem),
        'Extraído em': c.contato_extraido_em ? new Date(c.contato_extraido_em).toLocaleString('pt-BR') : '',
      }))
      const ws = XLSX.utils.json_to_sheet(linhas)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Contatos')
      XLSX.writeFile(wb, 'contatos-editais.xlsx')
    } catch {
      setErro('Não foi possível gerar o Excel. Use a exportação CSV.')
    }
  }

  const extrairAgora = async () => {
    setExtraindo(true)
    setMsg('')
    setErro('')
    try {
      const res = await fetch('/api/admin/contatos/extrair?limite=3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': pwd },
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setErro(data.erro || 'Falha na extração.')
        return
      }
      const r = data.resumo || {}
      setMsg(`Lote: ${data.processados} processado(s) · ${data.emails_extraidos} e-mail(s) · ok=${r.ok || 0} sem_contato=${r.sem_contato || 0} sem_arquivo=${r.sem_arquivo || 0} pdf_invalido=${r.pdf_invalido || 0} falha=${r.falha || 0}`)
      await carregar()
    } catch {
      setErro('Falha de conexão.')
    } finally {
      setExtraindo(false)
    }
  }

  const resumoEnvio = (j: { selecionados?: number; enviados?: number; pulados?: number; falhas?: number; dryRun?: boolean }) =>
    `selecionados=${j.selecionados || 0} enviados=${j.enviados || 0} pulados=${j.pulados || 0} falhas=${j.falhas || 0}${j.dryRun ? ' (dry-run)' : ''}`

  const enviarTeste = async () => {
    if (!emailTeste.trim()) {
      setMsgEnvio('Informe um e-mail de teste.')
      return
    }
    setEnviando(true)
    setMsgEnvio('')
    try {
      const res = await fetch(`/api/admin/contatos/enviar?para=${encodeURIComponent(emailTeste.trim())}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': pwd },
      })
      const j = await res.json()
      if (!res.ok || !j.ok) {
        setMsgEnvio(j.erro || 'Falha no envio.')
        return
      }
      setMsgEnvio(`Teste ${j.enviados ? 'enviado' : 'falhou'} para ${emailTeste.trim()}`)
    } catch {
      setMsgEnvio('Falha de conexão.')
    } finally {
      setEnviando(false)
    }
  }

  const enviarOutreach = async (dry: boolean) => {
    if (!dry && !confirm('Enviar o e-mail de apresentação para até 20 contatos REAIS? Esta ação não pode ser desfeita.')) return
    setEnviando(true)
    setMsgEnvio('')
    try {
      const res = await fetch(`/api/admin/contatos/enviar?limite=20${dry ? '&dry=1' : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': pwd },
      })
      const j = await res.json()
      if (!res.ok || !j.ok) {
        setMsgEnvio(j.erro || 'Falha no envio.')
        return
      }
      setMsgEnvio(`Lote: ${resumoEnvio(j)}`)
      if (!dry) await carregar()
    } catch {
      setMsgEnvio('Falha de conexão.')
    } finally {
      setEnviando(false)
    }
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0b1120] px-4">
        <form onSubmit={desbloquear} className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white mb-4">
            <Mail className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Contatos dos editais</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-5">Acesso restrito. Informe a senha administrativa.</p>
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Senha de administrador"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white mb-3 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {erroPwd && <p className="text-sm text-danger mb-3">{erroPwd}</p>}
          <button
            type="submit"
            disabled={entrando || !pwd}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {entrando ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
            Entrar
          </button>
          <Link href="/admin" className="mt-4 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600">
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao painel administrativo
          </Link>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Mail className="w-6 h-6 text-primary" /> Contatos dos editais
              </h1>
              <Link href="/admin" className="text-xs text-slate-400 hover:text-slate-600 inline-flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> /admin
              </Link>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              E-mails extraídos dos PDFs dos editais (deduplicados por órgão+e-mail) · {contatos.length} contato(s)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={exportarCsv} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
              <Download className="w-4 h-4" /> CSV
            </button>
            <button onClick={exportarExcel} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </button>
            <button onClick={() => carregar()} disabled={carregando} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50">
              {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Atualizar
            </button>
            <button onClick={extrairAgora} disabled={extraindo} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50">
              {extraindo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} Extrair agora
            </button>
          </div>
        </div>

        <div className="card bg-white dark:bg-slate-900 p-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">UF</label>
            <select value={uf} onChange={(e) => setUf(e.target.value)} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm">
              <option value="">Todas</option>
              {UFS_BRASIL.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Órgão</label>
            <input value={orgao} onChange={(e) => setOrgao(e.target.value)} placeholder="Nome do órgão" className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm w-56" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">E-mail</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contém..." className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm w-48" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Extraído de</label>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">até</label>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
          </div>
          <button onClick={() => carregar()} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">Filtrar</button>
        </div>

        {erro && <div className="card bg-white dark:bg-slate-900 p-4 text-sm text-danger">{erro}</div>}
        {msg && <div className="card bg-white dark:bg-slate-900 p-4 text-sm text-slate-600 dark:text-slate-300">{msg}</div>}

        <div className="card bg-white dark:bg-slate-900 p-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" /> Enviar e-mail de apresentação (outreach)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            1x por contato, em lotes de 20 por dia pelo cron. Use o teste para enviar apenas para um e-mail seu.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input value={emailTeste} onChange={(e) => setEmailTeste(e.target.value)} placeholder="E-mail de teste" className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm w-56" />
            <button onClick={enviarTeste} disabled={enviando} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50">Testar</button>
            <button onClick={() => enviarOutreach(true)} disabled={enviando} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50">Dry-run (20)</button>
            <button onClick={() => enviarOutreach(false)} disabled={enviando} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50">
              {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} Enviar lote (20)
            </button>
          </div>
          {msgEnvio && <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">{msgEnvio}</p>}
        </div>

        <div className="card bg-white dark:bg-slate-900 p-5">
          {contatos.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">
              Nenhum contato encontrado. Rode o cron de extração (`/api/cron/extrair-contatos`) para popular a base.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 uppercase">
                    <th className="py-2 pr-4">Órgão</th>
                    <th className="py-2 pr-4">E-mail</th>
                    <th className="py-2 pr-4">UF</th>
                    <th className="py-2 pr-4">Edital de origem</th>
                    <th className="py-2 pr-4">Extraído em</th>
                  </tr>
                </thead>
                <tbody>
                  {contatos.map((c) => (
                    <tr key={`${c.orgao_cnpj}-${c.contato_email}`} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-2 pr-4 text-slate-700 dark:text-slate-200">{c.orgao_nome || '—'}</td>
                      <td className="py-2 pr-4 text-primary font-medium">{c.contato_email}</td>
                      <td className="py-2 pr-4">{c.uf || '—'}</td>
                      <td className="py-2 pr-4 text-slate-500 max-w-md">{origensTexto(c.editais_origem)}</td>
                      <td className="py-2 pr-4 text-slate-500">{dt(c.contato_extraido_em)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
