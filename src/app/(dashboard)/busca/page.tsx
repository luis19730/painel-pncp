'use client';

import { useEffect, useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { ScoreBadge } from '@/components/opportunities/score-badge';
import FavoriteButton from '@/components/opportunities/favorite-button';
import PageHeader from '@/components/ui/page-header';
import { formatCurrency, formatDate, getDaysUntil, getDeadlineColor, getStatusColor } from '@/lib/utils';
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

const UF_OPTIONS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];
const MODALIDADES = ['Pregão Eletrônico', 'Pregão Presencial', 'Dispensa de Licitação', 'Inexigibilidade', 'Concorrência'];
const STATUSES = ['Aberta', 'Em andamento', 'Encerrada'];

function ResultsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-12 bg-slate-100 dark:bg-slate-800 rounded-full skeleton" />
            <div className="h-5 w-20 bg-slate-100 dark:bg-slate-800 rounded-full skeleton" />
          </div>
          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full skeleton" />
          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-3/4 skeleton" />
          <div className="space-y-2">
            <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2 skeleton" />
            <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/3 skeleton" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BuscaPage() {
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ uf: '', modalidade: '', status: '', valorMin: '', valorMax: '', data: '' });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput.trim()) {
        setQuery(searchInput.trim());
        setPage(1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ q: query, tipos_documento: 'edital', pagina: String(page) });
    fetch(`/api/pncp/search/?${params}`)
      .then((res) => res.json())
      .then((data) => {
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
        setLoading(false);
      })
      .catch(() => {
        setItems([]);
        setLoading(false);
      });
  }, [query, page]);

  const filteredItems = items
    .filter((i) => !filters.uf || i.uf === filters.uf)
    .filter((i) => !filters.modalidade || i.modalidade?.toLowerCase().includes(filters.modalidade.toLowerCase()))
    .filter((i) => !filters.status || (i.situacao || '').toLowerCase().includes(filters.status.toLowerCase()))
    .filter((i) => !filters.valorMin || (i.valor || 0) >= Number(filters.valorMin))
    .filter((i) => !filters.valorMax || (i.valor || 0) <= Number(filters.valorMax));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Busca Avançada"
        description="Encontre licitações com filtros detalhados"
      />

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Digite sua busca (ex: material hospitalar, TI, construção...)"
          className="w-full pl-12 pr-4 py-4 border border-slate-200 dark:border-slate-700 rounded-xl text-base bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 p-4 card bg-white dark:bg-slate-900 dark:border-slate-800">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
          <Filter className="w-4 h-4" />
          Filtros
        </div>
        <select
          value={filters.uf}
          onChange={(e) => setFilters((f) => ({ ...f, uf: e.target.value }))}
          className="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
        >
          <option value="">UF</option>
          {UF_OPTIONS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
        </select>
        <select
          value={filters.modalidade}
          onChange={(e) => setFilters((f) => ({ ...f, modalidade: e.target.value }))}
          className="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
        >
          <option value="">Modalidade</option>
          {MODALIDADES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
        >
          <option value="">Status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={filters.valorMin}
            onChange={(e) => setFilters((f) => ({ ...f, valorMin: e.target.value }))}
            placeholder="Valor mín"
            className="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm w-28 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
          />
          <span className="text-slate-400">—</span>
          <input
            type="number"
            value={filters.valorMax}
            onChange={(e) => setFilters((f) => ({ ...f, valorMax: e.target.value }))}
            placeholder="Valor máx"
            className="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm w-28 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>
        <input
          type="date"
          value={filters.data}
          onChange={(e) => setFilters((f) => ({ ...f, data: e.target.value }))}
          className="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
        />
      </div>

      {loading ? (
        <ResultsSkeleton />
      ) : filteredItems.length === 0 ? (
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 text-center py-16 px-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-primary" />
          </div>
          <p className="text-slate-500 dark:text-slate-400">Nenhum resultado encontrado para sua busca.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-500 dark:text-slate-400">{filteredItems.length} resultado(s) encontrado(s)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <a
                key={item.id}
                href={`/oportunidades/${item.id}`}
                className="card card-hover bg-white dark:bg-slate-900 dark:border-slate-800 p-4 relative"
              >
                <div className="flex items-center gap-2 mb-2">
                  <ScoreBadge score={item.score || 0} />
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(item.situacao)}`}>
                    {item.situacao || 'Aberta'}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2 mb-2">{item.objeto}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 truncate">{item.orgao}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {item.valor ? formatCurrency(item.valor) : '—'}
                  </span>
                  <span className={`text-xs font-medium ${getDeadlineColor(getDaysUntil(item.dataEncerramento))}`}>
                    {item.dataEncerramento ? formatDate(item.dataEncerramento) : '—'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-slate-400 dark:text-slate-500">
                  {item.modalidade && <span>{item.modalidade}</span>}
                  {item.uf && <span>• {item.uf}</span>}
                </div>
                <div className="absolute top-3 right-3" onClick={(e) => e.preventDefault()}>
                  <FavoriteButton pncpId={item.id} />
                </div>
              </a>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">Página {page} de {totalPages}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
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
