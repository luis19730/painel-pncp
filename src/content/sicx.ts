// ============================================================================
// CONTEÚDO INSTITUCIONAL DO SICX — arquivo EDITÁVEL (fonte única).
//
// Toda a copy da página /sicx, do bloco resumido da home/cadastro e do menu
// "Encontrar" vem daqui. Para atualizar quando surgirem novas normas, edite
// APENAS este arquivo (não há texto do SICX espalhado no código).
//
// IMPORTANTE (redação vigente em 2026):
//   - Lei nº 15.266/2025 (21/11/2025) alterou a Lei nº 14.133/2021 (art. 79)
//     para incluir o credenciamento por comércio eletrônico.
//   - Decreto nº 13.106, de 24/08/2026, com regras em vigor desde 08/09/2026.
//   - A operação prática depende de normas complementares, da plataforma e de
//     editais de credenciamento. NÃO afirmar operação plena.
//   - O SICX NÃO substitui o pregão.
//
// As URLs das fontes oficiais ficam aqui e podem ser ajustadas facilmente.
// ============================================================================

export interface SicxFonte {
  label: string
  url: string
}

export interface SicxPasso {
  titulo: string
  detalhe: string
}

export interface SicxFaq {
  pergunta: string
  resposta: string
}

export interface SicxComparativo {
  criterio: string
  sicx: string
  pregao: string
  dispensa: string
}

export const SICX = {
  /** Atualize esta data ao revisar o conteúdo. */
  atualizadoEm: '2026-09-20',
  atualizadoEmLabel: '20 de setembro de 2026',

  nome: 'SICX — Sistema de Compras Expressas',
  eyebrow: 'Compras Expressas',
  subtitulo:
    'Entenda, em linguagem simples, o que é o SICX, a base legal, como funciona e o que muda para quem vende ao governo.',

  /** Resumo curto (usado na home, no cadastro e no tooltip do menu). */
  resumo:
    'O SICX (Sistema de Compras Expressas) é o modelo de credenciamento por comércio eletrônico criado pela Lei nº 15.266/2025 para a contratação de bens e serviços comuns padronizados, integrado ao PNCP. É regulamentado pelo Decreto nº 13.106/2026 e depende de normas complementares, da plataforma e de editais de credenciamento para operar.',

  /** Destaques curtos (home/cadastro). */
  destaques: [
    'Criado pela Lei nº 15.266/2025 (alterou o art. 79 da Lei nº 14.133/2021)',
    'Regulamentado pelo Decreto nº 13.106/2026 (vigor em 08/09/2026)',
    'Credenciamento por comércio eletrônico, integrado ao PNCP',
    'Não é nova modalidade e NÃO substitui o pregão',
  ],

  oQueE: [
    'O SICX (Sistema de Compras Expressas) foi criado pela Lei nº 15.266/2025, de 21/11/2025, que alterou a Lei nº 14.133/2021 (Lei de Licitações e Contratos) para incluir o credenciamento por comércio eletrônico (art. 79).',
    'Ele é voltado à contratação de bens e serviços comuns padronizados — isto é, itens de contratação repetida e com características comparáveis entre fornecedores.',
    'O sistema é integrado ao PNCP (Portal Nacional de Contratações Públicas), a fonte oficial de dados das contratações públicas.',
    'O SICX NÃO é uma nova modalidade de licitação e NÃO substitui o pregão: trata-se de um procedimento de credenciamento que coexiste com as modalidades já previstas na Lei nº 14.133/2021.',
  ],

  regulamentacao: [
    'O Decreto nº 13.106, de 24/08/2026, regulamenta o sistema, com regras em vigor desde 08/09/2026.',
    'A operação prática depende de normas complementares, da disponibilização da plataforma pelo governo federal e da publicação de editais de credenciamento pelos órgãos contratantes.',
    'Por isso, não afirmamos que o SICX já opera de forma plena: a adoção ocorre de forma gradual, conforme a regulamentação e a plataforma evoluem.',
  ],

  comoFunciona: [
    { titulo: '1. Credenciamento eletrônico', detalhe: 'O órgão publica o edital de credenciamento e os fornecedores interessados se credenciam eletronicamente, dentro das regras do edital.' },
    { titulo: '2. Cadastro de ofertas por localidade', detalhe: 'O fornecedor credenciado cadastra suas ofertas de bens/serviços, informando preço, localidade atendida, condições de entrega e de pagamento.' },
    { titulo: '3. Ranqueamento automatizado', detalhe: 'A plataforma organiza e ranqueia as ofertas automaticamente, seguindo os critérios definidos no edital.' },
    { titulo: '4. Contratação', detalhe: 'O comprador público contrata diretamente dentro das regras do edital de credenciamento, sem abrir um novo pregão a cada necessidade.' },
    { titulo: '5. Recebimento', detalhe: 'O bem ou serviço é entregue/prestado conforme as condições cadastradas e as regras da contratação.' },
    { titulo: '6. Pagamento', detalhe: 'O pagamento segue as condições do edital e a legislação aplicável, respeitando os prazos e requisitos definidos.' },
  ],

  comparativo: {
    colunas: ['Critério', 'SICX', 'Pregão eletrônico', 'Dispensa eletrônica'],
    linhas: [
      { criterio: 'Natureza', sicx: 'Credenciamento por comércio eletrônico (procedimento auxiliar)', pregao: 'Modalidade de licitação', dispensa: 'Hipótese de contratação direta' },
      { criterio: 'Base legal', sicx: 'Lei nº 15.266/2025 + art. 79 da Lei nº 14.133/2021 + Decreto nº 13.106/2026', pregao: 'Lei nº 14.133/2021', dispensa: 'Lei nº 14.133/2021 (dispensa de licitação)' },
      { criterio: 'Objeto típico', sicx: 'Bens e serviços comuns padronizados, de contratação repetida', pregao: 'Bens e serviços comuns em geral', dispensa: 'Baixo valor ou situações específicas previstas em lei' },
      { criterio: 'Disputa', sicx: 'Ofertas cadastradas e ranqueadas na plataforma', pregao: 'Disputa aberta em sessão pública eletrônica', dispensa: 'Disputa eletrônica nas hipóteses de dispensa' },
      { criterio: 'Quando se aplica', sicx: 'Contratação repetida de itens padronizados', pregao: 'Regra geral para bens e serviços comuns', dispensa: 'Somente nas hipóteses legais de contratação direta' },
    ] as SicxComparativo[],
  },

  passos: [
    { titulo: '1. Cadastro no PNCP / registro cadastral unificado', detalhe: 'Mantenha seu cadastro e registro cadastral unificado atualizados no PNCP, com os dados da empresa e dos responsáveis.' },
    { titulo: '2. Documentos', detalhe: 'Separe os documentos de habilitação exigidos (fiscais, trabalhistas, técnicos e econômicos), conforme o edital de credenciamento.' },
    { titulo: '3. Credenciamento', detalhe: 'Acompanhe os editais de credenciamento publicados pelos órgãos e realize o credenciamento eletrônico dentro do prazo e das regras.' },
    { titulo: '4. Cadastro de ofertas', detalhe: 'Cadastre suas ofertas com preço, localidade atendida e condições de entrega e pagamento, mantendo-as atualizadas.' },
    { titulo: '5. Acompanhamento', detalhe: 'Monitore as contratações e mantenha seus dados e ofertas válidos para continuar disponível aos compradores.' },
  ] as SicxPasso[],

  faq: [
    { pergunta: 'Quem pode participar do SICX?', resposta: 'Fornecedores credenciados dentro das regras do edital. Do lado comprador, o decreto prevê a administração pública direta e indireta federal, empresas públicas, sociedades de economia mista e suas subsidiárias e entidades privadas sem fins lucrativos, podendo haver adesão de estados e municípios.' },
    { pergunta: 'ME/EPP têm tratamento diferenciado?', resposta: 'Microempresas e empresas de pequeno porte podem participar conforme as regras do edital e os benefícios previstos na Lei Complementar nº 123/2006. Verifique sempre o edital de credenciamento do órgão.' },
    { pergunta: 'Como fica o preço?', resposta: 'O fornecedor cadastra sua oferta com o preço praticado; as ofertas são ranqueadas automaticamente pela plataforma, seguindo os critérios do edital. O preço deve observar a pesquisa de preços e as regras do decreto e do edital.' },
    { pergunta: 'Quais os prazos de pagamento?', resposta: 'Dependem do edital de credenciamento e da legislação aplicável. As condições de pagamento ficam registradas na oferta e no edital — confira antes de participar.' },
    { pergunta: 'Quais são os riscos?', resposta: 'Como a operação prática depende de normas complementares, da plataforma e dos editais de credenciamento, o SICX deve ser analisado caso a caso. Há ainda riscos comuns de mercado: concorrência por preço, necessidade de manter ofertas e documentos atualizados.' },
    { pergunta: 'O que muda para quem vende por pregão?', resposta: 'O pregão continua existindo e sendo a regra geral para bens e serviços comuns. O SICX é um canal adicional, focado em itens padronizados e de contratação repetida: quem já vende por pregão pode também se credenciar, sem deixar de participar de pregões.' },
  ],

  aviso:
    'Conteúdo informativo, sujeito a atualização normativa. Este material não constitui parecer jurídico. As regras práticas dependem da legislação, das normas complementares e do edital de credenciamento de cada órgão. Consulte sempre as fontes oficiais.',

  fontes: [
    { label: 'Lei nº 15.266/2025 (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/L15266.htm' },
    { label: 'Decreto nº 13.106/2026 (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/D13106.htm' },
    { label: 'PNCP — Portal Nacional de Contratações Públicas', url: 'https://pncp.gov.br' },
    { label: 'Compras.gov.br', url: 'https://www.gov.br/compras/pt-br' },
  ] as SicxFonte[],
}

export type SicxContent = typeof SICX
