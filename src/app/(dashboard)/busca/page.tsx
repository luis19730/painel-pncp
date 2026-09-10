'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Filter, Package, MapPin, Tag, X, AlertCircle, ClipboardList, ExternalLink } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import DataSourceNotice, { type DataSource } from '@/components/ui/data-source-notice';
import EmptyState from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { CardSkeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { searchItems } from '@/lib/market-data';
import type { ItemRecord } from '@/lib/market-data';
import { searchLiveOpportunities } from '@/lib/pncp-data';
import { buildPncpEditalUrl } from '@/lib/pncp';
import { getOpportunityStatus } from '@/lib/utils';
import { track } from '@/lib/analytics';
import type { Opportunity } from '@/types';

const SELECT_CLS =
  'border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary focus:outline-none';
const INPUT_CLS =
  'w-24 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary focus:outline-none';

const PERIODOS = [
  { label: 'Período (todos)', days: 0 },
  { label: 'Últimos 7 dias', days: 7 },
  { label: 'Últimos 30 dias', days: 30 },
  { label: 'Últimos 90 dias', days: 90 },
];

const SITUACOES = ['Aberta', 'Encerrada'];

// 27 unidades federativas oficiais do Brasil (referência fixa do território).
const UFS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

// Modalidades oficiais de licitação do PNCP (Lei 14.133/2021 e anteriores).
const MODALIDADES_PNCP = [
  'Pregão - Eletrônico',
  'Pregão - Presencial',
  'Concorrência - Eletrônica',
  'Concorrência - Presencial',
  'Concurso',
  'Leilão',
  'Diálogo Competitivo',
  'Credenciamento',
  'Dispensa',
  'Inexigibilidade',
  'Manifestação de Interesse',
  'Tomada de Preços',
];

interface FilterState {
  uf: string;
  modalidade: string;
  orgao: string;
  municipio: string;
  periodo: number;
  situacao: string;
  valorMin: string;
  valorMax: string;
}

const EMPTY_FILTERS: FilterState = {
  uf: '',
  modalidade: '',
  orgao: '',
  municipio: '',
  periodo: 0,
  situacao: '',
  valorMin: '',
  valorMax: '',
};

function situacaoOf(data: string): string {
  return getOpportunityStatus(data) === 'aberta' ? 'Aberta' : getOpportunityStatus(data) === 'encerrada' ? 'Encerrada' : 'Sem data';
}

function filtersFromUrl(): FilterState {
  if (typeof window === 'undefined') return EMPTY_FILTERS;
  const params = new URLSearchParams(window.location.search);
  const next: FilterState = { ...EMPTY_FILTERS };
  next.uf = params.get('uf') || '';
  next.modalidade = params.get('modalidade') || '';
  next.orgao = params.get('orgao') || '';
  next.municipio = params.get('municipio') || '';
  const sit = params.get('situacao') || params.get('status') || '';
  next.situacao = SITUACOES.find((s) => s.toLowerCase() === sit.toLowerCase()) || '';
  return next;
}

function queryFromUrl(): string {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  return params.get('q') || params.get('keyword') || '';
}

export default function BuscaPage() {
  const [query, setQuery] = useState<string>(() => queryFromUrl());
  const [debounced, setDebounced] = useState('');
  const [draft, setDraft] = useState<FilterState>(() => filtersFromUrl());
  const [applied, setApplied] = useState<FilterState>(() => filtersFromUrl());
  const [results, setResults] = useState<ItemRecord[]>([]);
  const [liveResults, setLiveResults] = useState<Opportunity[] | null>(null);
  const [source, setSource] = useState<DataSource>('live');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  const UF_OPTIONS = useMemo(() => UFS_BRASIL, []);
  const MODALIDADES = useMemo(() => MODALIDADES_PNCP, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    // Reset loading/error/results before the debounced async fetch keyed by
    // [debounced, applied, reload]; intentionally synchronous so the spinner
    // and cleared results reflect the new filters immediately.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(false);
    setLiveResults(null);
    const t = setTimeout(async () => {
      try {
        const valorMin = parseFloat(applied.valorMin);
        const valorMax = parseFloat(applied.valorMax);

        const query = debounced.trim() || 'licitacao';

        track({
          event: 'search',
          page: 'busca',
          props: {
            query: query.slice(0, 200),
            uf: applied.uf || null,
            modalidade: applied.modalidade || null,
            municipio: applied.municipio || null,
          },
        });

        const live = await searchLiveOpportunities(query, {
          uf: applied.uf || undefined,
          modalidade: applied.modalidade || undefined,
          municipio: applied.municipio || undefined,
          orgao: applied.orgao || undefined,
          situacao: applied.situacao || undefined,
          periodo: applied.periodo > 0 ? applied.periodo : undefined,
        });

        // A API respondeu (mesmo que o filtro corte tudo -> "nenhum
        // resultado"). Só cai na base local quando a API está inacessível.
        if (live !== null) {
          const filtered = live.filter(
            (o) =>
              (!Number.isFinite(valorMin) || !o.valor || o.valor >= valorMin) &&
              (!Number.isFinite(valorMax) || !o.valor || o.valor <= valorMax)
          );
          if (!cancelled) {
            setSource('live');
            setLiveResults(filtered);
          }
        } else {
          let list = searchItems(debounced, {
            uf: applied.uf || undefined,
            modalidade: applied.modalidade || undefined,
            data: applied.periodo > 0 ? applied.periodo : undefined,
            valorMin: Number.isFinite(valorMin) ? valorMin : undefined,
            valorMax: Number.isFinite(valorMax) ? valorMax : undefined,
          });
          list = list
            .filter((i) => !applied.orgao || i.orgao.toLowerCase().includes(applied.orgao.toLowerCase()))
            .filter((i) => !applied.municipio || i.municipio === applied.municipio)
            .filter((i) => !applied.situacao || situacaoOf(i.data) === applied.situacao);
          if (!cancelled) {
            setSource('local');
            setResults(list);
          }
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
  }, [debounced, applied, reload]);

  const hasLiveResults = !!liveResults && liveResults.length > 0;

  const setFilter = (key: keyof FilterState, value: string | number) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const applyFilters = () => {
    setApplied({ ...draft });
  };

  const clearAll = () => {
    setQuery('');
    setDebounced('');
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
  };

  const hasQuery = debounced.trim().length > 0;
  const hasFilters = applied.uf || applied.modalidade || applied.orgao || applied.municipio || applied.periodo > 0 || applied.situacao || applied.valorMin || applied.valorMax;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Busca de Itens"
        description="Pesquise itens e oportunidades públicas no PNCP"
      />

      {!loading && <DataSourceNotice source={source} />}

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Digite sua busca (ex: notebook, papel A4, limpeza, 231226...)"
          className="w-full pl-12 pr-20 py-4 border border-slate-200 dark:border-slate-700 rounded-xl text-base bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {hasQuery && (
            <button onClick={() => setQuery('')} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400" aria-label="Limpar busca">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 p-4 card bg-white dark:bg-slate-900 dark:border-slate-800">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
          <Filter className="w-4 h-4" />
          Filtros
        </div>
        <select value={draft.uf} onChange={(e) => setFilter('uf', e.target.value)} className={SELECT_CLS}>
          <option value="">UF</option>
          {UF_OPTIONS.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
        <select value={draft.modalidade} onChange={(e) => setFilter('modalidade', e.target.value)} className={SELECT_CLS}>
          <option value="">Modalidade</option>
          {MODALIDADES.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <input
          type="text"
          value={draft.orgao}
          onChange={(e) => setFilter('orgao', e.target.value)}
          placeholder="Órgão"
          className='w-56 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary focus:outline-none'
        />
        <input
          type="text"
          value={draft.municipio}
          onChange={(e) => setFilter('municipio', e.target.value)}
          placeholder="Município"
          className='w-36 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary focus:outline-none'
        />
        <select value={draft.periodo} onChange={(e) => setFilter('periodo', Number(e.target.value))} className={SELECT_CLS}>
          {PERIODOS.map((p) => (
            <option key={p.days} value={p.days}>{p.label}</option>
          ))}
        </select>
        <select value={draft.situacao} onChange={(e) => setFilter('situacao', e.target.value)} className={SELECT_CLS}>
          <option value="">Situação</option>
          {SITUACOES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          type="number"
          min="0"
          step="0.01"
          value={draft.valorMin}
          onChange={(e) => setFilter('valorMin', e.target.value)}
          placeholder="Valor mín."
          className={INPUT_CLS}
        />
        <input
          type="number"
          min="0"
          step="0.01"
          value={draft.valorMax}
          onChange={(e) => setFilter('valorMax', e.target.value)}
          placeholder="Valor máx."
          className={INPUT_CLS}
        />
        <button
          onClick={applyFilters}
          className="inline-flex items-center gap-1 rounded-xl bg-primary px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
        >
          Aplicar
        </button>
        <button
          onClick={clearAll}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-3.5 h-3.5" /> Limpar
        </button>
      </div>

      {!hasQuery && !hasFilters ? (
        <Sugestoes onPick={setQuery} />
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 text-center py-16 px-6">
          <AlertCircle className="mx-auto w-10 h-10 text-red-500 mb-3" />
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
            Não foi possível carregar os resultados. Tente novamente.
          </p>
          <button
            onClick={() => setReload((r) => r + 1)}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      ) : hasLiveResults ? (
        <>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {liveResults.length} resultado(s) encontrado(s)
          </p>
          <LiveResultList items={liveResults} />
        </>
      ) : results.length === 0 ? (
        <EmptyState
          icon={<Search className="w-8 h-8" />}
          title="Nenhum resultado encontrado"
          description="Ajuste a busca ou os filtros e tente novamente."
        />
      ) : (
        <>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {results.length} resultado(s) encontrado(s)
          </p>
          <ResultList items={results} />
        </>
      )}

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Encontrou a oportunidade certa?</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Organize agora o processo de contratação com nosso assistente passo a passo.
          </p>
        </div>
        <Link
          href="/montagem-processo"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
        >
          <ClipboardList className="w-4 h-4" /> Montar Processo
        </Link>
      </div>
    </div>
  );
}

function ResultList({ items }: { items: ItemRecord[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/oportunidades/${item.id}`}
          className="card card-hover bg-white dark:bg-slate-900 dark:border-slate-800 p-4 flex flex-col"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Badge variant="info" icon={<Tag className="w-3 h-3" />}>{item.codigo}</Badge>
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', situacaoOf(item.data) === 'Encerrada' ? 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10' : 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-500/10')}>
                {situacaoOf(item.data)}
              </span>
            </div>
            <span className="text-xs font-semibold text-primary">{formatCurrency(item.valor)}</span>
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1 line-clamp-2">{item.nome}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{item.descricao}</p>
          <div className="mt-auto space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-slate-400" />
              <span className="truncate">{item.orgao}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{item.municipio} - {item.uf}</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span>{item.modalidade.replace('de Licitação', '')}</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="truncate text-slate-400">{item.fornecedor}</span>
              <span className="text-slate-400">{formatDate(item.data)}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function LiveResultList({ items }: { items: Opportunity[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => {
        const href = buildPncpEditalUrl(item)
        return (
        <div
          key={item.id}
          className="card card-hover bg-white dark:bg-slate-900 dark:border-slate-800 p-4 flex flex-col"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Badge variant="info">{item.modalidade || 'Licitação'}</Badge>
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium',
                  item.situacao && item.situacao.toLowerCase().includes('cancelad')
                    ? 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10'
                    : 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-500/10'
                )}
              >
                {item.situacao || 'Publicada'}
              </span>
            </div>
            {item.valor ? (
              <span className="text-xs font-semibold text-primary">{formatCurrency(item.valor)}</span>
            ) : null}
          </div>
          <Link href={`/oportunidades/${item.id}`} className="group">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1 line-clamp-2 group-hover:text-primary transition-colors">{item.objeto}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-1">{item.numero}</p>
          </Link>
          <div className="mt-auto space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-slate-400" />
              <span className="truncate">{item.orgao || '—'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{item.municipio ? `${item.municipio} - ` : ''}{item.uf || '—'}</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:text-primary-hover transition-colors"
              >
                Ver no PNCP
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-slate-400">{item.dataAbertura ? formatDate(item.dataAbertura) : '—'}</span>
            </div>
          </div>
        </div>
        )
      })}
    </div>
  );
}

function Sugestoes({ onPick }: { onPick: (q: string) => void }) {
  const sugestoes = ['Notebook', 'Papel A4', 'Material de Limpeza', 'Cadeira de Escritório', 'Combustível Diesel', 'Pneus', 'Oxigênio Medicinal', 'Uniforme Escolar'];
  return (
    <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Sugestões de busca</p>
      <div className="flex flex-wrap gap-2">
        {sugestoes.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300',
              'hover:border-primary hover:text-primary'
            )}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}