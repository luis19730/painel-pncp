-- ============================================================================
-- ANALYTICS (métricas reais de uso, engajamento e conversões)
--
-- Tabela de eventos de analytics para a página administrativa /admin.
--
-- Política de segurança:
--   - INSERT: permitido a TODOS (visitantes anônimos + logados), pois o
--     tracking de pageview/busca deve funcionar mesmo sem login. O campo
--     user_id é preenchido apenas quando o usuário está logado (nullable).
--   - SELECT/UPDATE/DELETE: BLOQUEADOS por RLS — apenas o SERVICE_ROLE
--     (backend/worker) consegue ler/agregar para o dashboard /admin.
--
-- Aplicar via: supabase db push (ou colar no SQL Editor do Supabase).
-- ============================================================================

create table if not exists public.analytics_events (
  id          bigint generated always as identity primary key,
  event       text not null,          -- pageview | search | view_opportunity | signup | login | conversion
  path        text,                   -- caminho atual (ex.: /busca, /oportunidades/x)
  page        text,                   -- label de página (ex.: 'busca', 'oportunidade')
  client_id   text,                   -- id de visitante (localStorage) p/ sessões/únicos
  user_id     uuid references auth.users (id) on delete set null,
  props       jsonb,                  -- dados extras (query, resultado, origem, etc.)
  created_at  timestamptz not null default now(),
  day         date not null default (now() at time zone 'America/Sao_Paulo')::date
);

-- Índices para agregação rápida no dashboard
create index if not exists idx_analytics_created on public.analytics_events (created_at desc);
create index if not exists idx_analytics_event   on public.analytics_events (event);
create index if not exists idx_analytics_day     on public.analytics_events (day);
create index if not exists idx_analytics_page    on public.analytics_events (page);

-- RLS: sempre ativa; DELETE/UPDATE negados por padrão (nenhuma política).
alter table public.analytics_events enable row level security;

-- INSERT permitido a qualquer um (visitantes anônimos + logados).
drop policy if exists "analytics insert anyone" on public.analytics_events;
create policy "analytics insert anyone"
  on public.analytics_events for insert
  with check (true);

-- SELECT/UPDATE/DELETE: nenhuma política -> negado ao público.
-- (service_role ignora RLS e consegue ler para o /admin.)
