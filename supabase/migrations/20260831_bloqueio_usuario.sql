-- ============================================================================
-- BLOQUEIO MANUAL DE USUÁRIO (painel admin)
--
-- Adiciona a coluna `bloqueado` na tabela user_planos para permitir que o
-- administrador suspenda/bloqueie o acesso de um usuário imediatamente.
--   NÃO altera o fluxo normal de planos/trial; apenas adiciona a flag.
--
-- Aplicar via: SQL Editor do Supabase (ou supabase db push).
-- ============================================================================

alter table public.user_planos
  add column if not exists bloqueado boolean not null default false;
