-- ============================================================================
-- ANÁLISES DE EDITAL — indicadores reais (métricas)
--
-- Complemento da tabela public.analises (criada em 20260830_analises.sql).
-- Adiciona os campos e restrições necessários para os indicadores reais da
-- página /analise-edital:
--   - pncp_id            -> identificador único da contratação/edital do PNCP
--                            (CNPJ-1-SEQ/ANO), usado para evitar duplicidade.
--   - inicio_em          -> timestamp de início da análise.
--   - conclusao_em       -> timestamp de conclusão da análise.
--   - classificacao_correta -> avaliação (true=correta / false=incorreta);
--                            NULL enquanto não avaliada.
--   - avaliada_em        -> quando a classificação foi avaliada.
--   - updated_at         -> última atualização.
--
-- Tudo idempotente (add column if not exists / create ... if not exists),
-- seguro tanto para instalações novas quanto já existentes.
--
-- Aplicar via: supabase db push (ou colar no SQL Editor do Supabase).
-- ============================================================================

alter table public.analises add column if not exists pncp_id text;
alter table public.analises add column if not exists inicio_em timestamptz;
alter table public.analises add column if not exists conclusao_em timestamptz;
alter table public.analises add column if not exists classificacao_correta boolean;
alter table public.analises add column if not exists avaliada_em timestamptz;
alter table public.analises add column if not exists updated_at timestamptz default now();

-- Índices para agregação rápida das métricas
create index if not exists idx_analises_pncp     on public.analises (pncp_id);
create index if not exists idx_analises_status   on public.analises (user_id, status);
create index if not exists idx_analises_avaliada on public.analises (user_id)
  where classificacao_correta is not null;

-- GARANTE que o MESMO edital PNCP não seja contado duas vezes quando concluído.
-- Se o usuário tentar reprocessar um edital já concluído, a inserção é barrada
-- e a rota devolve a análise já existente (sem incrementar o contador).
create unique index if not exists uq_analises_pncp_concluida
  on public.analises (user_id, pncp_id)
  where pncp_id is not null and status = 'concluida';

-- Atualiza updated_at automaticamente
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_analises_updated on public.analises;
create trigger trg_analises_updated
  before update on public.analises
  for each row execute function public.set_updated_at();

-- Atualiza avaliada_em ao gravar a avaliação da classificação
create or replace function public.set_avaliacao_updated()
returns trigger language plpgsql as $$
begin
  if new.classificacao_correta is distinct from old.classificacao_correta then
    new.avaliada_em = now();
  end if;
  return new;
end $$;

drop trigger if exists trg_analises_avaliacao on public.analises;
create trigger trg_analises_avaliacao
  before update of classificacao_correta on public.analises
  for each row execute function public.set_avaliacao_updated();
