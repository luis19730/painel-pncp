# Funcionalidades existentes — status (ANTES da atualização)

> Snapshot do estado atual (branch `backup/pre-atualizacao`).
> Legenda: **Funcionando** · **Parcial** · **Quebrada**.
> "Parcial" indica limitação conhecida (dados externos, armazenamento local ou
> dependência de plano/segredo), não necessariamente defeito.

| # | Funcionalidade | Rotas / arquivos principais | Dependências | Status | Observações |
|---|---|---|---|---|---|
| 1 | **Busca de licitações** | `/busca`; `lib/pncp-data.ts` | PNCP API/proxy | **Funcionando** | Busca ao vivo com filtros (UF, modalidade, município, órgão, situação, valor) e paginação. |
| 2 | **Oportunidades** | `/oportunidades`, `/oportunidades/[id]` | PNCP | **Funcionando** | Listagem + detalhe; link para o edital no PNCP. |
| 3 | **Dashboard** | `/dashboard` | PNCP + localStorage | **Funcionando** | Indicadores e "Editais abertos" ao vivo (fallback local); atalhos por card. |
| 4 | **Score de oportunidade** | `/score`; `lib/scoring.ts` | Perfil (localStorage) | **Funcionando** | Score 0–100 por critérios (keyword/local/valor/prazo/segmento); sem perfil, total 0 com aviso. |
| 5 | **Meu Radar** | `/meu-radar`; `/api/radar` | Supabase/local | **Parcial (a validar)** | Recurso presente; persistência depende de dados salvos do usuário. |
| 6 | **Alertas automáticos** | `/alertas`; `lib/alerts/*`; `/api/cron/alertas` | Supabase + e-mail/Telegram + cron | **Funcionando** | Tabelas `alerts/alert_channels/alert_schedules/alert_deliveries`; cron agora agendado (5 min). |
| 7 | **Mapa de preços** | `/precos`, `/precos-inteligentes` | PNCP + catálogo local | **Parcial** | O índice público do PNCP não expõe preço unitário; valores são de referência (documentado em código). |
| 8 | **Análise de edital com IA** | `/analise-edital`, `/ia-licitacoes`; `/api/ia/*` | Workers AI / Gemini; Supabase | **Funcionando** | Histórico em `analises`; permite PDF (unpdf + OCR) e texto. |
| 9 | **Relatórios de concorrentes** | `/concorrentes`; `/api/concorrentes` | PNCP | **Funcionando** | Consulta e exportação (Excel/CSV). |
| 10 | **Extração de e-mails dos editais** | `/admin/contatos`; `lib/contatos/extracao.ts`; `/api/cron/extrair-contatos`, `/api/admin/contatos/extrair` | PNCP (arquivos/PDF) + Supabase | **Funcionando** | Validado em produção (emails reais extraídos; dedup por órgão+e-mail). |
| 11 | **Outreach (e-mail para contatos)** | `lib/contatos/outreach.ts`; `/api/cron/enviar-contatos`, `/api/admin/contatos/enviar` | Resend/Brevo + Supabase | **Funcionando** | Idempotente (1x por contato), lote 20/dia, dry-run e teste. |
| 12 | **Exportações CSV/Excel** | `/api/admin/contatos?formato=csv`; `lib/concorrentes/export.ts`, `lib/contratacoes/export.ts`, `lib/admin/csv.ts` | xlsx / CSV | **Funcionando** | CSV (BOM `;`) e XLSX; validado no admin. |
| 13 | **Login / Cadastro** | `/login`, `/cadastro`; `/api/auth/cadastro`, `/api/auth/resend`, `/auth/callback` | Supabase Auth (+Google) | **Funcionando** | E-mail/senha com confirmação; **Google OAuth** habilitado (302 → accounts.google.com). |
| 14 | **Painel administrativo** | `/admin` | Supabase (service role) | **Funcionando** | Métricas, funil, usuários, assinaturas, receita, uso, eventos, saúde. |
| 15 | **Painel de conversão** | `/admin/conversao`; `/api/admin/conversao` | analytics_events + user_planos | **Funcionando** | Funil, lead score, leads quentes, trials, alertas, retenção D1/D7, CSV. |
| 16 | **Planos / Checkout / Assinatura** | `/planos`, `/checkout`, `/minha-assinatura`; `/api/asaas/*` | ASAAS + Supabase | **Funcionando** | Webhook idempotente (`asaas_webhook_events`); trial de 15 dias. |
| 17 | **Montagem de processo / SINAPI** | `/montagem-processo`, `/meus-processos`, `/sinapi`, `/estudo-tecnico`, `/justificativa`, `/matriz-riscos`, `/checklist` | Supabase (`processos_*`, `sinapi_*`) | **Funcionando** | Instrução completa; BDI, riscos, documentos, histórico. |
| 18 | **Documentos** | `/documentos` | Navegador (local) | **Parcial** | A própria página informa: arquivos permanecem apenas no navegador (sem sincronização). |
| 19 | **Calendário** | `/calendario`; `/api/calendario` | PNCP | **Funcionando** | Prazos/eventos derivados de editais. |
| 20 | **Modalidades** | `/modalidades`; `/api/modalidades` | PNCP | **Funcionando** | Base de modalidades + editais. |
| 21 | **Favoritos** | `/favoritos` | localStorage | **Funcionando** | Persistência no navegador. |
| 22 | **Relatórios** | `/relatorios` | Supabase/local | **Parcial (a validar)** | Visão interna de relatórios do usuário. |
| 23 | **SICX (compras expressas)** | `/sicx`, `/credenciamento-sicx` | PNCP | **Funcionando** | Página institucional + credenciamentos ao vivo. |
| 24 | **Páginas SEO** | `/licitacoes`, `/licitacoes/[estado]`, `/licitacoes/[estado]/[cidade]`, `/categorias`, `/categorias/[slug]` | PNCP | **Funcionando** | Padrão de seção + shell público (header/footer). |
| 25 | **Admin — contatos (seleção/export)** | `/admin/contatos` | Supabase | **Funcionando** | Checkboxes, envio/export/exclusão por seleção. |
| 26 | **Health / diagnóstico** | `/api/admin/health` | Supabase + PNCP + OAuth | **Funcionando** | Checa banco, secrets, ASAAS, IA, API PNCP (com fallback proxy) e Login Google. |

## Resumo
- **Funcionando:** 22 funcionalidades.
- **Parcial (com limitação conhecida):** 4 — Mapa de preços (#7), Documentos (#18), Meu Radar (#5) e Relatórios (#22) (os dois últimos a validar em uso real).
- **Quebrada:** nenhuma identificada.

## Dependências externas críticas
- **PNCP** (API pública) — indisponibilidades afetam busca, preços, calendário, SEO e extração (há fallback local/proxy).
- **Supabase** (Auth + Postgres) — login, planos, alertas, análises, processos, contatos.
- **ASAAS** — cobrança/assinatura.
- **Resend/Brevo** — envio de e-mails.
- **Workers AI / Gemini** — análise de edital e OCR.
