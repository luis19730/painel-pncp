-- ============================================================================
-- BASE DE FORNECEDORES (vencedores e licitantes) extraída do PNCP.
--
-- Fonte: endpoint de RESULTADOS por item da contratação
--   /pncp/v1/orgaos/{cnpj}/compras/{ano}/{seq}/itens/{item}/resultados
-- que publica a razão social, CNPJ (niFornecedor), porte, natureza jurídica,
-- valores e ordem de classificação de CADA participante/vencedor homologado.
--
-- O PNCP NÃO publica e-mail de fornecedor (dado pessoal/LGPD); esta base guarda
-- os dados públicos (nome + CNPJ + valores). E-mail só entraria se constasse em
-- documento do processo.
--
-- Tabelas:
--   fornecedor_participacoes  -> 1 linha por (contratação, item, CNPJ, ranking)
--   fornecedores              -> agregado por CNPJ (participações, vitórias, R$)
--   fornecedor_extracoes      -> log/estado por contratação (idempotência)
--
-- SEGURANÇA: RLS habilitada e SEM policy => só o service_role (backend/cron)
-- lê/escreve. Nada exposto publicamente.
--
-- Aplicar via: SQL Editor do Supabase (ou supabase db push).
-- ============================================================================

create table if not exists public.fornecedor_participacoes (
  id                        bigint generated always as identity primary key,
  cnpj                      text not null,
  razao_social              text,
  porte                     text,
  natureza_juridica         text,
  tipo_pessoa               text,
  pncp_id                   text not null,
  numero_item               integer not null default 0,
  orgao_cnpj                text,
  orgao_nome                text,
  uf                        text,
  municipio                 text,
  sequencial_resultado      integer,
  situacao                  text,
  valor_unitario_homologado numeric(18,4),
  quantidade_homologada     numeric(18,4),
  valor_total_homologado    numeric(18,2),
  data_resultado            timestamptz,
  created_at                timestamptz not null default now(),
  unique (pncp_id, numero_item, cnpj, sequencial_resultado)
);

create index if not exists idx_forn_part_cnpj on public.fornecedor_participacoes (cnpj);
create index if not exists idx_forn_part_uf   on public.fornecedor_participacoes (uf);
create index if not exists idx_forn_part_data on public.fornecedor_participacoes (data_resultado desc);
create index if not exists idx_forn_part_pncp on public.fornecedor_participacoes (pncp_id);

create table if not exists public.fornecedores (
  id                     bigint generated always as identity primary key,
  cnpj                   text not null unique,
  razao_social           text,
  porte                  text,
  natureza_juridica      text,
  tipo_pessoa            text,
  participacoes          integer not null default 0,
  vitorias               integer not null default 0,
  valor_total_homologado numeric(18,2) not null default 0,
  primeira_participacao  timestamptz,
  ultima_participacao    timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists idx_fornecedores_vitorias on public.fornecedores (vitorias desc);
create index if not exists idx_fornecedores_valor    on public.fornecedores (valor_total_homologado desc);
create index if not exists idx_fornecedores_partic   on public.fornecedores (participacoes desc);

create table if not exists public.fornecedor_extracoes (
  id                   bigint generated always as identity primary key,
  pncp_id              text not null unique,
  orgao_cnpj           text,
  orgao_nome           text,
  uf                   text,
  municipio            text,
  numero               text,
  data_publicacao      timestamptz,
  itens_com_resultado  integer not null default 0,
  fornecedores         integer not null default 0,
  status               text not null default 'pendente',  -- ok | sem_resultado | falha | pendente
  motivo               text,
  processado_em        timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_forn_ext_status on public.fornecedor_extracoes (status);
create index if not exists idx_forn_ext_proc   on public.fornecedor_extracoes (processado_em desc);

-- ---------------------------------------------------------------------------
-- Recalcula os agregados de `fornecedores` para um conjunto de CNPJs.
-- Chamado via RPC (service_role) após inserir participações.
-- ---------------------------------------------------------------------------
create or replace function public.recalcular_fornecedores(p_cnpjs text[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  insert into public.fornecedores (
    cnpj, razao_social, porte, natureza_juridica, tipo_pessoa,
    participacoes, vitorias, valor_total_homologado,
    primeira_participacao, ultima_participacao, updated_at
  )
  select
    p.cnpj,
    (array_agg(p.razao_social order by p.data_resultado desc nulls last))[1],
    (array_agg(p.porte order by p.data_resultado desc nulls last))[1],
    (array_agg(p.natureza_juridica order by p.data_resultado desc nulls last))[1],
    (array_agg(p.tipo_pessoa order by p.data_resultado desc nulls last))[1],
    count(*),
    count(*) filter (where p.sequencial_resultado = 1 or p.situacao ilike '%homologad%'),
    coalesce(sum(p.valor_total_homologado), 0),
    min(p.data_resultado),
    max(p.data_resultado),
    now()
  from public.fornecedor_participacoes p
  where p.cnpj = any(p_cnpjs)
  group by p.cnpj
  on conflict (cnpj) do update set
    razao_social           = excluded.razao_social,
    porte                  = excluded.porte,
    natureza_juridica      = excluded.natureza_juridica,
    tipo_pessoa            = excluded.tipo_pessoa,
    participacoes          = excluded.participacoes,
    vitorias               = excluded.vitorias,
    valor_total_homologado = excluded.valor_total_homologado,
    primeira_participacao  = excluded.primeira_participacao,
    ultima_participacao    = excluded.ultima_participacao,
    updated_at             = now();
  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on function public.recalcular_fornecedores(text[]) to service_role;

alter table public.fornecedor_participacoes enable row level security;
alter table public.fornecedores             enable row level security;
alter table public.fornecedor_extracoes      enable row level security;
-- Nenhuma policy: acesso apenas via service_role.
