// ============================================================================
// GUIAS PRÁTICOS DE LICITAÇÃO — arquivo EDITÁVEL (fonte única).
//
// Base legal: Lei nº 14.133/2021 (Lei de Licitações e Contratos).
// Linguagem simples e informativa. NÃO promete resultados e coloca sempre a
// decisão final no agente público/edital. Para atualizar, edite este arquivo.
// ============================================================================

export interface GuiaSecao {
  titulo: string
  itens: string[]
}

export interface GuiaRelacionado {
  label: string
  href: string
}

export interface Guia {
  slug: string
  titulo: string
  resumo: string
  cta: { label: string; href: string }
  secoes: GuiaSecao[]
  relacionados?: GuiaRelacionado[]
}

export const GUIA_AVISO =
  'Conteúdo informativo, baseado na Lei nº 14.133/2021, sujeito a atualização normativa. Não constitui parecer jurídico nem garantia de resultado. As regras práticas estão no edital de cada órgão — leia-o com atenção e, em caso de dúvida, consulte a fonte oficial ou um profissional habilitado.'

export const GUIA_ATUALIZADO_EM = '2026-09-20'
export const GUIA_ATUALIZADO_EM_LABEL = '20 de setembro de 2026'

export const GUIAS: Guia[] = [
  {
    slug: 'primeiro-pregao',
    titulo: 'Como participar do primeiro pregão',
    resumo:
      'Um passo a passo inicial para quem nunca participou: entender o pregão, preparar a empresa e enviar a proposta sem sustos.',
    cta: { label: 'Buscar editais abertos', href: '/oportunidades' },
    secoes: [
      { titulo: 'Antes de tudo', itens: [
        'Entenda o que é um pregão: é uma modalidade de licitação para bens e serviços comuns, em que os participantes apresentam propostas e disputam preço.',
        'Verifique se o objeto do edital tem a ver com o que sua empresa vende — comece por editais da sua área.',
        'Organize seus documentos e mantenha o cadastro da empresa atualizado.',
      ] },
      { titulo: 'Preparação da empresa', itens: [
        'Tenha CNPJ ativo, certidões fiscais e trabalhistas válidas e os documentos de habilitação exigidos comuns.',
        'Leia o edital e os anexos com calma e faça um checklist do que é exigido.',
        'Tire dúvidas dentro do prazo de esclarecimento, se o edital tiver.',
      ] },
      { titulo: 'No dia do pregão', itens: [
        'Acesse a plataforma indicada no edital com antecedência e teste seu login.',
        'Envie a proposta inicial dentro do prazo e acompanhe a sessão para os lances.',
        'Registre horários e mensagens da sessão; tudo fica no sistema.',
      ] },
      { titulo: 'Depois da disputa', itens: [
        'Se for a melhor proposta, envie os documentos de habilitação no prazo do edital.',
        'Atente aos prazos de recurso e assinatura do contrato.',
        'Guarde todos os comprovantes de envio.',
      ] },
    ],
    relacionados: [
      { label: 'Documentos de habilitação', href: '/ajuda/documentos-habilitacao' },
      { label: 'Como ler um edital', href: '/ajuda/como-ler-edital' },
      { label: 'Erros que desclassificam', href: '/ajuda/erros-que-desclassificam' },
    ],
  },
  {
    slug: 'documentos-habilitacao',
    titulo: 'Documentos de habilitação: o que pedem e como preparar',
    resumo:
      'Entenda quais documentos costumam ser exigidos para habilitar sua empresa e como deixá-los organizados e válidos.',
    cta: { label: 'Organizar documentos', href: '/documentos' },
    secoes: [
      { titulo: 'Os grupos mais comuns', itens: [
        'Habilitação jurídica: atos constitutivos da empresa (contrato/estatuto) e documentos dos representantes.',
        'Regularidade fiscal e trabalhista: certidões de tributos, FGTS e trabalhistas, dentro da validade.',
        'Qualificação econômico-financeira: balanços e certidões conforme o edital.',
        'Qualificação técnica: atestados e registros exigidos para o objeto.',
      ] },
      { titulo: 'Como preparar', itens: [
        'Use um checklist por edital: o que é exigido varia conforme o objeto e o órgão.',
        'Confira a validade de cada certidão antes de enviar.',
        'Mantenha cópias digitais organizadas e legíveis.',
      ] },
      { titulo: 'Boas práticas', itens: [
        'Não invente informação: envie apenas o que comprova a sua situação real.',
        'Se algo não se aplica, verifique no edital se há previsão de dispensa.',
        'Guarde protocolos e comprovantes de envio.',
      ] },
    ],
    relacionados: [
      { label: 'Erros que desclassificam', href: '/ajuda/erros-que-desclassificam' },
      { label: 'Como participar do primeiro pregão', href: '/ajuda/primeiro-pregao' },
    ],
  },
  {
    slug: 'como-ler-edital',
    titulo: 'Como ler um edital',
    resumo:
      'Um roteiro para localizar o que importa em um edital: objeto, prazos, exigências, critérios de julgamento e condições de pagamento.',
    cta: { label: 'Analisar edital com IA', href: '/analise-edital' },
    secoes: [
      { titulo: 'Comece pelo essencial', itens: [
        'Objeto: o que o órgão quer contratar (é compatível com o que você vende?).',
        'Prazos: datas de abertura, envio de proposta e sessão.',
        'Forma de disputa e plataforma onde ocorre.',
      ] },
      { titulo: 'O que mais importa', itens: [
        'Exigências de habilitação (documentos) e exigências técnicas.',
        'Critério de julgamento (menor preço, técnica e preço etc.).',
        'Condições de entrega, pagamento e garantia.',
      ] },
      { titulo: 'Pontos de atenção', itens: [
        'Itens com exigências específicas ou exclusivas.',
        'Prazos curtos e penalidades.',
        'Anexos e documentos que fazem parte do edital.',
      ] },
      { titulo: 'Atalho no Painel PNCP', itens: [
        'Use a Análise de Edital com IA para ter um resumo de objeto, exigências, prazos, riscos e documentos necessários.',
        'O resultado é um apoio à leitura — a análise final é sempre do responsável.',
      ] },
    ],
    relacionados: [
      { label: 'Erros que desclassificam', href: '/ajuda/erros-que-desclassificam' },
      { label: 'Documentos de habilitação', href: '/ajuda/documentos-habilitacao' },
    ],
  },
  {
    slug: 'modalidades-lei-14133',
    titulo: 'Modalidades da Lei 14.133/2021 e diferenças',
    resumo:
      'Um resumo das modalidades de licitação previstas na Lei nº 14.133/2021 e de quando cada uma costuma ser usada.',
    cta: { label: 'Ver modalidades no painel', href: '/modalidades' },
    secoes: [
      { titulo: 'As cinco modalidades', itens: [
        'Pregão: bens e serviços comuns; disputa por menor preço ou maior desconto.',
        'Concorrência: obras, serviços especiais e bens/serviços que o pregão não alcança.',
        'Concurso: escolha de trabalho técnico, científico ou artístico.',
        'Leilão: alienação de bens.',
        'Diálogo competitivo: hipóteses específicas e complexas previstas em lei.',
      ] },
      { titulo: 'Também existem', itens: [
        'Dispensa e inexigibilidade: não são modalidades, e sim hipóteses de contratação direta previstas em lei.',
        'Credenciamento: procedimento para contratações específicas, como o comércio eletrônico (base do SICX).',
      ] },
      { titulo: 'Como isso afeta você', itens: [
        'A modalidade muda as regras e o jeito de disputar.',
        'Leia sempre o edital: ele define o critério e o passo a passo.',
      ] },
    ],
    relacionados: [
      { label: 'Como ler um edital', href: '/ajuda/como-ler-edital' },
      { label: 'SICX / Compras Expressas', href: '/ajuda/sicx' },
    ],
  },
  {
    slug: 'me-epp-beneficios',
    titulo: 'ME/EPP e benefícios nas licitações',
    resumo:
      'O que a legislação prevê para micro e pequenas empresas nas contratações públicas e o que verificar no edital.',
    cta: { label: 'Buscar editais', href: '/oportunidades' },
    secoes: [
      { titulo: 'O que existe', itens: [
        'A Lei Complementar nº 123/2006 e a Lei nº 14.133/2021 preveem tratamento diferenciado para ME/EPP.',
        'Há previsão de critérios e cotas conforme o objeto e o edital.',
        'Existem regras específicas para regularização de documentação em determinadas situações.',
      ] },
      { titulo: 'O que verificar no edital', itens: [
        'Se o item é exclusivo para ME/EPP ou tem cota reservada.',
        'As condições e os prazos que se aplicam a ME/EPP.',
        'As exigências de habilitação e sua forma de comprovação.',
      ] },
      { titulo: 'Atenção', itens: [
        'O benefício depende do enquadramento e do que o edital define — não é automático.',
        'Declare somente a condição real da sua empresa.',
      ] },
    ],
    relacionados: [
      { label: 'Como formar preço', href: '/ajuda/como-formar-preco' },
      { label: 'Modalidades da Lei 14.133/2021', href: '/ajuda/modalidades-lei-14133' },
    ],
  },
  {
    slug: 'como-formar-preco',
    titulo: 'Como formar preço',
    resumo:
      'Como estimar um preço competitivo e sustentável: custos, referências de mercado e limites do edital.',
    cta: { label: 'Consultar preços', href: '/precos' },
    secoes: [
      { titulo: 'Antes de dar o lance', itens: [
        'Levante seus custos reais (produto/serviço, impostos, frete, deslocamento, administração).',
        'Considere o valor estimado e o limite máximo do edital.',
        'Pesquise preços praticados em contratações semelhantes.',
      ] },
      { titulo: 'Referências de preço', itens: [
        'Use o Mapa de Preços do Painel PNCP para consultar referências de contratações públicas.',
        'Compare com o valor estimado do edital.',
        'Cuidado com preço insustentável: pode gerar prejuízo e problemas na execução.',
      ] },
      { titulo: 'Na proposta', itens: [
        'Deixe claro o que está incluso (entrega, prazo, garantia).',
        'Confira a planilha e a soma antes de enviar.',
        'Mantenha a coerência entre proposta inicial e lance final.',
      ] },
    ],
    relacionados: [
      { label: 'Como ler um edital', href: '/ajuda/como-ler-edital' },
      { label: 'Erros que desclassificam', href: '/ajuda/erros-que-desclassificam' },
    ],
  },
  {
    slug: 'impugnacao-esclarecimentos-recursos',
    titulo: 'Impugnação, esclarecimentos e recursos',
    resumo:
      'Entenda os pedidos de esclarecimento, as impugnações ao edital e os recursos, e por que os prazos são decisivos.',
    cta: { label: 'Ver calendário e prazos', href: '/calendario' },
    secoes: [
      { titulo: 'Pedido de esclarecimento', itens: [
        'Serve para tirar dúvidas sobre o edital antes da disputa.',
        'Tem prazo definido no edital — perdeu o prazo, perdeu a chance.',
      ] },
      { titulo: 'Impugnação', itens: [
        'É o questionamento fundamentado de algum ponto do edital.',
        'Também tem prazo e forma previstos no edital e na lei.',
      ] },
      { titulo: 'Recursos', itens: [
        'Após o julgamento, pode haver recurso conforme as hipóteses e prazos da lei e do edital.',
        'O recurso precisa de fundamento e deve ser apresentado no prazo.',
      ] },
      { titulo: 'Boas práticas', itens: [
        'Anote todos os prazos em um calendário e acompanhe o sistema.',
        'Seja objetivo e fundamente com base no edital e na lei.',
      ] },
    ],
    relacionados: [
      { label: 'Como ler um edital', href: '/ajuda/como-ler-edital' },
      { label: 'Glossário de termos', href: '/ajuda/glossario' },
    ],
  },
  {
    slug: 'erros-que-desclassificam',
    titulo: 'Erros comuns que desclassificam propostas',
    resumo:
      'Uma lista de erros frequentes que levam à desclassificação ou inabilitação — e como evitá-los.',
    cta: { label: 'Abrir checklist', href: '/checklist' },
    secoes: [
      { titulo: 'Documentação', itens: [
        'Certidão vencida ou ilegível.',
        'Documento divergente do que o edital exige.',
        'Esquecer de anexar um documento obrigatório.',
      ] },
      { titulo: 'Proposta', itens: [
        'Preço acima do máximo do edital.',
        'Erro de soma ou divergência entre valores.',
        'Descrição do objeto diferente do edital.',
      ] },
      { titulo: 'Prazos e forma', itens: [
        'Enviar a proposta ou os documentos fora do prazo.',
        'Assinar/registrar de forma diferente da exigida.',
        'Não atender a uma exigência específica do edital.',
      ] },
      { titulo: 'Como se proteger', itens: [
        'Faça um checklist antes de enviar.',
        'Releia o edital e confira item por item.',
        'Guarde comprovantes de tudo o que enviar.',
      ] },
    ],
    relacionados: [
      { label: 'Documentos de habilitação', href: '/ajuda/documentos-habilitacao' },
      { label: 'Como formar preço', href: '/ajuda/como-formar-preco' },
    ],
  },
  {
    slug: 'glossario',
    titulo: 'Glossário de termos',
    resumo:
      'Os termos que mais aparecem em editais e no dia a dia das licitações, explicados de forma simples.',
    cta: { label: 'Buscar editais', href: '/oportunidades' },
    secoes: [
      { titulo: 'Termos gerais', itens: [
        'Edital: documento que define as regras da licitação.',
        'Objeto: o que está sendo contratado.',
        'Órgão/entidade compradora: quem está contratando.',
        'Termo de referência: documento que detalha o objeto e as condições.',
      ] },
      { titulo: 'Disputa', itens: [
        'Pregão: modalidade para bens e serviços comuns.',
        'Lance: oferta de preço durante a disputa.',
        'Sessão pública: momento em que a disputa acontece.',
      ] },
      { titulo: 'Habilitação', itens: [
        'Habilitação: fase de comprovação de que a empresa pode contratar.',
        'Certidões: documentos que comprovam regularidade.',
        'Atestado de capacidade técnica: comprova experiência.',
      ] },
      { titulo: 'Depois da disputa', itens: [
        'Homologação: confirmação do resultado pela autoridade.',
        'Adjudicação: atribuição do objeto ao vencedor.',
        'Contrato: instrumento que formaliza a contratação.',
      ] },
    ],
    relacionados: [
      { label: 'Como ler um edital', href: '/ajuda/como-ler-edital' },
      { label: 'Modalidades da Lei 14.133/2021', href: '/ajuda/modalidades-lei-14133' },
    ],
  },
  {
    slug: 'sicx',
    titulo: 'SICX — Sistema de Compras Expressas',
    resumo:
      'O que é o SICX, sua base legal (Lei nº 15.266/2025 e Decreto nº 13.106/2026) e o que ele muda — sem substituir o pregão.',
    cta: { label: 'Ver a página do SICX', href: '/sicx' },
    secoes: [
      { titulo: 'O que é', itens: [
        'É o credenciamento por comércio eletrônico criado pela Lei nº 15.266/2025, que alterou a Lei nº 14.133/2021 (art. 79).',
        'Voltado a bens e serviços comuns padronizados, de contratação repetida.',
        'Integrado ao PNCP.',
      ] },
      { titulo: 'Regulamentação', itens: [
        'Decreto nº 13.106/2026, com regras em vigor desde 08/09/2026.',
        'A operação prática depende de normas complementares, da plataforma e de editais de credenciamento.',
      ] },
      { titulo: 'Importante', itens: [
        'O SICX não é uma nova modalidade e não substitui o pregão.',
        'É um canal adicional para itens padronizados; o pregão continua existindo.',
      ] },
    ],
    relacionados: [
      { label: 'Modalidades da Lei 14.133/2021', href: '/ajuda/modalidades-lei-14133' },
    ],
  },
]

export function getGuia(slug: string): Guia | undefined {
  return GUIAS.find((g) => g.slug === slug)
}
