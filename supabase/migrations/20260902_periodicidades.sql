-- ============================================================================
-- PERIODICIDADES E DESCONTO PROGRESSIVO
--
-- Mudança ADITIVA sobre user_planos: adiciona a coluna `ciclo` (mensal,
-- trimestral, semestral, anual) para acompanhar a periodicidade contratada na
-- assinatura ASAAS. Não altera nada existente.
-- ============================================================================

alter table public.user_planos
  add column if not exists ciclo text default 'mensal'
    check (ciclo in ('mensal','trimestral','semestral','anual'));

-- Registros ASAAS anteriores não tinham ciclo → assumem 'mensal' (comportamento
-- histórico), mas não reescrevemos em runtime; apenas default para novos.
