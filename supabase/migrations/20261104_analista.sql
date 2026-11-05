-- ============================================================================
-- ANALISTA DE LICITAÇÕES — calculadora de viabilidade + Kanban
--
-- ADITIVA: não altera nenhuma tabela existente.
--
-- Tabelas:
--   analista_config     -> preferências do usuário (margem, impostos, frete...)
--   analista_analises   -> análises salvas (entradas/resultados em jsonb)
--   kanban_colunas      -> colunas do Kanban (padrão criado no 1º acesso)
--   kanban_cartoes      -> cartões do Kanban
--   kanban_notas        -> linha do tempo de anotações do cartão
--   kanban_checklist    -> checklist do cartão
--   kanban_historico    -> histórico de movimentação entre colunas
--
-- SEGURANÇA: RLS habilitada em todas as tabelas; cada usuário só lê/escreve
-- linhas com user_id = auth.uid(). O user_id é SEMPRE preenchido pelo backend
-- a partir da sessão, nunca confiado do cliente.
--
-- Aplicar via SQL Editor do Supabase (ou script node com DATABASE_URL).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. CONFIGURAÇÕES DO ANALISTA
-- ---------------------------------------------------------------------------
create table if not exists public.analista_config (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  margem_minima    numeric not null default 15,
  regime           text not null default 'simples'
    check (regime in ('simples','presumido','real','mei')),
  aliquotas        jsonb not null default '{"icms":0,"iss":0,"pis":0.65,"cofins":3,"irpj":0,"csll":0,"simples":6,"stDifal":0}'::jsonb,
  custo_capital    numeric not null default 1.5,   -- % ao mês
  fator_cubagem    numeric not null default 300,   -- kg por m³
  risco_pct        numeric not null default 3,
  despesas_pct     numeric not null default 2,
  frete_max_pct    numeric not null default 15,    -- alerta se frete > X% da receita
  prazo_max_dias   integer not null default 60,    -- alerta se pagamento > X dias
  tabela_frete     jsonb not null default '{"porKg":1.2,"porM3":180,"minimo":80,"faixas":[],"porUf":{}}'::jsonb,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. ANÁLISES SALVAS
-- ---------------------------------------------------------------------------
create table if not exists public.analista_analises (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  edital_ref       text,                          -- número de controle PNCP
  titulo           text,
  cenario          text not null default 'realista'
    check (cenario in ('otimista','realista','pessimista')),
  entradas         jsonb not null default '{}'::jsonb,
  resultados       jsonb not null default '{}'::jsonb,
  historico        jsonb not null default '[]'::jsonb, -- versões anteriores (máx. 10)
  veredito         text,                          -- verde | amarelo | vermelho
  margem_liquida   numeric,
  valor_referencia numeric,
  valor_ofertado   numeric,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);

create index if not exists idx_analista_analises_user on public.analista_analises (user_id, atualizado_em desc);
create index if not exists idx_analista_analises_edital on public.analista_analises (user_id, edital_ref);

-- ---------------------------------------------------------------------------
-- 3. KANBAN — COLUNAS
-- ---------------------------------------------------------------------------
create table if not exists public.kanban_colunas (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  nome          text not null,
  ordem         integer not null default 0,
  cor           text not null default 'slate',
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (user_id, nome)
);
create index if not exists idx_kanban_colunas_user on public.kanban_colunas (user_id, ordem);

-- ---------------------------------------------------------------------------
-- 4. KANBAN — CARTÕES
-- ---------------------------------------------------------------------------
create table if not exists public.kanban_cartoes (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  coluna_id         uuid not null references public.kanban_colunas (id) on delete cascade,
  ordem             integer not null default 0,
  titulo            text not null,
  orgao             text,
  edital_ref        text,
  modalidade        text,
  uf                text,
  valor_referencia  numeric,
  valor_ofertado    numeric,
  margem            numeric,
  analise_id        uuid references public.analista_analises (id) on delete set null,
  data_sessao       timestamptz,
  prazo_proposta    timestamptz,
  prazo_entrega     timestamptz,
  responsavel       text,
  prioridade        text not null default 'media'
    check (prioridade in ('baixa','media','alta','urgente')),
  etiquetas         jsonb not null default '[]'::jsonb,
  link_edital       text,
  anexos            jsonb not null default '[]'::jsonb,
  motivo_perda      text,
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now()
);
create index if not exists idx_kanban_cartoes_user on public.kanban_cartoes (user_id, coluna_id, ordem);
create index if not exists idx_kanban_cartoes_edital on public.kanban_cartoes (user_id, edital_ref);
create index if not exists idx_kanban_cartoes_prazo on public.kanban_cartoes (user_id, prazo_proposta);

-- ---------------------------------------------------------------------------
-- 5. KANBAN — NOTAS
-- ---------------------------------------------------------------------------
create table if not exists public.kanban_notas (
  id        uuid primary key default gen_random_uuid(),
  cartao_id uuid not null references public.kanban_cartoes (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  texto     text not null,
  tipo      text not null default 'nota' check (tipo in ('nota','comentario')),
  criado_em timestamptz not null default now()
);
create index if not exists idx_kanban_notas_cartao on public.kanban_notas (cartao_id, criado_em desc);
create index if not exists idx_kanban_notas_user on public.kanban_notas (user_id);

-- ---------------------------------------------------------------------------
-- 6. KANBAN — CHECKLIST
-- ---------------------------------------------------------------------------
create table if not exists public.kanban_checklist (
  id        uuid primary key default gen_random_uuid(),
  cartao_id uuid not null references public.kanban_cartoes (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  item      text not null,
  feito     boolean not null default false,
  ordem     integer not null default 0,
  criado_em timestamptz not null default now()
);
create index if not exists idx_kanban_checklist_cartao on public.kanban_checklist (cartao_id, ordem);
create index if not exists idx_kanban_checklist_user on public.kanban_checklist (user_id);

-- ---------------------------------------------------------------------------
-- 7. KANBAN — HISTÓRICO DE MOVIMENTAÇÃO
-- ---------------------------------------------------------------------------
create table if not exists public.kanban_historico (
  id          uuid primary key default gen_random_uuid(),
  cartao_id   uuid not null references public.kanban_cartoes (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  de_coluna   uuid,
  para_coluna uuid,
  criado_em   timestamptz not null default now()
);
create index if not exists idx_kanban_historico_cartao on public.kanban_historico (cartao_id, criado_em desc);
create index if not exists idx_kanban_historico_user on public.kanban_historico (user_id);

-- ---------------------------------------------------------------------------
-- 8. Trigger atualizado_em (função própria, não altera a da Estação)
-- ---------------------------------------------------------------------------
create or replace function public.analista_set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['analista_config','analista_analises','kanban_colunas','kanban_cartoes']
  loop
    execute format('drop trigger if exists trg_%1$s_atualizado on public.%1$s', t);
    execute format(
      'create trigger trg_%1$s_atualizado before update on public.%1$s for each row execute function public.analista_set_atualizado_em()',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 9. RLS + policies (cada usuário só acessa o próprio user_id)
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'analista_config','analista_analises','kanban_colunas','kanban_cartoes',
    'kanban_notas','kanban_checklist','kanban_historico'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "%s_select_own" on public.%I', t, t);
    execute format('drop policy if exists "%s_insert_own" on public.%I', t, t);
    execute format('drop policy if exists "%s_update_own" on public.%I', t, t);
    execute format('drop policy if exists "%s_delete_own" on public.%I', t, t);

    execute format(
      'create policy "%s_select_own" on public.%I for select using (user_id = auth.uid())', t, t
    );
    execute format(
      'create policy "%s_insert_own" on public.%I for insert with check (user_id = auth.uid())', t, t
    );
    execute format(
      'create policy "%s_update_own" on public.%I for update using (user_id = auth.uid()) with check (user_id = auth.uid())', t, t
    );
    execute format(
      'create policy "%s_delete_own" on public.%I for delete using (user_id = auth.uid())', t, t
    );
  end loop;
end $$;
