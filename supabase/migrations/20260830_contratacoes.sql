-- ============================================================================
-- MÓDULO DE CONTRATAÇÕES (SINAPI + MONTAGEM INTELIGENTE DE PROCESSOS)
--
-- Novas tabelas — NÃO altera estruturas existentes (alertas, analises, etc.).
--
-- Segurança: RLS habilitado em todas. O usuário autenticado só acessa os
-- PRÓPRIOS registros (user_id = auth.uid()), mesmo padrão das demais tabelas.
--
-- Aplicar via: SQL Editor do Supabase (ou supabase db push).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Base SINAPI importada (cabeçalho + itens)
--    Dados REAIS vindos da planilha oficial da Caixa, enviada pelo usuário.
--    Nenhum valor é inventado: só existem itens que vieram do arquivo.
-- ---------------------------------------------------------------------------
create table if not exists public.sinapi_cabecalhos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  nome_arquivo text not null,
  competencia  text,                 -- ex.: '2026-07'
  uf           text,                 -- UF da planilha (ex.: 'SP')
  deson_base   text,                 -- coluna de custo base usada (desonerada)
  fonte        text not null default 'Planilha oficial SINAPI (Caixa Econômica Federal)',
  linha_inicial int,
  total_itens  int not null default 0,
  criado_em    timestamptz not null default now()
);

create table if not exists public.sinapi_itens (
  id                 uuid primary key default gen_random_uuid(),
  cabecalho_id       uuid not null references public.sinapi_cabecalhos (id) on delete cascade,
  user_id            uuid not null references auth.users (id) on delete cascade,
  codigo             text,
  descricao          text,
  unidade            text,
  tipo               text,           -- insumo | mão de obra | equipamento | composição
  custo_nao_deson    numeric(15,2),
  custo_deson        numeric(15,2),
  origem_insumo      text,           -- para composições: código do insumo (opcional)
  criado_em          timestamptz not null default now()
);

create index if not exists idx_sinapi_itens_user on public.sinapi_itens (user_id, cabecalho_id);
create index if not exists idx_sinapi_itens_desc on public.sinapi_itens (user_id, descricao);
create index if not exists idx_sinapi_itens_codigo on public.sinapi_itens (user_id, codigo);

-- ---------------------------------------------------------------------------
-- 2) Processos de contratação (instrução completa)
-- ---------------------------------------------------------------------------
create table if not exists public.processos_instrucao (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  numero         text,
  unidade        text,
  setor          text,
  responsavel    text,
  objeto         text,
  descricao      text,
  finalidade     text,
  justificativa  text,
  quantidade     numeric(18,6),
  unidade_medida text,
  valor_estimado numeric(15,2),
  prazo          text,
  tipo_objeto    text,
  nd             text,               -- natureza da despesa (ex.: 44.90.52)
  -- conteúdo das etapas de documentos (jsonb)
  dfd            jsonb,
  etp            jsonb,
  tr             jsonb,
  riscos         jsonb,
  bdi            jsonb,              -- {aplicavel, percentual, custo_direto, preco_final}
  status         text not null default 'rascunho',  -- rascunho | em_instrucao | concluido
  percentual     numeric(5,2) not null default 0,
  processo_pdf   text,               -- id do arquivo em bucket, quando gerado
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_processos_user on public.processos_instrucao (user_id, updated_at desc);

-- ---------------------------------------------------------------------------
-- 3) Itens do orçamento (inclui itens SINAPI adicionados)
-- ---------------------------------------------------------------------------
create table if not exists public.processo_itens (
  id           uuid primary key default gen_random_uuid(),
  processo_id  uuid not null references public.processos_instrucao (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  posicao      int not null default 0,
  codigo       text,
  descricao    text,
  unidade      text,
  quantidade   numeric(18,6) not null default 1,
  unitario     numeric(15,2) not null default 0,
  total        numeric(15,2) not null default 0,
  fonte        text,
  competencia  text,
  tipo         text default 'orcamento',   -- orcamento | sinapi
  criado_em    timestamptz not null default now()
);
create index if not exists idx_processo_itens_p on public.processo_itens (processo_id, posicao);

-- ---------------------------------------------------------------------------
-- 4) Pesquisa de preços
-- ---------------------------------------------------------------------------
create table if not exists public.processo_precos (
  id          uuid primary key default gen_random_uuid(),
  processo_id uuid not null references public.processos_instrucao (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  fonte       text,
  fornecedor  text,
  cnpj        text,
  data        date,
  descricao   text,
  unidade     text,
  quantidade  numeric(18,6) not null default 1,
  preco_unit  numeric(15,2) not null default 0,
  preco_total numeric(15,2) not null default 0,
  link        text,
  obs         text,
  criado_em   timestamptz not null default now()
);
create index if not exists idx_processo_precos_p on public.processo_precos (processo_id);

-- ---------------------------------------------------------------------------
-- 5) Matriz de riscos
-- ---------------------------------------------------------------------------
create table if not exists public.processo_riscos (
  id            uuid primary key default gen_random_uuid(),
  processo_id   uuid not null references public.processos_instrucao (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  risco         text,
  probabilidade text,   -- baixa | media | alta
  impacto       text,   -- baixo | medio | alto
  consequencia  text,
  tratamento    text,
  responsavel   text,
  nivel         text,   -- baixo | medio | alto | critico (derivado/transparente)
  criado_em     timestamptz not null default now()
);
create index if not exists idx_processo_riscos_p on public.processo_riscos (processo_id);

-- ---------------------------------------------------------------------------
-- 6) Checklist de documentos
-- ---------------------------------------------------------------------------
create table if not exists public.processo_documentos (
  id            uuid primary key default gen_random_uuid(),
  processo_id   uuid not null references public.processos_instrucao (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  nome          text,
  status        text not null default 'pendente',  -- completo | elaboracao | pendente | nao_aplicavel
  obrigatorio   boolean not null default true,
  justificativa text,
  responsavel   text,
  data          date,
  arquivo       text,
  obs           text,
  criado_em     timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_processo_docs_p on public.processo_documentos (processo_id);

-- ---------------------------------------------------------------------------
-- 7) Histórico / auditoria do processo
-- ---------------------------------------------------------------------------
create table if not exists public.processo_historico (
  id          uuid primary key default gen_random_uuid(),
  processo_id uuid not null references public.processos_instrucao (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  acao        text,       -- criacao | edicao | exclusao | geracao | etc.
  detalhe     jsonb,
  criado_em   timestamptz not null default now()
);
create index if not exists idx_processo_hist_p on public.processo_historico (processo_id, criado_em desc);

-- ============================================================================
-- ROW LEVEL SECURITY (todas as tabelas: só o dono acessa)
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'sinapi_cabecalhos','sinapi_itens','processos_instrucao','processo_itens',
    'processo_precos','processo_riscos','processo_documentos','processo_historico'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "%I select own" on public.%I;', t, t);
    execute format('drop policy if exists "%I insert own" on public.%I;', t, t);
    execute format('drop policy if exists "%I update own" on public.%I;', t, t);
    execute format('drop policy if exists "%I delete own" on public.%I;', t, t);
    execute format('create policy "%I select own" on public.%I for select using (user_id = auth.uid());', t, t);
    execute format('create policy "%I insert own" on public.%I for insert with check (user_id = auth.uid());', t, t);
    execute format('create policy "%I update own" on public.%I for update using (user_id = auth.uid());', t, t);
    execute format('create policy "%I delete own" on public.%I for delete using (user_id = auth.uid());', t, t);
  end loop;
end $$;
