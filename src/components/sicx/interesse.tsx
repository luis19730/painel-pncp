'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2, Mail, ShieldCheck } from 'lucide-react'
import { apiSicxPublico } from '@/lib/sicx/client'

const INPUT =
  'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary'

export default function Interesse() {
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [consentimento, setConsentimento] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [ok, setOk] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [erro, setErro] = useState('')

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro(''); setOk('')
    if (!consentimento) { setErro('Marque o consentimento para receber as atualizações.'); return }
    setEnviando(true)
    try {
      const r = await apiSicxPublico<{ token: string | null; jaCadastrado?: boolean }>('/api/sicx/interessados', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, whatsapp, consentimento, origem: 'pagina-credenciamento-sicx' }),
      })
      setOk(r.jaCadastrado ? 'Seu e-mail já está na lista. Obrigado!' : 'Cadastro recebido. Você receberá as atualizações do SICX.')
      setToken(r.token)
      setEmail(''); setWhatsapp(''); setConsentimento(false)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível concluir o cadastro.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="card p-6 dark:bg-slate-900 dark:border-slate-800">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-soft dark:bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Mail className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">Receba as atualizações do SICX</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Avisamos quando a plataforma, as normas complementares ou o diretório mudarem. Sem spam e com saída a qualquer momento.
          </p>
        </div>
      </div>

      <form onSubmit={enviar} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label htmlFor="interesse-email" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">E-mail *</label>
          <input id="interesse-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} placeholder="voce@empresa.com.br" />
        </div>
        <div>
          <label htmlFor="interesse-whats" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">WhatsApp (opcional)</label>
          <input id="interesse-whats" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className={INPUT} placeholder="(11) 90000-0000" />
        </div>
        <label className="md:col-span-2 flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <input type="checkbox" checked={consentimento} onChange={(e) => setConsentimento(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" />
          <span>
            Concordo com o uso do e-mail e do WhatsApp para receber comunicações sobre o SICX, conforme a
            Política de Privacidade (LGPD). Posso pedir a exclusão a qualquer momento.
          </span>
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={enviando} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60">
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Quero receber
          </button>
        </div>
      </form>

      {ok && (
        <div role="status" className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
          <p>{ok}</p>
          {token && (
            <p className="mt-1 text-xs">
              Para sair a qualquer momento, guarde este link:{' '}
              <a href={`/credenciamento-sicx/descadastro?token=${token}`} className="font-semibold underline">cancelar inscrição</a>.
            </p>
          )}
        </div>
      )}
      {erro && <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-400">{erro}</p>}

      <p className="mt-3 flex items-start gap-1.5 text-[11px] text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        Dados usados apenas para comunicações sobre o SICX. Não compartilhamos com terceiros nem com órgãos públicos.
      </p>
    </div>
  )
}
