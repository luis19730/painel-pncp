-- ============================================================================
-- ALERTAS AUTOMÁTICOS (E-MAIL + TELEGRAM)
--
-- Tabelas para a funcionalidade da página /alertas:
--   alerts           -> definição do alerta (filtros + ativo)
--   alert_channels   -> canais de envio (e-mail / telegram) e destino
--   alert_schedules  -> modo/frequência/horário/dias do envio
--   alert_deliveries -> histórico de envio + controle de duplicidade
--
-- Aplicar via: supabase db push  (ou colar no SQL Editor do Supabase).
--
-- Segurança: RLS habilitado em todas as tabelas. O usuário autenticado só
-- acessa os PRÓPRIOS registros (user_id = auth.uid()).
-- O processador agendado (worker) usa a SERVICE_ROLE_KEY, que ignora o RLS.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. ALERTS
-- ---------------------------------------------------------------------------
create table if not exists public.alerts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  nome        text not null,
  keyword     text,
  modalidade  text,
  uf          text,
  municipio   text,
  orgao       text,
  valor_min   numeric(15,2),
  valor_max   numeric(15,2),
  data_inicial date,
  data_final  date,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.alerts enable row level security;

create policy "alerts select own"
  on public.alerts for select
  using (user_id = auth.uid());
create policy "alerts insert own"
  on public.alerts for insert
  with check (user_id = auth.uid());
create policy "alerts update own"
  on public.alerts for update
  using (user_id = auth.uid());
create policy "alerts delete own"
  on public.alerts for delete
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. ALERT_CHANNELS
-- ---------------------------------------------------------------------------
create table if not exists public.alert_channels (
  id         uuid primary key default gen_random_uuid(),
  alert_id   uuid not null references public.alerts (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  canal      text not null check (canal in ('email','telegram')),
  destino    text,
  ativo      boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.alert_channels enable row level security;

create policy "channels select own"
  on public.alert_channels for select
  using (user_id = auth.uid());
create policy "channels insert own"
  on public.alert_channels for insert
  with check (user_id = auth.uid());
create policy "channels update own"
  on public.alert_channels for update
  using (user_id = auth.uid());
create policy "channels delete own"
  on public.alert_channels for delete
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. ALERT_SCHEDULES
-- ---------------------------------------------------------------------------
create table if not exists public.alert_schedules (
  id           uuid primary key default gen_random_uuid(),
  alert_id     uuid not null unique references public.alerts (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  modo         text not null default 'imediato' check (modo in ('imediato','programado')),
  frequencia   text not null default 'imediato' check (frequencia in ('imediato','diario','semanal')),
  horario      time,
  dias_semana  integer[],
  fuso         text not null default 'America/Sao_Paulo',
  ultima_execucao timestamptz,
  created_at   timestamptz not null default now()
);

alter table public.alert_schedules enable row level security;

create policy "schedules select own"
  on public.alert_schedules for select
  using (user_id = auth.uid());
create policy "schedules insert own"
  on public.alert_schedules for insert
  with check (user_id = auth.uid());
create policy "schedules update own"
  on public.alert_schedules for update
  using (user_id = auth.uid());
create policy "schedules delete own"
  on public.alert_schedules for delete
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. ALERT_DELIVERIES  (histórico + deduplicação)
--   Controle de duplicidade: um mesmo (alerta, oportunidade, canal) só pode
--   ter UM registro de envio (unique constraint + política de inserção).
-- ---------------------------------------------------------------------------
create table if not exists public.alert_deliveries (
  id           uuid primary key default gen_random_uuid(),
  alert_id     uuid not null references public.alerts (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  canal        text not null check (canal in ('email','telegram')),
  oportunidade_id text not null,
  oportunidade_obj text,
  status       text not null default 'agendado' check (status in ('agendado','enviado','falhou')),
  erro         text,
  data_agendada timestamptz,
  data_envio   timestamptz,
  created_at   timestamptz not null default now(),
  constraint alert_deliveries_no_duplica unique (alert_id, oportunidade_id, canal)
);

create index if not exists idx_alert_deliveries_user on public.alert_deliveries (user_id, created_at desc);
create index if not exists idx_alert_deliveries_status on public.alert_deliveries (status, data_agendada);

alter table public.alert_deliveries enable row level security;

create policy "deliveries select own"
  on public.alert_deliveries for select
  using (user_id = auth.uid());
create policy "deliveries insert own"
  on public.alert_deliveries for insert
  with check (user_id = auth.uid());
create policy "deliveries update own"
  on public.alert_deliveries for update
  using (user_id = auth.uid());
create policy "deliveries delete own"
  on public.alert_deliveries for delete
  using (user_id = auth.uid());

-- Atualizar updated_at em alerts
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_alerts_updated on public.alerts;
create trigger trg_alerts_updated
  before update on public.alerts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Migração WhatsApp -> Telegram (idempotente, para instalações existentes)
--    Substitui a restrição de canal que ainda aceita 'whatsapp' por 'telegram'.
-- ---------------------------------------------------------------------------
do $$
begin
  -- alert_channels
  if exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'alert_channels' and c.conname = 'alert_channels_canal_check'
  ) then
    alter table public.alert_channels
      drop constraint alert_channels_canal_check;
  end if;
  execute 'alter table public.alert_channels add constraint alert_channels_canal_check
    check (canal in (''email'',''telegram''))';

  -- alert_deliveries
  if exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'alert_deliveries' and c.conname = 'alert_deliveries_canal_check'
  ) then
    alter table public.alert_deliveries
      drop constraint alert_deliveries_canal_check;
  end if;
  execute 'alter table public.alert_deliveries add constraint alert_deliveries_canal_check
    check (canal in (''email'',''telegram''))';
end $$;
