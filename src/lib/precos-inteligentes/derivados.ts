import { FONTE_LABEL, quartil, countOutliers, type PrecoRecord } from './index'

export type ResumoPrecos = {
  n: number
  menor: number | null
  maior: number | null
  media: number
  mediana: number | null
  soma: number
  outliers: number
  desvio: number
  cv: number
}

export function calcularResumo(precos: PrecoRecord[]): ResumoPrecos | null {
  if (!precos.length) return null
  const valores = precos
    .map((p) => (typeof p.valor === 'number' ? p.valor : Number(p.valor)))
    .filter((v) => Number.isFinite(v) && v > 0)
  if (!valores.length) return null
  const soma = valores.reduce((a, b) => a + b, 0)
  const media = soma / valores.length
  const sorted = [...valores].sort((a, b) => a - b)
  const desvio = valores.length > 1 ? Math.sqrt(valores.reduce((a, b) => a + Math.pow(b - media, 2), 0) / (valores.length - 1)) : 0
  return {
    n: valores.length,
    menor: sorted[0],
    maior: sorted[sorted.length - 1],
    media,
    mediana: quartil(sorted, 0.5),
    soma,
    outliers: countOutliers(precos),
    desvio,
    cv: media ? (desvio / media) * 100 : 0,
  }
}

export type Confianca = {
  nivel: 'alta' | 'moderada' | 'baixa'
  rotulo: string
  descricao: string
  cor: string
  fundo: string
  barra: string
  emoji: string
}

export function calcularConfianca(resumo: ResumoPrecos): Confianca {
  const pontos = resumo.n
  let nivel: Confianca['nivel'] = 'baixa'
  let motivo = ''
  if (pontos === 0) {
    motivo = 'Não há registros de preço disponíveis.'
  } else if (pontos < 3) {
    motivo = 'Poucos registros encontrados (menos de 3). A Lei 14.133/2021, Art. 23 recomenda, idealmente, ao menos 3 fontes.'
  } else if (pontos < 6) {
    nivel = 'moderada'
    motivo = 'Quantidade razoável de registros, mas ainda baixa. Considere ampliar o período ou a pesquisa.'
  } else if (resumo.cv > 30) {
    nivel = 'moderada'
    motivo = 'Há boa quantidade de registros, porém os preços variam bastante entre si (alta dispersão).'
  } else {
    nivel = 'alta'
    motivo = 'Boa quantidade de registros com baixa dispersão dos preços. Referência robusta.'
  }

  const mapa: Record<Confianca['nivel'], Confianca> = {
    alta: {
      nivel: 'alta',
      rotulo: 'Alta confiabilidade',
      descricao: motivo,
      cor: 'text-emerald-600',
      fundo: 'bg-emerald-50 dark:bg-emerald-500/10',
      barra: 'bg-emerald-500',
      emoji: '🟢',
    },
    moderada: {
      nivel: 'moderada',
      rotulo: 'Confiabilidade moderada',
      descricao: motivo,
      cor: 'text-amber-600',
      fundo: 'bg-amber-50 dark:bg-amber-500/10',
      barra: 'bg-amber-500',
      emoji: '🟡',
    },
    baixa: {
      nivel: 'baixa',
      rotulo: 'Baixa confiabilidade',
      descricao: motivo,
      cor: 'text-red-600',
      fundo: 'bg-red-50 dark:bg-red-500/10',
      barra: 'bg-red-500',
      emoji: '🔴',
    },
  }
  return mapa[nivel]
}

export type FaixaPreco = { inicio: number; fim: number; mediana: number; passos: { label: string; valor: string }[]; escala: number[]; qtdPonto: number[] }

export function calcularFaixa(resumo: ResumoPrecos, precos: PrecoRecord[]): FaixaPreco | null {
  if (!resumo || resumo.menor == null || resumo.maior == null) return null
  const passos = [
    { label: 'Menor preço', valor: resumo.menor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
    { label: 'Preço mediano', valor: resumo.mediana != null ? resumo.mediana.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—' },
    { label: 'Preço médio', valor: resumo.media.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
    { label: 'Maior preço', valor: resumo.maior.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
  ]
  const escala = gerarEscala(resumo.menor, resumo.maior)
  // distribui preços nos "buckets" da faixa
  const qtdPonto = escala.slice(0, -1).map((v, i) => {
    const fim = escala[i + 1]
    return precos.filter((p) => {
      const val = Number(p.valor)
      return val >= v && val < fim
    }).length
  })
  return { inicio: resumo.menor, fim: resumo.maior, mediana: resumo.mediana ?? 0, passos, escala, qtdPonto }
}

// Gera 6 marcas "redondas" para a escala linear entre menor e maior.
function gerarEscala(menor: number, maior: number): number[] {
  if (maior === menor) return [menor, menor]
  const diff = maior - menor
  const step = Math.max(diff / 5, 0.01)
  const out: number[] = []
  for (let i = 0; i < 6; i++) out.push(menor + step * i)
  out.push(maior)
  return out
}

// Distribuição de preços: histograma com 8 barras para o gráfico.
export function dadosDistribuicao(precos: PrecoRecord[]): { label: string; value: number }[] {
  const valores = precos.map((p) => Number(p.valor)).filter((v) => Number.isFinite(v) && v > 0)
  if (!valores.length) return []
  const menor = Math.min(...valores)
  const maior = Math.max(...valores)
  if (maior === menor) return [{ label: fmtCurto(menor), value: valores.length }]
  const nBuckets = 8
  const largura = (maior - menor) / nBuckets
  const buckets = Array.from({ length: nBuckets }, () => 0)
  valores.forEach((v) => {
    let idx = Math.min(nBuckets - 1, Math.floor((v - menor) / largura))
    if (v === maior) idx = nBuckets - 1
    buckets[idx]++
  })
  return buckets.map((count, i) => ({
    label: fmtCurto(menor + largura * i) + '–' + fmtCurto(menor + largura * (i + 1)),
    value: count,
  }))
}

// Evolução de preços ao longo do tempo (média mensal).
export function dadosEvolucao(precos: PrecoRecord[]): { label: string; mediana: number; media: number; count: number }[] {
  const porMes = new Map<string, { valores: number[] }>()
  precos.forEach((p) => {
    if (!p.data) return
    const d = new Date(p.data.length === 10 ? p.data + 'T00:00:00' : p.data)
    if (isNaN(d.getTime())) return
    const chave = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
    const val = Number(p.valor)
    if (!porMes.has(chave)) porMes.set(chave, { valores: [] })
    porMes.get(chave)!.valores.push(val)
  })
  const chaves = [...porMes.keys()].sort()
  return chaves.map((c) => {
    const vs = porMes.get(c)!.valores.sort((a, b) => a - b)
    const mediana = vs.length ? quartil(vs, 0.5) : 0
    const media = vs.reduce((a, b) => a + b, 0) / vs.length
    const [ano, mes] = c.split('-')
    return { label: `${mes}/${ano.slice(2)}`, mediana, media, count: vs.length }
  })
}

// Preços por estado (mediana e quantidade).
export function dadosPorEstado(precos: PrecoRecord[]): { uf: string; mediana: number; count: number }[] {
  const porUf = new Map<string, number[]>()
  precos.forEach((p) => {
    const uf = (p.uf || '?').toUpperCase()
    if (!porUf.has(uf)) porUf.set(uf, [])
    porUf.get(uf)!.push(Number(p.valor))
  })
  return [...porUf.entries()]
    .map(([uf, vs]) => {
      const sorted = [...vs].sort((a, b) => a - b)
      return { uf, mediana: sorted.length ? quartil(sorted, 0.5) : 0, count: vs.length }
    })
    .sort((a, b) => b.count - a.count)
}

export function fmtCurto(v: number): string {
  if (v >= 1000000) return (v / 1000000).toFixed(1).replace('.', ',') + 'M'
  if (v >= 1000) return (v / 1000).toFixed(1).replace('.', ',') + 'k'
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

export function rotuloFonte(fonte: string): string {
  return FONTE_LABEL[fonte] || fonte || '—'
}