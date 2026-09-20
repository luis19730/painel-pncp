'use client';

import { useEffect, useState } from 'react';
import { Search, Filter, ArrowUpDown, AlertCircle, MapPin, Zap } from 'lucide-react';
import OpportunityCard from '@/components/opportunities/opportunity-card';
import PageHeader from '@/components/ui/page-header';
import DataSourceNotice, { type DataSource } from '@/components/ui/data-source-notice';
import EmptyState from '@/components/ui/empty-state';
import { CardSkeleton } from '@/components/ui/skeleton';
import { searchItems } from '@/lib/market-data';
import { searchLiveOpportunities } from '@/lib/pncp-data';
import { calculateScore, scoreOpportunities } from '@/lib/scoring';
import { getOpportunityStatus, cn } from '@/lib/utils';
import { itemToOpportunity } from '@/lib/opportunity';
import { UFS_BRASIL } from '@/data/municipios';
import { MODALIDADES_PNCP } from '@/lib/calendario/modalidades';
import type { Opportunity, CompanyProfile } from '@/types';

const PAGE_SIZE = 10;
const SELECT_CLS =
  'rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary focus:outline-none';

interface Filters {
  keyword: string;
  uf: string;
  modalidade: string;
  municipio: string;
  orgao: string;
  situacao: string;
  valorMin: string;
  valorMax: string;
}

const EMPTY_FILTERS: Filters = {
  keyword: '',
  uf: '',
  modalidade: '',
  municipio: '',
  orgao: '',
  situacao: '',
  valorMin: '',
  valorMax: '',
};

const SITUACOES = ['Aberta', 'Encerrada'];
const SORT_OPTIONS = [
  { value: 'score', label: 'Maior Score' },
  { value: 'valor_desc', label: 'Maior Valor' },
  { value: 'valor_asc', label: 'Menor Valor' },
  { value: 'data', label: 'Data' },
  { value: 'nome', label: 'Nome' },
];

function loadProfile(): CompanyProfile | null {
  try {
    const raw = localStorage.getItem('perfilEmpresa');
    if (!raw) return null;
    const data = JSON.parse(raw);
    return {
      id: '',
      user_id: '',
      cnpj: data.cnpj || null,
      razao_social: data.razaoSocial || null,
      nome_fantasia: data.nomeFantasia || null,
      cnaes: data.cnaes || [],
      segmentos: data.segmentos || [],
      produtos: data.produtos || [],
      servicos: data.servicos || [],
      palavras_chave: data.palavrasChave || [],
      estados: data.estados || [],
      municipios: data.municipios || [],
      valor_minimo: data.valorMinimo || null,
      valor_maximo: data.valorMaximo || null,
      modalidades: data.modalidades || [],
    } as CompanyProfile;
  } catch {
    return null;
  }
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function OportunidadesPage() {
  const [keyword, setKeyword] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState('score');
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [source, setSource] = useState<DataSource>('live');

  const UF_OPTIONS = UFS_BRASIL;
  const MODALIDADES = MODALIDADES_PNCP.map((m) => m.nome);

  useEffect(() => {
    setProfile(loadProfile());
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next: Filters = { ...EMPTY_FILTERS };
    const kw = params.get('q') || params.get('keyword') || '';
    next.keyword = kw;
    next.uf = params.get('uf') || '';
    next.modalidade = params.get('modalidade') || '';
    // Filtro dedicado do SICX / Compras Expressas (credenciamento por comércio eletrônico).
    if (params.get('sicx') === '1' && !next.modalidade) next.modalidade = 'Credenciamento';
    next.municipio = params.get('municipio') || '';
    next.orgao = params.get('orgao') || '';
    const sit = params.get('situacao') || params.get('status') || '';
    next.situacao = SITUACOES.find((s) => s.toLowerCase() === sit.toLowerCase()) || '';
    next.valorMin = params.get('valorMin') || '';
    next.valorMax = params.get('valorMax') || '';
    setFilters(next);
    if (kw) setKeyword(kw);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filters, sort]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    const t = setTimeout(async () => {
      try {
        const valorMin = parseFloat(filters.valorMin);
        const valorMax = parseFloat(filters.valorMax);

        let opportunities: Opportunity[];
        let src: DataSource = 'local';

        const live = await searchLiveOpportunities(filters.keyword || 'licitacao', {
          uf: filters.uf || undefined,
          modalidade: filters.modalidade || undefined,
          municipio: filters.municipio || undefined,
          orgao: filters.orgao || undefined,
          situacao: filters.situacao || undefined,
        });

        if (live && live.length > 0) {
          opportunities = live.filter(
            (o) =>
              (!Number.isFinite(valorMin) || !o.valor || o.valor >= valorMin) &&
              (!Number.isFinite(valorMax) || !o.valor || o.valor <= valorMax)
          );
          src = 'live';
        } else {
          let list = searchItems(filters.keyword, {
            uf: filters.uf || undefined,
            modalidade: filters.modalidade || undefined,
            valorMin: Number.isFinite(valorMin) ? valorMin : undefined,
            valorMax: Number.isFinite(valorMax) ? valorMax : undefined,
          });
          list = list
            .filter((i) => !filters.municipio || i.municipio.toLowerCase().includes(filters.municipio.toLowerCase()))
            .filter((i) => !filters.orgao || i.orgao.toLowerCase().includes(filters.orgao.toLowerCase()))
            .filter((i) => {
              if (!filters.situacao) return true;
              const st = getOpportunityStatus(i.data);
              return filters.situacao === 'Aberta' ? st === 'aberta' : st === 'encerrada';
            });
          opportunities = list.map(itemToOpportunity);
        }

        const scored = opportunities.map((opp) => ({ ...opp, score: calculateScore(opp, profile).total }));
        let sorted: Opportunity[] = scored;
        if (sort === 'valor_desc') sorted = [...scored].sort((a, b) => b.valor - a.valor);
        else if (sort === 'valor_asc') sorted = [...scored].sort((a, b) => a.valor - b.valor);
        else if (sort === 'data')
          sorted = [...scored].sort(
            (a, b) => new Date(b.dataEncerramento || b.dataAbertura).getTime() - new Date(a.dataEncerramento || a.dataAbertura).getTime()
          );
        else if (sort === 'nome') sorted = [...scored].sort((a, b) => a.objeto.localeCompare(b.objeto, 'pt-BR'));
        else sorted = scoreOpportunities(scored, profile);

        if (!cancelled) {
          setResults(sorted);
          setSource(src);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [filters, sort, profile, reload]);

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const pageResults = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const setFilter = (key: keyof Filters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((f) => ({ ...f, keyword }));
    setPage(1);
  };

  const clearFilters = () => {
    setKeyword('');
    setFilters(EMPTY_FILTERS);
    setSort('score');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Oportunidades"
        description="Explore e filtre oportunidades públicas do PNCP"
      />

      {!loading && <DataSourceNotice source={source} />}

      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Buscar por palavra-chave (nome, descrição, código, órgão, fornecedor)..."
            title="Busca por palavra-chave no objeto, órgão, município e número do edital."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <button type="submit" className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors">
          Buscar
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Filter className="w-4 h-4" />
          Filtros:
        </div>
        <select value={filters.uf} onChange={(e) => setFilter('uf', e.target.value)} className={SELECT_CLS} title="Filtra pelo estado (UF) do órgão comprador.">
          <option value="">UF (Todas)</option>
          {UF_OPTIONS.map((uf) => (
            <option key={uf} value={uf}>{uf}</option>
          ))}
        </select>
        <select value={filters.modalidade} onChange={(e) => setFilter('modalidade', e.target.value)} className={SELECT_CLS} title="Modalidade de contratação (ex.: Pregão Eletrônico, Concorrência).">
          <option value="">Modalidade (Todas)</option>
          {MODALIDADES.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setFilter('modalidade', filters.modalidade === 'Credenciamento' ? '' : 'Credenciamento')}
          title="SICX / Compras Expressas: mostra os processos de credenciamento por comércio eletrônico (Lei nº 15.266/2025 / Decreto nº 13.106/2026)."
          className={cn(
            'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors',
            filters.modalidade === 'Credenciamento'
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
          )}
        >
          <Zap className="w-3.5 h-3.5" /> SICX / Compras Expressas
        </button>
        <input
          type="text"
          value={filters.municipio}
          onChange={(e) => setFilter('municipio', e.target.value)}
          placeholder="Município"
          title="Trecho do nome do município."
          className="w-40 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
        />
        <input
          type="text"
          value={filters.orgao}
          onChange={(e) => setFilter('orgao', e.target.value)}
          placeholder="Órgão"
          title="Trecho do nome do órgão comprador."
          className="w-56 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
        />
        <select value={filters.situacao} onChange={(e) => setFilter('situacao', e.target.value)} className={SELECT_CLS} title="Editais com prazo aberto ou já encerrado.">
          <option value="">Situação (Todas)</option>
          {SITUACOES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          type="number"
          min="0"
          step="0.01"
          value={filters.valorMin}
          onChange={(e) => setFilter('valorMin', e.target.value)}
          placeholder="Valor mín."
          title="Valor estimado mínimo do edital (R$)."
          className="w-28 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
        />
        <input
          type="number"
          min="0"
          step="0.01"
          value={filters.valorMax}
          onChange={(e) => setFilter('valorMax', e.target.value)}
          placeholder="Valor máx."
          title="Valor estimado máximo do edital (R$)."
          className="w-28 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
        />
        <button
          type="button"
          onClick={clearFilters}
          className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Limpar filtros
        </button>
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <select value={sort} onChange={(e) => setSort(e.target.value)} className={SELECT_CLS}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <GridSkeleton />
      ) : error ? (
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 text-center py-12 px-6">
          <AlertCircle className="mx-auto w-10 h-10 text-red-500 mb-3" />
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
            Não foi possível carregar as oportunidades. Tente novamente.
          </p>
          <button
            onClick={() => setReload((r) => r + 1)}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      ) : results.length === 0 ? (
        <EmptyState
          icon={<MapPin className="w-8 h-8" />}
          title="Nenhuma oportunidade encontrada"
          description="Ajuste os filtros ou limpe-os para ver mais resultados."
        />
      ) : (
        <>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {results.length} oportunidade(s) encontrada(s)
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pageResults.map((item) => (
              <OpportunityCard key={item.id} item={item} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-200 transition-colors"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-200 transition-colors"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}