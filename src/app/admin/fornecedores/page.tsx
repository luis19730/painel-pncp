'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Building2, Download, FileSpreadsheet, Loader2, RefreshCw, ShieldAlert, Trophy } from 'lucide-react'
import { UFS_BRASIL } from '@/data/municipios'
import { baixarCsv } from '@/lib/admin/csv'

const ADMIN_OK_KEY = 'painel_admin_sessao'
const ADMIN_PWD_KEY = 'painel_admin_pwd'

interface Fornecedor {
  cnpj: string
  razao_social: string | null
  porte: string | null
  natureza_juridica: string | null
  uf: string | null
  participacoes: number
  vitorias: number
  valor_total_homologado: number
  primeira_participacao: string | null
  ultima_participacao: string | null
}

function brl(v: number): string {
  return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function dt(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('pt-BR')
  } catch {
    return '—'
  }
}
function fmtCnpj(c: string): string {
  const d = (c || '').replace(/\D/g, '').padStart(14, '0')
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

export default function AdminFornecedoresPage() {
  const [pwd, setPwd] = useState(() => {
    try {
      return sessionStorage.getItem(ADMIN_PWD_KEY) || ''
    } catch {
      return ''
    }
  })
  const [unlocked, setUnlocked] = useState(false)
  const [erroPwd, setErroPwd] = useState('')
  const [entrando, setEntrando] = useState(false)

  const [busca, setBusca] = useState('')
  const [uf, setUf] = useState('')
  const [ordem, setOrdem] = useState('vitorias')

  const [lista, setLista] = useState<Fornecedor[]>([])
  const [total, setTotal] = useState(0)
  const [carregando, setCarregando] = useState(false)
  const [extraindo, setExtraindo] = useState(false)
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')

  const qs = useCallback(() => {
    const q = new URLSearchParams({ ordem, limite: '300' })
    if (busca.trim()) q.set('busca', busca.trim())
    if (uf) q.set('uf', uf)
    return q.toString()
  }, [busca, uf, ordem])

  const carregar = useCallback(
    async (senha?: string) => {
      const p = senha ?? pwd
      setCarregando(true)
      setErro('')
      try {
        const res = await fetch(`/api/admin/fornecedores?${qs()}`, {
          headers: { 'Content-Type': 'application/json', 'x-admin-password': p },
          cache: 'no-store',
        })
        const data = await res.json()
        if (!res.ok || !data.ok) throw new Error(data.erro || 'Falha ao carregar.')
        setLista(data.fornecedores || [])
        setTotal(data.total || 0)
        setUnlocked(true)
      } catch (e) {
        setErro((e as Error).message || 'Falha ao carregar.')
      } finally {
        setCarregando(false)
      }
    },
    [pwd, qs]
  )

  useEffect(() => {
    try {
      const ok = sessionStorage.getItem(ADMIN_OK_KEY) === '1'
      if (ok && pwd) queueMicrotask(() => carregar(pwd))
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
      const res = await fetch(`/api/admin/fornecedores?${qs()}`, {
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
      setLista(data.fornecedores || [])
      setTotal(data.total || 0)
      setUnlocked(true)
    } catch {
      setErroPwd('Falha de conexão.')
    } finally {
      setEntrando(false)
    }
  }

  const exportarCsv = (dados: Fornecedor[] = lista, nome = 'fornecedores') => {
    baixarCsv(
      nome,
      ['CNPJ', 'Razão social', 'UF', 'Porte', 'Participações', 'Vitórias', 'Valor total homologado', '1ª participação', 'Última participação'],
      dados.map((f) => [
        f.cnpj,
        f.razao_social || '',
        f.uf || '',
        f.porte || '',
        String(f.participacoes),
        String(f.vitorias),
        (Number(f.valor_total_homologado) || 0).toFixed(2),
        f.primeira_participacao || '',
        f.ultima_participacao || '',
      ])
    )
  }

  const exportarExcel = async (dados: Fornecedor[] = lista, nome = 'fornecedores') => {
    try {
      const XLSX = await import('xlsx')
      const linhas = dados.map((f) => ({
        CNPJ: f.cnpj,
        'Razão social': f.razao_social || '',
        UF: f.uf || '',
        Porte: f.porte || '',
        Participações: f.participacoes,
        Vitórias: f.vitorias,
        'Valor total homologado': Number(f.valor_total_homologado) || 0,
        '1ª participação': f.primeira_participacao ? new Date(f.primeira_participacao).toLocaleDateString('pt-BR') : '',
        'Última participação': f.ultima_participacao ? new Date(f.ultima_participacao).toLocaleDateString('pt-BR') : '',
      }))
      const ws = XLSX.utils.json_to_sheet(linhas)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Fornecedores')
      XLSX.writeFile(wb, `${nome}.xlsx`)
    } catch {
      setErro('Não foi possível gerar o Excel. Use a exportação CSV.')
    }
  }

  const extrairAgora = async () => {
    setExtraindo(true)
    setMsg('')
    setErro('')
    try {
      const res = await fetch('/api/admin/fornecedores/extrair?limite=4', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': pwd },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) throw new Error(String(data.erro) || `Erro HTTP ${res.status}`)
      const r = (data.resumo || {}) as Record<string, number>
      setMsg(`Lote: ${data.processados} contratação(ões) · ${data.fornecedores} fornecedor(es) novo(s)/atualizado(s) · ok=${r.ok || 0} sem_resultado=${r.sem_resultado || 0} falha=${r.falha || 0}`)
      await carregar()
    } catch (e) {
      setErro((e as Error).message || 'Falha na extração.')
    } finally {
      setExtraindo(false)
    }
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0b1120] px-4">
        <form onSubmit={desbloquear} className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white mb-4">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Base de fornecedores</h1>
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
                <Building2 className="w-6 h-6 text-primary" /> Base de fornecedores
              </h1>
              <Link href="/admin" className="text-xs text-slate-400 hover:text-slate-600 inline-flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> /admin
              </Link>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Vencedores e licitantes extraídos dos resultados do PNCP · {total} fornecedor(es). O PNCP não publica e-mail — base traz nome + CNPJ + valores.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => exportarCsv()} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
              <Download className="w-4 h-4" /> CSV
            </button>
            <button onClick={() => exportarExcel()} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </button>
            <button onClick={() => carregar()} disabled={carregando} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50">
              {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Atualizar
            </button>
            <button onClick={extrairAgora} disabled={extraindo} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50">
              {extraindo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />} Extrair agora
            </button>
          </div>
        </div>

        <div className="card bg-white dark:bg-slate-900 p-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Busca (nome ou CNPJ)</label>
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Ex.: serviços ou 12.345.678/0001-90" className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm w-64" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">UF</label>
            <select value={uf} onChange={(e) => setUf(e.target.value)} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm">
              <option value="">Todas</option>
              {UFS_BRASIL.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Ordenar por</label>
            <select value={ordem} onChange={(e) => setOrdem(e.target.value)} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm">
              <option value="vitorias">Mais vitórias</option>
              <option value="valor">Maior valor homologado</option>
              <option value="participacoes">Mais participações</option>
              <option value="recentes">Última participação</option>
              <option value="nome">Nome (A-Z)</option>
            </select>
          </div>
          <button onClick={() => carregar()} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">Filtrar</button>
        </div>

        {erro && <div className="card bg-white dark:bg-slate-900 p-4 text-sm text-danger">{erro}</div>}
        {msg && <div className="card bg-white dark:bg-slate-900 p-4 text-sm text-slate-600 dark:text-slate-300">{msg}</div>}

        <div className="card bg-white dark:bg-slate-900 p-5">
          {lista.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">
              Nenhum fornecedor ainda. Clique em “Extrair agora” (processa ~4 contratações por vez).
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 uppercase">
                    <th className="py-2 pr-4">Razão social</th>
                    <th className="py-2 pr-4">CNPJ</th>
                    <th className="py-2 pr-4">UF</th>
                    <th className="py-2 pr-4">Porte</th>
                    <th className="py-2 pr-4 text-right">Particip.</th>
                    <th className="py-2 pr-4 text-right">Vitórias</th>
                    <th className="py-2 pr-4 text-right">Valor homologado</th>
                    <th className="py-2 pr-4">Última</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((f) => (
                    <tr key={f.cnpj} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-2 pr-4 text-slate-700 dark:text-slate-200">{f.razao_social || '—'}</td>
                      <td className="py-2 pr-4 text-slate-500 font-mono text-xs">{fmtCnpj(f.cnpj)}</td>
                      <td className="py-2 pr-4">{f.uf || '—'}</td>
                      <td className="py-2 pr-4">{f.porte || '—'}</td>
                      <td className="py-2 pr-4 text-right">{f.participacoes}</td>
                      <td className="py-2 pr-4 text-right font-semibold text-success">{f.vitorias}</td>
                      <td className="py-2 pr-4 text-right text-slate-600 dark:text-slate-300">{brl(f.valor_total_homologado)}</td>
                      <td className="py-2 pr-4 text-slate-500">{dt(f.ultima_participacao)}</td>
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
