-- ============================================================================
-- COBRANÇA ASAAS (painel de assinaturas)
--
-- Mudanças ADITIVAS sobre estruturas existentes:
--   * Adiciona colunas ASAAS na tabela public.user_planos (NÃO recria/redefine).
--   * Cria a tabela public.asaas_webhook_events para IDEMPOTÊNCIA dos webhooks.
--
-- Não altera nada existente (alertas, analises, contratacoes, etc.).
--
-- Aplicar via: SQL Editor do Supabase (ou supabase db push).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Colunas ASAAS em user_planos (aditivas, com DEFAULT seguro).
--    `origem` passa a aceitar também 'asaas' (soma ao check existente).
-- ---------------------------------------------------------------------------
alter table public.user_planos
  add column if not exists asaas_customer_id    text,
  add column if not exists asaas_subscription_id text,
  add column if not exists status_pagamento     text default 'none'
    check (status_pagamento in
      ('none','trial','active','payment_pending','overdue','canceled','blocked')),
  add column if not exists payment_method       text default 'none'
    check (payment_method in ('none','credit_card','pix')),
  add column if not exists next_due_date        timestamptz,
  add column if not exists last_payment_at      timestamptz,
  add column if not exists canceled_at          timestamptz;

-- Permite origem 'asaas' no registrador de usuários cobrados via ASAAS.
do $$
begin
  -- Recria o CHECK de origem para incluir 'asaas' (drop + add).
  execute 'alter table public.user_planos drop constraint if exists user_planos_origem_check';
  execute 'alter table public.user_planos add constraint user_planos_origem_check check (origem in (''trial'', ''manual'', ''asaas''))';
end $$;

-- ---------------------------------------------------------------------------
-- 2. Tabela de idempotência dos webhooks ASAAS.
--    O mesmo event_id NUNCA é processado duas vezes.
-- ---------------------------------------------------------------------------
create table if not exists public.asaas_webhook_events (
  id           bigserial primary key,
  event_id     text not null,
  event_type   text not null,
  payload      jsonb not null,
  processed    boolean not null default false,
  created_at   timestamptz not null default now(),
  processed_at timestamptz
);

-- Garante que um mesmo event_id só exista uma vez (idempotência real).
create unique index if not exists asaas_webhook_events_event_id_uq
  on public.asaas_webhook_events (event_id);

do $$
begin
  execute 'alter table public.asaas_webhook_events enable row level security';
  -- Nenhuma política de acesso por usuário: apenas o backend (SERVICE_ROLE)
  -- insere/lê esta tabela. Nenhum acesso via anon/authenticated permitido.
end $$;
