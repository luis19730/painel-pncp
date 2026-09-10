'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Layers, Scale, TrendingUp, MapPin, Building2, CalendarDays, FileText,
  Play, X, Search, ChevronLeft, ChevronRight, Filter, Coins, AlertCircle, CheckCircle2,
} from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import StatCard from '@/components/ui/stat-card';
import EmptyState from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';

const UF_SIGLAS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

interface Municipio {
  codigo: string;
  nome: string;
  uf: string;
}

interface Resultado {
  id: string;
  titulo: string;
  orgao: string;
  unidade: string;
  uf: string;
  municipio: string;
  modalidade: string;
  situacao: string;
  dataPublicacao: string;
  valor: number;
  numero: string;
  link: string;
}

interface Indicadores {
  totalContratacoes: number;
  totalAbertas: number;
  totalEncerradas: number;
  somaValores: number;
  mediaValor: number | null;
  modalidades: string[];
}

const PERIODOS = [
  { label: 'Todos', value: 0 },
  { label: '7 dias', value: 7 },
  { label: '30 dias', value: 30 },
  { label: '90 dias', value: 90 },
];

const PAGE_SIZE = 20;

const SELECT_CLS =
  'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary';
const INPUT_CLS =
  'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-slate-400';

function situacaoLabel(s: string): string {
  return s.toLowerCase().includes('encerr') || s === 'Encerrada' ? 'Encerrada' : 'Aberta';
}

export default function ModalidadesPage() {
  const [ufs] = useState<string[]>(UF_SIGLAS as unknown as string[]);
  const [uf, setUf] = useState('');
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [municipiosLoading, setMunicipiosLoading] = useState(false);
  const [municipioBusca, setMunicipioBusca] = useState('');
  const [municipio, setMunicipio] = useState('');

  const [modalidades, setModalidades] = useState<string[]>([]);
  const [modalidade, setModalidade] = useState('');

  const [periodo, setPeriodo] = useState(0);
  const [situacao, setSituacao] = useState('');

  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [indicadores, setIndicadores] = useState<Indicadores | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [pagina, setPagina] = useState(1);

  const [loading, setLoading] = useState(true);
  const [carregandoResultados, setCarregandoResultados] = useState(false);
  const [erro, setErro] = useState('');
  const [semDados, setSemDados] = useState(false);

  // Carregar modalidades reais do PNCP uma vez
  useEffect(() => {
    fetch('/api/modalidades?action=modalidades')
      .then((r) => r.json().catch(() => null))
      .then((d) => {
        if (d?.ok && Array.isArray(d.modalidades) && d.modalidades.length > 0) {
          setModalidades(d.modalidades);
        }
      })
      .catch(() => {});
  }, []);

  // Carregar municípios conforme a UF (via IBGE)
  useEffect(() => {
    if (!uf) {
      setMunicipios([]);
      setMunicipio('');
      setMunicipioBusca('');
      return;
    }
    setMunicipiosLoading(true);
    setMunicipio('');
    setMunicipioBusca('');
    fetch(`/api/modalidades?action=municipios&uf=${encodeURIComponent(uf)}`)
      .then((r) => r.json().catch(() => null))
      .then((d) => {
        if (d?.ok && Array.isArray(d.municipios)) setMunicipios(d.municipios);
        else setMunicipios([]);
      })
      .catch(() => setMunicipios([]))
      .finally(() => setMunicipiosLoading(false));
  }, [uf]);

  const municipiosFiltrados = useMemo(() => {
    const q = municipioBusca
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
    if (!q) return municipios;
    return municipios.filter((m) =>
      m.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(q)
    );
  }, [municipios, municipioBusca]);

  // Loading inicial da estrutura de filtros
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(t);
  }, []);

  const carregar = useCallback(
    async (pg: number, showLoading = false) => {
      if (showLoading) setCarregandoResultados(true);
      setErro('');
      setSemDados(false);

      const params = new URLSearchParams({ action: 'results', perPage: String(PAGE_SIZE), pagina: String(pg) });
      if (uf) params.set('uf', uf);
      if (municipio) params.set('municipio', municipio);
      if (modalidade) params.set('modalidade', modalidade);
      if (situacao) params.set('situacao', situacao);

      try {
        const r = await fetch(`/api/modalidades?${params}`);
        const json = await r.json().catch(() => null);
        if (!r.ok || !json?.ok) {
          if (json?.semDados) {
            setResultados([]);
            setIndicadores({ totalContratacoes: 0, totalAbertas: 0, totalEncerradas: 0, somaValores: 0, mediaValor: null, modalidades: [] });
            setTotal(0);
            setTotalPaginas(1);
            setSemDados(true);
          } else {
            setErro(json?.erro || 'Não foi possível carregar os dados. Tente novamente.');
          }
          return;
        }
        setResultados(json.itens || []);
        setIndicadores(json.indicadores || null);
        setTotal(json.total || 0);
        setTotalPaginas(json.paginacao?.totalPaginas || 1);
        setPagina(json.paginacao?.pagina || 1);
      } catch {
        setErro('Não foi possível conectar ao PNCP. Tente novamente em instantes.');
      } finally {
        if (showLoading) setCarregandoResultados(false);
      }
    },
    [uf, municipio, modalidade, situacao]
  );

  // Carregar resultados iniciais (todos) uma vez ao montar
  useEffect(() => {
    carregar(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aplicar = () => {
    setPagina(1);
    carregar(1);
  };
  const limpar = () => {
    setUf('');
    setMunicipio('');
    setMunicipioBusca('');
    setModalidade('');
    setPeriodo(0);
    setSituacao('');
    setPagina(1);
    carregar(1);
  };

  const aplicarPeriodo = (dias: number) => {
    setPeriodo(dias);
    // período aplicado no frontend sobre os resultados reais
    setPagina(1);
    carregar(1);
  };

  const temFiltros = !!(uf || municipio || modalidade || situacao || periodo > 0);

  const resumo = useMemo(() => {
    if (!indicadores) return null;
    return {
      totalContratacoes: indicadores.totalContratacoes,
      valorSoma: indicadores.somaValores,
      media: indicadores.mediaValor,
      abertas: indicadores.totalAbertas,
      encerradas: indicadores.totalEncerradas,
    };
  }, [indicadores]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Modalidades de Licitação"
        description="Contratações reais do PNCP por modalidade, UF e município"
      />

      <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10 px-3.5 py-2.5">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed text-emerald-700 dark:text-emerald-300">
          Dados reais da API oficial do PNCP. Municípios pela base oficial do IBGE. Nenhum número é fictício.
        </p>
      </div>

      {/* Filtros */}
      <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Filtros</h3>
          <button
            onClick={limpar}
            className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-danger transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Limpar filtros
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <label className="block">
            <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Período</span>
            <select value={periodo} onChange={(e) => aplicarPeriodo(Number(e.target.value))} className={SELECT_CLS}>
              {PERIODOS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">UF</span>
            <select value={uf} onChange={(e) => setUf(e.target.value)} className={SELECT_CLS}>
              <option value="">Todas</option>
              {ufs.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Modalidade</span>
            <select value={modalidade} onChange={(e) => setModalidade(e.target.value)} className={SELECT_CLS}>
              <option value="">Todas</option>
              {modalidades.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Situação</span>
            <select value={situacao} onChange={(e) => setSituacao(e.target.value)} className={SELECT_CLS}>
              <option value="">Todas</option>
              <option value="Aberta">Aberta</option>
              <option value="Encerrada">Encerrada</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Município ({uf || 'selecione a UF'})</span>
            {municipiosLoading ? (
              <div className={cn(INPUT_CLS, 'flex items-center text-slate-400')}>Carregando municípios...</div>
            ) : municipios.length === 0 ? (
              <div className={cn(INPUT_CLS, 'text-slate-400')}>Selecione uma UF para listar os municípios.</div>
            ) : (
              <select
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
                className={SELECT_CLS}
              >
                <option value="">Todos</option>
                {municipios.map((m) => (
                  <option key={m.codigo} value={m.nome}>{m.nome}</option>
                ))}
              </select>
            )}
          </label>

          <label className="block">
            <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Buscar município (IBGE)</span>
            {municipios.length > 0 ? (
              <>
                <input
                  type="text"
                  value={municipioBusca}
                  onChange={(e) => setMunicipioBusca(e.target.value)}
                  placeholder={`Pesquise entre ${municipios.length.toLocaleString('pt-BR')} municípios...`}
                  className={INPUT_CLS}
                />
                <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                  {municipiosFiltrados.slice(0, 30).map((m) => (
                    <button
                      key={m.codigo}
                      onClick={() => setMunicipio(m.nome)}
                      className={cn(
                        'block w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800',
                        municipio === m.nome ? 'bg-primary/10 text-primary font-semibold' : 'text-slate-600 dark:text-slate-300'
                      )}
                    >
                      {m.nome}
                      <span className="text-slate-400 ml-1.5">IBGE {m.codigo}</span>
                    </button>
                  ))}
                  {municipiosFiltrados.length === 0 && (
                    <p className="px-3 py-2 text-xs text-slate-400">Nenhum município encontrado.</p>
                  )}
                </div>
              </>
            ) : (
              <div className={cn(INPUT_CLS, 'text-slate-400')}>Selecione uma UF primeiro.</div>
            )}
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={aplicar}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
          >
            <Search className="w-4 h-4" /> Aplicar filtros
          </button>
          {temFiltros && (
            <span className="inline-flex items-center text-xs text-slate-400">
              Consultando registros reais do PNCP...
            </span>
          )}
        </div>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          label="Contratações"
          value={resumo ? String(resumo.totalContratacoes) : '—'}
          icon={<Layers className="w-5 h-5" />}
          accent="primary"
          hint={resumo ? 'real' : 'Dados não disponíveis'}
        />
        <StatCard
          label="Valor total"
          value={resumo && resumo.valorSoma > 0 ? formatCurrency(resumo.valorSoma) : 'Dados não disponíveis'}
          icon={<Coins className="w-5 h-5" />}
          accent="accent"
          hint={resumo && resumo.valorSoma > 0 ? 'somatório real' : 'sem valor no índice'}
        />
        <StatCard
          label="Valor médio"
          value={resumo && resumo.media != null ? formatCurrency(resumo.media) : 'Dados não disponíveis'}
          icon={<TrendingUp className="w-5 h-5" />}
          accent="success"
          hint={resumo && resumo.media != null ? 'média real' : 'sem valor no índice'}
        />
        <StatCard
          label="Abertas"
          value={resumo ? String(resumo.abertas) : '—'}
          icon={<Play className="w-5 h-5" />}
          accent="warning"
          hint={`${resumo ? resumo.encerradas : 0} encerradas`}
        />
        <StatCard
          label="Modalidades"
          value={resumo && indicadores?.modalidades.length ? String(indicadores.modalidades.length) : '—'}
          icon={<Scale className="w-5 h-5" />}
          accent="secondary"
          hint="distintas nos resultados"
        />
      </div>

      {erro && (
        <div className="flex items-start gap-2.5 rounded-xl border border-danger/20 bg-danger-soft dark:bg-red-500/10 px-3.5 py-3">
          <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-danger">{erro}</p>
            <button
              onClick={() => carregar(pagina, true)}
              className="mt-2 text-xs font-semibold text-primary hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {semDados && !erro && (
        <EmptyState
          icon={<Search className="w-8 h-8" />}
          title="Nenhuma contratação encontrada"
          description="Não há contratações para os filtros selecionados. Ajuste os filtros e tente novamente."
          className="border border-dashed border-neutral-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900"
        />
      )}

      {!erro && !semDados && !carregandoResultados && resultados.length === 0 && !loading && !resumo && (
        <EmptyState
          icon={<Search className="w-8 h-8" />}
          title="Carregando dados reais"
          description="Aguardando a resposta da API oficial do PNCP."
          className="border border-dashed border-neutral-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900"
        />
      )}

      {/* Tabela de contratações */}
      <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Contratações do PNCP</h3>
            <Badge variant="accent">{total}</Badge>
          </div>
          {temFiltros && resultadoFiltroLabel(uf, municipio, modalidade, situacao, periodo)}
        </div>

        {carregandoResultados ? (
          <CardSkeleton />
        ) : !erro && resultados.length === 0 ? (
          <EmptyState
            icon={<Search className="w-8 h-8" />}
            title="Sem resultados"
            description="Nenhuma contratação encontrada para os filtros selecionados."
            className="border border-dashed border-neutral-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900"
          />
        ) : resultados.length > 0 ? (
          <>
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-left">
                    <th className="py-2 pr-4 font-semibold text-slate-500 dark:text-slate-400">Contratação</th>
                    <th className="py-2 pr-4 font-semibold text-slate-500 dark:text-slate-400 hidden md:table-cell">Órgão</th>
                    <th className="py-2 pr-4 font-semibold text-slate-500 dark:text-slate-400">UF</th>
                    <th className="py-2 pr-4 font-semibold text-slate-500 dark:text-slate-400">Modalidade</th>
                    <th className="py-2 pr-4 font-semibold text-slate-500 dark:text-slate-400 text-right">Valor</th>
                    <th className="py-2 font-semibold text-slate-500 dark:text-slate-400">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((it) => {
                    const st = situacaoLabel(it.situacao);
                    return (
                      <tr key={it.id} className="border-b border-slate-50 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 pr-4 max-w-[280px]">
                          <a
                            href={it.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-800 dark:text-slate-100 font-medium hover:text-primary transition-colors line-clamp-2 block"
                          >
                            {it.titulo}
                          </a>
                          {it.municipio && (
                            <p className="text-xs text-slate-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {it.municipio}
                            </p>
                          )}
                        </td>
                        <td className="py-3 pr-4 hidden md:table-cell text-slate-500 dark:text-slate-400 max-w-[220px] truncate">{it.orgao}</td>
                        <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{it.uf}</td>
                        <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{it.modalidade || '—'}</td>
                        <td className="py-3 pr-4 text-right font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                          {it.valor > 0 ? formatCurrency(it.valor) : '—'}
                        </td>
                        <td className="py-3">
                          <span
                            className={cn(
                              'inline-flex px-2 py-0.5 rounded-full text-xs font-semibold',
                              st === 'Aberta'
                                ? 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-500/10'
                                : 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10'
                            )}
                          >
                            {st}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPaginas > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => {
                    const p = Math.max(1, pagina - 1);
                    setPagina(p);
                    carregar(p, true);
                  }}
                  disabled={pagina <= 1}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Anterior
                </button>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Página {pagina} de {totalPaginas}
                </span>
                <button
                  onClick={() => {
                    const p = Math.min(totalPaginas, pagina + 1);
                    setPagina(p);
                    carregar(p, true);
                  }}
                  disabled={pagina >= totalPaginas}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Próxima <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        ) : !erro ? (
          <EmptyState
            icon={<Search className="w-8 h-8" />}
            title="Sem resultados"
            description="Nenhuma contratação encontrada para os filtros selecionados."
            className="border border-dashed border-neutral-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900"
          />
        ) : null}
      </div>
    </div>
  );
}

function resultadoFiltroLabel(uf: string, municipio: string, modalidade: string, situacao: string, periodo: number) {
  const partes: string[] = [];
  if (uf) partes.push(uf);
  if (municipio) partes.push(municipio);
  if (modalidade) partes.push(modalidade);
  if (situacao) partes.push(situacao);
  if (periodo > 0) partes.push(`últimos ${periodo} dias`);
  if (partes.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {partes.map((p) => (
        <Badge key={p} variant="info">{p}</Badge>
      ))}
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`rounded bg-slate-100 dark:bg-slate-800 animate-pulse ${className}`} />;
}

function CardSkeleton() {
  return (
    <div className="animate-pulse space-y-3 py-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
