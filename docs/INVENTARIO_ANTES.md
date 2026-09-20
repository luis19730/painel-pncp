# Inventário ANTES da atualização — Painel PNCP

> Documento gerado **antes** das alterações de atualização (etapa de preparação).
> **Não altera código de funcionamento.** Serve como referência para não perder
> nenhuma tabela, coluna, rota ou endpoint durante a atualização.
>
> Branch de backup: `backup/pre-atualizacao` · HEAD no momento do inventário: `71ff076`.
> Produção: https://www.painelpncp.com.br (Cloudflare Workers via Vinext).

## 0. Stack e configuração

- **Framework:** Next.js 16.3.3 (App Router, RSC) adaptado para **Cloudflare Workers** via `vinext` / `@vinext/cloudflare`.
- **UI:** React 19.2.8, Tailwind CSS 4, `lucide-react` (ícones), `react-chartjs-2` + `chart.js` (gráficos).
- **BaaS:** Supabase (Postgres + Auth + RLS) via `@supabase/ssr` e `@supabase/supabase-js`.
- **Deploy:** `vinext build` (`npm run build:vinext`) → `vinext-cloudflare deploy` (`npm run deploy:vinext`).
- **Config Worker:** `wrangler.jsonc` (name `painel-pncp`; bindings: `ASSETS`, `IMAGES`, `AI`, KV `VINEXT_KV_CACHE`, KV `EDITAIS_KV`). Sem `triggers`/`crons` nativos.
- **Middleware:** `src/proxy.ts` → `src/lib/supabase/middleware.ts` (`updateSession`).
- **Cache/PDF:** `unpdf` (extração de texto PDF) + Workers AI `toMarkdown` (OCR).

## 1. Rotas / páginas (App Router)

### Route group `(marketing)` — shell público (`site-shell.tsx`)
| Rota | Arquivo |
|---|---|
| `/` | `(marketing)/page.tsx` (+ `components/marketing/home-content.tsx`) |
| `/planos` | `(marketing)/planos/page.tsx` (+ `planos/layout.tsx`) |
| `/sobre` | `(marketing)/sobre/page.tsx` |
| `/sicx` | `(marketing)/sicx/page.tsx` |
| `/termos` | `(marketing)/termos/page.tsx` |
| `/privacidade` | `(marketing)/privacidade/page.tsx` |

### Route group `(dashboard)` — área logada (sidebar + header)
| Rota | Arquivo |
|---|---|
| `/dashboard` | `(dashboard)/dashboard/page.tsx` |
| `/oportunidades` | `(dashboard)/oportunidades/page.tsx` |
| `/oportunidades/[id]` | `(dashboard)/oportunidades/[id]/page.tsx` |
| `/busca` | `(dashboard)/busca/page.tsx` |
| `/meu-radar` | `(dashboard)/meu-radar/page.tsx` |
| `/alertas` | `(dashboard)/alertas/page.tsx` |
| `/precos` | `(dashboard)/precos/page.tsx` |
| `/precos-inteligentes` | `(dashboard)/precos-inteligentes/page.tsx` |
| `/concorrentes` | `(dashboard)/concorrentes/page.tsx` |
| `/analise-edital` | `(dashboard)/analise-edital/page.tsx` |
| `/ia-licitacoes` | `(dashboard)/ia-licitacoes/page.tsx` |
| `/score` | `(dashboard)/score/page.tsx` |
| `/modalidades` | `(dashboard)/modalidades/page.tsx` |
| `/estudo-tecnico` | `(dashboard)/estudo-tecnico/page.tsx` |
| `/matriz-riscos` | `(dashboard)/matriz-riscos/page.tsx` |
| `/checklist` | `(dashboard)/checklist/page.tsx` |
| `/justificativa` | `(dashboard)/justificativa/page.tsx` |
| `/documentos` | `(dashboard)/documentos/page.tsx` |
| `/montagem-processo` | `(dashboard)/montagem-processo/page.tsx` |
| `/meus-processos` | `(dashboard)/meus-processos/page.tsx` |
| `/sinapi` | `(dashboard)/sinapi/page.tsx` |
| `/favoritos` | `(dashboard)/favoritos/page.tsx` |
| `/relatorios` | `(dashboard)/relatorios/page.tsx` |
| `/calendario` | `(dashboard)/calendario/page.tsx` |
| `/perfil` | `(dashboard)/perfil/page.tsx` |
| `/configuracoes` | `(dashboard)/configuracoes/page.tsx` |
| `/ajuda` | `(dashboard)/ajuda/page.tsx` |
| `/credenciamento-sicx` | `(dashboard)/credenciamento-sicx/page.tsx` |

### Route group `(auth)`
| Rota | Arquivo |
|---|---|
| `/login` | `(auth)/login/page.tsx` |
| `/cadastro` | `(auth)/cadastro/page.tsx` |

### Route group `(seo)`
| Rota | Arquivo |
|---|---|
| `/licitacoes` | `(seo)/licitacoes/page.tsx` |
| `/licitacoes/[estado]` | `(seo)/licitacoes/[estado]/page.tsx` |
| `/licitacoes/[estado]/[cidade]` | `(seo)/licitacoes/[estado]/[cidade]/page.tsx` |
| `/categorias` | `(seo)/categorias/page.tsx` |
| `/categorias/[slug]` | `(seo)/categorias/[slug]/page.tsx` |

### Fora de route group
| Rota | Arquivo |
|---|---|
| `/admin` | `admin/page.tsx` |
| `/admin/conversao` | `admin/conversao/page.tsx` |
| `/admin/contatos` | `admin/contatos/page.tsx` |
| `/checkout` | `checkout/page.tsx` |
| `/minha-assinatura` | `minha-assinatura/page.tsx` |
| `/plano-bloqueado` | `plano-bloqueado/page.tsx` |
| `/confirmado` | `confirmado/page.tsx` |
| `/auth/callback` | `auth/callback/route.ts` (route handler OAuth) |

## 2. Endpoints / APIs (`src/app/api`)

### Admin (auth por `x-admin-password` = `ADMIN_PASSWORD`)
| Endpoint | Métodos |
|---|---|
| `/api/admin/analytics` | GET |
| `/api/admin/contatos` | GET, DELETE |
| `/api/admin/contatos/enviar` | POST |
| `/api/admin/contatos/extrair` | POST |
| `/api/admin/conversao` | GET |
| `/api/admin/conversao/timeline` | GET |
| `/api/admin/events` | GET |
| `/api/admin/funnel` | GET |
| `/api/admin/health` | GET |
| `/api/admin/metrics` | GET |
| `/api/admin/planos` | GET, POST |
| `/api/admin/revenue` | GET |
| `/api/admin/stats` | GET |
| `/api/admin/subscriptions` | GET |
| `/api/admin/trial/test-email` | POST |
| `/api/admin/trial/test-email-expirando` | POST |
| `/api/admin/users` | GET |

### Cron (auth por `CRON_SECRET`/`CRON_SECRET_ALT` via `lib/cron/auth.ts`)
| Endpoint | Métodos |
|---|---|
| `/api/cron/alertas` | GET |
| `/api/cron/enviar-contatos` | GET |
| `/api/cron/extrair-contatos` | GET |
| `/api/cron/trial-expirado` | GET |
| `/api/cron/trial-expirando` | GET |

### Demais
| Endpoint | Métodos |
|---|---|
| `/api/alerts/process` | POST |
| `/api/alerts/test` | POST |
| `/api/analise-edital` | GET, POST, DELETE |
| `/api/analise-edital/avaliacao` | POST |
| `/api/analytics/track` | POST |
| `/api/asaas/checkout` | POST |
| `/api/asaas/subscription` | GET, POST |
| `/api/asaas/webhook` | POST |
| `/api/auth/cadastro` | POST |
| `/api/auth/resend` | POST |
| `/api/calendario` | GET |
| `/api/concorrentes` | GET |
| `/api/ia/analisar` | GET, POST |
| `/api/ia/chat` | POST |
| `/api/ia/edital` | GET, DELETE |
| `/api/ia/importar` | POST |
| `/api/modalidades` | GET |
| `/api/pncp/[...path]` | GET, OPTIONS (proxy; inclui `mapa`, `consulta`, `search`) |
| `/api/radar` | GET |

## 3. Componentes (`src/components`)

- **a11y/analytics:** `analytics/pageview-tracker.tsx`
- **alerts:** `alerts/alert-form.tsx`, `alerts/alert-list.tsx`, `alerts/delivery-history.tsx`
- **auth:** `auth/cadastro-form.tsx`, `auth/google-auth-button.tsx`
- **layout:** `layout/footer.tsx`, `layout/header.tsx`, `layout/logo.tsx`, `layout/marketing-menu.tsx`, `layout/sidebar.tsx`, `layout/site-shell.tsx`, `layout/theme-toggle.tsx`
- **marketing:** `marketing/consulta-rapida.tsx`, `marketing/home-content.tsx`, `marketing/plan-cta-link.tsx`, `marketing/section.tsx`
- **opportunities:** `opportunities/favorite-button.tsx`, `opportunities/opportunity-card.tsx`, `opportunities/score-badge.tsx`
- **precos-inteligentes:** `precos-inteligentes/pesquisa-precos-app.tsx` + `ui/` (`barra-exportar`, `cards-resumo`, `comparacao`, `confianca`, `detalhes-registro`, `faixa-preco`, `filtro-painel`, `graficos`, `modal`, `pesquisas-salvas`, `search-hero`, `tabela-resultados`)
- **providers:** `providers/theme-provider.tsx`
- **shared/ui:** `shared/empty-state.tsx`, `ui/badge.tsx`, `ui/button.tsx`, `ui/card.tsx`, `ui/data-source-notice.tsx`, `ui/demo-notice.tsx`, `ui/empty-state.tsx`, `ui/input.tsx`, `ui/page-header.tsx`, `ui/select.tsx`, `ui/skeleton.tsx`, `ui/stat-card.tsx`

## 4. Supabase — tabelas e colunas (migrations em `supabase/migrations`)

> RLS habilitado em todas. Padrão "own": `user_id = auth.uid()`. Tabelas de backend/analytics/admin usam apenas SERVICE_ROLE.

### Alertas
- **`alerts`**: `id, user_id, nome, keyword, modalidade, uf, municipio, orgao, valor_min, valor_max, data_inicial, data_final, ativo, created_at, updated_at`
- **`alert_channels`**: `id, alert_id, user_id, canal('email'|'telegram'), destino, ativo, created_at`
- **`alert_schedules`**: `id, alert_id, user_id, modo('imediato'|'programado'), frequencia('imediato'|'diario'|'semanal'), horario, dias_semana, fuso, ultima_execucao, created_at`
- **`alert_deliveries`**: `id, alert_id, user_id, canal, oportunidade_id, oportunidade_obj, status('agendado'|'enviado'|'falhou'), erro, data_agendada, data_envio, created_at` (unique `alert_id+oportunidade_id+canal`)

### Analytics / conversão
- **`analytics_events`**: `id, event, path, page, client_id, user_id, props(jsonb), created_at, day` (INSERT liberado a todos; SELECT/UPDATE/DELETE só service_role)

### Análise de edital (IA)
- **`analises`**: `id, user_id, objeto, orgao, unidade, modalidade, cnpj, numero, uf, municipio, valor, data_publicacao, data_encerramento, link_edital, origem('texto'|'pdf'|'pncp'), nome_arquivo, conteudo_chars, status('concluida'|'erro'), modelo, tempo_ms, markdown, erro, created_at, pncp_id, inicio_em, conclusao_em, classificacao_correta, avaliada_em, updated_at`

### Contratações (SINAPI + montagem de processos)
- **`sinapi_cabecalhos`**: `id, user_id, nome_arquivo, competencia, uf, deson_base, fonte, linha_inicial, total_itens, criado_em`
- **`sinapi_itens`**: `id, cabecalho_id, user_id, codigo, descricao, unidade, tipo, custo_nao_deson, custo_deson, origem_insumo, criado_em`
- **`processos_instrucao`**: `id, user_id, numero, unidade, setor, responsavel, objeto, descricao, finalidade, justificativa, quantidade, unidade_medida, valor_estimado, prazo, tipo_objeto, nd, dfd, etp, tr, riscos, bdi, status, percentual, processo_pdf, created_at, updated_at`
- **`processo_itens`**: `id, processo_id, user_id, posicao, codigo, descricao, unidade, quantidade, unitario, total, fonte, competencia, tipo, criado_em`
- **`processo_precos`**: `id, processo_id, user_id, fonte, fornecedor, cnpj, data, descricao, unidade, quantidade, preco_unit, preco_total, link, obs, criado_em`
- **`processo_riscos`**: `id, processo_id, user_id, risco, probabilidade, impacto, consequencia, tratamento, responsavel, nivel, criado_em`
- **`processo_documentos`**: `id, processo_id, user_id, nome, status, obrigatorio, justificativa, responsavel, data, arquivo, obs, criado_em, updated_at`
- **`processo_historico`**: `id, processo_id, user_id, acao, detalhe(jsonb), criado_em`

### Planos / pagamentos
- **`user_planos`**: `user_id(PK), plano('free'|'pro'|'business'), origem('trial'|'manual'|'asaas'), trial_inicio, trial_fim, updated_at, created_at, bloqueado, asaas_customer_id, asaas_subscription_id, status_pagamento('none'|'trial'|'active'|'payment_pending'|'overdue'|'canceled'|'blocked'), payment_method('none'|'credit_card'|'pix'), next_due_date, last_payment_at, canceled_at, ciclo('mensal'|'trimestral'|'semestral'|'anual'), trial_email_enviado_em`
- **`asaas_webhook_events`**: `id, event_id(unique), event_type, payload(jsonb), processed, created_at, processed_at` (somente service_role)

### Contatos de editais (extração + outreach)
- **`edital_extracoes`**: `id, pncp_id(unique), orgao_cnpj, orgao_nome, uf, municipio, numero, data_publicacao, arquivo_url, arquivo_titulo, arquivo_hash, status('ok'|'sem_contato'|'sem_arquivo'|'pdf_invalido'|'falha'|'pendente'), emails(jsonb), motivo, processado_em, created_at, updated_at`
- **`edital_contatos`**: `id, orgao_cnpj, orgao_nome, uf, contato_email, editais_origem(jsonb), contato_extraido_em, created_at, updated_at, outreach_enviado_em, outreach_status, outreach_tentativas, outreach_erro` (unique `orgao_cnpj+contato_email`; sem policy → só service_role)

### Funções/triggers
- `public.set_updated_at()` (trigger em `alerts`, `analises`), `public.set_avaliacao_updated()` (trigger em `analises`).

### `auth.users`
- Gerenciado pelo Supabase Auth (login e-mail/senha + Google OAuth).

## 5. Jobs / crons / agendamento

- **Mecanismo:** o Vinext/Cloudflare **não** usa `scheduled` nativo; o agendamento é feito por **GitHub Actions** chamando endpoints HTTP protegidos.
- **Workflows** (`.github/workflows/`):
  - `cron-alertas.yml` — a cada **5 min** → `/api/cron/alertas`
  - `cron-extrair-contatos.yml` — a cada **6h** → `/api/cron/extrair-contatos`
  - `cron-enviar-contatos.yml` — **diário 09:30 BRT** → `/api/cron/enviar-contatos`
  - `cron-trial-expirando.yml` — **diário 09:15 BRT** → `/api/cron/trial-expirando`
  - `cron-trial-expirado.yml` — **diário 09:00 BRT** → `/api/cron/trial-expirado`
- **Scripts manuais:** `scripts/cron-trial-expirado.ps1` (lê `CRON_SECRET` de parâmetro/ambiente); `scripts/extract-merge-sides.mjs`; `scripts/ftp-resolver-sides.mjs`.
- **Auth dos crons:** `src/lib/cron/auth.ts` aceita `CRON_SECRET` **ou** `CRON_SECRET_ALT` (header `x-cron-secret`, `?token=` ou `Authorization: Bearer`).
- **Secrets dos workflows (GitHub):** `PNCP_BASE_URL`, `CRON_SECRET`.

## 6. Variáveis de ambiente (apenas nomes)

**Em `.env.example`:** `ADMIN_PASSWORD`, `AUTH_SECRET`, `BREVO_API_KEY`, `BREVO_FROM_EMAIL`, `BREVO_FROM_NAME`, `CRON_SECRET`, `CRON_SECRET_ALT`, `DATABASE_URL`, `GEMINI_API_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`.

**Referenciadas no código (união, inclui as acima):** `ADMIN_DELETE_PASSWORD`, `ADMIN_EMAILS`, `ANALYTICS_IGNORED_CLIENT_IDS`, `ANALYTICS_IGNORED_EMAILS`, `ANALYTICS_IGNORED_USER_IDS`, `ASAAS_API_KEY`, `ASAAS_ENVIRONMENT`, `ASAAS_WEBHOOK_TOKEN`, `CONTATOS_LOTE`, `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_PNCP_BASE`, `NEXT_PUBLIC_PNCP_PROXY`, `OUTREACH_LOTE`, `PNCP_ARQUIVO_PROXY`, `STRIPE_SECRET_KEY`.

**Secrets ativos no Worker (Cloudflare):** `ADMIN_PASSWORD`, `ASAAS_API_KEY`, `ASAAS_ENVIRONMENT`, `ASAAS_WEBHOOK_TOKEN`, `BREVO_API_KEY`, `BREVO_FROM_EMAIL`, `BREVO_FROM_NAME`, `CRON_SECRET`, `CRON_SECRET_ALT`, `EVOLUTION_API_KEY`, `EVOLUTION_API_URL`, `EVOLUTION_INSTANCE`, `GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `SUPABASE_SERVICE_ROLE_KEY`.

## 7. Integrações

- **PNCP (fonte oficial)** — API pública `pncp.gov.br/api` com fingerprint de navegador; fallback para proxy `pncp-proxy.luis19730.workers.dev` e proxy same-origin `/api/pncp/[...path]` (com `requirePaidAccess`). Arquivos/PDF via `/pncp/v1/.../arquivos` e download em `/pncp-api/...`.
- **Supabase** — Auth (e-mail/senha + Google OAuth) e Postgres (PostgREST + SERVICE_ROLE). Middleware de sessão/cookies.
- **ASAAS** — checkout, assinaturas, webhook (`/api/asaas/webhook`), links de pagamento; eventos em `asaas_webhook_events`.
- **E-mail** — **Resend** e **Brevo** (fallback) via `lib/alerts/notifications/email.ts` (confirmação de conta, alertas, trials, outreach).
- **Telegram** — canal de alertas (`TELEGRAM_BOT_TOKEN`).
- **Evolution API** — WhatsApp (secrets presentes; migração de alertas foi para Telegram).
- **Cloudflare Workers AI** — OCR de PDF (`env.AI.toMarkdown`).
- **Google Gemini** — fallback de IA (`GEMINI_API_KEY`).
- **Stripe** — `src/lib/stripe.ts` presente (referência a `STRIPE_SECRET_KEY`); pagamentos ativos usam **ASAAS**.
- **Exportações** — `xlsx` / `xlsx-js-style` (Excel) e CSV próprio.
- **PDF** — `unpdf` (+ OCR Workers AI).

## 8. Estrutura de `src/lib` (módulos principais)

`admin/` (auth, periodo, usuario-plano, conversao, lead-score, publico, csv), `alerts/` (db, processor, matching, scheduling, validation, notifications/{email,telegram}), `analises/`, `asaas/` (client, config, events, links, types), `auth/` (admin-emails, confirm-email, require-access, site-url, verification, email-validation), `calendario/`, `concorrentes/`, `contratacoes/`, `cron/auth.ts`, `contatos/` (extracao, outreach, outreach-email), `ia/` (analisar, pdf, kv-edital, workers-ai, prompt, ai-global), `planos/` (db, plano, trial-email), `precos-inteligentes/`, `supabase/` (client, server, admin, middleware), `analytics.ts`, `analytics-server.ts`, `market-data.ts`, `modalidades-data.ts`, `opportunity.ts`, `pncp.ts`, `pncp-data.ts`, `scoring.ts`, `seo-data.ts`, `storage-keys.ts`, `stripe.ts`, `utils.ts`, `auth-cooldown.ts`.

## 9. Observações de risco para a atualização

- **Nunca** renomear/remover tabelas, colunas, rotas ou endpoints (regra do projeto). Alterações de rota exigem **redirect 301**.
- O `analytics_events.event` é texto livre (sem enum) — novos eventos são aditivos.
- `edital_contatos` e `edital_extracoes` têm dados reais extraídos (dedup por órgão+e-mail) — preservar.
- `user_planos` concentra trial/assinatura/bloqueio — alterações são de alto risco.
- Build/validação: `npm run build:vinext` antes de finalizar cada etapa.
