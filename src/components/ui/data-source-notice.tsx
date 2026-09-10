import { Info, CheckCircle2 } from 'lucide-react'

export type DataSource = 'live' | 'local'

/**
 * Banner de origem de dados. Exibe confirmação quando os dados são reais do
 * PNCP e aviso (amber) apenas quando a página realmente caiu na base local —
 * ou seja, após todas as tentativas à API oficial falharem.
 */
export default function DataSourceNotice({
  source,
  localText = 'Sem conexão com o PNCP no momento — exibindo base demonstrativa local. Os valores reais são carregados automaticamente quando a API retorna.',
  liveText = 'Conectado à API oficial do PNCP — dados reais em tempo real.',
}: {
  source: DataSource
  localText?: string
  liveText?: string
}) {
  if (source === 'live') {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10 px-3.5 py-2.5">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed text-emerald-700 dark:text-emerald-300">{liveText}</p>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 px-3.5 py-2.5">
      <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">{localText}</p>
    </div>
  )
}
