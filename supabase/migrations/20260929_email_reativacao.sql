-- ============================================================================
-- CAMPANHA DE REATIVAÇÃO — e-mail pós-trial (recuperação de assinantes)
--
-- Adiciona duas colunas na tabela user_planos para o cron diário de
-- reativação saber quais usuários com trial expirado já receberam o e-mail de
-- recuperação ("Seu teste terminou — continue por R$ 19,90/mês"), evitando
-- reenvios:
--   - email_reactivation_sent    : booleano (default false)
--   - email_reactivation_sent_at : quando o e-mail foi realmente enviado
--
-- Aplicar via: SQL Editor do Supabase (ou supabase db push).
-- ============================================================================

alter table public.user_planos
  add column if not exists email_reactivation_sent boolean default false,
  add column if not exists email_reactivation_sent_at timestamptz;