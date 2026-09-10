-- ============================================================================
-- ANÁLISES DE EDITAL (histórico + métricas reais)
--
-- Tabela para a funcionalidade da página /analise-edital:
--   analises -> histórico de análises realizadas pelo usuário, com os
--               metadados do edital (PNCP ou upload), o resultado da IA em
--               markdown e métricas reais de execução (tempo, modelo, status).
--
-- Segurança: RLS habilitado. O usuário autenticado só acessa os PRÓPRIOS
-- registros (user_id = auth.uid()), mesmo padrão das tabelas de alertas.
--
-- Aplicar via: supabase db push (ou colar no SQL Editor do Supabase).
-- ============================================================================

create table if not exists public.analises (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  -- metadados do edital (preenchidos quando disponíveis: origem pncp/upload)
  objeto          text,
  orgao           text,
  unidade         text,
  modalidade      text,
  cnpj            text,
  numero          text,
  uf              text,
  municipio       text,
  valor           numeric(15,2),
  data_publicacao timestamptz,
  data_encerramento timestamptz,
  link_edital     text,
  -- dados da fonte
  origem          text not null default 'texto' check (origem in ('texto','pdf','pncp')),
  nome_arquivo    text,
  conteudo_chars  int,
  -- resultado da IA
  status          text not null default 'concluida' check (status in ('concluida','erro')),
  modelo          text,
  tempo_ms        int,
  markdown        text,
  erro            text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_analises_user on public.analises (user_id, created_at desc);

alter table public.analises enable row level security;

create policy "analises select own"
  on public.analises for select
  using (user_id = auth.uid());
create policy "analises insert own"
  on public.analises for insert
  with check (user_id = auth.uid());
create policy "analises update own"
  on public.analises for update
  using (user_id = auth.uid());
create policy "analises delete own"
  on public.analises for delete
  using (user_id = auth.uid());
