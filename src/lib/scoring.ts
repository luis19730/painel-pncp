import type { Opportunity, CompanyProfile } from '@/types'
import { normalizar } from '@/lib/utils'

interface ScoreBreakdown {
  keyword: number
  location: number
  value: number
  deadline: number
  segment: number
  total: number
  explanations: string[]
}

export function calculateScore(
  opp: Opportunity,
  profile: CompanyProfile | null
): ScoreBreakdown {
  if (!profile) {
    return {
      keyword: 0, location: 0, value: 0, deadline: 0, segment: 0,
      total: 0,
      explanations: ['Configure seu perfil para personalizar este score.'],
    }
  }

  const explanations: string[] = []
  let keywordScore = 0
  let locationScore = 0
  let valueScore = 0
  let deadlineScore = 0
  let segmentScore = 0

  // Keyword matching (30 points)
  const textoOpp = normalizar(`${opp.objeto} ${opp.orgao} ${opp.modalidade}`)
  const allKeywords = [
    ...(profile.palavras_chave || []),
    ...(profile.produtos || []),
    ...(profile.servicos || []),
  ]
  if (allKeywords.length > 0) {
    const matches = allKeywords.filter(kw =>
      textoOpp.includes(normalizar(kw))
    )
    if (matches.length > 0) {
      keywordScore = Math.min(30, 10 + matches.length * 10)
      explanations.push(`Palavras-chave encontradas: ${matches.join(', ')}`)
    }
  }

  // Location matching (20 points)
  if (profile.estados?.length > 0) {
    if (profile.estados.includes(opp.uf)) {
      locationScore += 15
      explanations.push(`Estado compatível: ${opp.uf}`)
      if (profile.municipios?.length > 0) {
        const mNorm = profile.municipios.map(normalizar)
        if (mNorm.includes(normalizar(opp.municipio))) {
          locationScore += 5
          explanations.push(`Município compatível: ${opp.municipio}`)
        }
      }
    }
  } else {
    locationScore = 10
  }

  // Value matching (20 points)
  if (profile.valor_minimo || profile.valor_maximo) {
    const min = profile.valor_minimo || 0
    const max = profile.valor_maximo || Infinity
    if (opp.valor >= min && opp.valor <= max) {
      valueScore = 20
      explanations.push('Valor dentro da faixa do seu perfil.')
    } else if (opp.valor > 0) {
      valueScore = 5
      explanations.push('Valor fora da faixa do seu perfil.')
    }
  } else {
    valueScore = 10
  }

  // Deadline (15 points)
  const now = new Date()
  const encerramento = new Date(opp.dataEncerramento)
  const diasRestantes = Math.ceil((encerramento.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diasRestantes > 7) {
    deadlineScore = 15
    explanations.push(`${diasRestantes} dias restantes.`)
  } else if (diasRestantes > 3) {
    deadlineScore = 10
    explanations.push(`Prazo próximo: ${diasRestantes} dias.`)
  } else if (diasRestantes > 0) {
    deadlineScore = 5
    explanations.push(`Prazo curto: ${diasRestantes} dias.`)
  } else {
    deadlineScore = 0
    explanations.push('Prazo encerrado.')
  }

  // Segment/CNAE matching (15 points)
  const cnaesTexto = (profile.cnaes || []).join(' ')
  const segTexto = normalizar((profile.segmentos || []).join(' '))
  if (cnaesTexto || segTexto) {
    const textoAll = normalizar(`${opp.objeto} ${opp.modalidade}`)
    const segWords = segTexto.split(/\s+/).filter(Boolean)
    const matchedSeg = segWords.filter(w => textoAll.includes(w))
    if (matchedSeg.length > 0) {
      segmentScore = Math.min(15, 5 + matchedSeg.length * 5)
      explanations.push(`Segmento compatível.`)
    }
  }

  const total = Math.min(100, keywordScore + locationScore + valueScore + deadlineScore + segmentScore)

  return { keyword: keywordScore, location: locationScore, value: valueScore, deadline: deadlineScore, segment: segmentScore, total, explanations }
}

export function scoreOpportunities(opps: Opportunity[], profile: CompanyProfile | null): Opportunity[] {
  return opps.map(opp => {
    const { total } = calculateScore(opp, profile)
    return { ...opp, score: total }
  }).sort((a, b) => b.score - a.score)
}
