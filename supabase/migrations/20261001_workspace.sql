-- ============================================================================
-- ESTAÇÃO DE TRABALHO (workspace) — MVP
--
-- Espaço logado onde o usuário acompanha cada licitação do edital ao resultado.
--
-- Tabelas:
--   workspace_itens      -> item da estação (edital) com etapa (kanban)
--   workspace_notas      -> anotações por item
--   workspace_prazos     -> datas importantes por item (com alerta por e-mail)
--   workspace_checklist  -> checklist de habilitação por item
--
-- SEGURANÇA: RLS habilitada; cada usuário só acessa linhas com user_id = auth.uid().
-- O user_id é SEMPRE o da sessão (o backend preenche), nunca confiado do cliente.
--
-- ADITIVA: não altera nada existente.
-- Aplicar via: SQL Editor do Supabase (ou supabase db push).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. ITENS
-- ---------------------------------------------------------------------------
create table if not exists public.workspace_itens (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references auth.users (id) on delete cascade,
  numero_controle_pncp        text not null,
  orgao                       text,
  cnpj_orgao                  text,
  uf                          text,
  municipio                   text,
  objeto                      text,
  modalidade                  text,
  valor_estimado              numeric,
  data_abertura               timestamptz,
  data_encerramento_proposta  timestamptz,
  link_pncp                   text,
  etapa                       text not null default 'em_analise'
    check (etapa in ('em_analise','preparando_proposta','proposta_enviada','aguardando_resultado','ganha','perdida','descartada')),
  ordem                       integer not null default 0,
  criado_em                   timestamptz not null default now(),
  atualizado_em               timestamptz not null default now(),
  unique (user_id, numero_controle_pncp)
);

create index if not exists idx_workspace_itens_user    on public.workspace_itens (user_id);
create index if not exists idx_workspace_itens_etapa   on public.workspace_itens (etapa);
create index if not exists idx_workspace_itens_user_ord on public.workspace_itens (user_id, etapa, ordem);

-- ---------------------------------------------------------------------------
-- 2. NOTAS
-- ---------------------------------------------------------------------------
create table if not exists public.workspace_notas (
  id            uuid primary key default gen_random_uuid(),
  item_id       uuid not null references public.workspace_itens (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  texto         text not null,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists idx_workspace_notas_item on public.workspace_notas (item_id);
create index if not exists idx_workspace_notas_user on public.workspace_notas (user_id);

-- ---------------------------------------------------------------------------
-- 3. PRAZOS
-- ---------------------------------------------------------------------------
create table if not exists public.workspace_prazos (
  id              uuid primary key default gen_random_uuid(),
  item_id         uuid not null references public.workspace_itens (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  tipo            text not null default 'outro'
    check (tipo in ('abertura_sessao','limite_esclarecimentos','limite_impugnacao','envio_proposta','outro')),
  data_hora       timestamptz not null,
  titulo          text,
  concluido       boolean not null default false,
  alerta_enviado  boolean not null default false,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);
create index if not exists idx_workspace_prazos_item   on public.workspace_prazos (item_id);
create index if not exists idx_workspace_prazos_user   on public.workspace_prazos (user_id);
create index if not exists idx_workspace_prazos_data   on public.workspace_prazos (data_hora);
create index if not exists idx_workspace_prazos_alerta on public.workspace_prazos (alerta_enviado, concluido, data_hora);

-- ---------------------------------------------------------------------------
-- 4. CHECKLIST
-- ---------------------------------------------------------------------------
create table if not exists public.workspace_checklist (
  id            uuid primary key default gen_random_uuid(),
  item_id       uuid not null references public.workspace_itens (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  descricao     text not null,
  concluido     boolean not null default false,
  ordem         integer not null default 0,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists idx_workspace_checklist_item on public.workspace_checklist (item_id);
create index if not exists idx_workspace_checklist_user on public.workspace_checklist (user_id);

-- ---------------------------------------------------------------------------
-- 5. Trigger atualizado_em (função reaproveitável)
-- ---------------------------------------------------------------------------
create or replace function public.workspace_set_atualizado_em()
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
  foreach t in array array['workspace_itens','workspace_notas','workspace_prazos','workspace_checklist']
  loop
    execute format('drop trigger if exists trg_%1$s_atualizado on public.%1$s', t);
    execute format(
      'create trigger trg_%1$s_atualizado before update on public.%1$s for each row execute function public.workspace_set_atualizado_em()',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 6. RLS + policies (cada usuário só vê/edita o próprio user_id)
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['workspace_itens','workspace_notas','workspace_prazos','workspace_checklist']
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
