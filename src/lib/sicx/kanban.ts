// Colunas padrão do Kanban "Minhas contratações" (Parte 7.4).
// Criadas no primeiro acesso do usuário; podem ser renomeadas/reordenadas.

export const COLUNAS_CONTRATACOES = [
  { nome: 'Pedido recebido', cor: 'slate' },
  { nome: 'Em separação', cor: 'amber' },
  { nome: 'Em transporte', cor: 'sky' },
  { nome: 'Entregue', cor: 'emerald' },
  { nome: 'Aguardando recebimento/ateste', cor: 'violet' },
  { nome: 'Aguardando pagamento', cor: 'orange' },
  { nome: 'Pago', cor: 'green' },
  { nome: 'Problema/Glosa', cor: 'rose' },
] as const

export const CORES_COLUNA: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  sky: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  green: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
  rose: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
}
