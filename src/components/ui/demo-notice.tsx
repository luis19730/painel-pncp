import { Info } from 'lucide-react'

export default function DemoNotice({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 px-3.5 py-2.5">
      <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">
        {children ?? 'Dados demonstrativos para demonstração do produto. Quando a API pública do PNCP estiver acessível, os valores reais são carregados automaticamente.'}
      </p>
    </div>
  )
}
