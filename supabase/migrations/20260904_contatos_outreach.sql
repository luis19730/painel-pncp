-- ============================================================================
-- OUTREACH — controle de envio de e-mail para os contatos extraídos.
--
-- Adiciona à `edital_contatos` o estado do envio, para garantir idempotência
-- (nunca enviar duas vezes para o mesmo e-mail) e permitir reenvio controlado
-- em caso de falha (limite de tentativas).
--
-- Aplicar via: SQL Editor do Supabase (ou supabase db push).
-- ============================================================================

alter table public.edital_contatos
  add column if not exists outreach_enviado_em timestamptz,
  add column if not exists outreach_status     text,          -- enviado | falha | opt_out
  add column if not exists outreach_tentativas int not null default 0,
  add column if not exists outreach_erro       text;

create index if not exists idx_edital_contatos_outreach
  on public.edital_contatos (outreach_enviado_em);
