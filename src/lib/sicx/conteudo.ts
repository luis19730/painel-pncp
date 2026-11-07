// ============================================================================
// CONTEÚDO DO SICX — fonte única da página /credenciamento-sicx.
//
// REGRA DE OURO: nada aqui pode inventar fato jurídico nem URL. Todo o texto
// jurídico vem da BASE LEGAL do briefing:
//   - Lei nº 15.266/2025 (DOU de 24/11/2025), que incluiu o art. 79, IV, na
//     Lei nº 14.133/2021 (credenciamento por comércio eletrônico);
//   - Decreto nº 13.106, de 24/08/2026, que regulamentou o art. 79, IV e
//     instituiu o Sicx na Administração Pública federal.
//
// O SICX NÃO substitui o pregão. A operação prática depende da plataforma e
// de normas complementares da SEGES/MGI. Nunca afirmar operação plena.
// ============================================================================

import type { SicxAlmoxarifado, SicxNorma, SicxStatus } from './types'

export const SICX_URLS = {
  lei15266: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/L15266.htm',
  decreto13106: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/d13106.htm',
  compras: 'https://www.gov.br/compras/pt-br',
  pncp: 'https://pncp.gov.br',
  avn: 'https://www.gov.br/gestao/pt-br/assuntos/central-de-compras/almoxarifado-virtual-nacional',
  es: 'https://www.es.gov.br/Noticia/governo-do-estado-publica-edital-do-almoxarifado-virtual-e-avanca-na-modernizacao-das-compras-publicas',
  justen: 'https://justen.com.br/wp-content/uploads/2026/08/IE-234-Nester-SICX.pdf',
  zenite: 'https://zenite.blog.br/a-administracao-pode-instituir-os-denominados-almoxarifados-virtuais/',
} as const

export const SICX_ATUALIZADO_EM = '2026-11-05'
export const SICX_ATUALIZADO_LABEL = '5 de novembro de 2026'

export const AVISO_JURIDICO =
  'Conteúdo informativo, não substitui consulta ao texto oficial nem assessoria jurídica.'

export const ROTULO_FERRAMENTA =
  'Ferramenta de apoio do Painel PNCP — não é o sistema oficial do SICX.'

export const TEXTO_BASE = [
  'Por meio do Sicx, compradores públicos poderão pesquisar ofertas e realizar contratações conforme as regras estabelecidas pelos órgãos responsáveis em cada esfera de governo. É o caso de itens de papelaria, mobiliário, medicamentos e materiais de construção, entre outros produtos e serviços.',
  'Previsto na Lei nº 14.133/2021 (art. 79, IV, incluído pela Lei nº 15.266/2025), o sistema foi regulamentado pelo Decreto nº 13.106/2026. Na prática, o Sicx vai funcionar como uma infraestrutura pública digital capaz de conectar diferentes plataformas de comércio eletrônico públicas e privadas aos sistemas governamentais. Com isso, deve simplificar processos e facilitar a participação de fornecedores. O sistema também deverá permitir o acompanhamento e o controle das contratações.',
]

export const NOTA_ESFERAS =
  'Atenção: as regras variam conforme a esfera de governo. O Decreto 13.106/2026 regula o Sicx no âmbito federal; Estados, municípios e demais entidades poderão se credenciar ou integrar suas próprias plataformas.'

export const HERO_SUBTITULO =
  'Infraestrutura pública digital que conecta plataformas de comércio eletrônico, públicas e privadas, aos sistemas do governo, para simplificar processos e facilitar a participação de fornecedores.'

// ---------------------------------------------------------------------------
// Perfis e ordem das seções
// ---------------------------------------------------------------------------
export type PerfilSicx = 'fornecedor' | 'orgao' | 'estudante'

export const PERFIS: Array<{ id: PerfilSicx; label: string; descricao: string }> = [
  {
    id: 'fornecedor',
    label: 'Eu sou fornecedor',
    descricao: 'Quero me preparar para vender ao governo por compras expressas.',
  },
  {
    id: 'orgao',
    label: 'Eu sou órgão comprador',
    descricao: 'Quero entender adesão, pesquisa de ofertas e escolha da oferta.',
  },
  {
    id: 'estudante',
    label: 'Estudante / consultor',
    descricao: 'Quero a base legal, o funcionamento e o glossário em ordem didática.',
  },
]

/** Ordem das seções por perfil. Usada para gerar CSS (SSR) e reordenar. */
export const ORDEM_SECOES: Record<PerfilSicx, string[]> = {
  fornecedor: [
    'hero', 'resumo', 'timeline', 'passos', 'comparativo', 'ranking',
    'almoxarifados', 'ferramentas', 'preparo', 'oportunidades', 'normas',
    'faq', 'interesse', 'glossario',
  ],
  orgao: [
    'hero', 'resumo', 'timeline', 'comparativo', 'ranking', 'passos',
    'almoxarifados', 'normas', 'faq', 'ferramentas', 'preparo',
    'oportunidades', 'interesse', 'glossario',
  ],
  estudante: [
    'hero', 'resumo', 'timeline', 'comparativo', 'ranking', 'glossario',
    'passos', 'almoxarifados', 'normas', 'faq', 'ferramentas', 'preparo',
    'oportunidades', 'interesse',
  ],
}

/** CSS que aplica a ordem acima sem hidratar o conteúdo (SEO preservado). */
export function cssOrdemSecoes(): string {
  const regras: string[] = []
  for (const [perfil, ids] of Object.entries(ORDEM_SECOES)) {
    ids.forEach((id, indice) => {
      regras.push(`.sicx-flow[data-perfil="${perfil}"] #sec-${id}{order:${indice + 1}}`)
    })
  }
  return regras.join('')
}

// ---------------------------------------------------------------------------
// Navegação por âncoras
// ---------------------------------------------------------------------------
export const ANCORAS: Array<{ id: string; label: string; perfis?: PerfilSicx[] }> = [
  { id: 'resumo', label: 'Em 60 segundos' },
  { id: 'timeline', label: 'Linha do tempo' },
  { id: 'passos', label: 'Passo a passo' },
  { id: 'comparativo', label: 'Comparativo' },
  { id: 'ranking', label: 'Ranking' },
  { id: 'almoxarifados', label: 'Almoxarifados' },
  { id: 'ferramentas', label: 'Ferramentas' },
  { id: 'preparo', label: 'Meu preparo' },
  { id: 'oportunidades', label: 'Oportunidades' },
  { id: 'normas', label: 'Normas e leituras' },
  { id: 'faq', label: 'Perguntas frequentes' },
  { id: 'glossario', label: 'Glossário' },
]

// ---------------------------------------------------------------------------
// 1. Quadro de status (fallback quando o banco está vazio)
// ---------------------------------------------------------------------------
export const STATUS_PADRAO = {
  titulo: 'Regulamentado — aguardando plataforma e normas complementares',
  descricao:
    'O Decreto nº 13.106/2026 regulamentou o art. 79, IV, da Lei nº 14.133/2021 e instituiu o Sicx na Administração Pública federal. A operação prática depende da disponibilização da plataforma e de normas complementares da SEGES/MGI. Esta página não afirma que o sistema já está operando.',
  fonte_label: 'Decreto nº 13.106/2026 (Planalto)',
  fonte_url: SICX_URLS.decreto13106,
  atualizado_em: SICX_ATUALIZADO_EM,
}

// ---------------------------------------------------------------------------
// 2. "SICX em 60 segundos"
// ---------------------------------------------------------------------------
export const RESUMO_60S = [
  {
    titulo: 'O que é',
    texto:
      'Infraestrutura pública digital integrada a plataformas de comércio eletrônico públicas e privadas, prevista no art. 79, IV, da Lei nº 14.133/2021.',
    icone: 'rede',
  },
  {
    titulo: 'O que se compra',
    texto:
      'Bens e serviços comuns padronizados. Os exemplos citados na apresentação oficial são papelaria, mobiliário, medicamentos e materiais de construção, entre outros produtos e serviços — não é uma lista fechada.',
    icone: 'caixa',
  },
  {
    titulo: 'Base legal',
    texto:
      'Lei nº 15.266/2025 (incluiu o art. 79, IV, na Lei nº 14.133/2021) e Decreto nº 13.106/2026, que regulamentou o Sicx no âmbito federal.',
    icone: 'balanca',
  },
  {
    titulo: 'Controle',
    texto:
      'O sistema deverá permitir o acompanhamento e o controle das contratações. A forma prática depende da plataforma e das normas complementares.',
    icone: 'escudo',
  },
]

// ---------------------------------------------------------------------------
// 3. Linha do tempo
// ---------------------------------------------------------------------------
export interface MarcoSicx {
  data: string
  titulo: string
  texto: string
  url?: string
  fonte?: string
  status?: 'concluido' | 'vigente' | 'aguardando'
}

export const TIMELINE: MarcoSicx[] = [
  {
    data: '2021',
    titulo: 'Lei nº 14.133/2021',
    texto:
      'Lei de Licitações e Contratos. O art. 79 passou a prever as hipóteses de credenciamento — depois ampliadas para o comércio eletrônico.',
    status: 'concluido',
  },
  {
    data: '24/11/2025',
    titulo: 'Lei nº 15.266/2025',
    texto:
      'Publicada no DOU em 24/11/2025. Alterou a Lei nº 14.133/2021 e criou o inciso IV do art. 79: credenciamento na hipótese de comércio eletrônico, para contratar bens e serviços comuns padronizados ofertados no Sistema de Compras Expressas (Sicx).',
    url: SICX_URLS.lei15266,
    fonte: 'Planalto',
    status: 'concluido',
  },
  {
    data: '24/08/2026',
    titulo: 'Decreto nº 13.106/2026',
    texto:
      'Regulamentou o art. 79, IV, e instituiu o Sicx na Administração Pública federal. Definiu a SEGES/MGI como órgão central, o credenciamento permanente por requerimento eletrônico e o ranqueamento automatizado das ofertas.',
    url: SICX_URLS.decreto13106,
    fonte: 'Planalto',
    status: 'concluido',
  },
  {
    data: '08/09/2026',
    titulo: 'Vigência das regras',
    texto:
      'Há informação de que as regras entram em vigor em 08/09/2026. Vigência não significa operação plena: a plataforma e as normas complementares ainda precisam ser disponibilizadas.',
    status: 'vigente',
  },
  {
    data: 'Acompanhe',
    titulo: 'Plataforma e normas complementares',
    texto:
      'A SEGES/MGI é o órgão central e define as normas complementares, a plataforma e os editais de credenciamento. O quadro de status desta página é editável pela administração do Painel e mostra a última atualização.',
    url: SICX_URLS.compras,
    fonte: 'Compras.gov.br',
    status: 'aguardando',
  },
]

// ---------------------------------------------------------------------------
// 4. Passo a passo do fornecedor
// ---------------------------------------------------------------------------
export interface PassoSicx {
  numero: number
  titulo: string
  oQuePreciso: string
  ondeFaco: string
  ondeLink?: string
  errosComuns: string
  disponivel: 'sim' | 'aguardando'
}

export const PASSOS: PassoSicx[] = [
  {
    numero: 1,
    titulo: 'Conta gov.br no nível exigido',
    oQuePreciso:
      'Ter uma conta gov.br com o nível de confiabilidade que vier a ser exigido para o credenciamento.',
    ondeFaco: 'Portal gov.br. O nível exigido será definido pelas normas complementares da SEGES/MGI.',
    errosComuns:
      'Criar a conta sem concluir a validação de identidade e descobrir o problema só na hora do credenciamento.',
    disponivel: 'sim',
  },
  {
    numero: 2,
    titulo: 'Cadastro e atualização no SICAF',
    oQuePreciso:
      'Dados da empresa e dos responsáveis atualizados. O Decreto prevê acesso por integração com o registro cadastral unificado e, na falta de integração, dados atualizados no SICAF.',
    ondeFaco: 'Compras.gov.br / SICAF.',
    ondeLink: SICX_URLS.compras,
    errosComuns:
      'Deixar certidões e dados cadastrais vencerem. A regularidade é uma condição prática para contratar.',
    disponivel: 'sim',
  },
  {
    numero: 3,
    titulo: 'Regularidade e certidões',
    oQuePreciso:
      'Certidões fiscais, trabalhistas e de regularidade do FGTS vigentes, além das exigências que vierem a ser definidas.',
    ondeFaco:
      'Órgãos emissores de cada certidão. No Painel, use o checklist "Meu preparo" para controlar as validades.',
    errosComuns:
      'Não controlar a data de validade de cada certidão e só perceber o vencimento durante o credenciamento.',
    disponivel: 'sim',
  },
  {
    numero: 4,
    titulo: 'Pedido de credenciamento eletrônico',
    oQuePreciso:
      'Aguardar a disponibilização da plataforma e das normas complementares da SEGES/MGI. O Decreto prevê credenciamento permanente, por requerimento eletrônico (art. 9º).',
    ondeFaco:
      'Ainda não há procedimento operacional divulgado nesta página. Acompanhe o Compras.gov.br e o quadro de status.',
    ondeLink: SICX_URLS.compras,
    errosComuns:
      'Usar procedimentos ou formulários inventados. Enquanto a SEGES não divulgar a plataforma, não há como afirmar o caminho oficial.',
    disponivel: 'aguardando',
  },
  {
    numero: 5,
    titulo: 'Cadastro de ofertas',
    oQuePreciso:
      'Preço, prazo, condições de entrega e especificação do bem ou serviço. O Decreto prevê cadastro contínuo de ofertas, podendo ocorrer por integração com plataformas em que o fornecedor já vende.',
    ondeFaco:
      'Aguardando regulamentação da SEGES/MGI. O protocolo técnico de integração será definido pelo órgão central.',
    errosComuns:
      'Prometer prazo ou área de entrega que você não consegue cumprir. A oferta cadastrada vincula o fornecedor.',
    disponivel: 'aguardando',
  },
  {
    numero: 6,
    titulo: 'Manter ofertas e dados atualizados',
    oQuePreciso:
      'Revisar preços, prazos, estoque, área de entrega e certidões. O fornecedor pode pedir descredenciamento a qualquer tempo, mas isso não o livra dos contratos já firmados.',
    ondeFaco: 'SICAF e, quando a plataforma estiver disponível, o ambiente de cadastro de ofertas.',
    ondeLink: SICX_URLS.compras,
    errosComuns:
      'Cadastrar uma oferta e esquecê-la. Preço defasado e prazo inviável geram problema na execução.',
    disponivel: 'sim',
  },
]

// ---------------------------------------------------------------------------
// 5. Comparativo
// ---------------------------------------------------------------------------
export const COMPARATIVO = {
  colunas: ['Pregão eletrônico', 'Ata de Registro de Preços', 'Almoxarifado virtual', 'Sicx'],
  linhas: [
    {
      criterio: 'Como o fornecedor entra',
      pregao: 'Participa da disputa conforme o edital.',
      arp: 'Depende do edital/órgão.',
      almoxarifado: 'Depende do edital/órgão.',
      sicx: 'Credenciamento permanente, por requerimento eletrônico (Decreto, art. 9º), quando a plataforma estiver disponível.',
    },
    {
      criterio: 'Como compete',
      pregao: 'Disputa em sessão pública eletrônica, conforme o edital.',
      arp: 'Depende do edital/órgão.',
      almoxarifado: 'Depende do edital/órgão.',
      sicx: 'Ofertas cadastradas e ranqueadas automaticamente (Decreto, art. 17). Critérios e pesos podem ser ajustados pelo órgão central.',
    },
    {
      criterio: 'Quem escolhe',
      pregao: 'A Administração seleciona conforme o resultado da disputa e as regras do edital.',
      arp: 'Depende do edital/órgão.',
      almoxarifado: 'Depende do edital/órgão.',
      sicx: 'A oferta melhor ranqueada pode ser selecionada sem motivação específica; a escolha de oferta pior classificada exige justificativa objetiva.',
    },
    {
      criterio: 'Precisa de edital a cada compra?',
      pregao: 'Sim, conforme o procedimento licitatório.',
      arp: 'Depende do edital/órgão.',
      almoxarifado: 'Depende do edital/órgão.',
      sicx: 'O Decreto prevê dispensa de termo de referência e de edital a cada contratação no sistema.',
    },
  ],
}

// ---------------------------------------------------------------------------
// 6. Ranking
// ---------------------------------------------------------------------------
export const RANKING = {
  titulo: 'Como o ranking pode funcionar',
  paragrafos: [
    'O Decreto nº 13.106/2026 prevê ranqueamento automatizado das ofertas (art. 17). A oferta melhor ranqueada pode ser selecionada sem motivação específica; a escolha de uma oferta pior classificada exige justificativa objetiva.',
    'Os critérios, os pesos e a metodologia podem ser ajustados pelo órgão central, inclusive para desconcentração de mercado e isonomia. Por isso, esta página não afirma quais serão os pesos nem promete posição.',
    'A pesquisa de preços também é automatizada no sistema. O fornecedor deve manter preço, prazo e especificação coerentes com o que consegue entregar.',
  ],
  checklist: [
    'Preço competitivo e sustentável (sem prometer o que não cabe no custo).',
    'Prazo de entrega realista e área de atendimento bem definida.',
    'Frete e condições de entrega informados com clareza.',
    'Especificação completa, com unidade, marca/modelo quando aplicável e ficha técnica.',
    'Regularidade fiscal, trabalhista e previdenciária em dia.',
    'Histórico de entrega e capacidade de atender pedidos repetidos.',
  ],
  aviso:
    'Não existe garantia de posição, ranking ou venda. O Painel PNCP não é o sistema oficial do Sicx e não interfere no ranqueamento.',
}

// ---------------------------------------------------------------------------
// 7. Checklist "Meu preparo"
// ---------------------------------------------------------------------------
export interface ItemPreparo {
  key: string
  titulo: string
  descricao: string
  grupo: string
  temValidade?: boolean
  link?: { label: string; url: string }
}

export const CHECKLIST_PREPARO: ItemPreparo[] = [
  {
    key: 'govbr',
    titulo: 'Conta gov.br no nível adequado',
    descricao: 'Confirme o nível da sua conta e quem será o responsável pelo credenciamento.',
    grupo: 'Cadastro',
  },
  {
    key: 'sicaf',
    titulo: 'SICAF atualizado',
    descricao: 'Dados da empresa, responsáveis e linhas de fornecimento em dia.',
    grupo: 'Cadastro',
    link: { label: 'Compras.gov.br / SICAF', url: SICX_URLS.compras },
  },
  {
    key: 'certidao_fgts',
    titulo: 'Certidão de regularidade do FGTS',
    descricao: 'Informe a validade para receber o alerta de vencimento.',
    grupo: 'Certidões',
    temValidade: true,
  },
  {
    key: 'certidao_trabalhista',
    titulo: 'Certidão Negativa de Débitos Trabalhistas (CNDT)',
    descricao: 'Informe a validade para receber o alerta de vencimento.',
    grupo: 'Certidões',
    temValidade: true,
  },
  {
    key: 'certidao_federal',
    titulo: 'Certidão federal (RFB/PGFN)',
    descricao: 'Informe a validade para receber o alerta de vencimento.',
    grupo: 'Certidões',
    temValidade: true,
  },
  {
    key: 'certidao_estadual',
    titulo: 'Certidão estadual',
    descricao: 'Informe a validade para receber o alerta de vencimento.',
    grupo: 'Certidões',
    temValidade: true,
  },
  {
    key: 'certidao_municipal',
    titulo: 'Certidão municipal',
    descricao: 'Informe a validade para receber o alerta de vencimento.',
    grupo: 'Certidões',
    temValidade: true,
  },
  {
    key: 'catalogo',
    titulo: 'Catálogo de produtos com especificações completas',
    descricao: 'Descrição padronizada, unidade, marca/modelo e código interno.',
    grupo: 'Catálogo',
  },
  {
    key: 'fichas',
    titulo: 'Fotos e fichas técnicas',
    descricao: 'Materiais de apoio para descrever o item sem ambiguidade.',
    grupo: 'Catálogo',
  },
  {
    key: 'precos_frete',
    titulo: 'Tabela de preços e frete',
    descricao: 'Preço por item e custo de entrega por região ou UF.',
    grupo: 'Preço e logística',
  },
  {
    key: 'logistica',
    titulo: 'Logística de entrega por região',
    descricao: 'Área atendida, prazo e transportadora/meio próprio.',
    grupo: 'Preço e logística',
  },
  {
    key: 'integracao',
    titulo: 'Integração com marketplace ou ERP (se houver)',
    descricao: 'Saiba de onde vêm preço, estoque e descrição dos produtos.',
    grupo: 'Integração',
  },
  {
    key: 'contato',
    titulo: 'Contato comercial definido',
    descricao: 'E-mail e telefone de quem responderá às demandas do setor público.',
    grupo: 'Cadastro',
  },
]

export const GRUPOS_PREPARO = ['Cadastro', 'Certidões', 'Catálogo', 'Preço e logística', 'Integração']

// ---------------------------------------------------------------------------
// 8. FAQ
// ---------------------------------------------------------------------------
export const FAQ: Array<{ pergunta: string; resposta: string }> = [
  {
    pergunta: 'O que é o Sicx?',
    resposta:
      'Por meio do Sicx, compradores públicos poderão pesquisar ofertas e realizar contratações conforme as regras estabelecidas pelos órgãos responsáveis em cada esfera de governo. É o caso de itens de papelaria, mobiliário, medicamentos e materiais de construção, entre outros produtos e serviços. Previsto na Lei nº 14.133/2021 (art. 79, IV, incluído pela Lei nº 15.266/2025), o sistema foi regulamentado pelo Decreto nº 13.106/2026. Na prática, o Sicx vai funcionar como uma infraestrutura pública digital capaz de conectar diferentes plataformas de comércio eletrônico públicas e privadas aos sistemas governamentais, simplificando processos e facilitando a participação de fornecedores.',
  },
  {
    pergunta: 'Preciso de SICAF?',
    resposta:
      'O Decreto prevê acesso por integração com o registro cadastral unificado e, na falta de integração, dados atualizados no SICAF. A forma prática ainda depende da plataforma e das normas complementares da SEGES/MGI.',
  },
  {
    pergunta: 'MEI pode participar?',
    resposta:
      'A BASE LEGAL não restringe a participação por porte. O Decreto se refere a fornecedores credenciados; requisitos e condições serão definidos nas normas complementares e nos editais de credenciamento. Não há, nesta base, regra específica para MEI — confirme no texto oficial e nas normas da SEGES.',
  },
  {
    pergunta: 'Estados e municípios também usam?',
    resposta:
      'O Decreto nº 13.106/2026 regula o Sicx no âmbito da Administração Pública federal. Estados, municípios, serviços sociais autônomos e entidades privadas sem fins lucrativos poderão se credenciar ou integrar suas próprias plataformas.',
  },
  {
    pergunta: 'Preciso de edital para cada compra?',
    resposta:
      'O Decreto prevê dispensa de termo de referência e de edital a cada contratação no sistema. O credenciamento é permanente, por requerimento eletrônico (art. 9º), quando a plataforma estiver disponível. As regras de cada esfera e de cada órgão devem ser conferidas.',
  },
  {
    pergunta: 'E se eu quiser sair do sistema?',
    resposta:
      'O fornecedor pode pedir descredenciamento a qualquer tempo. Isso não o livra das obrigações dos contratos já firmados.',
  },
  {
    pergunta: 'Quem escolhe a oferta?',
    resposta:
      'O Decreto prevê ranqueamento automatizado das ofertas (art. 17). A oferta melhor ranqueada pode ser selecionada sem motivação específica; a escolha de uma oferta pior classificada exige justificativa objetiva.',
  },
  {
    pergunta: 'Como o preço é definido?',
    resposta:
      'O fornecedor cadastra ofertas com preços, prazos e condições de entrega. O sistema prevê pesquisa automatizada de preços e ranqueamento automatizado. Os critérios, pesos e a metodologia podem ser ajustados pelo órgão central.',
  },
  {
    pergunta: 'Posso integrar meu marketplace ou ERP?',
    resposta:
      'O Decreto prevê que o cadastro de ofertas poderá ocorrer por integração com plataformas em que o fornecedor já vende. O protocolo técnico será definido pelo órgão central — esta página não inventa especificação de API nem formato oficial.',
  },
  {
    pergunta: 'O Sicx substitui o pregão?',
    resposta:
      'Não. O Sicx é o credenciamento por comércio eletrônico previsto no art. 79, IV, da Lei nº 14.133/2021, voltado a bens e serviços comuns padronizados. Ele coexiste com as modalidades de licitação já previstas na lei.',
  },
]

// ---------------------------------------------------------------------------
// 9. Glossário
// ---------------------------------------------------------------------------
export const GLOSSARIO: Array<{ termo: string; definicao: string }> = [
  {
    termo: 'Sicx',
    definicao:
      'Sistema de Compras Expressas: infraestrutura pública digital de credenciamento por comércio eletrônico para bens e serviços comuns padronizados, prevista no art. 79, IV, da Lei nº 14.133/2021 e regulamentada pelo Decreto nº 13.106/2026.',
  },
  {
    termo: 'SICAF',
    definicao:
      'Sistema de Cadastramento Unificado de Fornecedores do Governo Federal. O Decreto prevê acesso por integração com o registro cadastral unificado e, na falta de integração, dados atualizados no SICAF.',
  },
  {
    termo: 'CATMAT',
    definicao:
      'Catálogo de Materiais do Governo Federal, usado para padronizar a descrição de bens. A base legal do Sicx não detalha o uso obrigatório do CATMAT; a padronização prática será definida nas normas complementares.',
  },
  {
    termo: 'Credenciamento',
    definicao:
      'Procedimento pelo qual a Administração habilita fornecedores para contratar em condições previamente definidas. No Sicx, o Decreto prevê credenciamento permanente por requerimento eletrônico.',
  },
  {
    termo: 'Ranqueamento',
    definicao:
      'Ordenação automatizada das ofertas cadastradas (Decreto, art. 17). A oferta melhor ranqueada pode ser selecionada sem motivação específica; a escolha de oferta pior classificada exige justificativa objetiva.',
  },
  {
    termo: 'Almoxarifado virtual',
    definicao:
      'Modelo de compras em que os itens ficam disponíveis em um catálogo e são entregues sob demanda, sem a necessidade de estoque físico em cada órgão. Cada ente define suas próprias regras.',
  },
  {
    termo: 'ARP',
    definicao:
      'Ata de Registro de Preços: instrumento que registra preços e condições para contratações futuras. As regras aplicáveis dependem do edital e do órgão.',
  },
  {
    termo: 'PNCP',
    definicao:
      'Portal Nacional de Contratações Públicas, fonte oficial de dados das contratações públicas. O Painel PNCP é uma plataforma independente e não possui vínculo institucional com o PNCP.',
  },
]

// ---------------------------------------------------------------------------
// 10. Visão por esfera
// ---------------------------------------------------------------------------
export const ESFERAS = [
  {
    id: 'federal',
    label: 'Federal',
    regulado: 'Sim, pelo Decreto nº 13.106/2026.',
    texto:
      'O Decreto regula o Sicx na Administração Pública federal e define a SEGES/MGI como órgão central, responsável pelas normas complementares, pela plataforma e pelos editais de credenciamento.',
    ondeProcurar: 'Compras.gov.br e normas da SEGES/MGI.',
    link: SICX_URLS.compras,
  },
  {
    id: 'estadual',
    label: 'Estadual',
    regulado: 'Depende de adesão ou regulamentação própria.',
    texto:
      'Estados poderão se credenciar ou integrar suas próprias plataformas. As regras de cada estado podem ter base, prazos e procedimentos próprios, inclusive almoxarifados virtuais já existentes.',
    ondeProcurar: 'Diário oficial, portal de compras e secretaria de gestão do estado.',
  },
  {
    id: 'municipal',
    label: 'Municipal',
    regulado: 'Depende de adesão ou regulamentação própria.',
    texto:
      'Municípios poderão se credenciar ou integrar suas plataformas. Verifique a legislação local e o portal de compras do município.',
    ondeProcurar: 'Diário oficial e portal de compras do município.',
  },
  {
    id: 'entidades',
    label: 'Entidades sem fins lucrativos',
    regulado: 'Poderão se credenciar ou integrar suas plataformas.',
    texto:
      'O Decreto prevê que serviços sociais autônomos e entidades privadas sem fins lucrativos poderão se credenciar ou integrar suas plataformas. As condições concretas dependerão do instrumento de adesão.',
    ondeProcurar: 'Normas do ente ou da entidade e instrumento de adesão.',
  },
]

// ---------------------------------------------------------------------------
// 11. Perfil órgão comprador
// ---------------------------------------------------------------------------
export const GUIA_ORGAO = [
  {
    titulo: 'Adesão ao sistema',
    texto:
      'Compradores acessam o Sicx por adesão. O Decreto prevê que Estados, municípios, serviços sociais autônomos e entidades privadas sem fins lucrativos poderão se credenciar ou integrar suas plataformas.',
  },
  {
    titulo: 'Pesquisa de ofertas',
    texto:
      'O sistema prevê pesquisa automatizada de preços e consulta às ofertas cadastradas pelos fornecedores.',
  },
  {
    titulo: 'Escolha da oferta',
    texto:
      'A oferta melhor ranqueada pode ser selecionada sem motivação específica. A escolha de oferta pior classificada exige justificativa objetiva.',
  },
]

// ---------------------------------------------------------------------------
// 12. Assistente de integração (Parte 7.3)
// ---------------------------------------------------------------------------
export const CANAIS_INTEGRACAO = [
  {
    id: 'marketplace',
    label: 'Marketplace próprio / loja virtual',
    descricao: 'Você já tem catálogo, preço e estoque em uma plataforma própria.',
    checklist: [
      'Identificação do produto (nome, marca, modelo, GTIN/EAN quando houver).',
      'Descrição padronizada com unidade de fornecimento.',
      'Preço e política de reajuste.',
      'Estoque disponível e regra de reposição.',
      'Prazo de entrega e área de atendimento.',
      'Imagens e ficha técnica.',
      'Exportação de produtos em CSV/planilha ou feed.',
      'Certidões e dados cadastrais da empresa.',
    ],
  },
  {
    id: 'erp',
    label: 'ERP',
    descricao: 'Preço, estoque e cadastro vivem no ERP.',
    checklist: [
      'Relatório/exportação de produtos com código, descrição, unidade e preço.',
      'Relatório de estoque atualizado.',
      'Cadastro de clientes/órgãos e condições de pagamento.',
      'Responsável técnico pelo acesso aos dados.',
      'Definição de qual sistema será a fonte oficial do catálogo.',
    ],
  },
  {
    id: 'plataforma',
    label: 'Plataforma privada de compras',
    descricao: 'Você vende por um marketplace ou portal de terceiros.',
    checklist: [
      'Contrato e regras da plataforma sobre exportação de dados.',
      'Formato de exportação do catálogo.',
      'Quem responde pelo preço e pelo estoque exibidos.',
      'Prazo e área de entrega praticados na plataforma.',
      'Dados cadastrais e certidões atualizados.',
    ],
  },
  {
    id: 'planilha',
    label: 'Planilha',
    descricao: 'O catálogo está em Excel/CSV.',
    checklist: [
      'Colunas mínimas: descrição, unidade, preço, estoque, prazo, UF atendida.',
      'Padronização de unidades (un, cx, kg, m, m², m³, L).',
      'Revisão de linhas duplicadas ou sem preço.',
      'Validação de acentuação e caracteres especiais.',
      'Backup e controle de versão da planilha.',
    ],
  },
  {
    id: 'pdf',
    label: 'Catálogo em PDF',
    descricao: 'O catálogo existe apenas em PDF.',
    checklist: [
      'Transformar em planilha com uma linha por item.',
      'Definir unidade e preço de cada item.',
      'Completar descrições ambíguas.',
      'Separar itens por categoria.',
      'Criar uma ficha técnica por item.',
    ],
  },
]

export const AVISO_INTEGRACAO =
  'O Decreto 13.106/2026 prevê que o cadastro de ofertas poderá ocorrer por integração com plataformas em que o fornecedor já vende; o protocolo técnico será definido pelo órgão central. Esta ferramenta não especifica API, formato oficial nem prazo de integração.'

export const AVISO_INDICE =
  'Índice de apoio calculado pelo Painel PNCP com critérios próprios e transparentes. Não é nota oficial do SICX, não garante classificação, posição, habilitação ou venda.'

// ---------------------------------------------------------------------------
// 13. Categorias do buscador de preços (Parte 7.1)
// ---------------------------------------------------------------------------
export const CATEGORIAS_MERCADO = [
  { id: 'papelaria', label: 'Papelaria', termo: 'papelaria material de escritório' },
  { id: 'mobiliario', label: 'Mobiliário', termo: 'mobiliário mesa cadeira armário' },
  { id: 'medicamentos', label: 'Medicamentos', termo: 'medicamento' },
  { id: 'construcao', label: 'Materiais de construção', termo: 'material de construção cimento' },
  { id: 'informatica', label: 'Informática', termo: 'informática computador impressora' },
  { id: 'limpeza', label: 'Limpeza', termo: 'material de limpeza' },
  { id: 'alimentos', label: 'Alimentos', termo: 'alimento gênero alimentício' },
  { id: 'servicos', label: 'Serviços comuns', termo: 'serviço comum' },
  { id: 'outros', label: 'Outros', termo: '' },
]

// ---------------------------------------------------------------------------
// 14. Links oficiais do rodapé
// ---------------------------------------------------------------------------
export const FONTES_OFICIAIS = [
  { label: 'Lei nº 15.266/2025', url: SICX_URLS.lei15266 },
  { label: 'Decreto nº 13.106/2026', url: SICX_URLS.decreto13106 },
  { label: 'Compras.gov.br', url: SICX_URLS.compras },
  { label: 'PNCP', url: SICX_URLS.pncp },
]

// ---------------------------------------------------------------------------
// Fallback estático — garante SSR/SEO mesmo se o banco estiver indisponível
// ou vazio. Espelha o seed da migration 20261105_sicx.sql.
// ---------------------------------------------------------------------------
export const NORMAS_PADRAO: SicxNorma[] = [
  {
    id: 'lei-15266', titulo: 'Lei nº 15.266/2025 — credenciamento por comércio eletrônico',
    tipo: 'lei', orgao: 'Congresso Nacional', data_publicacao: '2025-11-24',
    url: SICX_URLS.lei15266, verificado_em: SICX_ATUALIZADO_EM, status_link: 'verificado', destaque: true, ordem: 1,
  },
  {
    id: 'decreto-13106', titulo: 'Decreto nº 13.106/2026 — regulamenta o Sicx',
    tipo: 'decreto', orgao: 'Presidência da República', data_publicacao: '2026-08-24',
    url: SICX_URLS.decreto13106, verificado_em: SICX_ATUALIZADO_EM, status_link: 'verificado', destaque: true, ordem: 2,
  },
  {
    id: 'compras', titulo: 'Compras.gov.br / SICAF',
    tipo: 'portal', orgao: 'Ministério da Gestão e da Inovação em Serviços Públicos', data_publicacao: null,
    url: SICX_URLS.compras, verificado_em: SICX_ATUALIZADO_EM, status_link: 'verificado', destaque: false, ordem: 3,
  },
  {
    id: 'pncp', titulo: 'PNCP — Portal Nacional de Contratações Públicas',
    tipo: 'portal', orgao: 'Governo Federal', data_publicacao: null,
    url: SICX_URLS.pncp, verificado_em: SICX_ATUALIZADO_EM, status_link: 'verificado', destaque: false, ordem: 4,
  },
  {
    id: 'justen', titulo: 'Informativo nº 234 — Justen, Pereira, Oliveira e Talamini',
    tipo: 'leitura', orgao: 'Justen, Pereira, Oliveira e Talamini', data_publicacao: '2026-08-01',
    url: SICX_URLS.justen, verificado_em: SICX_ATUALIZADO_EM, status_link: 'verificado', destaque: false, ordem: 5,
  },
  {
    id: 'zenite', titulo: 'A Administração pode instituir almoxarifados virtuais? — Zênite',
    tipo: 'leitura', orgao: 'Zênite', data_publicacao: null,
    url: SICX_URLS.zenite, verificado_em: SICX_ATUALIZADO_EM, status_link: 'verificado', destaque: false, ordem: 6,
  },
]

export const ALMOXARIFADOS_PADRAO: SicxAlmoxarifado[] = [
  {
    id: 'avn', nome: 'Almoxarifado Virtual Nacional (AVN)', orgao: 'Central de Compras — MGI',
    esfera: 'federal', uf: null, tipo: 'almoxarifado_virtual', situacao: 'ativo',
    descricao: 'Almoxarifado virtual da Administração Pública federal.',
    como_participar:
      'A operação é centralizada pela Central de Compras do MGI. Consulte a página oficial para conhecer o catálogo e as regras de fornecimento.',
    url_site: SICX_URLS.avn, url_norma: null, url_edital: null,
    verificado_em: SICX_ATUALIZADO_EM, status_link: 'verificado', ordem: 1,
  },
  {
    id: 'es', nome: 'Almoxarifado Virtual do Espírito Santo (Seger)', orgao: 'Governo do Estado do Espírito Santo — Seger',
    esfera: 'estadual', uf: 'ES', tipo: 'almoxarifado_virtual', situacao: 'em_implantacao',
    descricao: 'Almoxarifado virtual estadual.',
    como_participar:
      'O edital do Pregão Eletrônico SRP nº 008/2025 foi publicado em 05/11/2025, com sessão em 25/11/2025 pelo Compras.gov.br. Consulte a notícia oficial para acompanhar o andamento.',
    url_site: SICX_URLS.es, url_norma: null, url_edital: SICX_URLS.es,
    verificado_em: SICX_ATUALIZADO_EM, status_link: 'verificado', ordem: 2,
  },
  {
    id: 'mg', nome: 'Almoxarifado Virtual de Minas Gerais (AVMG)', orgao: 'Secretaria de Estado de Planejamento e Gestão (Seplag-MG)',
    esfera: 'estadual', uf: 'MG', tipo: 'almoxarifado_virtual', situacao: 'ativo',
    descricao: 'Materiais de expediente e de informática no catálogo do AVMG.',
    como_participar:
      'A adesão ao AVMG é formalizada por termo de adesão por órgãos e entidades do Executivo estadual; a contratação e a gestão são centralizadas pela Seplag-MG. Consulte a página oficial de adesão.',
    url_site: 'https://www.mg.gov.br/planejamento/pagina/adesao',
    url_norma: 'https://www.pesquisalegislativa.mg.gov.br/LegislacaoCompleta.aspx?cod=203331&marc=',
    url_edital: null, verificado_em: SICX_ATUALIZADO_EM, status_link: 'verificado', ordem: 3,
  },
  {
    id: 'rj', nome: 'Almoxarifado Virtual do Rio de Janeiro', orgao: 'Secretaria de Planejamento e Gestão (Seplag-RJ)',
    esfera: 'estadual', uf: 'RJ', tipo: 'almoxarifado_virtual', situacao: 'ativo',
    descricao: 'Materiais de consumo administrativo, de copa, de limpeza e insumos para urgências públicas.',
    como_participar:
      'O Almoxarifado Virtual é coordenado pela Seplag-RJ e o fornecimento é contratado de forma centralizada, com entregas em todo o território do estado. Consulte a página oficial e a norma estadual.',
    url_site: 'https://redelog.rj.gov.br/redelog/almoxarifado-virtual-2/',
    url_norma: 'https://redelog.rj.gov.br/redelog/resolucao-seplag-no-359-de-19-de-marco-de-2025/',
    url_edital: null, verificado_em: SICX_ATUALIZADO_EM, status_link: 'verificado', ordem: 4,
  },
  {
    id: 'pr', nome: 'Sistema GMS / CAUFPR — Paraná', orgao: 'Secretaria da Administração e da Previdência (SEAP-PR)',
    esfera: 'estadual', uf: 'PR', tipo: 'catalogo_eletronico', situacao: 'ativo',
    descricao: 'Cadastro de fornecedores, catálogo de itens e almoxarifado no Sistema GMS.',
    como_participar:
      'O cadastro de fornecedores é feito no Sistema GMS (CAUFPR). Consulte as orientações oficiais de cadastro e o portal Compras Paraná.',
    url_site: 'https://www.administracao.pr.gov.br/Compras',
    url_norma: 'https://www.administracao.pr.gov.br/Compras/SistemaGMSContratos',
    url_edital: 'https://www.gms.pr.gov.br/gms/solicitarCadastroFornecedorNovo.do?action=iniciarProcesso',
    verificado_em: SICX_ATUALIZADO_EM, status_link: 'verificado', ordem: 5,
  },
  {
    id: 'ms', nome: 'e-Fornecedor / SIGA — Mato Grosso do Sul', orgao: 'Secretaria de Estado de Administração (SAD-MS)',
    esfera: 'estadual', uf: 'MS', tipo: 'catalogo_eletronico', situacao: 'ativo',
    descricao: 'Cadastro de fornecedores (e-Fornecedor), catálogo e almoxarifado (SIGA).',
    como_participar:
      'O cadastro de fornecedores é feito pelo e-Fornecedor e pelos sistemas SIGA do Estado. Consulte o portal Compras MS e a lista oficial de sistemas.',
    url_site: 'https://www.compras.ms.gov.br/sistemas/', url_norma: null, url_edital: null,
    verificado_em: SICX_ATUALIZADO_EM, status_link: 'verificado', ordem: 6,
  },
]

export const STATUS_OBJETO_PADRAO: SicxStatus = {
  id: 'status-padrao',
  titulo: STATUS_PADRAO.titulo,
  descricao: STATUS_PADRAO.descricao,
  fonte_label: STATUS_PADRAO.fonte_label,
  fonte_url: STATUS_PADRAO.fonte_url,
  atualizado_em: STATUS_PADRAO.atualizado_em,
}
