import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Normaliza e colapsa para comparação: remove acentos, espaços e qualquer
 * caractere não alfanumérico. Ex.: "Pregão - Eletrônico" e "Pregão Eletrônico"
 * viram "pregaoeletronico".
 */
export function compactar(texto: string): string {
  return normalizar(texto).replace(/[^a-z0-9]/g, '')
}

export function formatCurrency(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function formatDate(data: string): string {
  if (!data) return '-'
  try {
    return new Date(data).toLocaleDateString('pt-BR')
  } catch {
    return data
  }
}

export function formatDateTime(data: string): string {
  if (!data) return '-'
  try {
    return new Date(data).toLocaleString('pt-BR')
  } catch {
    return data
  }
}

export function slugify(text: string): string {
  return normalizar(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export type OpportunityStatus = 'aberta' | 'encerrada' | 'sem_data'

/**
 * Interpreta uma data como timestamp em milissegundos.
 * - Strings vazias/inválidas retornam null (nunca NaN).
 * - Datas apenas (YYYY-MM-DD) são tratadas como meia-noite no fuso local do
 *   usuário (Brasília), evitando o "deslocamento" causado pela interpretação
 *   UTC da especificação ISO 8601 para datas sem componente de horário.
 * - Strings completas (ISO 8601 com offset) são interpretadas normalmente.
 */
export function parseDateMs(data: string | null | undefined): number | null {
  if (!data) return null
  const trimmed = String(data).trim()
  if (!trimmed) return null
  const ts = Date.parse(trimmed)
  if (Number.isNaN(ts)) return null
  // Data sem horário (YYYY-MM-DD): interpretar como meia-noite local.
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number)
    return new Date(y, m - 1, d).getTime()
  }
  return ts
}

/**
 * Função ÚNICA de classificação de status de oportunidade (origem central dos
 * números "Abertas / Encerradas" do Dashboard e das demais páginas).
 *
 * Regra: a oportunidade está ABERTA enquanto a data/hora atual for anterior ou
 * igual à data limite. Encerrada quando passou da data limite. Retorna
 * 'sem_data' quando não há data válida (para nunca derivar status falso).
 */
export function getOpportunityStatus(dataLimite: string | null | undefined): OpportunityStatus {
  const t = parseDateMs(dataLimite)
  if (t === null) return 'sem_data'
  return Date.now() <= t ? 'aberta' : 'encerrada'
}

export function getStatusColor(status: string): string {
  const s = normalizar(status)
  if (s.includes('aberto') || s.includes('publicado')) return 'text-green-600 bg-green-50'
  if (s.includes('andamento') || s.includes('em andamento')) return 'text-yellow-600 bg-yellow-50'
  if (s.includes('encerrado') || s.includes('homologado')) return 'text-red-600 bg-red-50'
  if (s.includes('suspenso')) return 'text-orange-600 bg-orange-50'
  if (s.includes('revogado') || s.includes('anulado')) return 'text-purple-600 bg-purple-50'
  if (s.includes('deserto')) return 'text-gray-600 bg-gray-50'
  return 'text-gray-600 bg-gray-50'
}

export function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Excelente', color: 'text-green-600 bg-green-50 border-green-200' }
  if (score >= 60) return { label: 'Boa', color: 'text-blue-600 bg-blue-50 border-blue-200' }
  if (score >= 40) return { label: 'Avaliar', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' }
  return { label: 'Baixa aderência', color: 'text-gray-600 bg-gray-50 border-gray-200' }
}

export function getDaysUntil(dateStr: string): number {
  if (!dateStr) return 999
  const target = new Date(dateStr)
  const now = new Date()
  const diff = target.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function getDeadlineColor(days: number): string {
  if (days <= 0) return 'text-red-600 bg-red-50'
  if (days <= 3) return 'text-orange-600 bg-orange-50'
  if (days <= 7) return 'text-yellow-600 bg-yellow-50'
  return 'text-green-600 bg-green-50'
}
