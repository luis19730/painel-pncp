// ============================================================================
// Funções PURAS do SICX (testáveis com `node --test`).
// Nada aqui acessa rede, banco ou `window`.
// ============================================================================

export function round2(valor: number): number {
  if (!Number.isFinite(valor)) return 0
  return Math.round((valor + Number.EPSILON) * 100) / 100
}

export function numeroSeguro(valor: unknown): number {
  const n = typeof valor === 'number' ? valor : Number(String(valor ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

/** Converte "1.234,56", "1234,56" e "1234.56" em número. */
export function parseNumeroBR(valor: unknown): number {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0
  const texto = String(valor ?? '').trim()
  if (!texto) return 0
  const limpo = texto
    .replace(/[R$\s%]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.')
  const n = Number(limpo)
  return Number.isFinite(n) ? n : 0
}

export function mediana(valores: number[]): number {
  const lista = valores.filter((v) => Number.isFinite(v)).sort((a, b) => a - b)
  if (lista.length === 0) return 0
  const meio = Math.floor(lista.length / 2)
  if (lista.length % 2 === 1) return round2(lista[meio])
  return round2((lista[meio - 1] + lista[meio]) / 2)
}

export function media(valores: number[]): number {
  const lista = valores.filter((v) => Number.isFinite(v))
  if (lista.length === 0) return 0
  return round2(lista.reduce((s, v) => s + v, 0) / lista.length)
}

export function minimo(valores: number[]): number {
  const lista = valores.filter((v) => Number.isFinite(v))
  return lista.length ? round2(Math.min(...lista)) : 0
}

export function maximo(valores: number[]): number {
  const lista = valores.filter((v) => Number.isFinite(v))
  return lista.length ? round2(Math.max(...lista)) : 0
}

export interface ResumoMercado {
  quantidade: number
  minimo: number
  mediana: number
  media: number
  maximo: number
  orgaos: Array<{ nome: string; quantidade: number }>
}

/** Resumo de preços praticados (entrada já filtrada pela API/PNCP). */
export function resumoMercado(
  registros: Array<{ valor: number; orgao?: string | null }>
): ResumoMercado {
  const valores = registros.map((r) => numeroSeguro(r.valor)).filter((v) => v > 0)
  const contagem = new Map<string, number>()
  for (const r of registros) {
    const nome = (r.orgao || '').trim()
    if (!nome) continue
    contagem.set(nome, (contagem.get(nome) || 0) + 1)
  }
  const orgaos = [...contagem.entries()]
    .map(([nome, quantidade]) => ({ nome, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 5)

  return {
    quantidade: valores.length,
    minimo: minimo(valores),
    mediana: mediana(valores),
    media: media(valores),
    maximo: maximo(valores),
    orgaos,
  }
}

/** Percentil simples (0 a 100), usado no gráfico de dispersão. */
export function percentil(valores: number[], p: number): number {
  const lista = valores.filter((v) => Number.isFinite(v)).sort((a, b) => a - b)
  if (!lista.length) return 0
  const pos = Math.min(1, Math.max(0, p / 100)) * (lista.length - 1)
  const base = Math.floor(pos)
  const resto = pos - base
  const proximo = lista[Math.min(lista.length - 1, base + 1)]
  return round2(lista[base] + resto * (proximo - lista[base]))
}

// ---------------------------------------------------------------------------
// Margem / lucro (usado em "Minha oferta")
// ---------------------------------------------------------------------------
export interface MargemOferta {
  receita: number
  custoTotal: number
  lucro: number
  margemPct: number
  markupPct: number
}

export function calcularMargemOferta(input: {
  preco: number
  custoUnitario: number
  frete?: number
  impostoPct?: number
  despesaPct?: number
}): MargemOferta {
  const receita = round2(Math.max(0, numeroSeguro(input.preco)))
  const frete = Math.max(0, numeroSeguro(input.frete))
  const custoBase = round2(Math.max(0, numeroSeguro(input.custoUnitario)) + frete)
  const impostoPct = Math.max(0, numeroSeguro(input.impostoPct))
  const despesaPct = Math.max(0, numeroSeguro(input.despesaPct))
  const impostos = round2(receita * (impostoPct / 100))
  const despesas = round2(receita * (despesaPct / 100))
  const custoTotal = round2(custoBase + impostos + despesas)
  const lucro = round2(receita - custoTotal)
  const margemPct = receita > 0 ? round2((lucro / receita) * 100) : 0
  const markupPct = custoBase > 0 ? round2((lucro / custoBase) * 100) : 0

  return { receita, custoTotal, lucro, margemPct, markupPct }
}

// ---------------------------------------------------------------------------
// Índice de competitividade do Painel (heurística PRÓPRIA, 0–100)
//
// NÃO é o ranqueamento oficial do Sicx. Os critérios são explicados na UI.
// ---------------------------------------------------------------------------
export interface EntradaIndice {
  preco: number
  precoMinimo?: number | null
  precoMediana?: number | null
  precoMaximo?: number | null
  prazoDias?: number | null
  descricao: string
  unidade?: string | null
  categoria?: string | null
  regularidadeInformada?: boolean | null
}

export interface CriterioIndice {
  nome: string
  pontos: number
  maximo: number
  detalhe: string
}

export interface ResultadoIndice {
  total: number
  criterios: CriterioIndice[]
}

function pontuarPreco(entrada: EntradaIndice): CriterioIndice {
  const preco = numeroSeguro(entrada.preco)
  const min = entrada.precoMinimo != null && entrada.precoMinimo > 0 ? numeroSeguro(entrada.precoMinimo) : 0
  const med = entrada.precoMediana != null && entrada.precoMediana > 0 ? numeroSeguro(entrada.precoMediana) : 0
  const max = entrada.precoMaximo != null && entrada.precoMaximo > 0 ? numeroSeguro(entrada.precoMaximo) : 0

  if (!preco || !min || !med) {
    return { nome: 'Preço vs. mercado', pontos: 25, maximo: 50, detalhe: 'Sem dados de mercado suficientes: pontuação neutra.' }
  }

  let pontos: number
  let detalhe: string
  if (preco <= min) {
    pontos = 50
    detalhe = 'Preço igual ou abaixo do menor preço observado.'
  } else if (preco <= med) {
    const faixa = Math.max(0.01, med - min)
    pontos = 50 - 20 * ((preco - min) / faixa)
    detalhe = 'Preço abaixo da mediana do mercado.'
  } else if (max && preco <= max) {
    const faixa = Math.max(0.01, max - med)
    pontos = 30 - 18 * ((preco - med) / faixa)
    detalhe = 'Preço acima da mediana, mas dentro da faixa observada.'
  } else {
    pontos = max ? Math.max(0, 12 * (max / Math.max(preco, 0.01))) : 0
    detalhe = 'Preço acima do maior preço observado.'
  }

  return {
    nome: 'Preço vs. mercado',
    pontos: round2(Math.min(50, Math.max(0, pontos))),
    maximo: 50,
    detalhe,
  }
}

function pontuarPrazo(entrada: EntradaIndice): CriterioIndice {
  const prazo = entrada.prazoDias == null ? null : numeroSeguro(entrada.prazoDias)
  let pontos = 10
  let detalhe = 'Prazo não informado: pontuação neutra.'
  if (prazo != null) {
    if (prazo <= 5) { pontos = 20; detalhe = 'Prazo de até 5 dias.' }
    else if (prazo <= 10) { pontos = 16; detalhe = 'Prazo de até 10 dias.' }
    else if (prazo <= 20) { pontos = 12; detalhe = 'Prazo de até 20 dias.' }
    else if (prazo <= 30) { pontos = 6; detalhe = 'Prazo de até 30 dias.' }
    else { pontos = 2; detalhe = 'Prazo acima de 30 dias.' }
  }
  return { nome: 'Prazo de entrega', pontos, maximo: 20, detalhe }
}

function pontuarCompletude(entrada: EntradaIndice): CriterioIndice {
  const descricao = (entrada.descricao || '').trim()
  let pontos = 0
  const partes: string[] = []
  if (descricao.length >= 80) { pontos += 8; partes.push('descrição detalhada') }
  else if (descricao.length >= 40) { pontos += 5; partes.push('descrição razoável') }
  else if (descricao.length > 0) { pontos += 2; partes.push('descrição curta') }

  if ((entrada.unidade || '').trim()) { pontos += 4; partes.push('unidade informada') }
  if ((entrada.categoria || '').trim() && entrada.categoria !== 'outros') { pontos += 4; partes.push('categoria definida') }
  if (numeroSeguro(entrada.preco) > 0) { pontos += 4; partes.push('preço informado') }

  return {
    nome: 'Completude da oferta',
    pontos: Math.min(20, pontos),
    maximo: 20,
    detalhe: partes.length ? partes.join(', ') : 'Faltam dados essenciais.',
  }
}

function pontuarRegularidade(entrada: EntradaIndice): CriterioIndice {
  if (entrada.regularidadeInformada === true) {
    return { nome: 'Regularidade informada', pontos: 10, maximo: 10, detalhe: 'O fornecedor declarou regularidade.' }
  }
  if (entrada.regularidadeInformada === false) {
    return { nome: 'Regularidade informada', pontos: 0, maximo: 10, detalhe: 'O fornecedor declarou pendência.' }
  }
  return { nome: 'Regularidade informada', pontos: 5, maximo: 10, detalhe: 'Não informada: pontuação neutra.' }
}

export function indiceCompetitividade(entrada: EntradaIndice): ResultadoIndice {
  const criterios = [
    pontuarPreco(entrada),
    pontuarPrazo(entrada),
    pontuarCompletude(entrada),
    pontuarRegularidade(entrada),
  ]
  const total = Math.min(100, Math.max(0, Math.round(criterios.reduce((s, c) => s + c.pontos, 0))))
  return { total, criterios }
}

export const AVISO_INDICE =
  'Não corresponde ao ranqueamento oficial do SICX, cujos critérios são definidos pelo órgão central.'

// ---------------------------------------------------------------------------
// Checklist "Meu preparo"
// ---------------------------------------------------------------------------
export function progressoChecklist(
  itens: Array<{ key: string }>,
  salvos: Array<{ item_key: string; feito: boolean }>
): { feitos: number; total: number; pct: number } {
  const total = itens.length
  const mapa = new Map(salvos.map((s) => [s.item_key, s.feito]))
  const feitos = itens.filter((i) => mapa.get(i.key) === true).length
  return { feitos, total, pct: total ? Math.round((feitos / total) * 100) : 0 }
}

/** Certidões vencendo em até `dias` dias (ou vencidas) a partir de uma referência. */
export function certidoesEmAlerta(
  itens: Array<{ item_key: string; validade: string | null; feito: boolean }>,
  dias = 30,
  referencia = new Date()
): Array<{ item_key: string; validade: string; dias: number; vencida: boolean }> {
  const hoje = new Date(referencia)
  hoje.setHours(0, 0, 0, 0)
  const limite = new Date(hoje)
  limite.setDate(limite.getDate() + dias)

  const resultado: Array<{ item_key: string; validade: string; dias: number; vencida: boolean }> = []
  for (const item of itens) {
    if (!item.validade) continue
    const data = new Date(`${item.validade}T00:00:00`)
    if (Number.isNaN(data.getTime())) continue
    const diff = Math.round((data.getTime() - hoje.getTime()) / 86400000)
    if (data <= limite) {
      resultado.push({ item_key: item.item_key, validade: item.validade, dias: diff, vencida: diff < 0 })
    }
  }
  return resultado.sort((a, b) => a.dias - b.dias)
}

// ---------------------------------------------------------------------------
// Prazos do Kanban de contratações
// ---------------------------------------------------------------------------
export type StatusPrazo = 'vencido' | 'urgente' | 'ok' | 'sem-prazo'

export function prazoInfo(data: string | null | undefined, referencia = new Date()): {
  status: StatusPrazo
  dias: number
  label: string
} {
  if (!data) return { status: 'sem-prazo', dias: 0, label: 'Sem prazo' }
  const alvo = new Date(data.length <= 10 ? `${data}T00:00:00` : data)
  if (Number.isNaN(alvo.getTime())) return { status: 'sem-prazo', dias: 0, label: 'Sem prazo' }

  const hoje = new Date(referencia)
  hoje.setHours(0, 0, 0, 0)
  const dia = new Date(alvo)
  dia.setHours(0, 0, 0, 0)
  const dias = Math.round((dia.getTime() - hoje.getTime()) / 86400000)

  if (dias < 0) return { status: 'vencido', dias, label: `Vencido há ${Math.abs(dias)} dia(s)` }
  if (dias <= 2) return { status: 'urgente', dias, label: dias === 0 ? 'Vence hoje' : `Vence em ${dias} dia(s)` }
  return { status: 'ok', dias, label: `Vence em ${dias} dia(s)` }
}

// ---------------------------------------------------------------------------
// Formatação pt-BR
// ---------------------------------------------------------------------------
export function moeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor) || 0)
}

export function pct(valor: number, casas = 1): string {
  return `${(Number(valor) || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}%`
}

export function dataBR(valor: string | null | undefined): string {
  if (!valor) return '—'
  const data = new Date(valor.length <= 10 ? `${valor}T00:00:00` : valor)
  if (Number.isNaN(data.getTime())) return '—'
  return data.toLocaleDateString('pt-BR')
}

export function dataHoraBR(valor: string | null | undefined): string {
  if (!valor) return '—'
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return '—'
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

/** Categoria a partir de palavra-chave (para importar ofertas por planilha). */
export function inferirCategoria(texto: string): string {
  const t = (texto || '').toLowerCase()
  if (/papel|caneta|lápis|lapis|grampe|pasta|envelope|escritório|escritorio/.test(t)) return 'papelaria'
  if (/cadeira|mesa|armário|armario|estante|mobiliário|mobiliario/.test(t)) return 'mobiliario'
  if (/medicament|remédio|remedio|comprimido|dipirona|paracetamol/.test(t)) return 'medicamentos'
  if (/cimento|areia|brita|tijolo|bloco|aço|aco|tubo|pvc|constru/.test(t)) return 'construcao'
  if (/computador|notebook|impressora|monitor|teclado|mouse|toner|informática|informatica/.test(t)) return 'informatica'
  if (/limpeza|detergente|desinfetante|sabão|sabao|álcool|alcool|papel higiênico|papel higienico/.test(t)) return 'limpeza'
  if (/alimento|arroz|feijão|feijao|leite|café|cafe|açúcar|acucar/.test(t)) return 'alimentos'
  if (/serviço|servico|manutenção|manutencao|limpeza predial|vigilância|vigilancia/.test(t)) return 'servicos'
  return 'outros'
}

/** CSV seguro (aspas duplas escapadas). */
export function paraCSV(cabecalhos: string[], linhas: Array<Array<string | number | null | undefined>>): string {
  const escapar = (v: string | number | null | undefined) => {
    const s = String(v ?? '')
    return `"${s.replace(/"/g, '""')}"`
  }
  return [cabecalhos.map(escapar).join(';'), ...linhas.map((l) => l.map(escapar).join(';'))].join('\r\n')
}

// ---------------------------------------------------------------------------
// Estatísticas do diretório de almoxarifados (KPIs e contagem por UF)
// ---------------------------------------------------------------------------
export interface EstatisticasDiretorio {
  total: number
  ufsComRegistros: number
  novos7dias: number
  /** sigla -> quantidade (apenas UFs com pelo menos 1 registro). */
  contagemPorUf: Record<string, number>
}

/**
 * Agrega o diretório a partir da LISTA COMPLETA (nunca de uma página
 * filtrada), para que as contagens por UF fiquem corretas inclusive quando a
 * tabela é paginada na interface.
 */
export function estatisticasDiretorio(
  almoxarifados: Array<{ uf?: string | null; criado_em?: string | null }>,
  referencia = new Date()
): EstatisticasDiretorio {
  const contagemPorUf: Record<string, number> = {}
  const limite = new Date(referencia)
  limite.setDate(limite.getDate() - 7)
  limite.setHours(0, 0, 0, 0)

  let novos7dias = 0
  for (const a of almoxarifados) {
    const uf = (a.uf || '').trim().toUpperCase()
    if (uf) contagemPorUf[uf] = (contagemPorUf[uf] || 0) + 1

    if (a.criado_em) {
      const criado = new Date(a.criado_em)
      if (!Number.isNaN(criado.getTime()) && criado >= limite) novos7dias += 1
    }
  }

  return {
    total: almoxarifados.length,
    ufsComRegistros: Object.keys(contagemPorUf).length,
    novos7dias,
    contagemPorUf,
  }
}
