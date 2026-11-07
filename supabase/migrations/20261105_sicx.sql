-- ============================================================================
-- SICX (Sistema de Compras Expressas) — página /credenciamento-sicx
--
-- ADITIVA: não altera nenhuma tabela existente.
--
-- CONTEÚDO (admin escreve, público lê):
--   sicx_status          -> quadro de status editável
--   sicx_normas          -> normas, portais e leituras recomendadas
--   sicx_almoxarifados   -> diretório de almoxarifados virtuais / catálogos
--   sicx_sugestoes       -> fila de sugestões de almoxarifados
--   sicx_link_reports    -> denúncias de link quebrado/desatualizado
--
-- USUÁRIO (auth.uid() = user_id):
--   sicx_checklist, sicx_preparo, sicx_interessados (captura pública),
--   sicx_ofertas, sicx_itens_salvos, sicx_contratacoes,
--   sicx_contratacoes_colunas, sicx_contratacoes_notas,
--   sicx_contratacoes_historico, sicx_alertas
--
-- ADMIN: sicx_admins + sicx_is_admin(). A função compara o e-mail do JWT com
-- a lista, então não é preciso conhecer o auth.users.id no momento do seed.
--
-- Aplicar via SQL Editor do Supabase ou:
--   node scripts/aplicar-migration.mjs supabase/migrations/20261105_sicx.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Helpers
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;

create or replace function public.sicx_set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create table if not exists public.sicx_admins (
  email text primary key,
  user_id uuid,
  created_at timestamptz not null default now()
);

alter table public.sicx_admins enable row level security;

drop policy if exists "sicx_admins_select_self" on public.sicx_admins;
create policy "sicx_admins_select_self" on public.sicx_admins
  for select using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

insert into public.sicx_admins (email)
values ('luis19730@gmail.com')
on conflict (email) do nothing;

create or replace function public.sicx_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.sicx_admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

grant execute on function public.sicx_is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1. Quadro de status (editável pelo admin)
-- ---------------------------------------------------------------------------
create table if not exists public.sicx_status (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  fonte_label text,
  fonte_url text,
  atualizado_em timestamptz not null default now(),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

alter table public.sicx_status enable row level security;

drop policy if exists "sicx_status_select_public" on public.sicx_status;
create policy "sicx_status_select_public" on public.sicx_status
  for select using (ativo = true);

drop policy if exists "sicx_status_admin_all" on public.sicx_status;
create policy "sicx_status_admin_all" on public.sicx_status
  for all using (public.sicx_is_admin()) with check (public.sicx_is_admin());

-- ---------------------------------------------------------------------------
-- 2. Normas, portais e leituras
-- ---------------------------------------------------------------------------
create table if not exists public.sicx_normas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tipo text not null default 'norma', -- lei | decreto | norma | portal | leitura
  orgao text,
  data_publicacao date,
  url text,
  verificado_em timestamptz,
  status_link text not null default 'a_verificar', -- verificado | a_verificar | em_revisao
  destaque boolean not null default false,
  ordem integer not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.sicx_normas enable row level security;

drop policy if exists "sicx_normas_select_public" on public.sicx_normas;
create policy "sicx_normas_select_public" on public.sicx_normas
  for select using (ativo = true);

drop policy if exists "sicx_normas_admin_all" on public.sicx_normas;
create policy "sicx_normas_admin_all" on public.sicx_normas
  for all using (public.sicx_is_admin()) with check (public.sicx_is_admin());

drop trigger if exists trg_sicx_normas_atualizado on public.sicx_normas;
create trigger trg_sicx_normas_atualizado
  before update on public.sicx_normas
  for each row execute function public.sicx_set_atualizado_em();

-- ---------------------------------------------------------------------------
-- 3. Diretório de almoxarifados virtuais
-- ---------------------------------------------------------------------------
create table if not exists public.sicx_almoxarifados (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  orgao text,
  esfera text not null default 'federal', -- federal | estadual | municipal | autarquia | entidade
  uf text,
  tipo text not null default 'almoxarifado_virtual', -- almoxarifado_virtual | catalogo_eletronico | marketplace_publico | compras_expressas
  situacao text not null default 'a_verificar', -- ativo | em_implantacao | a_verificar | em_revisao
  descricao text,
  como_participar text,
  url_site text,
  url_norma text,
  url_edital text,
  verificado_em timestamptz,
  status_link text not null default 'a_verificar', -- verificado | a_verificar | em_revisao
  falhas_consecutivas integer not null default 0,
  situacao_anterior text,
  ordem integer not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.sicx_almoxarifados enable row level security;

-- Colunas de verificação de links (idempotente para bancos migrados antes).
alter table public.sicx_almoxarifados
  add column if not exists falhas_consecutivas integer not null default 0;
alter table public.sicx_almoxarifados
  add column if not exists situacao_anterior text;

-- O público não vê registros "em revisão" (2 falhas seguidas na verificação).
drop policy if exists "sicx_almoxarifados_select_public" on public.sicx_almoxarifados;
create policy "sicx_almoxarifados_select_public" on public.sicx_almoxarifados
  for select using (ativo = true and situacao <> 'em_revisao');

drop policy if exists "sicx_almoxarifados_admin_all" on public.sicx_almoxarifados;
create policy "sicx_almoxarifados_admin_all" on public.sicx_almoxarifados
  for all using (public.sicx_is_admin()) with check (public.sicx_is_admin());

drop trigger if exists trg_sicx_almoxarifados_atualizado on public.sicx_almoxarifados;
create trigger trg_sicx_almoxarifados_atualizado
  before update on public.sicx_almoxarifados
  for each row execute function public.sicx_set_atualizado_em();

-- ---------------------------------------------------------------------------
-- 4. Sugestões e denúncias de link (qualquer pessoa pode enviar)
-- ---------------------------------------------------------------------------
create table if not exists public.sicx_sugestoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  dados jsonb not null default '{}'::jsonb,
  status text not null default 'pendente', -- pendente | aprovada | rejeitada
  created_at timestamptz not null default now()
);

alter table public.sicx_sugestoes enable row level security;

drop policy if exists "sicx_sugestoes_insert_public" on public.sicx_sugestoes;
create policy "sicx_sugestoes_insert_public" on public.sicx_sugestoes
  for insert with check (
    status = 'pendente'
    and (user_id is null or user_id = auth.uid())
  );

drop policy if exists "sicx_sugestoes_admin_all" on public.sicx_sugestoes;
create policy "sicx_sugestoes_admin_all" on public.sicx_sugestoes
  for all using (public.sicx_is_admin()) with check (public.sicx_is_admin());

create table if not exists public.sicx_link_reports (
  id uuid primary key default gen_random_uuid(),
  almoxarifado_id uuid references public.sicx_almoxarifados(id) on delete cascade,
  user_id uuid,
  motivo text not null,
  created_at timestamptz not null default now()
);

alter table public.sicx_link_reports enable row level security;

drop policy if exists "sicx_link_reports_insert_public" on public.sicx_link_reports;
create policy "sicx_link_reports_insert_public" on public.sicx_link_reports
  for insert with check (user_id is null or user_id = auth.uid());

drop policy if exists "sicx_link_reports_admin_all" on public.sicx_link_reports;
create policy "sicx_link_reports_admin_all" on public.sicx_link_reports
  for all using (public.sicx_is_admin()) with check (public.sicx_is_admin());

-- ---------------------------------------------------------------------------
-- 5. Captura de interesse (LGPD) + descadastro por token
-- ---------------------------------------------------------------------------
create table if not exists public.sicx_interessados (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  whatsapp text,
  consentimento boolean not null default false,
  origem text not null default 'pagina-sicx',
  token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  descadastrado_em timestamptz
);

create unique index if not exists sicx_interessados_email_uidx
  on public.sicx_interessados (lower(email));

alter table public.sicx_interessados enable row level security;

drop policy if exists "sicx_interessados_insert_public" on public.sicx_interessados;
create policy "sicx_interessados_insert_public" on public.sicx_interessados
  for insert with check (consentimento = true);

drop policy if exists "sicx_interessados_admin_all" on public.sicx_interessados;
create policy "sicx_interessados_admin_all" on public.sicx_interessados
  for all using (public.sicx_is_admin()) with check (public.sicx_is_admin());

create or replace function public.sicx_descadastrar(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.sicx_interessados
     set descadastrado_em = now()
   where token = p_token
     and descadastrado_em is null;
  return found;
end;
$$;

grant execute on function public.sicx_descadastrar(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Checklist "Meu preparo" + data-alvo
-- ---------------------------------------------------------------------------
create table if not exists public.sicx_checklist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  item_key text not null,
  feito boolean not null default false,
  validade date,
  updated_at timestamptz not null default now(),
  unique (user_id, item_key)
);

alter table public.sicx_checklist enable row level security;

drop policy if exists "sicx_checklist_select_own" on public.sicx_checklist;
create policy "sicx_checklist_select_own" on public.sicx_checklist
  for select using (user_id = auth.uid());
drop policy if exists "sicx_checklist_insert_own" on public.sicx_checklist;
create policy "sicx_checklist_insert_own" on public.sicx_checklist
  for insert with check (user_id = auth.uid());
drop policy if exists "sicx_checklist_update_own" on public.sicx_checklist;
create policy "sicx_checklist_update_own" on public.sicx_checklist
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "sicx_checklist_delete_own" on public.sicx_checklist;
create policy "sicx_checklist_delete_own" on public.sicx_checklist
  for delete using (user_id = auth.uid());

create table if not exists public.sicx_preparo (
  user_id uuid primary key,
  data_alvo date,
  updated_at timestamptz not null default now()
);

alter table public.sicx_preparo enable row level security;

drop policy if exists "sicx_preparo_select_own" on public.sicx_preparo;
create policy "sicx_preparo_select_own" on public.sicx_preparo
  for select using (user_id = auth.uid());
drop policy if exists "sicx_preparo_insert_own" on public.sicx_preparo;
create policy "sicx_preparo_insert_own" on public.sicx_preparo
  for insert with check (user_id = auth.uid());
drop policy if exists "sicx_preparo_update_own" on public.sicx_preparo;
create policy "sicx_preparo_update_own" on public.sicx_preparo
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "sicx_preparo_delete_own" on public.sicx_preparo;
create policy "sicx_preparo_delete_own" on public.sicx_preparo
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 7. Ferramentas do fornecedor
-- ---------------------------------------------------------------------------
create table if not exists public.sicx_ofertas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  categoria text not null default 'outros',
  descricao text not null,
  unidade text,
  preco numeric(14,2) not null default 0,
  estoque integer,
  prazo_dias integer,
  frete_por_uf jsonb not null default '{}'::jsonb,
  condicoes jsonb not null default '{}'::jsonb,
  custo_unitario numeric(14,2),
  margem_pct numeric(8,2),
  indice_competitividade integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sicx_ofertas enable row level security;

drop policy if exists "sicx_ofertas_select_own" on public.sicx_ofertas;
create policy "sicx_ofertas_select_own" on public.sicx_ofertas
  for select using (user_id = auth.uid());
drop policy if exists "sicx_ofertas_insert_own" on public.sicx_ofertas;
create policy "sicx_ofertas_insert_own" on public.sicx_ofertas
  for insert with check (user_id = auth.uid());
drop policy if exists "sicx_ofertas_update_own" on public.sicx_ofertas;
create policy "sicx_ofertas_update_own" on public.sicx_ofertas
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "sicx_ofertas_delete_own" on public.sicx_ofertas;
create policy "sicx_ofertas_delete_own" on public.sicx_ofertas
  for delete using (user_id = auth.uid());

drop trigger if exists trg_sicx_ofertas_atualizado on public.sicx_ofertas;
create trigger trg_sicx_ofertas_atualizado
  before update on public.sicx_ofertas
  for each row execute function public.sicx_set_atualizado_em();

create table if not exists public.sicx_itens_salvos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  termo text not null,
  filtros jsonb not null default '{}'::jsonb,
  alerta_ativo boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, termo)
);

alter table public.sicx_itens_salvos enable row level security;

drop policy if exists "sicx_itens_salvos_select_own" on public.sicx_itens_salvos;
create policy "sicx_itens_salvos_select_own" on public.sicx_itens_salvos
  for select using (user_id = auth.uid());
drop policy if exists "sicx_itens_salvos_insert_own" on public.sicx_itens_salvos;
create policy "sicx_itens_salvos_insert_own" on public.sicx_itens_salvos
  for insert with check (user_id = auth.uid());
drop policy if exists "sicx_itens_salvos_update_own" on public.sicx_itens_salvos;
create policy "sicx_itens_salvos_update_own" on public.sicx_itens_salvos
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "sicx_itens_salvos_delete_own" on public.sicx_itens_salvos;
create policy "sicx_itens_salvos_delete_own" on public.sicx_itens_salvos
  for delete using (user_id = auth.uid());

create table if not exists public.sicx_contratacoes_colunas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  nome text not null,
  ordem integer not null default 0,
  cor text not null default 'slate',
  created_at timestamptz not null default now(),
  unique (user_id, nome)
);

alter table public.sicx_contratacoes_colunas enable row level security;

drop policy if exists "sicx_contratacoes_colunas_select_own" on public.sicx_contratacoes_colunas;
create policy "sicx_contratacoes_colunas_select_own" on public.sicx_contratacoes_colunas
  for select using (user_id = auth.uid());
drop policy if exists "sicx_contratacoes_colunas_insert_own" on public.sicx_contratacoes_colunas;
create policy "sicx_contratacoes_colunas_insert_own" on public.sicx_contratacoes_colunas
  for insert with check (user_id = auth.uid());
drop policy if exists "sicx_contratacoes_colunas_update_own" on public.sicx_contratacoes_colunas;
create policy "sicx_contratacoes_colunas_update_own" on public.sicx_contratacoes_colunas
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "sicx_contratacoes_colunas_delete_own" on public.sicx_contratacoes_colunas;
create policy "sicx_contratacoes_colunas_delete_own" on public.sicx_contratacoes_colunas
  for delete using (user_id = auth.uid());

create table if not exists public.sicx_contratacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  coluna_id uuid references public.sicx_contratacoes_colunas(id) on delete set null,
  ordem integer not null default 0,
  orgao text,
  item text not null,
  quantidade numeric(14,3),
  valor numeric(14,2),
  datas jsonb not null default '{}'::jsonb,
  anexos jsonb not null default '[]'::jsonb,
  checklist jsonb not null default '[]'::jsonb,
  margem_prevista numeric(8,2),
  margem_realizada numeric(8,2),
  motivo_problema text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sicx_contratacoes enable row level security;

drop policy if exists "sicx_contratacoes_select_own" on public.sicx_contratacoes;
create policy "sicx_contratacoes_select_own" on public.sicx_contratacoes
  for select using (user_id = auth.uid());
drop policy if exists "sicx_contratacoes_insert_own" on public.sicx_contratacoes;
create policy "sicx_contratacoes_insert_own" on public.sicx_contratacoes
  for insert with check (user_id = auth.uid());
drop policy if exists "sicx_contratacoes_update_own" on public.sicx_contratacoes;
create policy "sicx_contratacoes_update_own" on public.sicx_contratacoes
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "sicx_contratacoes_delete_own" on public.sicx_contratacoes;
create policy "sicx_contratacoes_delete_own" on public.sicx_contratacoes
  for delete using (user_id = auth.uid());

drop trigger if exists trg_sicx_contratacoes_atualizado on public.sicx_contratacoes;
create trigger trg_sicx_contratacoes_atualizado
  before update on public.sicx_contratacoes
  for each row execute function public.sicx_set_atualizado_em();

create table if not exists public.sicx_contratacoes_notas (
  id uuid primary key default gen_random_uuid(),
  contratacao_id uuid not null references public.sicx_contratacoes(id) on delete cascade,
  user_id uuid not null,
  texto text not null,
  created_at timestamptz not null default now()
);

alter table public.sicx_contratacoes_notas enable row level security;

drop policy if exists "sicx_contratacoes_notas_select_own" on public.sicx_contratacoes_notas;
create policy "sicx_contratacoes_notas_select_own" on public.sicx_contratacoes_notas
  for select using (user_id = auth.uid());
drop policy if exists "sicx_contratacoes_notas_insert_own" on public.sicx_contratacoes_notas;
create policy "sicx_contratacoes_notas_insert_own" on public.sicx_contratacoes_notas
  for insert with check (user_id = auth.uid());
drop policy if exists "sicx_contratacoes_notas_update_own" on public.sicx_contratacoes_notas;
create policy "sicx_contratacoes_notas_update_own" on public.sicx_contratacoes_notas
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "sicx_contratacoes_notas_delete_own" on public.sicx_contratacoes_notas;
create policy "sicx_contratacoes_notas_delete_own" on public.sicx_contratacoes_notas
  for delete using (user_id = auth.uid());

create table if not exists public.sicx_contratacoes_historico (
  id uuid primary key default gen_random_uuid(),
  contratacao_id uuid not null references public.sicx_contratacoes(id) on delete cascade,
  user_id uuid not null,
  de_coluna text,
  para_coluna text,
  created_at timestamptz not null default now()
);

alter table public.sicx_contratacoes_historico enable row level security;

drop policy if exists "sicx_contratacoes_historico_select_own" on public.sicx_contratacoes_historico;
create policy "sicx_contratacoes_historico_select_own" on public.sicx_contratacoes_historico
  for select using (user_id = auth.uid());
drop policy if exists "sicx_contratacoes_historico_insert_own" on public.sicx_contratacoes_historico;
create policy "sicx_contratacoes_historico_insert_own" on public.sicx_contratacoes_historico
  for insert with check (user_id = auth.uid());
drop policy if exists "sicx_contratacoes_historico_update_own" on public.sicx_contratacoes_historico;
create policy "sicx_contratacoes_historico_update_own" on public.sicx_contratacoes_historico
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "sicx_contratacoes_historico_delete_own" on public.sicx_contratacoes_historico;
create policy "sicx_contratacoes_historico_delete_own" on public.sicx_contratacoes_historico
  for delete using (user_id = auth.uid());

create table if not exists public.sicx_alertas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  tipo text not null, -- item | norma | status | prazo
  referencia text not null,
  canal text not null default 'interno', -- interno | email
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, tipo, referencia)
);

alter table public.sicx_alertas enable row level security;

drop policy if exists "sicx_alertas_select_own" on public.sicx_alertas;
create policy "sicx_alertas_select_own" on public.sicx_alertas
  for select using (user_id = auth.uid());
drop policy if exists "sicx_alertas_insert_own" on public.sicx_alertas;
create policy "sicx_alertas_insert_own" on public.sicx_alertas
  for insert with check (user_id = auth.uid());
drop policy if exists "sicx_alertas_update_own" on public.sicx_alertas;
create policy "sicx_alertas_update_own" on public.sicx_alertas
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "sicx_alertas_delete_own" on public.sicx_alertas;
create policy "sicx_alertas_delete_own" on public.sicx_alertas
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 8. Índices
-- ---------------------------------------------------------------------------
create index if not exists sicx_normas_ordem_idx on public.sicx_normas (ordem, data_publicacao desc);
create index if not exists sicx_almoxarifados_filtros_idx on public.sicx_almoxarifados (esfera, uf, situacao, ordem);
create index if not exists sicx_sugestoes_status_idx on public.sicx_sugestoes (status, created_at desc);
create index if not exists sicx_link_reports_almox_idx on public.sicx_link_reports (almoxarifado_id, created_at desc);
create index if not exists sicx_ofertas_user_idx on public.sicx_ofertas (user_id, categoria);
create index if not exists sicx_itens_salvos_user_idx on public.sicx_itens_salvos (user_id);
create index if not exists sicx_contratacoes_user_idx on public.sicx_contratacoes (user_id, coluna_id, ordem);
create index if not exists sicx_contratacoes_notas_idx on public.sicx_contratacoes_notas (contratacao_id, created_at);
create index if not exists sicx_contratacoes_hist_idx on public.sicx_contratacoes_historico (contratacao_id, created_at);
create index if not exists sicx_alertas_user_idx on public.sicx_alertas (user_id, ativo);

-- Log das verificações automáticas de link (auditoria do admin).
create table if not exists public.sicx_link_verificacoes (
  id bigint generated always as identity primary key,
  entidade text not null, -- almoxarifado | norma
  entidade_id uuid,
  url text not null,
  status_http integer,
  ok boolean not null default false,
  erro text,
  created_at timestamptz not null default now()
);

alter table public.sicx_link_verificacoes enable row level security;

drop policy if exists "sicx_link_verificacoes_admin_all" on public.sicx_link_verificacoes;
create policy "sicx_link_verificacoes_admin_all" on public.sicx_link_verificacoes
  for all using (public.sicx_is_admin()) with check (public.sicx_is_admin());

grant select, insert, update, delete on public.sicx_link_verificacoes to authenticated;
create index if not exists sicx_link_verificacoes_created_idx
  on public.sicx_link_verificacoes (created_at desc);

-- ---------------------------------------------------------------------------
-- 9. Grants (RLS continua decidindo as linhas)
-- ---------------------------------------------------------------------------
grant select on public.sicx_status, public.sicx_normas, public.sicx_almoxarifados to anon, authenticated;
grant insert on public.sicx_sugestoes, public.sicx_link_reports, public.sicx_interessados to anon, authenticated;
grant select on public.sicx_admins to authenticated;

grant select, insert, update, delete on
  public.sicx_checklist,
  public.sicx_preparo,
  public.sicx_ofertas,
  public.sicx_itens_salvos,
  public.sicx_contratacoes,
  public.sicx_contratacoes_colunas,
  public.sicx_contratacoes_notas,
  public.sicx_contratacoes_historico,
  public.sicx_alertas
to authenticated;

grant select, insert, update, delete on
  public.sicx_status,
  public.sicx_normas,
  public.sicx_almoxarifados,
  public.sicx_sugestoes,
  public.sicx_link_reports,
  public.sicx_interessados
to authenticated;

-- ---------------------------------------------------------------------------
-- 10. Seed — conteúdo da BASE LEGAL
--    verificado_em = 2026-11-05 (HTTP 200 validado na implantação).
-- ---------------------------------------------------------------------------
insert into public.sicx_status (titulo, descricao, fonte_label, fonte_url, atualizado_em, ativo)
select
  'Regulamentado — aguardando plataforma e normas complementares',
  'O Decreto nº 13.106/2026 regulamentou o art. 79, IV, da Lei nº 14.133/2021 e instituiu o Sicx na Administração Pública federal. A operação prática depende da disponibilização da plataforma e de normas complementares da SEGES/MGI. Esta página não afirma que o sistema já está operando.',
  'Decreto nº 13.106/2026 (Planalto)',
  'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/d13106.htm',
  now(),
  true
where not exists (select 1 from public.sicx_status);

insert into public.sicx_normas (titulo, tipo, orgao, data_publicacao, url, verificado_em, status_link, destaque, ordem, ativo)
select * from (values
  ('Lei nº 15.266/2025 — credenciamento por comércio eletrônico', 'lei', 'Congresso Nacional', date '2025-11-24',
   'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/L15266.htm', now(), 'verificado', true, 1, true),
  ('Decreto nº 13.106/2026 — regulamenta o Sicx', 'decreto', 'Presidência da República', date '2026-08-24',
   'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/d13106.htm', now(), 'verificado', true, 2, true),
  ('Compras.gov.br / SICAF', 'portal', 'Ministério da Gestão e da Inovação em Serviços Públicos', null,
   'https://www.gov.br/compras/pt-br', now(), 'verificado', false, 3, true),
  ('PNCP — Portal Nacional de Contratações Públicas', 'portal', 'Governo Federal', null,
   'https://pncp.gov.br', now(), 'verificado', false, 4, true),
  ('Informativo nº 234 — Justen, Pereira, Oliveira e Talamini', 'leitura', 'Justen, Pereira, Oliveira e Talamini', date '2026-08-01',
   'https://justen.com.br/wp-content/uploads/2026/08/IE-234-Nester-SICX.pdf', now(), 'verificado', false, 5, true),
  ('A Administração pode instituir almoxarifados virtuais? — Zênite', 'leitura', 'Zênite', null,
   'https://zenite.blog.br/a-administracao-pode-instituir-os-denominados-almoxarifados-virtuais/', now(), 'verificado', false, 6, true)
) as v(titulo, tipo, orgao, data_publicacao, url, verificado_em, status_link, destaque, ordem, ativo)
where not exists (select 1 from public.sicx_normas);

insert into public.sicx_almoxarifados
  (nome, orgao, esfera, uf, tipo, situacao, descricao, como_participar, url_site, url_norma, url_edital, verificado_em, status_link, ordem, ativo)
select * from (values
  ('Almoxarifado Virtual Nacional (AVN)', 'Central de Compras — MGI', 'federal', null, 'almoxarifado_virtual', 'ativo',
   'Almoxarifado virtual da Administração Pública federal.',
   'A operação é centralizada pela Central de Compras do MGI. Consulte a página oficial para conhecer o catálogo e as regras de fornecimento.',
   'https://www.gov.br/gestao/pt-br/assuntos/central-de-compras/almoxarifado-virtual-nacional', null, null, now(), 'verificado', 1, true),
  ('Almoxarifado Virtual do Espírito Santo (Seger)', 'Governo do Estado do Espírito Santo — Seger', 'estadual', 'ES', 'almoxarifado_virtual', 'em_implantacao',
   'Almoxarifado virtual estadual.',
   'O edital do Pregão Eletrônico SRP nº 008/2025 foi publicado em 05/11/2025, com sessão em 25/11/2025 pelo Compras.gov.br. Consulte a notícia oficial para acompanhar o andamento.',
   'https://www.es.gov.br/Noticia/governo-do-estado-publica-edital-do-almoxarifado-virtual-e-avanca-na-modernizacao-das-compras-publicas', null, 'https://www.es.gov.br/Noticia/governo-do-estado-publica-edital-do-almoxarifado-virtual-e-avanca-na-modernizacao-das-compras-publicas', now(), 'verificado', 2, true),
  ('Almoxarifado Virtual de Minas Gerais (AVMG)', 'Secretaria de Estado de Planejamento e Gestão (Seplag-MG)', 'estadual', 'MG', 'almoxarifado_virtual', 'ativo',
   'Materiais de expediente e de informática no catálogo do AVMG.',
   'A adesão ao AVMG é formalizada por termo de adesão por órgãos e entidades do Executivo estadual; a contratação e a gestão são centralizadas pela Seplag-MG. Consulte a página oficial de adesão.',
   'https://www.mg.gov.br/planejamento/pagina/adesao', 'https://www.pesquisalegislativa.mg.gov.br/LegislacaoCompleta.aspx?cod=203331&marc=', null, now(), 'verificado', 3, true),
  ('Almoxarifado Virtual do Rio de Janeiro', 'Secretaria de Planejamento e Gestão (Seplag-RJ)', 'estadual', 'RJ', 'almoxarifado_virtual', 'ativo',
   'Materiais de consumo administrativo, de copa, de limpeza e insumos para urgências públicas.',
   'O Almoxarifado Virtual é coordenado pela Seplag-RJ e o fornecimento é contratado de forma centralizada, com entregas em todo o território do estado. Consulte a página oficial e a norma estadual.',
   'https://redelog.rj.gov.br/redelog/almoxarifado-virtual-2/', 'https://redelog.rj.gov.br/redelog/resolucao-seplag-no-359-de-19-de-marco-de-2025/', null, now(), 'verificado', 4, true),
  ('Sistema GMS / CAUFPR — Paraná', 'Secretaria da Administração e da Previdência (SEAP-PR)', 'estadual', 'PR', 'catalogo_eletronico', 'ativo',
   'Cadastro de fornecedores, catálogo de itens e almoxarifado no Sistema GMS.',
   'O cadastro de fornecedores é feito no Sistema GMS (CAUFPR). Consulte as orientações oficiais de cadastro e o portal Compras Paraná.',
   'https://www.administracao.pr.gov.br/Compras', 'https://www.administracao.pr.gov.br/Compras/SistemaGMSContratos', 'https://www.gms.pr.gov.br/gms/solicitarCadastroFornecedorNovo.do?action=iniciarProcesso', now(), 'verificado', 5, true),
  ('e-Fornecedor / SIGA — Mato Grosso do Sul', 'Secretaria de Estado de Administração (SAD-MS)', 'estadual', 'MS', 'catalogo_eletronico', 'ativo',
   'Cadastro de fornecedores (e-Fornecedor), catálogo e almoxarifado (SIGA).',
   'O cadastro de fornecedores é feito pelo e-Fornecedor e pelos sistemas SIGA do Estado. Consulte o portal Compras MS e a lista oficial de sistemas.',
   'https://www.compras.ms.gov.br/sistemas/', null, null, now(), 'verificado', 6, true)
) as v(nome, orgao, esfera, uf, tipo, situacao, descricao, como_participar, url_site, url_norma, url_edital, verificado_em, status_link, ordem, ativo)
where not exists (select 1 from public.sicx_almoxarifados);
