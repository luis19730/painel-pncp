'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Radar, Plus, Trash2, Search, MapPin, Building2, DollarSign, Calendar, Pencil, Power, PowerOff, ExternalLink, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import EmptyState from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { formatCurrency, formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { CalendarioEvento } from '@/lib/calendario/types';
import { buildPncpEditalUrl } from '@/lib/pncp';

const UF_OPTIONS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];
const MODALIDADES = [
  'Leilão-Eletrônico', 'Leilão-Presencial', 'Diálogo Competitivo', 'Concurso',
  'Concorrência-Eletrônica', 'Concorrência-Presencial', 'Pregão-Eletrônico',
  'Pregão-Presencial', 'Dispensa', 'Inexigibilidade',
  'Manifestação de Interesse', 'Pré-qualificação', 'Credenciamento',
];
const SITUACOES = ['Aberta', 'Encerrada'];

export interface RadarSearch {
  id: string
  keyword: string
  uf: string
  modalidade: string
  cnae: string
  municipios: string
  valorMin?: number
  valorMax?: number
  situacao: string
  ativo: boolean
  createdAt: string
}

interface RadarResultado {
  ok: boolean
  atualizadoEm: string
  eventos: CalendarioEvento[]
  totalDisponivel: number
  mensagem: string | null
}

const GENERIC_STORAGE_KEY = 'meuRadar';

export default function MeuRadarPage() {
  const supabase = createClient();
  const [radars, setRadars] = useState<RadarSearch[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    keyword: '',
    uf: '',
    modalidade: '',
    cnae: '',
    municipios: '',
    valorMin: '',
    valorMax: '',
    situacao: '',
  });
  const [novoAtivo, setNovoAtivo] = useState(true);
  const [ativo, setAtivo] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [resultado, setResultado] = useState<RadarResultado | null>(null);
  const [carregando, setCarregando] = useState(false);
  const reqSeq = useRef(0);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const id = data.user?.id ?? null;
      setUserId(id);
      const key = id ? `meuRadar:${id}` : GENERIC_STORAGE_KEY;
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored) as RadarSearch[];
          setRadars(parsed);
          const firstActive = parsed.find((r) => r.ativo);
          if (firstActive) setAtivo(firstActive.id);
        }
      } catch {}
      setReady(true);
    });
    return () => { mounted = false; };
  }, [supabase]);

  const storageKey = userId ? `meuRadar:${userId}` : GENERIC_STORAGE_KEY;

  // Busca resultados REAIS do PNCP para o radar ativo.
  const buscarResultados = useCallback(async (r: RadarSearch | null, forcar = false) => {
    if (!r || !r.ativo) {
      setResultado(null);
      return;
    }
    const seq = ++reqSeq.current;
    setCarregando(true);
    try {
      const params = new URLSearchParams();
      if (r.keyword.trim()) params.set('q', r.keyword.trim());
      if (r.uf) params.set('uf', r.uf);
      if (r.modalidade) params.set('modalidade', r.modalidade);
      if (r.municipios.trim()) params.set('municipio', r.municipios.trim());
      if (r.valorMin != null) params.set('valorMin', String(r.valorMin));
      if (r.valorMax != null) params.set('valorMax', String(r.valorMax));
      if (r.situacao) params.set('situacao', r.situacao);
      params.set('paginas', '4');
      if (forcar) params.set('force', '1');
      const res = await fetch(`/api/radar?${params.toString()}`);
      const json = (await res.json()) as RadarResultado;
      if (seq !== reqSeq.current) return;
      if (!res.ok || !json.ok) {
        setResultado({ ok: false, atualizadoEm: new Date().toISOString(), eventos: [], totalDisponivel: 0, mensagem: json.mensagem });
      } else {
        setResultado(json);
      }
    } catch {
      if (seq !== reqSeq.current) return;
      setResultado({ ok: false, atualizadoEm: new Date().toISOString(), eventos: [], totalDisponivel: 0, mensagem: 'Não foi possível conectar.' });
    } finally {
      if (seq === reqSeq.current) setCarregando(false);
    }
  }, []);

  const radarAtivo = radars.find((r) => r.id === ativo) || null;
  const resultadoReal = radarAtivo && radarAtivo.ativo ? resultado : null;

  useEffect(() => {
    if (!ready) return;
    let ativo_ = true;
    const r = radars.find((x) => x.id === ativo) || null;
    ;(async () => {
      await Promise.resolve();
      if (ativo_) await buscarResultados(r);
    })();
    return () => { ativo_ = false; };
  }, [ready, radars, ativo, buscarResultados]);

  const save = (list: RadarSearch[]) => {
    setRadars(list);
    localStorage.setItem(storageKey, JSON.stringify(list));
    if (!list.some((r) => r.id === ativo)) {
      const firstActive = list.find((r) => r.ativo);
      setAtivo(firstActive ? firstActive.id : null);
    }
  };

  const resetForm = () => {
    setForm({ keyword: '', uf: '', modalidade: '', cnae: '', municipios: '', valorMin: '', valorMax: '', situacao: '' });
    setNovoAtivo(true);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.keyword.trim()) return;
    if (editingId) {
      const list = radars.map((r) =>
        r.id === editingId
          ? {
              ...r,
              keyword: form.keyword.trim(),
              uf: form.uf,
              modalidade: form.modalidade,
              cnae: form.cnae.trim(),
              municipios: form.municipios.trim(),
              valorMin: form.valorMin ? Number(form.valorMin) : undefined,
              valorMax: form.valorMax ? Number(form.valorMax) : undefined,
              situacao: form.situacao,
              ativo: novoAtivo,
            }
          : r
      );
      save(list);
      setAtivo(editingId);
      resetForm();
      setShowForm(false);
      return;
    }
    const novo: RadarSearch = {
      id: Date.now().toString(),
      keyword: form.keyword.trim(),
      uf: form.uf,
      modalidade: form.modalidade,
      cnae: form.cnae.trim(),
      municipios: form.municipios.trim(),
      valorMin: form.valorMin ? Number(form.valorMin) : undefined,
      valorMax: form.valorMax ? Number(form.valorMax) : undefined,
      situacao: form.situacao,
      ativo: novoAtivo,
      createdAt: new Date().toISOString(),
    };
    const list = [novo, ...radars];
    save(list);
    setAtivo(novo.id);
    resetForm();
    setShowForm(false);
  };

  const toggleAtivo = (id: string) => {
    const list = radars.map((r) => (r.id === id ? { ...r, ativo: !r.ativo } : r));
    save(list);
  };

  const editRadar = (r: RadarSearch) => {
    setForm({
      keyword: r.keyword,
      uf: r.uf,
      modalidade: r.modalidade,
      cnae: r.cnae,
      municipios: r.municipios,
      valorMin: r.valorMin != null ? String(r.valorMin) : '',
      valorMax: r.valorMax != null ? String(r.valorMax) : '',
      situacao: r.situacao,
    });
    setNovoAtivo(r.ativo);
    setEditingId(r.id);
    setShowForm(true);
  };

  const removeRadar = (id: string) => {
    save(radars.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meu Radar"
        description="Pesquisas salvas que cruzam oportunidades reais do PNCP com seu perfil"
      >
        <Button onClick={() => { resetForm(); setShowForm(!showForm); }} variant="primary" icon={<Plus className="w-4 h-4" />}>
          Nova Busca
        </Button>
      </PageHeader>

      <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-600 dark:text-slate-300">
        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <span>
          O radar agora consulta <strong>contratações reais</strong> do PNCP que estão recebendo propostas,
          cruzando palavra-chave, UF, modalidade, municípios e faixa de valor. Apenas licitações abertas
          geram resultados — nada é inventado.
        </span>
      </div>

      {!ready && (
        <div className="flex items-center justify-center py-10 text-sm text-slate-400">
          Carregando seu radar...
        </div>
      )}

      {ready && !userId && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-500 dark:text-slate-400">
          Você não está conectado. As buscas serão salvas localmente neste navegador e não ficam vinculadas a uma conta.
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-5 space-y-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Radar className="w-4 h-4 text-primary" />
            {editingId ? 'Editar busca do radar' : 'Configurar nova busca do radar'}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <Input
                label="Palavra-chave"
                type="text"
                value={form.keyword}
                onChange={(e) => setForm((f) => ({ ...f, keyword: e.target.value }))}
                placeholder="Ex: material hospitalar"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">UF</label>
              <select
                value={form.uf}
                onChange={(e) => setForm((f) => ({ ...f, uf: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="">Todas</option>
                {UF_OPTIONS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Modalidade</label>
              <select
                value={form.modalidade}
                onChange={(e) => setForm((f) => ({ ...f, modalidade: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="">Todas</option>
                {MODALIDADES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="sm:col-span-1">
              <Input
                label="CNAE (reserva — não filtra)"
                type="text"
                value={form.cnae}
                onChange={(e) => setForm((f) => ({ ...f, cnae: e.target.value }))}
                placeholder="Ex: 4751-2/01"
              />
            </div>
            <div className="sm:col-span-2">
              <Input
                label="Municípios (separados por vírgula)"
                type="text"
                value={form.municipios}
                onChange={(e) => setForm((f) => ({ ...f, municipios: e.target.value }))}
                placeholder="Ex: São Paulo, Campinas"
              />
            </div>
            <div>
              <Input
                label="Valor mínimo (R$)"
                type="number"
                min="0"
                value={form.valorMin}
                onChange={(e) => setForm((f) => ({ ...f, valorMin: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div>
              <Input
                label="Valor máximo (R$)"
                type="number"
                min="0"
                value={form.valorMax}
                onChange={(e) => setForm((f) => ({ ...f, valorMax: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Situação</label>
              <select
                value={form.situacao}
                onChange={(e) => setForm((f) => ({ ...f, situacao: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="">Abertas (recomendado)</option>
                {SITUACOES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">O radar consulta contratações abertas do PNCP; a opção &quot;Encerrada&quot; não gera resultados.</p>
            </div>
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={novoAtivo}
              onChange={(e) => setNovoAtivo(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">Radar ativo (participa dos alertas e da busca automática)</span>
          </label>
          <div className="flex gap-2">
            <Button type="submit" variant="primary">{editingId ? 'Salvar Alterações' : 'Salvar Busca'}</Button>
            <Button type="button" variant="secondary" onClick={() => { resetForm(); setShowForm(false); }}>Cancelar</Button>
          </div>
        </form>
      )}

      {radars.length === 0 && !showForm ? (
        <div className="space-y-4">
          <EmptyState
            icon={<Radar className="w-8 h-8" />}
            title="Nenhuma busca no radar"
            description="Crie buscas com palavra-chave, UF, modalidade, municípios e faixa de valor para monitorar contratações reais do PNCP compatíveis com a sua empresa."
            className="border border-dashed border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900"
          />
          <div className="text-center">
            <Button type="button" variant="primary" onClick={() => setShowForm(true)}>
              Criar primeira busca
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {radars.map((r) => {
            const sel = r.id === ativo;
            const contagem = r.ativo && sel ? resultadoReal?.eventos.length ?? null : null;
            return (
              <div
                key={r.id}
                onClick={() => r.ativo && setAtivo(r.id)}
                className={`card p-4 transition-colors ${
                  r.ativo ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'
                } ${
                  sel
                    ? 'bg-white dark:bg-slate-900 border-primary'
                    : 'bg-white dark:bg-slate-900 dark:border-slate-800 hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2.5 rounded-xl ${sel ? 'bg-primary-soft text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                      <Radar className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{r.keyword}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <Badge variant="accent">{r.uf || 'Todas UFs'}</Badge>
                        <Badge variant="accent">{r.modalidade || 'Todas modalidades'}</Badge>
                        {r.cnae && <Badge variant="accent">CNAE {r.cnae}</Badge>}
                        {r.municipios && <Badge variant="accent">{r.municipios}</Badge>}
                        {r.situacao && <Badge variant="accent">{r.situacao}</Badge>}
                        {r.valorMin != null && r.valorMax != null && (
                          <Badge variant="accent">{formatCurrency(r.valorMin)} – {formatCurrency(r.valorMax)}</Badge>
                        )}
                        <Badge variant={r.ativo ? 'success' : 'accent'}>{r.ativo ? 'Ativo' : 'Desativado'}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleAtivo(r.id); }}
                      className="p-2 text-slate-400 hover:text-primary hover:bg-primary-soft dark:hover:bg-primary/10 rounded-xl transition-colors"
                      title={r.ativo ? 'Desativar radar' : 'Ativar radar'}
                    >
                      {r.ativo ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); editRadar(r); }}
                      className="p-2 text-slate-400 hover:text-primary hover:bg-primary-soft dark:hover:bg-primary/10 rounded-xl transition-colors"
                      title="Editar radar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeRadar(r.id); }}
                      className="p-2 text-slate-400 hover:text-danger hover:bg-danger-soft dark:hover:bg-danger/10 rounded-xl transition-colors"
                      title="Excluir busca"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {!r.ativo
                    ? 'Radar desativado — não participa da busca nem dos alertas'
                    : sel && contagem != null
                      ? `${contagem} contratação(ões) real(is) encontrada(s) no PNCP`
                      : 'Radar ativo — selecione para ver os resultados'}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {radarAtivo && radarAtivo.ativo && (
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Resultados para «{radarAtivo.keyword}»
            </h2>
            {resultadoReal && <Badge variant="primary">{resultadoReal.eventos.length}</Badge>}
          </div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-slate-400">
              {resultadoReal?.atualizadoEm
                ? `Atualizado em ${new Date(resultadoReal.atualizadoEm).toLocaleString('pt-BR')} · dados reais do PNCP`
                : `Consultando contratações reais do PNCP (recebendo propostas)`}
            </p>
            <button
              onClick={() => { setCarregando(true); buscarResultados(radarAtivo, true); }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:underline"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} /> Atualizar
            </button>
          </div>

          {carregando && !resultadoReal?.eventos?.length ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse border border-slate-100 dark:border-slate-800 rounded-xl p-4">
                  <div className="h-4 w-2/3 rounded bg-slate-100 dark:bg-slate-800 mb-2" />
                  <div className="h-3 w-full rounded bg-slate-100 dark:bg-slate-800" />
                </div>
              ))}
            </div>
          ) : !resultadoReal?.ok ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 px-3.5 py-3 text-sm text-amber-700 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {resultadoReal?.mensagem || 'Não foi possível atualizar os dados do PNCP no momento.'}
              <button onClick={() => buscarResultados(radarAtivo, true)} className="ml-auto text-xs font-semibold underline">Tentar novamente</button>
            </div>
          ) : !resultadoReal?.eventos?.length ? (
            <EmptyState
              icon={<Search className="w-8 h-8" />}
              title="Nenhuma contratação aberta encontrada"
              description={resultadoReal?.mensagem || "Ajuste os filtros da busca ou amplie a palavra-chave. Apenas licitações reais do PNCP que estão recebendo propostas aparecem aqui."}
              className="border border-dashed border-neutral-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900"
            />
          ) : (
            <>
              <div className="space-y-3">
                {resultadoReal.eventos.slice(0, 10).map((i) => (
                  <div key={i.id} className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{i.objeto || i.numero}</p>
                      <p className="text-xs text-slate-400 mb-2">{i.modalidade || 'Modalidade não informada'}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1"><Building2 className="w-3 h-3" /> {i.orgao || '—'}</span>
                        <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {i.municipio || '—'}/{i.uf || '—'}</span>
                        <span className="inline-flex items-center gap-1"><DollarSign className="w-3 h-3" /> {i.valor != null ? formatCurrency(i.valor) : 'não informado'}</span>
                        <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> Encerra em {i.dataEncerramento ? formatDate(i.dataEncerramento) : i.dataAbertura ? formatDate(i.dataAbertura) : '—'}</span>
                      </div>
                    </div>
                    <a
                      href={buildPncpEditalUrl({ id: i.id, link: i.link })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary transition-colors shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Ver no PNCP
                    </a>
                  </div>
                ))}
              </div>
              {resultadoReal.eventos.length > 10 && (
                <p className="text-xs text-slate-400 mt-3">
                  Exibindo 10 de {resultadoReal.eventos.length} contratação(ões).
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
