// ============================================================================
// Constantes do KANBAN do Analista.
// As colunas padrão são criadas no primeiro acesso do usuário (via API) e
// podem ser renomeadas, reordenadas, criadas e removidas depois.
// ============================================================================

export interface ColunaPadrao {
  nome: string
  cor: string
}

export const COLUNAS_PADRAO: ColunaPadrao[] = [
  { nome: 'Radar / Oportunidades', cor: 'slate' },
  { nome: 'Em análise', cor: 'sky' },
  { nome: 'Aguardando documentos', cor: 'amber' },
  { nome: 'Proposta enviada', cor: 'indigo' },
  { nome: 'Em disputa', cor: 'violet' },
  { nome: 'Recurso / Impugnação', cor: 'orange' },
  { nome: 'Ganha / Homologada', cor: 'emerald' },
  { nome: 'Contrato / Entrega', cor: 'teal' },
  { nome: 'Pagamento recebido', cor: 'green' },
  { nome: 'Perdida / Desistida', cor: 'rose' },
]

/** Itens de checklist sugeridos (o usuário adiciona com 1 clique). */
export const CHECKLIST_SUGERIDO = [
  'Certidões negativas (federal, estadual, municipal, FGTS, trabalhista)',
  'Proposta comercial assinada',
  'Planilha de custos e formação de preços',
  'Amostra / catálogo técnico',
  'Garantia / seguro-garantia',
  'Documentos de habilitação jurídica e fiscal',
]

/** Cores aceitas nas colunas (classes Tailwind explícitas para o build). */
export const CORES_COLUNA: Record<string, { barra: string; fundo: string; texto: string; borda: string }> = {
  slate: { barra: 'bg-slate-400', fundo: 'bg-slate-50 dark:bg-slate-900/40', texto: 'text-slate-700 dark:text-slate-200', borda: 'border-slate-200 dark:border-slate-700' },
  sky: { barra: 'bg-sky-500', fundo: 'bg-sky-50 dark:bg-sky-500/10', texto: 'text-sky-700 dark:text-sky-300', borda: 'border-sky-200 dark:border-sky-500/30' },
  amber: { barra: 'bg-amber-500', fundo: 'bg-amber-50 dark:bg-amber-500/10', texto: 'text-amber-700 dark:text-amber-300', borda: 'border-amber-200 dark:border-amber-500/30' },
  indigo: { barra: 'bg-indigo-500', fundo: 'bg-indigo-50 dark:bg-indigo-500/10', texto: 'text-indigo-700 dark:text-indigo-300', borda: 'border-indigo-200 dark:border-indigo-500/30' },
  violet: { barra: 'bg-violet-500', fundo: 'bg-violet-50 dark:bg-violet-500/10', texto: 'text-violet-700 dark:text-violet-300', borda: 'border-violet-200 dark:border-violet-500/30' },
  orange: { barra: 'bg-orange-500', fundo: 'bg-orange-50 dark:bg-orange-500/10', texto: 'text-orange-700 dark:text-orange-300', borda: 'border-orange-200 dark:border-orange-500/30' },
  emerald: { barra: 'bg-emerald-500', fundo: 'bg-emerald-50 dark:bg-emerald-500/10', texto: 'text-emerald-700 dark:text-emerald-300', borda: 'border-emerald-200 dark:border-emerald-500/30' },
  teal: { barra: 'bg-teal-500', fundo: 'bg-teal-50 dark:bg-teal-500/10', texto: 'text-teal-700 dark:text-teal-300', borda: 'border-teal-200 dark:border-teal-500/30' },
  green: { barra: 'bg-green-600', fundo: 'bg-green-50 dark:bg-green-500/10', texto: 'text-green-700 dark:text-green-300', borda: 'border-green-200 dark:border-green-500/30' },
  rose: { barra: 'bg-rose-500', fundo: 'bg-rose-50 dark:bg-rose-500/10', texto: 'text-rose-700 dark:text-rose-300', borda: 'border-rose-200 dark:border-rose-500/30' },
}

export const CORES_DISPONIVEIS = Object.keys(CORES_COLUNA)

export function corColuna(cor: string) {
  return CORES_COLUNA[cor] || CORES_COLUNA.slate
}

export const PRIORIDADES = [
  { id: 'baixa', label: 'Baixa', classe: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  { id: 'media', label: 'Média', classe: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300' },
  { id: 'alta', label: 'Alta', classe: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  { id: 'urgente', label: 'Urgente', classe: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' },
] as const

export function prioridadeInfo(id: string) {
  return PRIORIDADES.find((p) => p.id === id) || PRIORIDADES[1]
}

/** Etiquetas sugeridas (o usuário pode digitar outras). */
export const ETIQUETAS_SUGERIDAS = [
  'Alta concorrência',
  'Órgão novo',
  'Cliente antigo',
  'Exige amostra',
  'Exige garantia',
  'Prazo curto',
  'Frete alto',
  'Parceria',
]

const CORES_ETIQUETA = [
  'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
]

export function corEtiqueta(nome: string): string {
  let h = 0
  for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) % 997
  return CORES_ETIQUETA[h % CORES_ETIQUETA.length]
}

export interface PrazoInfo {
  texto: string
  classe: string
  vencido: boolean
  urgente: boolean
}

/** Indicador visual de prazo: vencido (vermelho), até 48h (laranja), ok. */
export function prazoInfo(data: string | null | undefined): PrazoInfo | null {
  if (!data) return null
  const d = new Date(data)
  if (Number.isNaN(d.getTime())) return null
  const agora = Date.now()
  const diffMs = d.getTime() - agora
  const horas = diffMs / 3600000
  const dias = Math.ceil(diffMs / 86400000)

  if (diffMs < 0) {
    return {
      texto: `Vencido em ${d.toLocaleDateString('pt-BR')}`,
      classe: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
      vencido: true,
      urgente: false,
    }
  }
  if (horas <= 48) {
    return {
      texto: horas <= 1 ? 'Vence em menos de 1h' : `Vence em ${Math.ceil(horas)}h`,
      classe: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
      vencido: false,
      urgente: true,
    }
  }
  return {
    texto: `Vence em ${dias} dia(s)`,
    classe: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    vencido: false,
    urgente: false,
  }
}
