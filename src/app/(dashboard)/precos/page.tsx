'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Medal, TrendingUp, TrendingDown, Package, Trophy, RefreshCw, AlertCircle, Table } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import DataSourceNotice, { type DataSource } from '@/components/ui/data-source-notice';
import StatCard from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { priceStats, searchItems, ITEMS, type PriceStats, type ItemRecord } from '@/lib/market-data';
import { searchLivePriceData, priceStatsFromRecords } from '@/lib/pncp-data';

export default function PrecosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [tab, setTab] = useState<'estatisticas' | 'vencedores' | 'evolucao' | 'amostra' | 'catalogo'>('estatisticas');
  const [stats, setStats] = useState<PriceStats | null>(null);
  const [source, setSource] = useState<DataSource>('live');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  // Reset derivado (durante o render) quando a busca muda — padrão recomendado
  // em vez de chamar setState síncrono dentro de um effect.
  const resetsKey = `${debounced}|${reload}`;
  const [lastKey, setLastKey] = useState(resetsKey);
  if (lastKey !== resetsKey) {
    setLastKey(resetsKey);
    setStats(null);
    setLoading(true);
    setError(false);
  }

  useEffect(() => {
    const t = setTimeout(() => setDebounced(searchTerm), 250);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    let cancelled = false;

    const t = setTimeout(async () => {
      try {
        const live = await searchLivePriceData(debounced.trim() || 'ligacao');
        if (live && live.length > 0) {
          const s = priceStatsFromRecords(live);
          if (!cancelled) {
            setSource('live');
            setStats(s);
          }
        } else {
          const s = priceStats(debounced.trim());
          if (!cancelled) {
            setSource('local');
            setStats(s);
          }
        }
      } catch {
        if (!cancelled) {
          const s = priceStats(debounced.trim());
          setSource('local');
          setStats(s);
          setError(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [debounced, reload]);

  const itemCount = useMemo(
    () => (debounced.trim() ? searchItems(debounced.trim()).length : ITEMS.length),
    [debounced]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mapa de Preços"
        description="Análise estatística de preços de bens e serviços adquiridos pela administração pública"
      >
        <button
          onClick={() => setReload((r) => r + 1)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar dados
        </button>
      </PageHeader>

      {!loading && (
        <DataSourceNotice
          source={source}
          liveText="Dados de editais consultados na API pública do PNCP. O índice público não expõe preços unitários reais — os valores de referência são estimados a partir do catálogo de mercado local."
          localText="Sem conexão com o PNCP no momento — exibindo estimativas de referência a partir do catálogo local."
        />
      )}

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar produto ou serviço (ex: notebook, combustível, limpeza...)"
          className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
        />
      </div>

      {loading ? (
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 text-center py-16 px-6">
          <p className="text-slate-500 dark:text-slate-400">Carregando dados de preços...</p>
        </div>
      ) : error ? (
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 text-center py-16 px-6">
          <AlertCircle className="mx-auto w-10 h-10 text-red-500 mb-3" />
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
            Não foi possível carregar os dados. Tente novamente.
          </p>
          <button
            onClick={() => setReload((r) => r + 1)}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Preço de referência" value={formatCurrency(stats.referencia)} icon={<Medal className="w-5 h-5" />} accent="secondary" hint="valor orientador" />
            <StatCard label="Mediana" value={formatCurrency(stats.mediana)} icon={<TrendingUp className="w-5 h-5" />} accent="primary" hint="50% dos registros" />
            <StatCard label="Média" value={formatCurrency(stats.media)} icon={<TrendingUp className="w-5 h-5" />} accent="accent" hint="todos os registros" />
            <StatCard label="Menor" value={formatCurrency(stats.menor)} icon={<TrendingDown className="w-5 h-5" />} accent="success" hint="mínimo histórico" />
            <StatCard label="Maior" value={formatCurrency(stats.maior)} icon={<TrendingUp className="w-5 h-5" />} accent="danger" hint="máximo histórico" />
            <StatCard label="Amostra" value={stats.registros} icon={<Package className="w-5 h-5" />} accent="warning" hint="registros analisados" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">{stats.nome}{stats.codigo ? ` · Cód. ${stats.codigo}` : ''}</Badge>
            <Badge variant="accent">{itemCount} itens no catálogo</Badge>
          </div>

          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
            {[
              { key: 'estatisticas' as const, label: 'Estatísticas', icon: TrendingUp },
              { key: 'vencedores' as const, label: 'Vencedores', icon: Trophy },
              { key: 'evolucao' as const, label: 'Evolução', icon: TrendingUp },
              { key: 'catalogo' as const, label: 'Catálogo (198 itens)', icon: Package },
              { key: 'amostra' as const, label: 'Amostra completa', icon: Table },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors',
                  tab === t.key
                    ? 'border-primary text-primary border-b-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="card p-6">
            {tab === 'estatisticas' && <Estatisticas stats={stats} />}
            {tab === 'vencedores' && <Vencedores stats={stats} />}
            {tab === 'evolucao' && <Evolucao stats={stats} />}
            {tab === 'catalogo' && <Catalogo search={debounced} />}
            {tab === 'amostra' && <Amostra search={debounced} />}
          </div>
        </>
      ) : (
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 text-center py-16 px-6">
          <p className="text-slate-500 dark:text-slate-400">
            Nenhum registro encontrado para &quot;{debounced}&quot;. Tente outro termo.
          </p>
        </div>
      )}
    </div>
  );
}

function Estatisticas({ stats }: { stats: PriceStats }) {
  const max = stats.maior || 1;
  const bars = [
    { label: 'Menor', value: stats.menor, color: 'bg-emerald-500' },
    { label: 'Mediana', value: stats.mediana, color: 'bg-primary' },
    { label: 'Média', value: stats.media, color: 'bg-cyan-500' },
    { label: 'Referência', value: stats.referencia, color: 'bg-violet-500' },
    { label: 'Maior', value: stats.maior, color: 'bg-rose-500' },
  ];
  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Distribuição de preços</h3>
        <div className="space-y-3">
          {bars.map((b) => (
            <div key={b.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500 dark:text-slate-400">{b.label}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(b.value)}</span>
              </div>
              <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div className={cn('h-full rounded-full transition-all', b.color)} style={{ width: `${Math.max(6, (b.value / max) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl bg-slate-50 dark:bg-slate-800 p-5">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Faixa competitiva</h4>
          <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
            <span>{formatCurrency(stats.menor)}</span>
            <span className="font-bold text-slate-600 dark:text-slate-300">Vencedor típico: {formatCurrency(stats.mediana)}</span>
            <span>{formatCurrency(stats.maior)}</span>
          </div>
          <div className="relative h-3 rounded-full bg-slate-200 dark:bg-slate-700">
            <div className="absolute inset-y-0 rounded-full bg-gradient-to-r from-emerald-500 via-primary to-rose-500" style={{ left: '5%', width: '90%' }} />
          </div>
          <div className="flex justify-between mt-1.5 text-[11px] text-slate-400">
            <span className="text-emerald-600 dark:text-emerald-400">Alta competitividade</span>
            <span className="text-rose-600 dark:text-rose-400">Limite do mercado</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Competitividade</h3>
        <div className="rounded-xl p-5 bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 dark:text-slate-300">Preço de referência</span>
            <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(stats.referencia)}</span>
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-slate-600 dark:text-slate-300">Faixa típica de vitória</span>
            <span className="font-bold text-primary">{formatCurrency(stats.menor)} – {formatCurrency(stats.mediana)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Competitividade</span>
            <Badge variant="success">Alta abaixo da média</Badge>
          </div>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Análise estatística baseada em dados históricos disponíveis. Não é garantia de resultado —
          sempre avalie o edital completo antes de propor um lance.
        </p>
        <div className="rounded-xl border border-slate-100 dark:border-slate-800 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Para uma projeção competitiva, considere lançar até <b className="text-slate-700 dark:text-slate-200">5% abaixo da mediana</b>,
            respeitando o piso de cobertura de custos e a margem mínima desejável.
          </p>
        </div>
      </div>
    </div>
  );
}

function Vencedores({ stats }: { stats: PriceStats }) {
  return (
    <div className="overflow-x-auto">
      <p className="text-xs text-slate-400 mb-4">Vencedores para este item</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800 text-left">
            <th className="px-4 py-3 font-medium text-slate-500">Fornecedor</th>
            <th className="px-4 py-3 font-medium text-slate-500">CNPJ</th>
            <th className="px-4 py-3 font-medium text-slate-500">UF</th>
            <th className="px-4 py-3 font-medium text-slate-500">Preço</th>
            <th className="px-4 py-3 font-medium text-slate-500">Desconto vs média</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
          {stats.vencedores.map((w, i) => (
            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
              <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{w.fornecedor}</td>
              <td className="px-4 py-3 text-slate-500">{w.cnpj}</td>
              <td className="px-4 py-3 text-slate-600">{w.uf}</td>
              <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{formatCurrency(w.valor)}</td>
              <td className={cn('px-4 py-3 font-medium', w.desconto >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                {w.desconto >= 0 ? '−' : '+'}{Math.abs(w.desconto)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Evolucao({ stats }: { stats: PriceStats }) {
  const values = stats.historico;
  const max = Math.max(...values);
  const min = Math.min(...values);
  return (
    <div>
      <p className="text-xs text-slate-400 mb-4">Evolução do preço médio do produto nos últimos meses</p>
      <div className="flex items-end gap-3 h-48">
        {stats.mensal.map((m, i) => (
          <div key={m.mes} className="flex-1 flex flex-col items-center gap-2">
            <div
              className="relative w-full max-w-[40px] rounded-t-lg bg-gradient-to-t from-primary to-secondary"
              style={{ height: `${((values[i] - min) / (max - min || 1)) * 100 + 10}%` }}
            >
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                {m.valor.toLocaleString('pt-BR')}
              </span>
            </div>
            <span className="text-[11px] text-slate-400">{m.mes}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const PAGE_SIZE = 15;

function Catalogo({ search }: { search: string }) {
  const filtered = searchItems(search);
  const total = ITEMS.length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-xs text-slate-400">
          Lista completa do catálogo com <b className="text-slate-700 dark:text-slate-200">{total} itens</b>
          {search.trim()
            ? <> · mostrando <b className="text-slate-700 dark:text-slate-200">{filtered.length}</b> resultado(s) para &quot;{search}&quot;</>
            : null}
          .
        </p>
        <span className="text-xs text-slate-400">Código CATMAT/CATSER</span>
      </div>

      <div className="overflow-x-auto max-h-[560px] overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white dark:bg-slate-900">
            <tr className="border-b border-slate-100 dark:border-slate-800 text-left">
              <th className="px-4 py-3 font-medium text-slate-500">#</th>
              <th className="px-4 py-3 font-medium text-slate-500">Código</th>
              <th className="px-4 py-3 font-medium text-slate-500">Descrição do item</th>
              <th className="px-4 py-3 font-medium text-slate-500">Órgão / Local</th>
              <th className="px-4 py-3 font-medium text-slate-500">Modalidade</th>
              <th className="px-4 py-3 font-medium text-slate-500 text-right">Valor unitário</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
            {filtered.map((item: ItemRecord, idx) => (
              <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">{idx + 1}</td>
                <td className="px-4 py-2.5 text-xs font-mono text-slate-500 whitespace-nowrap">{item.codigo}</td>
                <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white min-w-[220px]">
                  <span className="block">{item.nome}</span>
                  <span className="block text-xs font-normal text-slate-400">{item.descricao}</span>
                </td>
                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                  <span className="block text-xs">{item.orgao}</span>
                  <span className="block text-xs text-slate-400">{item.uf} · {item.municipio}</span>
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{item.modalidade}</td>
                <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-white text-right whitespace-nowrap">{formatCurrency(item.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-slate-400">Nenhum item encontrado para &quot;{search}&quot;.</p>
        )}
      </div>
    </div>
  );
}

function Amostra({ search }: { search: string }) {
  const [page, setPage] = useState(1);
  const filtered = searchItems(search);
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-xs text-slate-400">
          A amostra desta análise contém <b className="text-slate-700 dark:text-slate-200">{total} itens</b>{' '}
          {search.trim() ? `(filtrados por "${search}")` : 'do catálogo'}.
        </p>
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Anterior
          </button>
          <span className="text-xs text-slate-500">
            Página <b className="text-slate-700 dark:text-slate-200">{page}</b> de {pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Próxima
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 text-left">
              <th className="px-4 py-3 font-medium text-slate-500">Código</th>
              <th className="px-4 py-3 font-medium text-slate-500">Descrição do item</th>
              <th className="px-4 py-3 font-medium text-slate-500">Órgão / Data</th>
              <th className="px-4 py-3 font-medium text-slate-500">Modalidade</th>
              <th className="px-4 py-3 font-medium text-slate-500 text-right">Valor unitário</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
            {visible.map((item: ItemRecord) => (
              <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <td className="px-4 py-3 text-xs font-mono text-slate-500 whitespace-nowrap">{item.codigo}</td>
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white min-w-[220px]">
                  <span className="block">{item.nome}</span>
                  <span className="block text-xs font-normal text-slate-400">{item.descricao}</span>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  <span className="block text-xs">{item.orgao}</span>
                  <span className="block text-xs text-slate-400">{formatDate(item.data)} · {item.uf} · {item.municipio}</span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{item.modalidade}</td>
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white text-right whitespace-nowrap">{formatCurrency(item.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-xs text-slate-400">
        <span>
          Mostrando {start + 1}–{Math.min(start + PAGE_SIZE, total) || 0} de {total} itens
        </span>
        <span>Código CATMAT/CATSER</span>
      </div>
    </div>
  );
}
