'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { apiSicxPublico } from '@/lib/sicx/client'

/** Formulário do rodapé: "Reportar erro nesta página". */
export default function ReportarPagina() {
  const [aberto, setAberto] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [ok, setOk] = useState(false)
  const [erro, setErro] = useState('')

  async function enviar() {
    if (!motivo.trim()) return
    setEnviando(true); setErro('')
    try {
      await apiSicxPublico('/api/sicx/reportar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ motivo }),
      })
      setOk(true)
      setMotivo('')
      setAberto(false)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar o relato.')
    } finally {
      setEnviando(false)
    }
  }

  if (ok) {
    return <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-500"><CheckCircle2 className="w-3.5 h-3.5" /> Erro reportado. Obrigado!</p>
  }

  return (
    <div className="text-xs">
      {!aberto ? (
        <button type="button" onClick={() => setAberto(true)} className="inline-flex items-center gap-1.5 font-semibold text-slate-400 hover:text-primary">
          <AlertTriangle className="w-3.5 h-3.5" /> Reportar erro nesta página
        </button>
      ) : (
        <div className="mt-2 max-w-md rounded-xl border border-slate-700 bg-slate-800/60 p-3">
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={2}
            placeholder="Descreva o erro ou a informação desatualizada..."
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-2.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={enviar} disabled={enviando} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
              {enviando && <Loader2 className="w-3 h-3 animate-spin" />} Enviar
            </button>
            <button type="button" onClick={() => setAberto(false)} className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-300">Cancelar</button>
          </div>
          {erro && <p className="mt-1 text-rose-400">{erro}</p>}
        </div>
      )}
    </div>
  )
}
