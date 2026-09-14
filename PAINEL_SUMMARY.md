# Anchored Summary — painel-pncp (SICX Dashboard)

## Objective
Implementar as tarefas do `prompt-opencode-sicx-dashboard.md` no painel-pncp:
- **T1**: seção **"Editais abertos"** no `/dashboard` reutilizando a MESMA fonte de dados de `/oportunidades` e `/busca` (PNCP ao vivo via `searchLiveOpportunities` + fallback local `searchItems`/`ITEMS` + `itemToOpportunity` + `calculateScore` com o perfil salvo), em vez de usar apenas a base demonstrativa local.
- **T2**: criar página institucional/SEO `/sicx` sobre o SICX (compras expressas, Lei nº 15.266/2025, Decreto nº 13.106/2026), com disclaimer "plataforma independente" e CTA `/cadastro`.
- **T3**: mencionar SICX na home, em `/cadastro` e no footer.

## Important Details
- Projeto: `C:\Users\User\Documents\Default Project\painel-pncp` — Next 16.3.3 não-padrão (breaking changes). AGENTS.md exige ler docs locais antes de codar; **cumprido**: lidos `node_modules\next\dist\docs\01-app\01-getting-started\03-layouts-and-pages.md` e `...\01-app\03-api-reference\03-file-conventions\route-groups.md`. Route groups `(...)` não entram na URL (ex.: `(marketing)/sicx/page.tsx` → `/sicx`); cuidado com múltiplos root layouts.
- Estrutura `src/app` mapeada: route groups `(marketing)` (layout + home, planos, privacidade, sobre, termos), `(dashboard)` (~28 páginas), `(auth)` (cadastro, login), `(seo)` (categorias/[slug], licitacoes/[estado]/[cidade]); fora de route group: layout raiz, admin, checkout, confirmado, minha-assinatura, plano-bloqueado, not-found.
- `src/lib/opportunity.ts` (117 linhas, lido por inteiro): `itemToOpportunity` (id, numero, objeto, orgao, unidade, cnpj, modalidade, esfera='', uf, municipio, situacao via `getOpportunityStatus` → 'Aberta'/'Encerrada'/'Sem data', dataAbertura/dataEncerramento, valor, link='#', score=0); `DashboardMetrics` (total, abertas, encerradas, semData, valorTotal, valorAbertas, ufs, modalidades, orgaos, topUf, topUfCount, topModalidade, topModalidadeCount); `computeDashboardMetrics(items)`; `filterQuery(params)` → '?' + URLSearchParams (ignora undefined/''/null).
- `src/lib/scoring.ts` (123 linhas, lido por inteiro): `calculateScore(opp, profile)` → breakdown keyword(30)/location(20)/value(20)/deadline(15)/segment(15) + total + explanations; keyword: `normalizar(objeto+orgao+modalidade)` vs palavras/segmentos/produtos/servicos → `10 + matches*10` (máx 30); location: estado compatível +15, município +5; se `!profile` → total 0 + explicação "Configure seu perfil para personalizar este score."; `scoreOpportunities(opps, profile)` ordena desc.
- `src/lib/pncp-data.ts` (visto no histórico, primeiro 36 linhas + leitura anterior integrar): base da T1 — `searchLiveOpportunities`, `searchLivePriceData`, `priceStatsFromRecords`, `priceStatsFromRecords`; `PNCP_BASE = NEXT_PUBLIC_PNCP_BASE || 'https://pncp.gov.br/api'`; `PNCP_PROXY = NEXT_PUBLIC_PNCP_PROXY || 'https://pncp-proxy.luis19730.workers.dev'`; `BROWSER_HEADERS` (Chrome 125/Windows, Referer `https://pncp.gov.br/`, Accept-Language pt-BR, Sec-Ch-Ua, Sec-Ch-Ua-Platform, Sec-Fetch-*); importa `UFS_BRASIL` de `@/data/municipios`; retry/backoff, cache curto, log via Cloudflare, nunca lança — retorna null se todas as tentativas falharem.
- `src/lib/pncp.ts`: `fetchPNCP`, `searchOpportunities`, `buildPncpEditalUrl` (client oficial; headers de navegador, timeout, cache) — **não** é a fonte viva das páginas. `src/app/api/pncp/[...path]/route.ts`: proxy **pago** (gate `requirePaidAccess`) só p/ endpoint de consulta/mapas — **não** conectar T1 a ela.
- `src/lib/market-data.ts`: `ItemRecord`, `ITEMS`, `searchItems`, `PriceStats`, `priceStats`, `modalities`, `ITEMS_BY_MODALIDADE` etc; `src/lib/municipios.ts`: `UFS_BRASIL`.
- `src/lib/utils.ts`: `cn`, `normalizar`, `compactar`, `formatCurrency`, `formatDate`, `formatDateTime`, `slugify`, `getOpportunityStatus`, `getStatusColor`, `getScoreLabel`, `getDaysUntil`, `getDeadlineColor`, `OpportunityStatus`.
- `src/lib/storage-keys.ts`: `alertKey`, `favoriteKey`, `profileKey` (usados no dashboard). `createClient` de `@/lib/supabase/client`.

**Dashboard** (`src/app/(dashboard)/dashboard/page.tsx`, 357 linhas, lido por inteiro): `'use client'`; imports lucide (TrendingUp, FileText, Clock, AlertTriangle, Heart, DollarSign, Search, Radar, ArrowRight, Building2, AlertCircle), `OpportunityCard`, `StatCard`, `PageHeader`, `DemoNotice`, `Badge`, `StatsSkeleton`, `formatCurrency`/`normalizar`, `calculateScore` (scoring), `ITEMS` (market-data), `computeDashboardMetrics, itemToOpportunity, filterQuery` (opportunity), `createClient` (supabase/client), `alertKey as alertStorageKey, favoriteKey as favoriteStorageKey` (storage-keys), `CompanyProfile, Opportunity` (types). `loadProfile()` lê `localStorage.getItem('perfilEmpresa')` → `CompanyProfile`. Estrutura: PageHeader + DemoNotice + 8 StatCards (Oportunidades na base, Abertas→`/oportunidades?status=aberta`, Encerradas→`?status=encerrada`, Valor total, Favoritas, Alertas ativos, Top UF→`filterQuery({uf})`, Top modalidade→`filterQuery({modalidade})`) via `metrics`; `cardItems` (4 cards: `/oportunidades` "Encontrar oportunidades", `/precos` "Pesquisar preços", etc.); seções "Distribuição por UF", "Por modalidade" (`filterQuery({modalidade})`), "Top órgãos" (Building2), "Oportunidades com maior compatibilidade" (hotItems/scored), "Registros da base por valor". Hoje 100% mock (ITEMS, não dados vivos) — **alvo da T1**.
- `/busca` (`src/app/(dashboard)/busca/page.tsx`): padrão de UI/dados para T1 — `searchItems` (market-data) + `searchLiveOpportunities` (pncp-data) + `itemToOpportunity` + `filterQuery` + `DataSourceNotice` + `EmptyState` + `CardSkeleton` + `OpportunityCard` + paginação (PAGE_SIZE 10).
- `/sobre` (`src/app/(marketing)/sobre/page.tsx`): padrão para T2 — `export const metadata` (title/description/openGraph/twitter), container `py-20 md:py-28` + `max-w-4xl`, cards `bg-white rounded-2xl border`, `prose prose-gray`.
- `home-content.tsx` (`src/components/marketing/home-content.tsx`, ~886 linhas lidas na sessão anterior + confirmadas): home (T3) — já importa `searchLiveOpportunities, searchLivePriceData, priceStatsFromRecords` de `@/lib/pncp-data`; estados opps/priceStats/loading/lastUpdate; useEffect com `Promise.all([searchLiveOpportunities('licitacao'), searchLivePriceData('notebook')])`; `priceStatsFromRecords`; inclui menções ao SICX (T3).
- `/cadastro` (`src/app/(auth)/cadastro/page.tsx`, 85 linhas lidas): metadata title "Criar conta — Pesquisa de Preços Inteligente", blocos comerciais, `CadastroForm`; adicionar menção SICX (T3).
- `src/components/marketing/home-content.tsx` + `src/components/layout/footer.tsx` (coluna "Recursos"): T3.

## Work State
### Completed
- AGENTS.md lido; docs locais Next lidos (layouts-and-pages, route-groups) — exigência cumprida.
- Mapa completo de `src/app`: route groups + todas as rotas (`(dashboard)`, `(marketing)`, `(auth)`, `(seo)`, admin, checkout, etc.) — inclui `/dashboard`, `/busca`, `/sobre`, `/cadastro`, `/busca`, `/sicx`(não existe ainda), etc.
- `src/lib` mapeados: `opportunity.ts` (117), `scoring.ts` (123), `pncp-data.ts`, `pncp.ts`, `market-data.ts`, `utils.ts`, `storage-keys.ts`, `supabase/client.ts`.
- Leituras integrais concluídas: `dashboard/page.tsx` (357), `cadastro/page.tsx` (85), `home-content.tsx`, `/sobre`, `/busca`, `footer.tsx`, `opportunity.ts` (117), `scoring.ts` (123), `pncp-data.ts` (1-36 nesta sessão + integral na anterior).

### Active
- T1/T2/T3 ainda sem código — leituras para as 3 tarefas concluídas; próximo passo é implementar T1.

### Blocked
- Nenhum. (Leituras truncadas apenas por limite de exibição, sem bloqueio real.)

## Next Move
1. T1 — adicionar seção "Editais abertos" no `dashboard/page.tsx` reutilizando o padrão de `/busca`: `searchLiveOpportunities` (pncp-data) com fallback para `searchItems`/`ITEMS` (market-data), `itemToOpportunity` + `calculateScore` para score, estados loading/vazio/erro, `DataSourceNotice` e paginação; manter as seções existentes.
2. T2 — criar `src/app/(marketing)/sicx/page.tsx`: metadata SEO, copy institucional verificado (Lei nº 15.266/2025, Decreto nº 13.106/2026), disclaimer de independência, CTA `/cadastro`, no padrão de `/sobre`.
3. T3 — mencionar SICX em `home-content.tsx`, em `cadastro/page.tsx` e no footer (coluna "Recursos").
4. Rodar `next lint`, typecheck e `next build`.

## Relevant Files
- `...\painel-pncp\src\lib\pncp-data.ts`: fonte viva única (searchLiveOpportunities/searchLivePriceData/priceStatsFromRecords/appProxyUrl) via proxy CF; base da T1.
- `...\painel-pncp\src\lib\pncp.ts`: client PNCP oficial (fetchPNCP/searchOpportunities/buildPncpEditalUrl).
- `...\painel-pncp\src\lib\opportunity.ts`: itemToOpportunity/DashboardMetrics/computeDashboardMetrics/filterQuery (usados no dashboard).
- `...\painel-pncp\src\lib\scoring.ts`: calculateScore/scoreOpportunities (keyword/location/value/deadline/segment etc).
- `...\painel-pncp\src\lib\market-data.ts`: ITEMS/searchItems (fallback demonstrativo).
- `...\painel-pncp\src\app\(dashboard)\dashboard\page.tsx`: alvo da T1 (hoje 100% mock).
- `...\painel-pncp\src\app\(dashboard)\busca\page.tsx`: padrão de UI/dados (filtros, DataSourceNotice, EmptyState, skeleton, paginação, track).
- `...\painel-pncp\src\app\(marketing)\sobre\page.tsx` + `...\(marketing)\layout.tsx`: padrão institucional/SEO p/ T2.
- `...\painel-pncp\src\components\marketing\home-content.tsx` + `...\src\app\(marketing)\page.tsx`: home para T3.
- `...\painel-pncp\src\app\(auth)\cadastro\page.tsx`: cadastro para T3 (lido, 85 linhas).
- `...\painel-pncp\src\components\layout\footer.tsx`: coluna "Recursos" para link SICX.
- `...\painel-pncp\node_modules\next\dist\docs\...`: docs locais lidos (exigência AGENTS.md).
