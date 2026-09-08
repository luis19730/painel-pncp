'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, Filter, ArrowUpDown } from 'lucide-react';
import OpportunityCard from '@/components/opportunities/opportunity-card';
import PageHeader from '@/components/ui/page-header';
import { CardSkeleton } from '@/components/ui/skeleton';
import { getDaysUntil } from '@/lib/utils';
import { mapItems } from '@/lib/pncp';
import { calculateScore } from '@/lib/scoring';
import type { CompanyProfile } from '@/types';

function loadProfile(): CompanyProfile | null {
  try {
    const raw = localStorage.getItem('perfilEmpresa')
    if (!raw) return null
    const data = JSON.parse(raw)
    return {
      id: '', user_id: '',
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
    } as CompanyProfile
  } catch { return null }
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

const UF_OPTIONS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];
const MODALIDADES = ['Pregão Eletrônico', 'Pregão Presencial', 'Dispensa de Licitação', 'Inexigibilidade', 'Concorrência', 'Leilão', 'Concurso'];
const STATUSES = ['Aberta', 'Em andamento', 'Encerrada', 'Deserta', 'Fracassada'];
const SORT_OPTIONS = [
  { value: 'relevancia', label: 'Relevância' },
  { value: 'valor_desc', label: 'Maior Valor' },
  { value: 'valor_asc', label: 'Menor Valor' },
  { value: 'prazo', label: 'Prazo mais próximo' },
  { value: 'score', label: 'Maior Score' },
];

export default function OportunidadesPage() {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ uf: '', modalidade: '', status: '', sort: 'relevancia' });

  const fetchItems = useCallback(async (query: string, pageNum: number) => {
    setLoading(true);
    try {
      const term = query.trim();
      const params = term
        ? new URLSearchParams({ q: query, tipos_documento: 'edital', pagina: String(pageNum) })
        : new URLSearchParams({ modalidade: 'todos', pagina: String(pageNum) });
      const res = await fetch(term ? `/api/pncp/search/?${params}` : `/api/pncp/mapa?${params}`);
      const data = await res.json();
      const mapped = mapItems(data.data || data.items || []);
      const profile = loadProfile();
      mapped.forEach(item => {
        if (profile) {
          const { total } = calculateScore(item, profile);
          item.score = total;
        }
      });
      setItems(mapped);
      setTotalPages(data.totalPages || data.total_pages || 1);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems(search || '', page);
  }, [page, fetchItems]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchItems(search || '', 1);
  };

  const filteredItems = items
    .filter((i) => !filters.uf || i.uf === filters.uf)
    .filter((i) => !filters.modalidade || i.modalidade?.toLowerCase().includes(filters.modalidade.toLowerCase()))
    .filter((i) => !filters.status || (i.situacao || '').toLowerCase().includes(filters.status.toLowerCase()))
    .sort((a, b) => {
      if (filters.sort === 'valor_desc') return (b.valor || 0) - (a.valor || 0);
      if (filters.sort === 'valor_asc') return (a.valor || 0) - (b.valor || 0);
      if (filters.sort === 'prazo') return getDaysUntil(a.dataEncerramento) - getDaysUntil(b.dataEncerramento);
      if (filters.sort === 'score') return (b.score || 0) - (a.score || 0);
      return 0;
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Oportunidades"
        description="Explore e filtre licitações públicas em tempo real"
      />

      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por palavra-chave..."
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
        <select
          value={filters.uf}
          onChange={(e) => setFilters((f) => ({ ...f, uf: e.target.value }))}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
        >
          <option value="">UF (Todas)</option>
          {UF_OPTIONS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
        </select>
        <select
          value={filters.modalidade}
          onChange={(e) => setFilters((f) => ({ ...f, modalidade: e.target.value }))}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
        >
          <option value="">Modalidade (Todas)</option>
          {MODALIDADES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
        >
          <option value="">Status (Todos)</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filters.sort}
            onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <GridSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.length === 0 ? (
              <div className="card p-10 text-center text-slate-400 dark:text-slate-500 col-span-full">
                Nenhuma oportunidade encontrada com os filtros selecionados.
              </div>
            ) : (
              filteredItems.map((item) => (
                <OpportunityCard key={item.id} item={item} />
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">Página {page} de {totalPages}</p>
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
