# Inventário DEPOIS — Painel PNCP

> Estado **após** as etapas de atualização. Compara com `docs/INVENTARIO_ANTES.md`.
> Branch: `feat/atualizacao-profissional`. Produção: https://www.painelpncp.com.br.

## 1. Resumo das etapas realizadas
1. **Auditoria** (`docs/AUDITORIA.md`): corrigida `/licitacoes` vazia, `/credenciamento-sicx` sem login e botão sem ação no radar; tooltips.
2. **Navegação** por jornada (ENCONTRAR/ANALISAR/PRECIFICAR/MONTAR PROCESSO/ACOMPANHAR/CONCORRENTES/APRENDER), mantendo todas as rotas; dashboard com prazos, alertas novos, atalhos e estados.
3. **SICX**: conteúdo editável (`src/content/sicx.ts`), página `/sicx`, blocos na home e no cadastro, item no menu e filtro dedicado nos editais.
4. **Ajuda**: 10 guias práticos (`src/content/guias.ts`), `/ajuda` (público) com busca e `/ajuda/[slug]`.
5. **SEO/Home/Cadastro**: proposta de valor, contadores reais, seção de funções com prévias, sitemap.xml, robots.txt, JSON-LD, canonical, rodapé com LGPD/contato/fonte PNCP, cadastro com onboarding em 3 passos + campos de perfil + e-mail de boas-vindas.

## 2. Comparativo ANTES × DEPOIS

| Item | ANTES | DEPOIS | Perdido? |
|---|---|---|---|
| Páginas (`page.tsx`) | 48 | **49** (+`/ajuda/[slug]`) | Não (nada removido) |
| Endpoints (`route.ts`) | 41 | **41** | Não |
| Componentes | 45 | **46** (`site-shell`) + home/sicx | Não |
| Tabelas Supabase | 18 | **18** | Não (nenhuma removida) |
| Colunas | — | aditivas apenas | Não |
| Workflows (crons) | 5 | **5** | Não |
| Guias de ajuda | 0 | **10** | — (novo) |
| Rotas movidas (301) | — | 0 | `/ajuda` mudou de grupo de rota, **URL igual** → sem 301 |

### 2.1 Rotas — confirmação
- Todas as rotas do ANTES continuam existindo (mesma URL).
- **Única mudança de organização**: `/ajuda` e `/ajuda/[slug]` passaram da área logada `(dashboard)` para o shell público `(marketing)` — a **URL não mudou**, então **não há redirect 301**.
- Adicionadas: `/ajuda/[slug]` (10 guias), `/sitemap.xml`, `/robots.txt`.

### 2.2 Tabelas/colunas — confirmação
As 18 tabelas permanecem: `alerts`, `alert_channels`, `alert_schedules`, `alert_deliveries`, `analytics_events`, `analises`, `sinapi_cabecalhos`, `sinapi_itens`, `processos_instrucao`, `processo_itens`, `processo_precos`, `processo_riscos`, `processo_documentos`, `processo_historico`, `user_planos`, `asaas_webhook_events`, `edital_extracoes`, `edital_contatos`. Nenhuma removida/renomeada; `edital_contatos` recebeu colunas de outreach (aditivas).

### 2.3 Funcionalidades — confirmação
As 26 funcionalidades mapeadas no ANTES seguem ativas (busca, dashboard, score, radar, alertas, mapa de preços, análise de edital com IA, concorrentes, extração de e-mails, exportações, login/cadastro, admin, conversão, planos/checkout, montagem/SINAPI, documentos, calendário, modalidades, favoritos, relatórios, SICX, SEO, contatos, health). Nenhuma removida do menu; itens apenas **reagrupados/renomeados**.

## 3. SEO e confiança (novo)
- **title/description/OpenGraph** por página; `metadataBase` em `https://www.painelpncp.com.br`.
- **Canonical** (`alternates.canonical`) no layout raiz.
- **sitemap.xml** (`src/app/sitemap.ts`) — 58 URLs (home, institucionais, `/licitacoes/[estado]` (27), `/categorias/[slug]` (12), `/sicx`, `/ajuda/[slug]` (10)).
- **robots.txt** (`src/app/robots.ts`) — permite o público, bloqueia áreas internas e referencia o sitemap.
- **JSON-LD** na home (Organization, WebSite, SoftwareApplication).
- **Rodapé**: Termos, Privacidade (LGPD), Contato, Central de Ajuda e **Fonte dos dados: PNCP**.

## 4. Validação
- `npx tsc --noEmit` → **sem erros** em `src/`.
- `npm run build:vinext` → **Build complete**.
- HTTP em produção: `/ajuda` 200, `/ajuda/sicx` 200, `/sitemap.xml` 200 (58 URLs), `/robots.txt` 200, `/` 200 (com proposta de valor, contadores e funções).
- Observação: **não há suíte de testes automatizados** no projeto; a validação é por typecheck + build + checagens HTTP.

## 5. Pendências
| # | Item | Detalhe |
|---|---|---|
| P1 | **Screenshots reais** | A home usa **prévias ilustrativas**; substituir por imagens reais das telas (o ponto de troca está comentado no código). |
| P2 | **Persistência do perfil no cadastro** | Perfil/segmento/UFs são salvos em `localStorage` (navegador). Persistir no backend (`user_metadata` ou tabela de perfil) numa próxima etapa. |
| P3 | **Core Web Vitals / mobile** | Otimizações básicas aplicadas; recomenda-se medir no Lighthouse/PageSpeed e otimizar imagens/JS pesados (pdfjs/xlsx já são carregados sob demanda). |
| P4 | **SEO contínuo** | Validar sitemap/robots e canonicals no Search Console; considerar canonical/OG individuais por página. |
| P5 | **QA logado e mobile** | Auditoria logado/mobile manual (sem credenciais/browser neste ambiente). |
| P6 | **Tratamento de erro** | Ausência de `error.tsx`/`global-error.tsx` (robustez). |
