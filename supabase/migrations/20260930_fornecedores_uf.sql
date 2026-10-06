-- ============================================================================
-- Complemento: UF do fornecedor (via participações) + recálculo com UF.
-- ============================================================================

alter table public.fornecedores add column if not exists uf text;
create index if not exists idx_fornecedores_uf on public.fornecedores (uf);

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
    cnpj, razao_social, porte, natureza_juridica, tipo_pessoa, uf,
    participacoes, vitorias, valor_total_homologado,
    primeira_participacao, ultima_participacao, updated_at
  )
  select
    p.cnpj,
    (array_agg(p.razao_social order by p.data_resultado desc nulls last))[1],
    (array_agg(p.porte order by p.data_resultado desc nulls last))[1],
    (array_agg(p.natureza_juridica order by p.data_resultado desc nulls last))[1],
    (array_agg(p.tipo_pessoa order by p.data_resultado desc nulls last))[1],
    mode() within group (order by p.uf),
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
    uf                     = excluded.uf,
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
