-- ============================================================================
-- CONTATOS DE E-MAIL EXTRAÍDOS DOS EDITAIS (PDF)
--
-- Duas tabelas:
--   edital_extracoes  — log/estado por edital processado (cache + idempotência)
--   edital_contatos   — contatos deduplicados por órgão+e-mail, com a lista de
--                       editais de origem (rastreabilidade)
--
-- SEGURANÇA: RLS habilitada e SEM nenhuma policy => somente o service_role
-- (backend/worker) lê/escreve. Os campos de contato NUNCA são expostos em API
-- pública; apenas nas rotas administrativas protegidas.
--
-- Aplicar via: SQL Editor do Supabase (ou supabase db push).
-- ============================================================================

create table if not exists public.edital_extracoes (
  id              bigint generated always as identity primary key,
  pncp_id         text not null unique,          -- numero_controle_pncp
  orgao_cnpj      text,
  orgao_nome      text,
  uf              text,
  municipio       text,
  numero          text,
  data_publicacao timestamptz,
  arquivo_url     text,
  arquivo_titulo  text,
  arquivo_hash    text,
  status          text not null default 'pendente',
    -- ok | sem_contato | sem_arquivo | pdf_invalido | falha | pendente
  emails          jsonb not null default '[]'::jsonb,
  motivo          text,
  processado_em   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_edital_extracoes_status  on public.edital_extracoes (status);
create index if not exists idx_edital_extracoes_uf      on public.edital_extracoes (uf);
create index if not exists idx_edital_extracoes_proc    on public.edital_extracoes (processado_em desc);

create table if not exists public.edital_contatos (
  id                   bigint generated always as identity primary key,
  orgao_cnpj           text not null,
  orgao_nome           text,
  uf                   text,
  contato_email        text not null,
  editais_origem       jsonb not null default '[]'::jsonb,  -- [{pncp_id, numero, data, arquivo_url}]
  contato_extraido_em  timestamptz not null default now(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (orgao_cnpj, contato_email)
);

create index if not exists idx_edital_contatos_uf       on public.edital_contatos (uf);
create index if not exists idx_edital_contatos_orgao    on public.edital_contatos (orgao_cnpj);
create index if not exists idx_edital_contatos_extraido on public.edital_contatos (contato_extraido_em desc);

alter table public.edital_extracoes enable row level security;
alter table public.edital_contatos  enable row level security;

-- Nenhuma policy: SELECT/INSERT/UPDATE/DELETE negados ao público.
-- (service_role ignora RLS e é o único que acessa — backend/cron/admin.)
