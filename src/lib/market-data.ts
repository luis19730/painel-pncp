import { normalizar, compactar } from '@/lib/utils'

// ============================================================================
// Banco de dados local (mock) com estrutura pronta para troca pela API real
// do PNCP. Todas as funcoes sao async para facilitar a migracao.
// ============================================================================

export interface ItemRecord {
  id: string
  nome: string
  codigo: string // CATMAT/CATSER
  descricao: string
  orgao: string
  orgaoCnpj: string
  uf: string
  municipio: string
  valor: number
  data: string
  modalidade: string
  fornecedor: string
  fornecedorCnpj: string
}

const ORGAOS = [
  { nome: 'MUNICÍPIO DE SÃO PAULO', cnpj: '46629749000107', uf: 'SP', municipio: 'São Paulo' },
  { nome: 'MINISTÉRIO DA SAÚDE', cnpj: '00394543000118', uf: 'DF', municipio: 'Brasília' },
  { nome: 'PREFEITURA DE BELO HORIZONTE', cnpj: '17213008000190', uf: 'MG', municipio: 'Belo Horizonte' },
  { nome: 'GOVERNO DO ESTADO DO RIO GRANDE DO SUL', cnpj: '87669362000176', uf: 'RS', municipio: 'Porto Alegre' },
  { nome: 'PREFEITURA MUNICIPAL DE CAMPINAS', cnpj: '51642016000146', uf: 'SP', municipio: 'Campinas' },
  { nome: 'UNIVERSIDADE FEDERAL DO RIO DE JANEIRO', cnpj: '33366378000109', uf: 'RJ', municipio: 'Rio de Janeiro' },
  { nome: 'SECRETARIA DA EDUCAÇÃO DO PARANÁ', cnpj: '03560763000150', uf: 'PR', municipio: 'Curitiba' },
  { nome: 'PREFEITURA DE RECIFE', cnpj: '10570160000115', uf: 'PE', municipio: 'Recife' },
  { nome: 'EXÉRCITO BRASILEIRO', cnpj: '00394504000150', uf: 'DF', municipio: 'Brasília' },
  { nome: 'PREFEITURA DE CURITIBA', cnpj: '77779298000157', uf: 'PR', municipio: 'Curitiba' },
]

const FORNECEDORES = [
  'TechSol Comércio Ltda', 'InfoMax Distribuidora', 'Prime Supply Ltda', 'NovaTech Equipamentos',
  'Construtora Andrade Lima', 'Servilimpo Serviços', 'MedFarma Distribuidora', 'DataSystem Tecnologia',
  'AgroVale Insumos', 'Energia Norte Elétrica', 'Papelaria Central', 'Transporte Rápido Logística',
]

// ----------------------------------------------------------------------------
// Catálogo demonstrativo com 198 produtos distintos (cada um gera 1 registro).
// Usado como base de referência/fallback quando a API do PNCP está indisponível.
// ----------------------------------------------------------------------------
const CAT = (
  nome: string,
  codigo: string,
  descricao: string,
  base: number,
  uf = 'SP',
  municipio = 'São Paulo',
  modalidade = 'Pregão Eletrônico'
) => ({ nome, codigo, descricao, base, uf, municipio, modalidade })

const ITEM_CATALOG: Array<ReturnType<typeof CAT>> = [
  // ---- Materiais de construção / ferragens / elétrica ----
  CAT('Prego 17x27 (2.5x60mm)', '170011', 'Prego comum 17x27, caixa com 1kg', 14.5, 'SP', 'Campinas'),
  CAT('Prego 18x24', '170012', 'Prego comum 18x24, caixa com 1kg', 13.8, 'SP', 'São Paulo'),
  CAT('Prego 15x15', '170013', 'Prego comum 15x15, caixa com 1kg', 11.9, 'MG', 'Belo Horizonte'),
  CAT('Prego 20x30', '170014', 'Prego comum 20x30, caixa com 1kg', 16.2, 'SP', 'Campinas'),
  CAT('Parafuso 1/4 x 2 pol', '170015', 'Parafuso de madeira 1/4 x 2 pol, caixa com 100 un', 32, 'SP', 'São Paulo'),
  CAT('Parafuso máquina 6mm x 50mm', '170016', 'Parafuso de máquina sextavado, cx 100 un', 28.5, 'MG', 'Belo Horizonte'),
  CAT('Bucha nylon 8mm', '170017', 'Bucha de nylon S8, saco com 500 un', 45, 'SP', 'São Paulo'),
  CAT('Arruela lisa 1/4', '170018', 'Arruela lisa 1/4, caixa com 500 un', 22, 'PR', 'Curitiba'),
  CAT('Porca sextavada 1/4', '170019', 'Porca sextavada 1/4, caixa com 500 un', 24, 'SP', 'Campinas'),
  CAT('Tijolo cerâmico 9x19x19', '170020', 'Tijolo cerâmico de 9 furos, milheiro', 1450, 'SP', 'São Paulo'),
  CAT('Bloco de concreto 14x19x39', '170021', 'Bloco de concreto estrutural, unidade', 3.2, 'MG', 'Belo Horizonte'),
  CAT('Cimento Portland CP II', '170022', 'Cimento Portland CP II, saco 50kg', 32, 'SP', 'Campinas'),
  CAT('Cal hidratada', '170023', 'Cal hidratada CH1, saco 20kg', 18, 'SP', 'São Paulo'),
  CAT('Areia lavada', '170024', 'Areia média lavada, m³', 95, 'SP', 'Campinas'),
  CAT('Brita nº 1', '170025', 'Brita granítica nº 1, m³', 120, 'MG', 'Belo Horizonte'),
  CAT('Vergalhão CA-50 3/8', '170026', 'Vergalhão de aço CA-50 10mm, barra 12m', 48, 'SP', 'São Paulo'),
  CAT('Tubo PVC 100mm', '170027', 'Tubo de esgoto PVC 100mm, barra 6m', 45, 'PR', 'Curitiba'),
  CAT('Joelho PVC 90° 100mm', '170028', 'Joelho de 90° PVC esgoto 100mm', 12, 'SP', 'São Paulo'),
  CAT('Cano PVC água 25mm', '170029', 'Tubo PVC soldável água 25mm, barra 6m', 22, 'SP', 'Campinas'),
  CAT('Registro de gaveta 3/4', '170030', 'Registro de gaveta 3/4, cromado', 38, 'MG', 'Belo Horizonte'),
  CAT('Fio elétrico 2,5mm', '170031', 'Fio de cobre flexível 2,5mm², rolo 100m', 145, 'SP', 'São Paulo'),
  CAT('Cabos de automação elétrica', '170032', 'Cabo de força de automação elétrica 1,5mm', 3.5, 'SP', 'Campinas'),
  CAT('Interruptor simples', '170033', 'Interruptor simples 10A branco', 9.5, 'PR', 'Curitiba'),
  CAT('Tomada 2P+T', '170034', 'Tomada 2P+T 10A branca', 11, 'SP', 'São Paulo'),
  CAT('Lâmpada LED 9W', '170035', 'Lâmpada LED bulbo 9W branco frio', 7.9, 'MG', 'Belo Horizonte'),
  CAT('Placa de gesso 120x60', '170036', 'Placa de gesso lisa 12,5mm 120x60cm', 26, 'SP', 'Campinas'),
  CAT('Tinta acrílica branca', '170037', 'Tinta acrílica branca 18L', 185, 'SP', 'São Paulo'),
  CAT('Massa corrida', '170038', 'Massa corrida acrílica 18L', 90, 'PR', 'Curitiba'),
  CAT('Selador', '170039', 'Selador acrílico 18L', 120, 'SP', 'Campinas'),
  CAT('Rejunte cinza', '170040', 'Rejunte para cerâmica cinza, saco 5kg', 18, 'MG', 'Belo Horizonte'),
  CAT('Cimento cola ACII', '170041', 'Cimento cola ACII, saco 20kg', 16, 'SP', 'São Paulo'),
  CAT('Manta asfáltica', '170042', 'Manta asfáltica 4mm 10m²', 220, 'PR', 'Curitiba'),
  CAT('Caixa d\'água 1000L', '170043', 'Caixa d\'água polietileno 1000L', 620, 'SP', 'Campinas'),
  CAT('Torneira de pia', '170044', 'Torneira de pia cromada 1/2', 55, 'SP', 'São Paulo'),
  CAT('Sifão flexível', '170045', 'Sifão flexível 1x1/2', 9, 'MG', 'Belo Horizonte'),
  CAT('Descarga de parede', '170046', 'Válvula de descarga de parede 1/2', 32, 'SP', 'Campinas'),
  CAT('Alvenaria de vedação (m²)', '170047', 'Serviço de alvenaria de vedação por m²', 55, 'SP', 'São Paulo'),
  // ---- Material de limpeza / higiene ----
  CAT('Água sanitária', '770101', 'Água sanitária 5L', 12.9, 'SP', 'São Paulo'),
  CAT('Detergente líquido', '770102', 'Detergente neutro 5L', 15.5, 'SP', 'Campinas'),
  CAT('Sabão em pó', '770103', 'Sabão em pó 1kg', 8.5, 'MG', 'Belo Horizonte'),
  CAT('Sabão em barra', '770104', 'Sabão em barra 200g', 2.4, 'SP', 'São Paulo'),
  CAT('Desinfetante', '770105', 'Desinfetante perfume pinho 5L', 14, 'PR', 'Curitiba'),
  CAT('Multiuso', '770106', 'Limpa multiuso 500ml', 4.5, 'SP', 'Campinas'),
  CAT('Esponja dupla face', '770107', 'Esponja de limpeza dupla face, unidade', 1.8, 'SP', 'São Paulo'),
  CAT('Pano de chão', '770108', 'Pano de chão algodão, pacote 2 un', 9, 'MG', 'Belo Horizonte'),
  CAT('Flanela', '770109', 'Flanela microfibra 40x40cm', 6, 'SP', 'São Paulo'),
  CAT('Rodo 35cm', '770110', 'Rodo de madeira 35cm com borracha', 13, 'PR', 'Curitiba'),
  CAT('Vassoura', '770111', 'Vassoura de piaçava 24cm', 9.5, 'SP', 'Campinas'),
  CAT('Balde 12L', '770112', 'Balde plástico 12L', 8.5, 'SP', 'São Paulo'),
  CAT('Esponja de aço', '770113', 'Esponja de aço, pacote com 8 un', 4.9, 'MG', 'Belo Horizonte'),
  CAT('Palha de aço', '770114', 'Palha de aço nº 0, pacote com 6 un', 6.5, 'SP', 'São Paulo'),
  CAT('Papel toalha', '770115', 'Papel toalha interfolha 2.000 folhas', 22, 'SP', 'Campinas'),
  CAT('Papel higiênico', '770116', 'Papel higiênico folha dupla 16 rolos', 19.9, 'PR', 'Curitiba'),
  CAT('Sabonete líquido', '770117', 'Sabonete líquido antisséptico 5L', 26, 'SP', 'São Paulo'),
  CAT('Álcool 70%', '770118', 'Álcool etílico 70% 1L', 6.5, 'MG', 'Belo Horizonte'),
  CAT('Álcool gel', '770119', 'Álcool em gel 70% 500ml', 8.9, 'SP', 'São Paulo'),
  CAT('Lava roupas', '770120', 'Lava roupas líquido concentrado 5L', 24, 'SP', 'Campinas'),
  CAT('Amaciante', '770121', 'Amaciante de roupas 5L', 18, 'PR', 'Curitiba'),
  CAT('Inseticida', '770122', 'Inseticida spray aerossol 400ml', 12, 'SP', 'São Paulo'),
  CAT('Soda cáustica', '770123', 'Soda cáustica em escamas, pacote 1kg', 8, 'SP', 'Campinas'),
  CAT('Dedetizante profissional', '770124', 'Serviço de dedetização por m²', 8, 'SP', 'São Paulo'),
  // ---- Alimentação / copa / cozinha ----
  CAT('Arroz tipo 1', '110010', 'Arroz agulhinha tipo 1, saco 5kg', 28, 'SP', 'São Paulo'),
  CAT('Feijão carioca', '110011', 'Feijão carioca, saco 5kg', 36, 'SP', 'Campinas'),
  CAT('Óleo de soja', '110012', 'Óleo de soja refinado 900ml', 7.5, 'MG', 'Belo Horizonte'),
  CAT('Açúcar cristal', '110013', 'Açúcar cristal, saco 5kg', 22, 'SP', 'São Paulo'),
  CAT('Café em pó', '110014', 'Café em pó tradicional 500g', 16, 'PR', 'Curitiba'),
  CAT('Sal refinado', '110015', 'Sal refinado iodado 1kg', 2.5, 'SP', 'Campinas'),
  CAT('Farinha de trigo', '110016', 'Farinha de trigo 1kg', 4.2, 'SP', 'São Paulo'),
  CAT('Macarrão espaguete', '110017', 'Macarrão espaguete 500g', 4.5, 'MG', 'Belo Horizonte'),
  CAT('Leite integral', '110018', 'Leite integral UHT 1L', 4.8, 'SP', 'Campinas'),
  CAT('Carne bovina', '110019', 'Carne bovina patinho/coxa dura, kg', 34, 'SP', 'São Paulo'),
  CAT('Frango congelado', '110020', 'Frango inteiro congelado, kg', 14, 'PR', 'Curitiba'),
  CAT('Ovos', '110021', 'Ovos brancos, dúzia', 9, 'SP', 'Campinas'),
  CAT('Pão francês', '110022', 'Pão francês, kg', 14, 'SP', 'São Paulo'),
  CAT('Tomate', '110023', 'Tomate comum, kg', 5.5, 'SP', 'São Paulo'),
  CAT('Cebola', '110024', 'Cebola nacional, kg', 4.5, 'MG', 'Belo Horizonte'),
  CAT('Batata', '110025', 'Batata inglesa, kg', 6, 'SP', 'Campinas'),
  CAT('Alface', '110026', 'Alface crespa, unidade', 2.8, 'SP', 'São Paulo'),
  CAT('Banana prata', '110027', 'Banana prata, kg', 6.5, 'SP', 'Campinas'),
  CAT('Maçã', '110028', 'Maçã gala, kg', 9, 'PR', 'Curitiba'),
  CAT('Laranja', '110029', 'Laranja pera, kg', 4, 'SP', 'São Paulo'),
  CAT('Suco de laranja', '110030', 'Suco de laranja integral 1L', 9.5, 'SP', 'São Paulo'),
  CAT('Água mineral', '110031', 'Água mineral sem gás 20L galão', 15, 'SP', 'Campinas'),
  CAT('Refrigerante', '110032', 'Refrigerante lata 350ml', 4.2, 'MG', 'Belo Horizonte'),
  CAT('Molho de tomate', '110033', 'Extrato de tomate 340g', 4.8, 'SP', 'São Paulo'),
  CAT('Margarina', '110034', 'Margarina 500g', 7.5, 'PR', 'Curitiba'),
  CAT('Requeijão', '110035', 'Requeijão cremoso 200g', 7, 'SP', 'Campinas'),
  CAT('Filtro de café', '110036', 'Filtro de papel 103, pacote 30 un', 7.5, 'SP', 'São Paulo'),
  CAT('Copos descartáveis', '110037', 'Copo descartável 200ml, pacote 100 un', 12, 'SP', 'Campinas'),
  CAT('Prato descartável', '110038', 'Prato descartável 15cm, pacote 100 un', 22, 'MG', 'Belo Horizonte'),
  CAT('Guardanapo', '110039', 'Guardanapo de papel 60 un', 3.5, 'SP', 'São Paulo'),
  CAT('Palito de dente', '110040', 'Palito de dente, pacote 100 un', 3, 'SP', 'Campinas'),
  // ---- Escritório / papelaria ----
  CAT('Papel A4', '661300', 'Papel sulfite A4 75g, resma 500 folhas', 26, 'SP', 'São Paulo'),
  CAT('Papel A4 colorido', '661301', 'Papel sulfite A4 75g colorido, resma', 34, 'SP', 'Campinas'),
  CAT('Toner preto', '661302', 'Toner preto compatível impressora laser', 185, 'SP', 'São Paulo'),
  CAT('Cartucho de tinta', '661303', 'Cartucho de tinta preto original', 62, 'MG', 'Belo Horizonte'),
  CAT('Caneta esferográfica', '661304', 'Caneta esferográfica azul, cx 50 un', 75, 'SP', 'São Paulo'),
  CAT('Lápis preto', '661305', 'Lápis preto nº2, cx 144 un', 68, 'SP', 'Campinas'),
  CAT('Borracha', '661306', 'Borracha branca, cx 72 un', 40, 'PR', 'Curitiba'),
  CAT('Apontador', '661307', 'Apontador duplo, cx 12 un', 28, 'SP', 'São Paulo'),
  CAT('Clips', '661308', 'Clips metálico nº2, cx 100 un', 9, 'SP', 'Campinas'),
  CAT('Grampeador', '661309', 'Grampeador metálico nº 26/6', 24, 'MG', 'Belo Horizonte'),
  CAT('Grampo nº 26/6', '661310', 'Caixa com 5000 grampos 26/6', 14, 'SP', 'São Paulo'),
  CAT('Fita adesiva', '661311', 'Fita adesiva transparente 48mm x 40m', 8, 'SP', 'Campinas'),
  CAT('Fita crepe', '661312', 'Fita crepe 48mm x 50m', 12, 'SP', 'São Paulo'),
  CAT('Cola branca', '661313', 'Cola branca escolar 90g', 5.5, 'PR', 'Curitiba'),
  CAT('Cola bastão', '661314', 'Cola bastão 21g, cx 12 un', 38, 'SP', 'Campinas'),
  CAT('Envelope ofício', '661315', 'Envelope ofício A4 114x229, cx 100', 45, 'SP', 'São Paulo'),
  CAT('Pasta suspensa', '661316', 'Pasta suspensa com trilho, cx 50', 65, 'MG', 'Belo Horizonte'),
  CAT('Pasta AZ', '661317', 'Pasta AZ plástica, cx 20', 42, 'SP', 'São Paulo'),
  CAT('Caderno 200 fls', '661318', 'Caderno universitário 200 folhas', 16, 'SP', 'Campinas'),
  CAT('Caneta marca-texto', '661319', 'Marca-texto amarelo, cx 12', 32, 'PR', 'Curitiba'),
  CAT('Corretivo', '661320', 'Corretivo líquido 18ml', 4.5, 'SP', 'São Paulo'),
  CAT('Perfurador', '661321', 'Perfurador metálico para 30 folhas', 28, 'SP', 'Campinas'),
  CAT('Pastas catálogo', '661322', 'Pasta catálogo com 40 plásticos', 12, 'SP', 'São Paulo'),
  CAT('Etiqueta adesiva', '661323', 'Etiqueta adesiva 105x35mm, fl 100', 14, 'MG', 'Belo Horizonte'),
  CAT('Bloco de recados', '661324', 'Bloco de recados 92x92mm 100fl', 9, 'SP', 'São Paulo'),
  CAT('Folha ofício', '661325', 'Papel ofício A4 90g, resma', 29, 'SP', 'Campinas'),
  // ---- Informática / eletrônicos ----
  CAT('Notebook', '231226', 'Notebook 14 pol, i5, 16GB RAM, SSD 512GB', 4100, 'SP', 'São Paulo'),
  CAT('Computador Desktop', '313240', 'Desktop para escritório, 16GB, SSD 256GB', 3600, 'SP', 'São Paulo'),
  CAT('Monitor 24 pol', '231227', 'Monitor LED 24 pol Full HD', 950, 'SP', 'Campinas'),
  CAT('Teclado USB', '231228', 'Teclado ABNT2 USB com fio', 65, 'SP', 'São Paulo'),
  CAT('Mouse óptico', '231229', 'Mouse óptico USB, unidade', 28, 'MG', 'Belo Horizonte'),
  CAT('Impressora Multifuncional', '232026', 'Impressora laser multifuncional A4', 2800, 'SP', 'São Paulo'),
  CAT('Impressora jato de tinta', '232027', 'Impressora jato de tinta multifuncional', 420, 'SP', 'Campinas'),
  CAT('Scanner de mesa', '232028', 'Scanner de mesa A4', 480, 'PR', 'Curitiba'),
  CAT('Roteador WiFi', '231230', 'Roteador WiFi dual band AC1200', 180, 'SP', 'São Paulo'),
  CAT('Switch 24 portas', '231231', 'Switch gerenciável 24 portas 10/100/1000', 750, 'SP', 'São Paulo'),
  CAT('Cabo de rede Cat6', '231232', 'Cabo de rede Cat6, rolo 305m', 420, 'SP', 'Campinas'),
  CAT('Conector RJ45', '231233', 'Conector RJ45, caixa 100 un', 55, 'SP', 'São Paulo'),
  CAT('Estabilizador', '231234', 'Estabilizador 1200VA', 220, 'MG', 'Belo Horizonte'),
  CAT('Nobreak', '231235', 'Nobreak 1400VA', 950, 'SP', 'São Paulo'),
  CAT('Pen drive 64GB', '231236', 'Pen drive 64GB USB 3.0', 45, 'SP', 'Campinas'),
  CAT('HD externo 1TB', '231237', 'HD externo 1TB USB 3.0', 320, 'PR', 'Curitiba'),
  CAT('Webcam HD', '231238', 'Webcam USB Full HD 1080p', 130, 'SP', 'São Paulo'),
  CAT('Fone de ouvido', '231239', 'Fone de ouvido com microfone USB', 85, 'SP', 'Campinas'),
  CAT('Caixa de som', '231240', 'Caixa de som USB para sala de reunião', 150, 'SP', 'São Paulo'),
  CAT('No-break de rack', '231241', 'No-break para rack 3000VA', 3200, 'SP', 'São Paulo'),
  CAT('Servidor 1U', '231242', 'Servidor rack 1U Xeon 16GB', 12500, 'SP', 'São Paulo'),
  CAT('Projetor multimídia', '231243', 'Projetor multimídia 4000 lumens', 2400, 'MG', 'Belo Horizonte'),
  CAT('Lousa branca 2x1,2m', '661326', 'Lousa branca magnética 200x120cm', 320, 'SP', 'São Paulo'),
  CAT('Tela de projeção', '231244', 'Tela de projeção 200x200cm', 420, 'SP', 'Campinas'),
  CAT('Extensão 5m', '231245', 'Extensão elétrica 5 tomadas 1,5m', 38, 'SP', 'São Paulo'),
  // ---- Veículos / peças / EPI ----
  CAT('Pneu 225/60 R17', '153650', 'Pneu 225/60 R17 p/ veículos de passeio', 620, 'SP', 'São Paulo'),
  CAT('Pneu 205/55 R16', '153651', 'Pneu 205/55 R16', 480, 'SP', 'Campinas'),
  CAT('Pneu 175/70 R14', '153652', 'Pneu 175/70 R14', 320, 'MG', 'Belo Horizonte'),
  CAT('Bateria 60Ah', '153653', 'Bateria automotiva 60Ah', 520, 'SP', 'São Paulo'),
  CAT('Óleo motor 5W30', '153654', 'Óleo motor sintético 5W30, galão 4L', 120, 'PR', 'Curitiba'),
  CAT('Filtro de óleo', '153655', 'Filtro de óleo universal', 22, 'SP', 'Campinas'),
  CAT('Filtro de ar', '153656', 'Filtro de ar motor, unidade', 60, 'SP', 'São Paulo'),
  CAT('Pastilha de freio', '153657', 'Jogo de pastilhas de freio dianteiras', 190, 'SP', 'Campinas'),
  CAT('Vela de ignição', '153658', 'Vela de ignição, cx 4 un', 120, 'MG', 'Belo Horizonte'),
  CAT('Capa de chuva', '153659', 'Capa de chuva PVC, unidade', 18, 'SP', 'São Paulo'),
  CAT('Luva de segurança', '153660', 'Luva de segurança nitrílica, par', 12, 'SP', 'Campinas'),
  CAT('Luva de látex', '153661', 'Luva de procedimento látex, cx 100', 25, 'SP', 'São Paulo'),
  CAT('Bota de segurança', '153662', 'Bota de segurança com bico de aço', 95, 'MG', 'Belo Horizonte'),
  CAT('Capacete de segurança', '153663', 'Capacete de segurança jugular', 28, 'SP', 'São Paulo'),
  CAT('Óculos de proteção', '153664', 'Óculos de proteção incolor', 9, 'PR', 'Curitiba'),
  CAT('Máscara descartável', '153665', 'Máscara cirúrgica tripla, cx 50', 15, 'SP', 'São Paulo'),
  CAT('Máscara N95', '153666', 'Máscara de proteção N95, cx 10', 45, 'SP', 'Campinas'),
  CAT('Protetor auricular', '153667', 'Protetor auricular tipo plug, par', 6, 'SP', 'São Paulo'),
  CAT('Touca descartável', '153669', 'Touca descartável, cx 100', 12, 'SP', 'Campinas'),
  CAT('Colete refletivo', '153670', 'Colete refletivo segurança', 22, 'MG', 'Belo Horizonte'),
  // ---- Saúde / medicamentos ----
  CAT('Dipirona sódica 500mg', '200010', 'Dipirona sódica 500mg, cx 20 comprimidos', 8.9, 'SP', 'São Paulo'),
  CAT('Paracetamol 750mg', '200011', 'Paracetamol 750mg, cx 20 comprimidos', 9.5, 'SP', 'Campinas'),
  CAT('Ibuprofeno 600mg', '200012', 'Ibuprofeno 600mg, cx 20 comprimidos', 14, 'MG', 'Belo Horizonte'),
  CAT('Omeprazol 20mg', '200013', 'Omeprazol 20mg, cx 14 cápsulas', 12, 'SP', 'São Paulo'),
  CAT('Amoxicilina 500mg', '200014', 'Amoxicilina 500mg, cx 21 cápsulas', 18, 'PR', 'Curitiba'),
  CAT('Soro fisiológico 0,9%', '200015', 'Soro fisiológico 0,9% 500ml', 4.5, 'SP', 'São Paulo'),
  CAT('Seringa 5ml', '200016', 'Seringa descartável 5ml, unidade', 1.2, 'SP', 'Campinas'),
  CAT('Agulha 25x7', '200017', 'Agulha hipodérmica 25x7, cx 100', 35, 'SP', 'São Paulo'),
  CAT('Gaze estéril', '200018', 'Gaze estéril 7,5x7,5, pacote 500', 28, 'MG', 'Belo Horizonte'),
  CAT('Atadura 10cm', '200019', 'Atadura de crepom 10cm, unidade', 3.5, 'SP', 'São Paulo'),
  CAT('Esparadrapo', '200020', 'Esparadrapo antialérgico 10cm', 8, 'SP', 'Campinas'),
  CAT('Termômetro digital', '200021', 'Termômetro digital clínico', 22, 'PR', 'Curitiba'),
  CAT('Esfigmomanômetro', '200022', 'Esfigmomanômetro adulto digital', 95, 'SP', 'São Paulo'),
  CAT('Estetoscópio', '200023', 'Estetoscópio adulto', 85, 'SP', 'Campinas'),
  CAT('Luvas de procedimento', '200024', 'Luva de procedimento tam M, cx 100', 25, 'SP', 'São Paulo'),
  CAT('Máscara cirúrgica', '200025', 'Máscara cirúrgica tripla, cx 50', 15, 'SP', 'São Paulo'),
  CAT('Oxigênio Medicinal', '100002', 'Oxigênio medicinal 1m³ comprimido', 180, 'SP', 'São Paulo'),
  CAT('Insulina NPH', '200026', 'Insulina NPH 100UI, frasco 10ml', 62, 'SP', 'Campinas'),
  CAT('Vitamina B12', '200027', 'Vitamina B12 injetável, ampola', 9, 'MG', 'Belo Horizonte'),
  CAT('Cloridrato de soro', '200028', 'Solução comum 1:1 500ml', 5.5, 'SP', 'São Paulo'),
  CAT('Bandagem elástica', '200029', 'Bandagem elástica 15cm', 6, 'SP', 'Campinas'),
  // ---- Equipamentos / utensílios ----
  CAT('Bebedouro 20L', '221015', 'Bebedouro elétrico 20L', 420, 'SP', 'São Paulo'),
  CAT('Geladeira 260L', '221016', 'Refrigerador 260L frost free', 2200, 'SP', 'Campinas'),
  CAT('Fogão 4 bocas', '221017', 'Fogão 4 bocas com forno', 950, 'SP', 'São Paulo'),
  CAT('Micro-ondas 20L', '221018', 'Micro-ondas 20L', 380, 'MG', 'Belo Horizonte'),
  CAT('Ventilador de pedestal', '221019', 'Ventilador de pedestal 40cm', 130, 'SP', 'São Paulo'),
  CAT('Ar-condicionado 12000BTU', '221020', 'Ar-condicionado split 12000 BTU', 2100, 'PR', 'Curitiba'),
  CAT('Aspirador de pó', '221021', 'Aspirador de pó 1400W', 190, 'SP', 'São Paulo'),
  CAT('Carrinho de limpeza', '221022', 'Carrinho de limpeza organizador', 160, 'SP', 'Campinas'),
  CAT('Cesto de lixo', '221023', 'Cesto de lixo pedal 30L', 45, 'SP', 'São Paulo'),
  CAT('Saboneteira', '221024', 'Saboneteira de parede', 15, 'SP', 'São Paulo'),
  CAT('Porta papel toalha', '221025', 'Dispenser de papel toalha', 28, 'MG', 'Belo Horizonte'),
  CAT('Dispenser de sabonete', '221026', 'Dispenser de sabonete líquido', 35, 'SP', 'Campinas'),
  CAT('Lixeira coleta seletiva', '221027', 'Lixeira coleta seletiva 50L', 80, 'SP', 'São Paulo'),
  CAT('Armário de aço', '221028', 'Armário de aço 2 portas', 890, 'PR', 'Curitiba'),
]

function seededNum(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function buildItems(): ItemRecord[] {
  const items: ItemRecord[] = []
  let seq = 1
  ITEM_CATALOG.forEach((cat, ci) => {
    const org = ORGAOS.find((o) => o.uf === cat.uf && o.municipio === cat.municipio) || ORGAOS[0]
    const variance = 0.9 + seededNum(ci * 3 + 1) * 0.2
    const valor = Math.round(cat.base * variance * 100) / 100
    const day = new Date(2026, 6 + (ci % 3), 5 + (ci % 20))
    items.push({
      id: `P${String(ci + 1).padStart(3, '0')}`,
      nome: cat.nome,
      codigo: cat.codigo,
      descricao: cat.descricao,
      orgao: org.nome,
      orgaoCnpj: org.cnpj,
      uf: org.uf,
      municipio: org.municipio,
      valor,
      data: day.toISOString(),
      modalidade: cat.modalidade,
      fornecedor: FORNECEDORES[ci % FORNECEDORES.length],
      fornecedorCnpj: `${String(10000000 + ci * 37 + (ci % 9)).replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}`,
    })
    seq++
  })
  return items
}

export const ITEMS: ItemRecord[] = buildItems()

export function searchItems(
  query: string,
  filters: { uf?: string; modalidade?: string; data?: number; valorMin?: number; valorMax?: number } = {}
): ItemRecord[] {
  const q = normalizar(query)
  let out = ITEMS
  if (q) {
    out = out.filter(
      (i) =>
        normalizar(i.nome).includes(q) ||
        normalizar(i.descricao).includes(q) ||
        i.codigo.includes(q) ||
        normalizar(i.orgao).includes(q) ||
        normalizar(i.fornecedor).includes(q)
    )
  }
  if (filters.uf) out = out.filter((i) => i.uf === filters.uf)
  if (filters.modalidade) out = out.filter((i) => compactar(i.modalidade).includes(compactar(filters.modalidade!)))
  if (filters.data) {
    const cutoff = Date.now() - filters.data * 86400000
    out = out.filter((i) => new Date(i.data).getTime() >= cutoff)
  }
  if (filters.valorMin != null) out = out.filter((i) => i.valor >= filters.valorMin!)
  if (filters.valorMax != null) out = out.filter((i) => i.valor <= filters.valorMax!)
  return out
}

export interface PriceStats {
  nome: string
  codigo: string
  registros: number
  referencia: number
  media: number
  mediana: number
  menor: number
  maior: number
  mensal: Array<{ mes: string; valor: number }>
  vencedores: Array<{ fornecedor: string; cnpj: string; valor: number; desconto: number; uf: string }>
  faixaMinima: number
  faixaMaxima: number
  historico: number[]
}

export function priceStats(query: string, seed: number = 0): PriceStats | null {
  const q = normalizar(query)
  const matches = ITEMS.filter((i) => (q ? normalizar(i.nome).includes(q) || i.codigo.includes(q) : true))
  if (matches.length === 0) return null
  const vals = matches.map((m) => m.valor).sort((a, b) => a - b)
  const mediana = vals.length % 2 ? vals[Math.floor(vals.length / 2)] : (vals[vals.length / 2 - 1] + vals[vals.length / 2]) / 2
  const media = vals.reduce((a, b) => a + b, 0) / vals.length
  const menor = vals[0]
  const maior = vals[vals.length - 1]
  const referencia = mediana
  const faixaMinima = menor
  const faixaMaxima = maior

  const meses: string[] = ['Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set']
  const mensal = meses.map((m, idx) => {
    const jitter = seed > 0 ? seededNum(seed * 13 + idx) * 0.04 : 0
    const base = media * (0.9 + Math.sin(idx + 1) * 0.07 + seededNum(idx + 3) * 0.05 + jitter)
    return { mes: m, valor: Math.max(10, Math.round(base * 100) / 100) }
  })
  const historico = mensal.map((m) => m.valor)

  const vencedores = matches.slice(0, 6).map((m, idx) => ({
    fornecedor: m.fornecedor,
    cnpj: m.fornecedorCnpj || `12.345.678/0001-${idx}`,
    valor: m.valor,
    desconto: Math.round((1 - m.valor / media) * 1000) / 10,
    uf: m.uf,
  }))

  return {
    nome: matches[0].nome,
    codigo: matches[0].codigo,
    registros: matches.length,
    referencia: Math.round(referencia * 100) / 100,
    media: Math.round(media * 100) / 100,
    mediana: Math.round(mediana * 100) / 100,
    menor: Math.round(menor * 100) / 100,
    maior: Math.round(maior * 100) / 100,
    mensal,
    vencedores,
    faixaMinima,
    faixaMaxima,
    historico,
  }
}

// ----------------------------------------------------------------------------
// Concorrentes
// ----------------------------------------------------------------------------

export interface Concorrente {
  id: string
  nome: string
  cnpj: string
  uf: string
  cnae: string
  segmento: string
  licitacoesVencidas: number
  totalValor: number
  principaisOrgaos: string[]
  principaisItens: string[]
  taxaLancamento: number
  sucesso: number
  historicoMensal: number[]
  modalidades: Record<string, number>
}

export const CONCORRENTES: Concorrente[] = [
  {
    id: 'c1', nome: 'TechSol Comércio Ltda', cnpj: '12.345.678/0001-90', uf: 'SP', cnae: '4744-0/01', segmento: 'Equipamentos de TI',
    licitacoesVencidas: 47, totalValor: 3250000, principaisOrgaos: ['Prefeitura de São Paulo', 'Secretaria da Educação', 'UFRJ'],
    principaisItens: ['Notebook', 'Computador Desktop', 'Impressora'], taxaLancamento: 68, sucesso: 41,
    historicoMensal: [3, 5, 4, 6, 5, 7, 4, 6, 5, 6, 5, 7],
    modalidades: { 'Pregão Eletrônico': 34, 'Pregão Presencial': 6, 'Dispensa': 7 },
  },
  {
    id: 'c2', nome: 'InfoMax Distribuidora', cnpj: '98.765.432/0001-10', uf: 'MG', cnae: '4751-2/00', segmento: 'Suprimentos',
    licitacoesVencidas: 32, totalValor: 1980000, principaisOrgaos: ['Prefeitura de Belo Horizonte', 'Ministério da Saúde'],
    principaisItens: ['Papel A4', 'Material de Limpeza', 'Cadeira'], taxaLancamento: 55, sucesso: 38,
    historicoMensal: [2, 3, 3, 4, 3, 4, 3, 4, 3, 4, 4, 5],
    modalidades: { 'Pregão Eletrônico': 24, 'Concorrência': 4, 'Dispensa': 4 },
  },
  {
    id: 'c3', nome: 'Construtora Andrade Lima', cnpj: '55.555.555/0001-55', uf: 'RJ', cnae: '4120-4/00', segmento: 'Construção civil',
    licitacoesVencidas: 18, totalValor: 8200000, principaisOrgaos: ['Governo do RJ', 'Exército Brasileiro', 'Prefeitura de Campinas'],
    principaisItens: ['Cimento Portland', 'Mesa de Escritório', 'Reforma de unidades'], taxaLancamento: 80, sucesso: 29,
    historicoMensal: [1, 2, 1, 2, 1, 2, 2, 1, 2, 1, 2, 2],
    modalidades: { 'Concorrência': 14, 'Tomada de Preços': 4 },
  },
  {
    id: 'c4', nome: 'MedFarma Distribuidora', cnpj: '44.444.444/0001-44', uf: 'PR', cnae: '4646-0/01', segmento: 'Farmacêutico',
    licitacoesVencidas: 61, totalValor: 5100000, principaisOrgaos: ['Ministério da Saúde', 'Secretaria da Educação do PR'],
    principaisItens: ['Dipirona', 'Oxigênio Medicinal', 'Medicamentos diversos'], taxaLancamento: 72, sucesso: 52,
    historicoMensal: [5, 4, 6, 5, 7, 6, 5, 6, 7, 6, 6, 5],
    modalidades: { 'Pregão Eletrônico': 54, 'Dispensa': 7 },
  },
  {
    id: 'c5', nome: 'Servilimpo Serviços', cnpj: '33.333.333/0001-33', uf: 'RS', cnae: '8121-4/00', segmento: 'Serviços de limpeza',
    licitacoesVencidas: 12, totalValor: 2300000, principaisOrgaos: ['Governo do RS', 'Prefeitura de Curitiba'],
    principaisItens: ['Serviços contínuos de limpeza', 'Material de Limpeza'], taxaLancamento: 33, sucesso: 36,
    historicoMensal: [1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 1],
    modalidades: { 'Concorrência': 8, 'Pregão Eletrônico': 4 },
  },
]

// ----------------------------------------------------------------------------
// Score
// ----------------------------------------------------------------------------

export interface ScoredLicitation {
  id: string
  titulo: string
  orgao: string
  uf: string
  valor: number
  modalidade: string
  dataEncerramento: string
  score: number
  criterios: { compatibilidade: number; concorrencia: number; prazo: number; valor: number; orgao: number; modalidade: number }
}

export const LICITACOES_SCORE: ScoredLicitation[] = [
  { id: 's1', titulo: 'Aquisição de Notebooks para rede de ensino', orgao: 'Secretaria da Educação do PR', uf: 'PR', valor: 480000, modalidade: 'Pregão Eletrônico', dataEncerramento: '2026-09-20', score: 88, criterios: { compatibilidade: 28, concorrencia: 24, prazo: 13, valor: 13, orgao: 6, modalidade: 4 } },
  { id: 's2', titulo: 'Fornecimento de material de limpeza hospitalar', orgao: 'Ministério da Saúde', uf: 'DF', valor: 920000, modalidade: 'Pregão Eletrônico', dataEncerramento: '2026-09-25', score: 74, criterios: { compatibilidade: 20, concorrencia: 22, prazo: 12, valor: 10, orgao: 6, modalidade: 4 } },
  { id: 's3', titulo: 'Obra de reforma de unidade de saúde', orgao: 'Prefeitura de Campinas', uf: 'SP', valor: 3200000, modalidade: 'Concorrência', dataEncerramento: '2026-10-15', score: 41, criterios: { compatibilidade: 8, concorrencia: 14, prazo: 8, valor: 6, orgao: 3, modalidade: 2 } },
  { id: 's4', titulo: 'Aquisição de pneus para frota municipal', orgao: 'Prefeitura de Curitiba', uf: 'PR', valor: 210000, modalidade: 'Pregão Eletrônico', dataEncerramento: '2026-09-12', score: 66, criterios: { compatibilidade: 22, concorrencia: 16, prazo: 11, valor: 9, orgao: 5, modalidade: 3 } },
  { id: 's5', titulo: 'Contratação de serviços continuados de limpeza', orgao: 'Governo do Rio Grande do Sul', uf: 'RS', valor: 5400000, modalidade: 'Concorrência', dataEncerramento: '2026-11-08', score: 52, criterios: { compatibilidade: 12, concorrencia: 12, prazo: 9, valor: 8, orgao: 7, modalidade: 4 } },
]

// ----------------------------------------------------------------------------
// Modalidades
// ----------------------------------------------------------------------------

export interface ModalidadeInfo {
  nome: string
  legado: string
  novaLei: string
  quando: string
  prazos: string[]
  vantagens: string[]
  desvantagens: string[]
  exemplo: string
}

export const MODALIDADES_INFO: ModalidadeInfo[] = [
  { nome: 'Pregão Eletrônico', legado: 'Sem limite definido (Lei 10.520/2002)', novaLei: 'Qualquer valor para bens/serviços comuns', quando: 'Aquisição de bens e serviços comuns', prazos: ['Propostas: 8 dias úteis', 'Lances: sessão pública', 'Licitante: até 5% do valor'], vantagens: ['Mais rápido', 'Maior competitividade', 'Menor preço'], desvantagens: ['Menos adequado a serviços complexos', 'Foco em preço'], exemplo: 'Compra de notebooks para escolas' },
  { nome: 'Pregão Presencial', legado: 'Lei 10.520/2002', novaLei: 'Permitido em caráter excepcional', quando: 'Quando o eletrônico for inviável', prazos: ['Propostas: 8 dias úteis'], vantagens: ['Contato direto'], desvantagens: ['Menos transparente', 'Menor alcance'], exemplo: 'Compras emergenciais de pequeno porte' },
  { nome: 'Concorrência', legado: 'Acima de R$ 1,5mi (obras) / R$ 650mil (demais)', novaLei: 'Bens/serviços especiais e obras/serviços de engenharia', quando: 'Obras e serviços especiais', prazos: ['Propostas: 35 dias corridos (obras)'], vantagens: ['Permite análise técnica', 'Proposta por melhor técnica'], desvantagens: ['Processo longo', 'Custo alto'], exemplo: 'Construção de escola municipal' },
  { nome: 'Tomada de Preços', legado: 'Até R$ 1,5mi (obras) / R$ 650mil (demais)', novaLei: 'Estágios', quando: 'Licitação de obras e serviços por cadastrados', prazos: ['Propostas: 15 dias corridos'], vantagens: ['Agilidade', 'Cadastro prévio'], desvantagens: ['Público menor'], exemplo: 'Obras de manutenção' },
  { nome: 'Convite', legado: 'Até R$ 150mil (obras) / R$ 80mil (demais)', novaLei: 'Estágios', quando: 'Aquisições de pequeno valor', prazos: ['Propostas: 5 dias úteis'], vantagens: ['Muito rápido'], desvantagens: ['Baixa competitividade'], exemplo: 'Reparos emergenciais' },
  { nome: 'Concurso', legado: 'Lei 8.666', novaLei: 'Escolha de melhor técnica', quando: 'Seleção de trabalho técnico/científico', prazos: ['Proposta técnica'], vantagens: ['Qualidade técnica'], desvantagens: ['Sem foco em preço'], exemplo: 'Concurso de arquitetura' },
  { nome: 'Leilão', legado: 'Lei 8.666', novaLei: 'Venda de bens', quando: 'Venda de bens móveis/imóveis', prazos: ['Edital + lances'], vantagens: ['Menor preço de venda'], desvantagens: ['Específico'], exemplo: 'Leilão de veículos da frota' },
  { nome: 'Diálogo Competitivo', legado: '-', novaLei: 'Inovação (art. 32)', quando: 'Objetos inovadores/tecnológicos de alto valor', prazos: ['Fases com diálogo com licitantes'], vantagens: ['Solução sob medida', 'Inovação'], desvantagens: ['Longo', 'Complexo'], exemplo: 'Plataforma digital de serviços públicos' },
]

// ----------------------------------------------------------------------------
// Matriz de Riscos (Lei 14.133/2021)
// ----------------------------------------------------------------------------

export interface RiscoItem {
  id: string
  categoria: string
  exemplo: string
  probabilidade: 'Baixo' | 'Médio' | 'Alto'
  impacto: 'Baixo' | 'Médio' | 'Alto'
  mitigacao: string
}

export const MATRIZ_PADRAO: RiscoItem[] = [
  { id: 'r1', categoria: 'Técnicos', exemplo: 'Falha na execução, não conformidade', probabilidade: 'Médio', impacto: 'Alto', mitigacao: 'Plano de qualidade e testes' },
  { id: 'r2', categoria: 'Econômicos', exemplo: 'Variação de preços, custos extras', probabilidade: 'Médio', impacto: 'Médio', mitigacao: 'Cláusula de reajuste contratual' },
  { id: 'r3', categoria: 'Ambientais', exemplo: 'Licenças, impactos ambientais', probabilidade: 'Baixo', impacto: 'Alto', mitigacao: 'Estudo prévio de impacto' },
  { id: 'r4', categoria: 'Trabalhistas', exemplo: 'Acidentes, passivos trabalhistas', probabilidade: 'Médio', impacto: 'Alto', mitigacao: 'Treinamento e uso de EPI' },
  { id: 'r5', categoria: 'Regulatórios', exemplo: 'Mudança na legislação', probabilidade: 'Baixo', impacto: 'Médio', mitigacao: 'Assessoria jurídica' },
  { id: 'r6', categoria: 'Fornecimento', exemplo: 'Falta de insumos, fornecedor', probabilidade: 'Médio', impacto: 'Médio', mitigacao: 'Múltiplos fornecedores credenciados' },
  { id: 'r7', categoria: 'Financeiros', exemplo: 'Inadimplência, fluxo de caixa', probabilidade: 'Médio', impacto: 'Alto', mitigacao: 'Garantias financeiras' },
  { id: 'r8', categoria: 'Cronograma', exemplo: 'Atrasos, paralisações', probabilidade: 'Alto', impacto: 'Médio', mitigacao: 'Cronograma realista e folgas' },
]

export const PROB_ORDER = { Baixo: 1, Médio: 2, Alto: 3 } as const
export const IMP_ORDER = { Baixo: 1, Médio: 2, Alto: 3 } as const

export function nivelRisco(p: RiscoItem['probabilidade'], i: RiscoItem['impacto']): 'Baixo' | 'Médio' | 'Alto' {
  const v = PROB_ORDER[p] * IMP_ORDER[i]
  if (v <= 2) return 'Baixo'
  if (v <= 4) return 'Médio'
  return 'Alto'
}
