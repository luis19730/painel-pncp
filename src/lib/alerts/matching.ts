// ============================================================================
// Correspondência de oportunidades para um alerta.
//
// Fluxo REAL:
//   1. Tenta a API oficial do PNCP (via searchLiveOpportunities), que retorna
//      dados reais quando disponíveis.
//   2. Se o PNCP estiver indisponível, usa a base de referência local
//      (mesmo fallback honesto das demais páginas) — nunca inventa dados.
//
// Cada oportunidade correspondida é normalizada em AlertOpportunity para a
// montagem do conteúdo do alerta.
// ============================================================================

import { ITEMS, searchItems, type ItemRecord } from '@/lib/market-data'
import { searchLiveOpportunities } from '@/lib/pncp-data'
import type { AlertRecord } from './types'
import type { AlertOpportunity } from './notifications/content'

export function itemToAlertOpportunity(item: ItemRecord): AlertOpportunity {
  return {
    id: item.id,
    objeto: `${item.nome} — ${item.descricao}`,
    orgao: item.orgao,
    modalidade: item.modalidade,
    valor: item.valor,
    uf: item.uf,
    municipio: item.municipio,
    dataAbertura: item.data,
    dataEncerramento: item.data,
    score: 0,
    link: '#',
  }
}

function normalize(o: {
  id: string
  objeto: string
  orgao: string
  modalidade: string
  valor: number
  uf: string
  municipio: string
  dataAbertura: string | null
  dataEncerramento: string | null
  score: number
  link: string
}): AlertOpportunity {
  return {
    id: o.id,
    objeto: o.objeto,
    orgao: o.orgao,
    modalidade: o.modalidade,
    valor: o.valor,
    uf: o.uf,
    municipio: o.municipio,
    dataAbertura: o.dataAbertura,
    dataEncerramento: o.dataEncerramento,
    score: o.score,
    link: o.link,
  }
}

/** Aplica os critérios do alerta sobre uma lista de oportunidades. */
function applyFilters(
  opps: AlertOpportunity[],
  a: Pick<AlertRecord, 'modalidade' | 'uf' | 'municipio' | 'orgao' | 'valor_min' | 'valor_max' | 'data_inicial' | 'data_final'>
): AlertOpportunity[] {
  return opps.filter((o) => {
    if (a.modalidade) {
      if (!o.modalidade?.toLowerCase().includes(a.modalidade.toLowerCase())) return false
    }
    if (a.uf) {
      if ((o.uf || '').toUpperCase() !== a.uf.toUpperCase()) return false
    }
    if (a.municipio) {
      const m = a.municipio.toLowerCase()
      if (!(o.municipio || '').toLowerCase().includes(m)) return false
    }
    if (a.orgao) {
      const og = a.orgao.toLowerCase()
      if (!(o.orgao || '').toLowerCase().includes(og)) return false
    }
    if (typeof a.valor_min === 'number' && o.valor && o.valor < a.valor_min) return false
    if (typeof a.valor_max === 'number' && o.valor && o.valor > a.valor_max) return false
    if (a.data_inicial) {
      const d = o.dataAbertura || o.dataEncerramento
      if (d && new Date(d).getTime() < new Date(a.data_inicial).getTime()) return false
    }
    if (a.data_final) {
      const d = o.dataAbertura || o.dataEncerramento
      if (d && new Date(d).getTime() > new Date(a.data_final + 'T23:59:59').getTime()) return false
    }
    return true
  })
}

/**
 * Encontra oportunidades compatíveis com o alerta.
 * Retorna { opps, source: 'live' | 'local' }.
 */
export async function matchAlert(a: AlertRecord): Promise<{
  opps: AlertOpportunity[]
  source: 'live' | 'local'
}> {
  // 1) Live: usa a API real do PNCP.
  const live = await searchLiveOpportunities(a.keyword || a.nome, {
    uf: a.uf || undefined,
    modalidade: a.modalidade || undefined,
    municipio: a.municipio || undefined,
    orgao: a.orgao || undefined,
  })
  if (live && live.length > 0) {
    const normalized = live.map((o) =>
      normalize({
        id: o.id,
        objeto: o.objeto,
        orgao: o.orgao,
        modalidade: o.modalidade,
        valor: o.valor,
        uf: o.uf,
        municipio: o.municipio,
        dataAbertura: o.dataAbertura,
        dataEncerramento: o.dataEncerramento,
        score: o.score || 0,
        link: o.link,
      })
    )
    const filtered = applyFilters(normalized, a)
    return { opps: filtered, source: 'live' }
  }

  // 2) Fallback local (base de referência) — mesmo comportamento honesto.
  const local = searchItems(a.keyword || '', {
    uf: a.uf || undefined,
    modalidade: a.modalidade || undefined,
    valorMin: typeof a.valor_min === 'number' ? a.valor_min : undefined,
    valorMax: typeof a.valor_max === 'number' ? a.valor_max : undefined,
  }).map(itemToAlertOpportunity)
  const filtered = applyFilters(local, a)
  return { opps: filtered, source: 'local' }
}
