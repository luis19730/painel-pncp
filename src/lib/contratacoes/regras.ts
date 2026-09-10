// ============================================================================
// Regras parametrizáveis de enquadramento e checklist de documentos.
//
// As regras de contratação pública mudam com frequência. Por isso aqui elas
// são dados, e não lógica dura no código. O sistema MOSTRA a origem da regra e
// sempre ressalva: "requer validação do responsável pelo processo". O sistema
// NUNCA afirma por conta própria que uma contratação é legal só pelo valor.
// ============================================================================

import type { TipoObjeto } from './types'

export const TIPOS_OBJETO: TipoObjeto[] = [
  'Material de consumo',
  'Material permanente',
  'Serviço',
  'Serviço continuado',
  'Obra',
  'Serviço de engenharia',
  'Tecnologia da Informação',
  'Locação',
  'Equipamento',
  'Solução especializada',
  'Outros',
]

export const NATUREZAS_DESPESA: string[] = [
  '33.90.30', // material de consumo
  '33.90.39', // outros serviços de terceiros - pessoa jurídica
  '33.90.40', // serviços de TI e comunicação
  '44.90.52', // equipamentos e material permanente
  '44.90.51', // obras e instalações
  '33.90.35', // serviços de consultoria
  '33.90.37', // locação de mão de obra
  '33.90.36', // outros serviços de terceiros - pessoa física
]

/** Lista de modalidades de licitação segundo a Lei 14.133/2021. */
export const MODALIDADES_LEI = [
  'Pregão',
  'Concorrência',
  'Concurso',
  'Leilão',
  'Dispensa de licitação',
  'Inexigibilidade de licitação',
  'Contratação direta',
  'SRP (Sistema de Registro de Preços)',
  'Adesão a ata de registro de preços',
  'Credenciamento',
]

export interface ItemEnquadramento {
  modalidade: string
  nota: string
  aplicavel: boolean
}

/**
 * Gera sugestões de enquadramento. Retorna MODALIDADES possíveis + aviso de que
 * precisa de validação. Nunca afirma legalidade por valor sozinha.
 */
export function sugerirEnquadramento(opts: {
  tipoObjeto?: string | null
  valor?: number | null
  continuado?: boolean
}): { sugestoes: string[]; avisos: string[] } {
  const tipo = opts.tipoObjeto || ''
  const sugestoes: string[] = []
  const avisos: string[] = []

  if (/engenharia/i.test(tipo) || /obra/i.test(tipo)) {
    sugestoes.push('Concorrência')
    avisos.push(
      'Obras e serviços de engenharia: o valor estimado e a complexidade definem o procedimento (Lei 14.133/2021).'
    )
  }

  if (/serviç|fornecimento|material|permanente|consumo|equipamento|informa/i.test(tipo) && !/engenharia/i.test(tipo)) {
    sugestoes.push('Pregão')
    sugestoes.push('SRP (Sistema de Registro de Preços)')
  }

  if (opts.continuado) {
    sugestoes.push('Contratação continuada (serviços com natureza continuada — §4º art. 6º, Lei 14.133)')
    avisos.push('Serviço continuado exige ETP específico e projeção plurianual da despesa.')
  }

  avisos.push('O enquadramento indicado requer validação do responsável pelo processo e da assessoria jurídica.')

  return { sugestoes: Array.from(new Set(sugestoes)), avisos }
}

export interface DocRegra {
  nome: string
  obrigatorio: boolean
  justificativa: string
  /** tipos de objeto dos quais o documento é aplicável (vazio = sempre). */
  aplicavelA?: string[]
}

/**
 * Checklist inteligente de documentos obrigatórios por tipo de objeto.
 * Base normativa principal: Lei 14.133/2021 (art. 6º, 18º, 23º, 72º, 74º) e
 * regulamentações de pesquisa de preços e SINAPI.
 */
export function documentacaoAplicavel(tipoObjeto?: string | null): DocRegra[] {
  const tipo = tipoObjeto || ''
  const temSINAPI = /obra/i.test(tipo) || /engenharia/i.test(tipo)
  const docs: DocRegra[] = [
    { nome: 'DFD (Documento de Formalização da Demanda)', obrigatorio: true, justificativa: 'Art. 72, VII — formaliza a demanda.' },
    { nome: 'ETP (Estudo Técnico Preliminar)', obrigatorio: true, justificativa: 'Art. 18, I — necessário para a instrução.' },
    { nome: 'Pesquisa de preços', obrigatorio: true, justificativa: 'Art. 23 — fundamenta o valor de referência.' },
    { nome: 'Termo de Referência (TR)', obrigatorio: true, justificativa: 'Art. 6º, XXIII e art. 40 — para contratação direta e licitação.' },
    { nome: 'Análise de riscos', obrigatorio: true, justificativa: 'Art. 18, §1º — quando contrato crítico/alta complexidade.' },
    { nome: 'Disponibilidade orçamentária', obrigatorio: true, justificativa: 'Art. 7º, §2º e art. 150 — indispensável.' },
    { nome: 'Justificativa da contratação', obrigatorio: true, justificativa: 'Art. 72, I e VI.' },
    { nome: 'Parecer jurídico', obrigatorio: false, justificativa: 'Art. 53 — consultoria jurídica; obrigatório conforme o vulto/a complexidade.' },
    { nome: 'Autorização do ordenador de despesa', obrigatorio: true, justificativa: 'Art. 72, VII.' },
    { nome: 'Declaração de adequação orçamentária e financeira', obrigatorio: false, justificativa: 'Art. 7º — quando houver repercussão orçamentária.' },
    { nome: 'Projeto básico / projeto executivo', obrigatorio: temSINAPI, justificativa: temSINAPI ? 'Art. 18, §1º — obras e serviços de engenharia exigem projeto.' : 'Aplicável apenas a obras e serviços de engenharia.' },
    { nome: 'Composição de custos (SINAPI) com competência e fonte', obrigatorio: temSINAPI, justificativa: temSINAPI ? 'Art. 23, §2º — orçamento sigiloso baseado em sistema oficial (SINAPI).' : 'Aplicável apenas a obras e serviços de engenharia.' },
  ]
  return docs.filter((d) => !d.aplicavelA || d.aplicavelA.some((a) => new RegExp(a, 'i').test(tipo)) || !d.aplicavelA)
}

// ---------------------------------------------------------------------------
// Validações da Etapa 14
// ---------------------------------------------------------------------------

export interface Validacao {
  nivel: 'erro' | 'alerta'
  mensagem: string
}

export function validarProcesso(opts: {
  objeto: string
  nd: string
  itens: number
  quantidade: number
  valorEstimado: number | null
  precos: number
  temCompetenciaSinapi: boolean
  tipoObjeto: string
}): Validacao[] {
  const erros: Validacao[] = []
  if (!opts.objeto?.trim()) erros.push({ nivel: 'erro', mensagem: 'Informe o objeto da contratação.' })
  if (!opts.nd?.trim()) erros.push({ nivel: 'erro', mensagem: 'Informe a Natureza da Despesa.' })
  if (opts.itens === 0) erros.push({ nivel: 'erro', mensagem: 'A planilha orçamentária não tem itens.' })
  if (opts.quantidade <= 0) erros.push({ nivel: 'alerta', mensagem: 'A quantidade informada é zero ou inválida.' })
  if (opts.valorEstimado != null && opts.valorEstimado <= 0) erros.push({ nivel: 'erro', mensagem: 'Valor estimado inválido (deve ser maior que zero).' })
  if (opts.precos === 0) erros.push({ nivel: 'alerta', mensagem: 'Não há pesquisa de preços cadastrada.' })
  if (/obra/i.test(opts.tipoObjeto) && !opts.temCompetenciaSinapi) {
    erros.push({ nivel: 'erro', mensagem: 'Obras/serviços de engenharia exigem composição de custos SINAPI com competência e fonte.' })
  }
  return erros
}
