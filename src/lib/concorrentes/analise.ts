// ============================================================================
// Análises HONESTAS do módulo de Concorrentes.
// Todas as métricas são derivadas SOMENTE dos registros reais já consultados
// (RegistroPNCP). Nenhuma estatística é inventada: quando não houver registros
// suficientes, o chamador deve exibir "Dados insuficientes para esta análise".
// As agregações deixam claro que refletem "os dados encontrados na consulta",
// e não o histórico total da empresa.
// ============================================================================

import type { RegistroPNCP, FornecedorPerfil, AnalisePreco } from './types'

function groupBy<T>(list: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>()
  for (const it of list) {
    const k = key(it)
    if (!k) continue
    if (!m.has(k)) m.set(k, [])
    m.get(k)!.push(it)
  }
  return m
}

function mediana(vals: number[]): number {
  if (vals.length === 0) return 0
  const s = [...vals].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

const INSUFICIENTE = 3 // mínimo de registros por fornecedor para perfis confiáveis

export function registrosDeFornecedor(
  registros: RegistroPNCP[],
  cnpj: string
): RegistroPNCP[] {
  return registros.filter(
    (r) =>
      r.fornecedorCnpj &&
      r.fornecedorCnpj.replace(/\D/g, '') === cnpj.replace(/\D/g, '')
  )
}

/**
 * Constrói o perfil de um fornecedor a partir dos registros REAIS consultados.
 * "Vitorias" = contratos firmados registrados para este fornecedor na consulta.
 */
export function montarPerfilFornecedor(registros: RegistroPNCP[], cnpj: string): FornecedorPerfil | null {
  const rs = registrosDeFornecedor(registros, cnpj)
  const primeiro = rs[0]
  if (!primeiro?.fornecedorCnpj) return null

  const razaoSocial = primeiro.fornecedor || 'Fornecedor não identificado'
  const valores = rs.map((r) => r.valor || 0)
  const valorTotal = valores.reduce((a, b) => a + b, 0)

  const orgaos = new Set<string>()
  const municipios = new Set<string>()
  const ufs = new Set<string>()
  const itens = new Set<string>()
  const modalidades = new Map<string, number>()
  const porAno = new Map<string, { registros: number; valor: number }>()
  const porModalidade = new Map<string, { registros: number; vitorias: number; valor: number }>()
  const porOrgao = new Map<string, { registros: number; valor: number; uf: string; municipio: string; ultima: string }>()
  const porUf = new Map<string, { registros: number; vitorias: number; valor: number }>()
  const porItem = new Map<string, { registros: number; vitorias: number; valorTotal: number; media: number; menor: number; maior: number }>()

  let ultimaOcorrencia = ''

  for (const r of rs) {
    if (r.orgao) orgaos.add(r.orgao)
    if (r.municipio) municipios.add(r.municipio)
    if (r.uf) ufs.add(r.uf)
    if (r.objeto) itens.add(r.objeto.slice(0, 200))
    modalidades.set(r.modalidade || 'Contrato', (modalidades.get(r.modalidade || 'Contrato') || 0) + 1)

    const ano = r.dataPublicacao ? new Date(r.dataPublicacao).getFullYear() : 0
    if (ano) {
      const cur = porAno.get(String(ano)) || { registros: 0, valor: 0 }
      cur.registros++
      cur.valor += r.valor || 0
      porAno.set(String(ano), cur)
    }

    const mod = r.modalidade || 'Contrato'
    const pm = porModalidade.get(mod) || { registros: 0, vitorias: 0, valor: 0 }
    pm.registros++
    if (r.fornecedorCnpj) pm.vitorias++
    pm.valor += r.valor || 0
    porModalidade.set(mod, pm)

    const po = porOrgao.get(r.orgao || 'Não informado') || {
      registros: 0, valor: 0, uf: r.uf, municipio: r.municipio, ultima: r.dataPublicacao,
    }
    po.registros++
    po.valor += r.valor || 0
    po.ultima = r.dataPublicacao || po.ultima
    porOrgao.set(r.orgao || 'Não informado', po)

    const pu = porUf.get(r.uf || '') || { registros: 0, vitorias: 0, valor: 0 }
    pu.registros++
    if (r.fornecedorCnpj) pu.vitorias++
    pu.valor += r.valor || 0
    if (r.uf) porUf.set(r.uf, pu)

    const obj = r.objeto || 'Item sem descrição'
    const pi = porItem.get(obj) || { registros: 0, vitorias: 0, valorTotal: 0, media: 0, menor: Infinity, maior: -Infinity }
    pi.registros++
    if (r.fornecedorCnpj) pi.vitorias++
    pi.valorTotal += r.valor || 0
    if (r.valor != null) {
      if (r.valor < pi.menor) pi.menor = r.valor
      if (r.valor > pi.maior) pi.maior = r.valor
    }
    porItem.set(obj, pi)

    if (r.dataPublicacao > ultimaOcorrencia) ultimaOcorrencia = r.dataPublicacao
  }

  const porItemFinal: FornecedorPerfil['porItem'] = {}
  for (const [k, v] of porItem) {
    porItemFinal[k] = {
      ...v,
      media: v.registros ? v.valorTotal / v.registros : 0,
      menor: v.menor === Infinity ? 0 : v.menor,
      maior: v.maior === -Infinity ? 0 : v.maior,
    }
  }

  const porModFinal: FornecedorPerfil['porModalidade'] = {}
  for (const [k, v] of porModalidade) porModFinal[k] = v
  const porAnoFinal: FornecedorPerfil['porAno'] = {}
  for (const [k, v] of porAno) porAnoFinal[k] = v
  const porOrgaoFinal: FornecedorPerfil['porOrgao'] = {}
  for (const [k, v] of porOrgao) porOrgaoFinal[k] = v
  const porUfFinal: FornecedorPerfil['porUf'] = {}
  for (const [k, v] of porUf) porUfFinal[k] = v

  // Índice de competitividade — explícito como "baseado nos dados encontrados".
  const suficientes = rs.length >= INSUFICIENTE
  let competividade: FornecedorPerfil['competividade'] = null
  if (suficientes) {
    const fatores: string[] = []
    let pontos = 0
    pontos += Math.min(rs.length / 10, 1) * 25
    fatores.push(`${rs.length} participações identificadas`)
    pontos += (ufs.size >= 2 ? 15 : ufs.size >= 1 ? 8 : 0)
    fatores.push(`${ufs.size} UF identificadas`)
    pontos += (orgaos.size >= 3 ? 15 : orgaos.size >= 1 ? 6 : 0)
    fatores.push(`${orgaos.size} órgãos identificados`)
    pontos += (Object.keys(porItemFinal).length >= 3 ? 15 : Object.keys(porItemFinal).length >= 1 ? 5 : 0)
    fatores.push(`${Object.keys(porItemFinal).length} itens/objetos distintos`)
    pontos += Math.min(valorTotal > 0 ? 30 : 0, 30)
    fatores.push(valorTotal > 0 ? `valor identificado de R$ ${valorTotal.toFixed(2)}` : 'sem valor identificado')
    competividade = { pontuacao: Math.round(pontos), fatores, registros: rs.length }
  }

  return {
    cnpj,
    razaoSocial,
    registros: rs.length,
    vitorias: rs.filter((r) => r.fornecedorCnpj).length,
    valorTotal,
    ticketMedio: rs.length ? valorTotal / rs.length : 0,
    orgaos: orgaos.size,
    municipios: municipios.size,
    ufs: ufs.size,
    itens: itens.size,
    modalidades: Object.fromEntries(modalidades),
    ufList: Array.from(ufs).sort(),
    municipioList: Array.from(municipios).sort(),
    orgaoList: Array.from(orgaos).sort(),
    porAno: porAnoFinal,
    porModalidade: porModFinal,
    porOrgao: porOrgaoFinal,
    porUf: porUfFinal,
    porItem: porItemFinal,
    competividade,
    ultimaOcorrencia,
  }
}

export function analisarPrecoRegistros(registros: RegistroPNCP[], cnpj: string): AnalisePreco | null {
  const rs = registros.filter((r) => r.valor != null && r.valor > 0)
  if (rs.length < INSUFICIENTE) return null
  const meus = rs.filter(
    (r) => r.fornecedorCnpj && r.fornecedorCnpj.replace(/\D/g, '') === cnpj.replace(/\D/g, '')
  )
  const meusValores = meus.map((r) => r.valor as number)
  const vals = rs.map((r) => r.valor as number)
  const media = vals.reduce((a, b) => a + b, 0) / vals.length
  const precoConcorrente = meusValores.length ? meusValores.reduce((a, b) => a + b, 0) / meusValores.length : 0
  return {
    menor: Math.min(...vals),
    maior: Math.max(...vals),
    media,
    mediana: mediana(vals),
    precoConcorrente,
    diferencaPct: media > 0 ? ((precoConcorrente - media) / media) * 100 : 0,
    registros: rs.length,
  }
}

// ---- Agregações para o ranking de fornecedores (a partir dos contratos reais) ----
export interface FornecedorAgregado {
  cnpj: string
  razaoSocial: string
  registros: number
  valorTotal: number
  valorMedio: number
  ufs: number
  orgaos: number
  ultima: string
}

export function rankingFornecedores(registros: RegistroPNCP[]): FornecedorAgregado[] {
  const comForn = registros.filter((r) => r.fornecedorCnpj)
  const grupos = groupBy(comForn, (r) => r.fornecedorCnpj!.replace(/\D/g, ''))
  const out: FornecedorAgregado[] = []
  for (const [cnpj, rs] of grupos) {
    const valores = rs.map((r) => r.valor || 0)
    const ultima = rs.reduce((a, b) => (b.dataPublicacao > a ? b.dataPublicacao : a), '')
    out.push({
      cnpj,
      razaoSocial: rs[0].fornecedor || 'Não identificado',
      registros: rs.length,
      valorTotal: valores.reduce((a, b) => a + b, 0),
      valorMedio: rs.length ? valores.reduce((a, b) => a + b, 0) / rs.length : 0,
      ufs: new Set(rs.map((r) => r.uf)).size,
      orgaos: new Set(rs.map((r) => r.orgao)).size,
      ultima,
    })
  }
  return out.sort((a, b) => b.registros - a.registros || b.valorTotal - a.valorTotal)
}

// ---- Análise de concorrência por item (a partir dos contratos) ----
export interface ItemConcorrencia {
  objeto: string
  fornecedores: string[]
  registros: number
  valorTotal: number
  ultima: string
}

export function concorrentesPorItem(registros: RegistroPNCP[]): ItemConcorrencia[] {
  const grupos = groupBy(registros, (r) => (r.objeto || 'Item sem descrição').slice(0, 200))
  const out: ItemConcorrencia[] = []
  for (const [obj, rs] of grupos) {
    const fornecedores = new Set(
      rs.filter((r) => r.fornecedorCnpj).map((r) => r.fornecedor as string)
    )
    if (fornecedores.size === 0) continue
    out.push({
      objeto: obj,
      fornecedores: Array.from(fornecedores),
      registros: rs.length,
      valorTotal: rs.reduce((a, b) => a + (b.valor || 0), 0),
      ultima: rs.reduce((a, b) => (b.dataPublicacao > a ? b.dataPublicacao : a), ''),
    })
  }
  return out.sort((a, b) => b.fornecedores.length - a.fornecedores.length)
}

export { mediana, groupBy }
