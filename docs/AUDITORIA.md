# Auditoria — Painel PNCP

> Base: `docs/INVENTARIO_ANTES.md` · Branch: `feat/atualizacao-profissional`.
> Produção auditada: https://www.painelpncp.com.br (após correções, Version ID `bff417d9`).

## 1. Método e limitações

- **Varredura HTTP** de todas as rotas públicas, deslogado (status, redirecionamentos, presença de conteúdo).
- **Análise estática** do código: links internos, placeholders/TODO/"em breve", botões sem ação, uso de env indevida.
- **Limitações (não foi possível automatizar neste ambiente):**
  - **Estado logado:** não há credenciais de teste; rotas logadas foram verificadas pelo comportamento do middleware (redirecionam para `/login` quando deslogado) e por inspeção de código.
  - **Mobile/visual:** verificado por classes responsivas (Tailwind) no código, **sem** browser real (não houve teste pixel-a-pixel).
- Nenhuma funcionalidade foi removida. Nada foi escondido do menu.

## 2. Erros HTTP
| Rota | Resultado | Situação |
|---|---|---|
| Todas as públicas (marketing, seo, auth, admin) | 200 | OK |
| `/checkout`, `/minha-assinatura` | 307 → `/login` | OK (exigem login) |
| Rotas do dashboard (deslogado) | 307 → `/login` | OK |
| Rota inexistente (`/rota-inexistente-xyz`) | 404 + `not-found.tsx` | OK |
| **Nenhum 500** encontrado nas rotas testadas | — | OK |

## 3. Problemas encontrados e correções

### 3.1 [CORRIGIDO] `/licitacoes` vazia em produção
- **Sintoma:** a listagem aparecia vazia ("Nenhuma licitação encontrada no momento").
- **Causa:** a página buscava dados em `${NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/pncp/mapa`; sem a variável, o fetch ia para `localhost` e falhava.
- **Correção:** passou a usar a mesma fonte resiliente das demais páginas SEO — `fetchSeoLicitacoes()` (`src/lib/seo-data.ts`), que consulta o PNCP direto e cai em base local em caso de falha.
- **Arquivo:** `src/app/(seo)/licitacoes/page.tsx`.
- **Validação:** `/licitacoes` agora renderiza itens (deixou de exibir o estado vazio).

### 3.2 [CORRIGIDO] `/credenciamento-sicx` acessível sem login
- **Sintoma:** a rota respondia **200 deslogado** e renderizava o shell do dashboard para anônimos (as demais rotas do dashboard vão para `/login`).
- **Causa:** a rota não estava na lista `isDashboard` do middleware de sessão.
- **Correção:** adicionada ao `isDashboard` em `src/lib/supabase/middleware.ts` → passa a exigir login (e plano ativo, como as demais).
- **Validação:** agora responde **307 → `/login?redirect=%2Fcredenciamento-sicx`**.

### 3.3 [CORRIGIDO] Botão "Criar primeira busca" sem ação (`/meu-radar`)
- **Sintoma:** no estado vazio, o botão usava `href="#"` (não abria o formulário).
- **Correção:** substituído por botão que abre o formulário (`onClick={() => setShowForm(true)}`).
- **Arquivo:** `src/app/(dashboard)/meu-radar/page.tsx`.

## 4. Itens verificados e considerados OK
- **Links internos:** todos os `href` internos apontam para rotas existentes (verificação automática contra o inventário). Único `href="#"` encontrado era o item 3.3 (corrigido).
- **Textos/placeholder:** nenhum `TODO`, `FIXME`, "em breve", "coming soon" ou "lorem ipsum" visível.
- **Páginas vazias (dados):** `/licitacoes/SP`, `/categorias/*`, `/sobre`, `/sicx`, `/termos`, `/privacidade` renderizam conteúdo; estados vazios restantes são data-driven (ex.: sem resultados do PNCP) com mensagem apropriada.
- **Botões/`onClick` vazios:** nenhum `onClick={() => {}}` encontrado.
- **405/erros de API:** endpoints admin/cron corretamente protegidos (403/401) e sem 500 observado.
- **Dados "desatualizados":** páginas SEO usam `revalidate` (120s) e fallback; a home exibe rótulo de atualização. Sem valores fictícios apresentados como reais.

## 5. Pendências / observações (não bloqueantes)
| # | Item | Tipo | Observação |
|---|---|---|---|
| P1 | Ausência de `error.tsx` / `global-error.tsx` | Robustez | Não é bug; recomenda-se adicionar fallback de erro no App Router. |
| P2 | Lentidão potencial em Home/Dashboard e `/api/cron/extrair-contatos` | Performance | Muitas chamadas ao PNCP (1 por UF) e download de PDFs. Aceitável, mas candidato a cache/otimização em etapa futura. |
| P3 | Auditoria **logado** e **mobile** não automatizada | Cobertura | Sem credenciais e sem browser real neste ambiente; recomenda-se teste manual logado (desktop/celular) numa etapa de QA. |
| P4 | Documentos (`/documentos`) salvam apenas no navegador | Produto | Comportamento informado na própria página; não é erro. |
| P5 | Mapa de preços usa valores de referência (índice público do PNCP não expõe preço unitário) | Produto/dados | Já documentado no código; sem correção de bug. |

## 6. Resumo
- **Corrigidos:** 3 (listagem `/licitacoes` vazia; `/credenciamento-sicx` sem autenticação; botão sem ação em `/meu-radar`).
- **Pendentes:** 5 observações (nenhuma é funcionalidade quebrada).
- **Funcionalidades removidas:** nenhuma.
- **Build:** `npm run build:vinext` → Build complete (antes da publicação).
- **Publicado:** Version ID `bff417d9-c2aa-4498-88c7-148fec1700d7`.
