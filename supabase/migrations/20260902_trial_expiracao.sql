-- ============================================================================
-- TRIAL — expiração e e-mail automático (painel admin)
--
-- Adiciona a coluna `trial_email_enviado_em` na tabela user_planos para que o
-- cron diário de expiração do trial saiba quais usuários já receberam o e-mail
-- de "período de teste encerrado", evitando envios duplicados.
--
-- O campo `trial_fim` (e `trial_inicio`) já existem desde 20260830_user_planos.
--
-- Aplicar via: SQL Editor do Supabase (ou supabase db push).
-- ============================================================================

alter table public.user_planos
  add column if not exists trial_email_enviado_em timestamptz;
