'use client'

import { FileSpreadsheet, FileText, FileDown, Download } from 'lucide-react'
import Button from '@/components/ui/button'

export default function ExportBar({
  habilitado,
  orcamentoCount,
  aoExcel,
  aoCsv,
  aoPdf,
  baixandoCsv,
}: {
  habilitado: boolean
  orcamentoCount: number
  aoExcel: () => void
  aoCsv: () => void
  aoPdf: () => void
  baixandoCsv: boolean
}) {
  return (
    <section className="card p-5">
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Exportar relatório</h2>
            <p className="text-xs text-slate-400">Gere um relatório profissional, pronto para imprimir.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="success" size="md" onClick={aoExcel} disabled={!habilitado || orcamentoCount === 0}>
            <FileSpreadsheet className="w-4 h-4" /> Excel (.xlsx)
          </Button>
          <Button variant="secondary" size="md" onClick={aoCsv} disabled={!habilitado}>
            {baixandoCsv ? <><FileDown className="w-4 h-4 animate-pulse" /> Baixando...</> : <><FileText className="w-4 h-4" /> CSV</>}
          </Button>
          <Button variant="ghost" size="md" onClick={aoPdf} disabled>
            <Download className="w-4 h-4" /> PDF
          </Button>
        </div>
      </div>
      {orcamentoCount === 0 && (
        <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
          Para exportar o relatório Excel, adicione ao menos um item ao orçamento (passo "Adicionar ao orçamento").
        </p>
      )}
    </section>
  )
}