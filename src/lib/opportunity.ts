import { getOpportunityStatus } from '@/lib/utils'
import type { ItemRecord } from '@/lib/market-data'
import type { Opportunity } from '@/types'

// ============================================================================
// Camada central de dados do Dashboard e das listagens locais.
//
// Garante que Dashboard, Oportunidades, Busca e Modalidades leiam os MESMOS
// registros, a MESMA função de status e a MESMA conversão para Opportunity —
// evitando divergências de contagem (ex.: Dashboard=198 mas Oportunidades=204).
// ============================================================================

/** Converte um registro base (ItemRecord) em Opportunity usando a função
 * central de status. Este é o único lugar onde essa conversão é feita para a
 * base local — evita duplicar lógica nos componentes. */
export function itemToOpportunity(item: ItemRecord): Opportunity {
  const st = getOpportunityStatus(item.data)
  const situacao = st === 'aberta' ? 'Aberta' : st === 'encerrada' ? 'Encerrada' : 'Sem data'
  return {
    id: item.id,
    numero: item.codigo,
    objeto: `${item.nome} - ${item.descricao}`,
    orgao: item.orgao,
    unidade: item.orgao,
    cnpj: item.orgaoCnpj,
    modalidade: item.modalidade,
    esfera: '',
    uf: item.uf,
    municipio: item.municipio,
    situacao,
    dataAbertura: item.data,
    dataEncerramento: item.data,
    valor: item.valor,
    link: '#',
    score: 0,
  }
}

export interface DashboardMetrics {
  total: number
  abertas: number
  encerradas: number
  semData: number
  valorTotal: number
  valorAbertas: number
  ufs: Array<[string, number]>
  modalidades: Array<[string, number]>
  orgaos: Array<[string, number]>
  topUf: string
  topUfCount: number
  topModalidade: string
  topModalidadeCount: number
}

function top(values: string[], n = 5): Array<[string, number]> {
  const map = new Map<string, number>()
  values.forEach((v) => {
    if (!v) return
    map.set(v, (map.get(v) || 0) + 1)
  })
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, n)
}

/** Calcula todos os indicadores do Dashboard a partir de UMA fonte (ITEMS),
 * aplicando a classificação de status central. */
export function computeDashboardMetrics(items: ItemRecord[]): DashboardMetrics {
  return computeOpportunityMetrics(items.map(itemToOpportunity))
}

/** Calcula os MESMOS indicadores do Dashboard a partir de oportunidades já
 * normalizadas (ex.: dados ao vivo do PNCP). O status é classificado pela data
 * limite de encerramento — e não pelo texto bruto vindo da origem, que varia
 * entre a base local e a API do PNCP. */
export function computeOpportunityMetrics(opps: Opportunity[]): DashboardMetrics {
  let abertas = 0
  let encerradas = 0
  let semData = 0
  let valorTotal = 0
  let valorAbertas = 0

  for (const o of opps) {
    const v = typeof o.valor === 'number' && Number.isFinite(o.valor) ? (o.valor > 0 ? o.valor : 0) : 0
    valorTotal += v
    const st = getOpportunityStatus(o.dataEncerramento || o.dataAbertura)
    if (st === 'aberta') {
      abertas += 1
      valorAbertas += v
    } else if (st === 'encerrada') {
      encerradas += 1
    } else {
      semData += 1
    }
  }

  const ufs = top(opps.map((o) => o.uf)).slice(0, 5)
  const modalidades = top(opps.map((o) => o.modalidade)).slice(0, 5)
  const orgaos = top(opps.map((o) => o.orgao)).slice(0, 5)

  return {
    total: opps.length,
    abertas,
    encerradas,
    semData,
    valorTotal,
    valorAbertas,
    ufs,
    modalidades,
    orgaos,
    topUf: ufs[0]?.[0] || '—',
    topUfCount: ufs[0]?.[1] || 0,
    topModalidade: modalidades[0]?.[0] || '—',
    topModalidadeCount: modalidades[0]?.[1] || 0,
  }
}

/** Monta a query string de filtros para navegação dos cards clicáveis. */
export function filterQuery(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '' && v !== null) q.set(k, String(v))
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}
