-- ============================================================================
-- PLANOS E TRIAL (painel de assinaturas + home)
--
-- Nova tabela — NÃO altera estruturas existentes (alertas, analises, etc.).
--
-- Todo usuário começa em plano `free` com um TRIAL de 15 dias contados do
-- cadastro (definido no backend /api/auth/cadastro). Após `trial_fim`, se não
-- houver upgrade, o usuário fica no plano `free` (limites de PLAN_LIMITS.free).
--
-- O admin pode promover manualmente um usuário para `pro`/`business` sem
-- cobrança (origem = 'manual').
--
-- Segurança: RLS habilitado. O usuário só lê/atualiza o PRÓPRIO registro
-- (user_id = auth.uid()). O admin lê/escreve todos via SERVICE_ROLE (ignora RLS).
--
-- Aplicar via: SQL Editor do Supabase (ou supabase db push).
-- ============================================================================

create table if not exists public.user_planos (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  plano        text        not null default 'free' check (plano in ('free', 'pro', 'business')),
  origem       text        not null default 'trial' check (origem in ('trial', 'manual')),
  trial_inicio timestamptz,
  trial_fim    timestamptz,
  updated_at   timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

-- RLS + políticas via bloco DO (mesmo padrão da migration de contratações),
-- evita problemas de parse de multi-statement no SQL Editor.
do $$
begin
  execute 'alter table public.user_planos enable row level security';
  execute 'drop policy if exists "user_planos select own" on public.user_planos';
  execute 'drop policy if exists "user_planos insert own" on public.user_planos';
  execute 'drop policy if exists "user_planos update own" on public.user_planos';
  execute 'create policy "user_planos select own" on public.user_planos for select using (user_id = auth.uid())';
  execute 'create policy "user_planos insert own" on public.user_planos for insert with check (user_id = auth.uid())';
  execute 'create policy "user_planos update own" on public.user_planos for update using (user_id = auth.uid())';
end $$;