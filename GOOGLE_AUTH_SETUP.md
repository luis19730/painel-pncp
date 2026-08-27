# GOOGLE AUTH SETUP — PAINEL PNCP

Guia para habilitar "Entrar com Google" no PAINEL PNCP.

> **Arquitetura**: o login Google usa o provedor **Google** do **Supabase Auth**
> (`supabase.auth.signInWithOAuth({ provider: 'google' })`). Ele se integra ao
> sistema de sessão, cookies, middleware e logout já existentes — não cria um
> sistema de autenticação paralelo.

---

## 1. Visão geral do fluxo

```
/  login ou /cadastro
        │  clique em "Continuar com Google"
        ▼
supabase.auth.signInWithOAuth({ provider: 'google', redirectTo })
        │
        ▼
navegador é redirecionado para o Google
        │  usuário escolhe a conta e autoriza
        ▼
Google → Supabase (troca o código)
        │
        ▼
/auth/callback (route handler) → troca o code por sessão
        │
        ▼
/dashboard
```

Endpoints criados:

| Rota                       | Função                                            |
| -------------------------- | ------------------------------------------------- |
| `/auth/callback`           | Troca o `code` do OAuth por sessão e redireciona  |

---

## 2. Criar projeto no Google Cloud

1. Acesse https://console.cloud.google.com e crie/abra um projeto.
2. **APIs & Services → OAuth consent screen**:
   - Escolha **External** (ou Internal, se o e-mail do domínio for do Google Workspace).
   - Preencha: nome do app **PAINEL PNCP**, e-mail de suporte.
   - **Scopes**: adicione `openid`, `email`, `profile`.
   - Adicione os usuários de teste (modo "Testing").
3. **APIs & Services → Credentials → Create Credentials → OAuth Client ID**:
   - Tipo: **Web application**.
   - **Authorized JavaScript origins**:
     - `https://painelpncp.com.br`
     - (se quiser testar no Workers dev temporário) `https://painel-pncp.luis19730.workers.dev`
     - (desenvolvimento local) `http://localhost:3001`
   - **Authorized redirect URIs**:
     - `https://<SEU-PROJETO>.supabase.co/auth/v1/callback` ← **obrigatório** (é o Supabase quem recebe o retorno do Google)
   - Anote o **Client ID** e o **Client Secret**.

> O redirect URI oficial é o do **Supabase**, porque o Supabase Auth gerencia o
> retorno do Google e depois redireciona para o nosso `/auth/callback`.

---

## 3. Configurar o provedor Google no Supabase

1. **Supabase Dashboard → Authentication → Providers**.
2. Ative **Google**.
3. Preencha:
   - **Client ID** (Google OAuth Client ID)
   - **Client Secret** (Google OAuth Client Secret)
4. Salve.

> É o Supabase (não o Cloudflare) quem guarda o `client_secret` do Google. Por
> isso ele **não** aparece no código-fonte nem em secrets do Cloudflare.

---

## 4. Variáveis de ambiente

O app já usa as variáveis do Supabase (que devem ser os valores reais do projeto
Supabase, não placeholders):

| Variável                       | Onde                                   |
| ------------------------------ | -------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`     | Supabase Dashboard → Project Settings  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| Supabase Dashboard → Project Settings  |

Essas variáveis NÃO podem conter segredo. Em produção, injete via
**Cloudflare Workers → painel-pncp → Settings → Variables and Secrets**.

Nunca commitar `.env*`. O `.gitignore` já bloqueia os arquivos `.env`.

---

## 5. Configurar no Cloudflare Workers

1. Abra o Worker **painel-pncp** no Cloudflare dashboard.
2. **Settings → Variables and Secrets → Edit**.
3. Adicione como **plaintext variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL` = `https://painelpncp.com.br`
4. (Se for usado) adicione os demais segredos atuais como **secrets**.

> Não é necessário criar `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` no Cloudflare:
> esses segredos vivem no painel do Supabase (provedor Google).

---

## 6. Domínio / Redirect URI

- Domínio oficial: `https://painelpncp.com.br`
- Callback do app: `https://painelpncp.com.br/auth/callback`
- Callback do Supabase (Google): `https://<projeto>.supabase.co/auth/v1/callback`

O `redirectTo` do app é montado a partir de `window.location.origin`, então a
mesma URL correta é usada automaticamente em produção e em desenvolvimento.

---

## 7. Publicar

```bash
npm run build:vinext   # build local
npm run deploy:vinext  # deploy para Cloudflare Workers
```

---

## 8. Testar

Pré-requisito: credenciais reais do Supabase + provedor Google ativo.

1. Criar conta com Google (usuário novo).
2. Entrar com Google (usuário existente).
3. Logout → volta para `/login`.
4. Cancelar a autenticação no Google.
5. Callback inválido / sessão expirada.

---

## 9. Notas de segurança

- O código, senhas e chamadas vão para o backend (Supabase); o navegador nunca
  vê o `client_secret`.
- O Supabase valida `state`/PKCE no fluxo OAuth e o `id_token`/`email_verified`
  do Google.
- Sessão e cookies continuam geridos pelo Supabase (HttpOnly, Secure, SameSite).
- O login Google não contorna papéis/permissões do sistema.
- Nenhum token ou segredo é gravado em logs.

---

## 10. Pendência

O login Google só funciona de fato em produção quando:

1. Existir um projeto **Supabase real** (URL/anon reais) — hoje são placeholders.
2. O provedor **Google** estiver configurado no Supabase (Client ID/Secret).
3. As variáveis reais estiverem injetadas no Cloudflare Workers.
