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
  return { label: 'Baixa aderencia', color: 'text-gray-600 bg-gray-50 border-gray-200' }
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
