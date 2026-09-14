'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Gauge, Target, Shield, ExternalLink, Info, ClipboardList, Search } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import StatCard from '@/components/ui/stat-card';
import { cn, formatCurrency, formatDate, getScoreLabel, normalizar } from '@/lib/utils';
import { searchLiveOpportunities } from '@/lib/pncp-data';
import { calculateScore } from '@/lib/scoring';
import type { Opportunity, CompanyProfile } from '@/types';

const CRITERIOS: Array<{ key: 'keyword' | 'location' | 'value' | 'deadline' | 'segment'; label: string; max: number }> = [
  { key: 'keyword', label: 'Aderência de palavras-chave', max: 30 },
  { key: 'location', label: 'Compatibilidade de localização', max: 20 },
  { key: 'value', label: 'Faixa de valor', max: 20 },
  { key: 'deadline', label: 'Prazo de encerramento', max: 15 },
  { key: 'segment', label: 'Segmento / CNAE', max: 15 },
];

function loadProfile(): CompanyProfile | null {
  try {
    const raw = localStorage.getItem('perfilEmpresa');
    if (!raw) return null;
    const data = JSON.parse(raw);
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
    } as CompanyProfile;
  } catch { return null }
}

export default function ScorePage() {
  const [opps, setOpps] = useState<Opportunity[] | null>(null);
  const [profile] = useState<CompanyProfile | null>(() => loadProfile());
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      const live = await searchLiveOpportunities('licitacao');
      if (mounted) {
        setOpps(live && live.length > 0 ? live : null);
        if (live && live.length > 0) setSelected(live[0].id);
        setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  const scored = useMemo(() => {
    if (!opps) return [];
    return opps
      .map((o) => ({ opp: o, s: calculateScore(o, profile) }))
      .sort((a, b) => b.s.total - a.s.total);
  }, [opps, profile]);

  const termo = normalizar(busca.trim());
  const filtrados = termo
    ? scored.filter(({ opp }) =>
        normalizar(`${opp.objeto} ${opp.orgao} ${opp.uf} ${opp.municipio} ${opp.modalidade}`).includes(termo)
      )
    : scored;

  const current = selected ? scored.find((x) => x.opp.id === selected) : undefined;
  const media = scored.length ? Math.round(scored.reduce((a, x) => a + x.s.total, 0) / scored.length) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Score de Oportunidades"
        description="Compatibilidade calculada com metodologia transparente a partir dos dados reais do PNCP"
      />

      <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 px-3.5 py-2.5 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">
          {profile
            ? 'Score calculado a partir do perfil da sua empresa e dos dados reais de cada oportunidade. Critérios sem dados suficientes são exibidos como "dados insuficientes", nunca zerados como se fossem informação negativa.'
            : 'Configure o perfil da sua empresa (Perfil) para personalizar o score. Sem perfil, não há base para estimar compatibilidade.'}
        </p>
      </div>

      {loading ? (
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 text-center py-16 px-6">
          <p className="text-slate-500 dark:text-slate-400">Carregando oportunidades reais do PNCP...</p>
        </div>
      ) : !scored.length ? (
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 text-center py-16 px-6">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Dados indisponíveis no momento</p>
          <p className="text-xs text-slate-400 mt-1">Não foi possível consultar a API pública do PNCP agora. Tente novamente em instantes.</p>
        </div>
      ) : (
        <>
          <form onSubmit={(e) => e.preventDefault()} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar nas oportunidades avaliadas (objeto, órgão, UF)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Oportunidades avaliadas" value={String(scored.length)} icon={<Gauge className="w-5 h-5" />} accent="primary" hint="retornadas do PNCP" />
            <StatCard label="Score médio" value={`${media}`} icon={<Target className="w-5 h-5" />} accent="secondary" hint="aderência geral" />
            <StatCard label="Melhor score" value={String(scored[0].s.total)} icon={<Shield className="w-5 h-5" />} accent="success" hint="maior compatibilidade" />
          </div>

          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 space-y-2">
              {filtrados.length === 0 && (
                <p className="text-sm text-slate-400 px-1 py-6 text-center">Nenhum resultado para sua busca.</p>
              )}
              {filtrados.map(({ opp, s }) => {
                const label = getScoreLabel(s.total);
                return (
                  <button
                    key={opp.id}
                    onClick={() => setSelected(opp.id)}
                    className={cn(
                      'w-full text-left p-4 rounded-xl border transition-all',
                      selected === opp.id
                        ? 'border-primary bg-primary/5 dark:bg-primary/10'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', label.color)}>{s.total} · {label.label}</span>
                      <span className="text-xs text-slate-400">{opp.modalidade || '—'}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2">{opp.objeto || opp.orgao || 'Sem descrição'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{opp.orgao || 'Órgão não informado'} · {opp.uf || '—'}</p>
                  </button>
                );
              })}
            </div>

            <div className="lg:col-span-3 space-y-6">
              {current ? (
                <>
                  <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{current.opp.objeto || current.opp.orgao || 'Oportunidade'}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{current.opp.orgao || 'Órgão não informado'} · {current.opp.uf || '—'}</p>
                      </div>
                      <ScoreGauge score={current.s.total} />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <PerfilItem label="Valor estimado" value={current.opp.valor > 0 ? formatCurrency(current.opp.valor) : 'Não informado'} />
                      <PerfilItem label="Modalidade" value={current.opp.modalidade || '—'} />
                      <PerfilItem label="Encerramento" value={current.opp.dataEncerramento ? formatDate(current.opp.dataEncerramento) : 'Não informado'} />
                      <PerfilItem label="Score final" value={`${current.s.total}/100`} />
                    </div>

                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                      Por que este score? — critérios
                    </p>
                    <div className="space-y-2.5">
                      {CRITERIOS.map((c) => {
                        const v = current.s[c.key];
                        const max = c.max;
                        return (
                          <div key={c.key}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-slate-600 dark:text-slate-300">{c.label}</span>
                              <span className="font-semibold text-slate-700 dark:text-slate-200">{v}/{max}</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${(v / max) * 100}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {current.s.explanations.length > 0 && (
                      <ul className="mt-4 space-y-1">
                        {current.s.explanations.map((e) => (
                          <li key={e} className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                            <span className="text-primary mt-0.5">•</span> {e}
                          </li>
                        ))}
                      </ul>
                    )}

                    <p className="mt-4 text-xs text-slate-400">
                      Concorrência: dados insuficientes para avaliação (não dispomos de histórico de participantes
                      deste registro no índice público do PNCP). Nenhum critério sem dados é tratado como informação
                      positiva ou negativa.
                    </p>

                    {current.opp.link?.startsWith('https://pncp.gov.br/app/') && (
                      <a
                        href={current.opp.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
                      >
                        Abrir edital no PNCP (gov.br)
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  <Interpretation score={current.s.total} />
                </>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Oportunidade identificada?</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Use o Auxílio na Montagem de Processo para organizar as próximas etapas.
              </p>
            </div>
            <Link
              href="/montagem-processo"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
            >
              <ClipboardList className="w-4 h-4" /> Montar Processo
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#3b82f6' : score >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative w-20 h-20 shrink-0">
      <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
        <circle cx="40" cy="40" r="34" fill="none" stroke="#e2e8f0" strokeWidth="8" className="dark:stroke-slate-700" />
        <circle
          cx="40" cy="40" r="34" fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * 213.6} 213.6`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-slate-900 dark:text-white">{score}</span>
      </div>
    </div>
  );
}

function Interpretation({ score }: { score: number }) {
  const copy =
    score >= 80
      ? 'Excelente aderência. Alta compatibilidade com seu perfil — priorize a preparação da proposta e monitore o edital.'
      : score >= 60
      ? 'Boa oportunidade. Vale a pena participar, mas avalie ajustes de prazo, valor ou escopo para maximizar a chance.'
      : score >= 40
      ? 'Aderência moderada. Reveja os critérios de menor peso antes de investir tempo na proposta.'
      : 'Baixa aderência. Provavelmente não vale a pena participar — foque suas energias em licitações mais compatíveis.';
  const tone = score >= 80 ? 'success' : score >= 40 ? 'warning' : 'danger';
  return (
    <div className={cn(
      'rounded-xl border p-5',
      tone === 'success' ? 'border-emerald-500/20 bg-emerald-500/10' : tone === 'warning' ? 'border-amber-500/20 bg-amber-500/10' : 'border-rose-500/20 bg-rose-500/10'
    )}>
      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{copy}</p>
      <p className="mt-2 text-[11px] text-slate-400">
        Como calculamos este score: parcelamos a aderência em palavras-chave (30), localização (20), faixa de
        valor (20), prazo (15) e segmento/CNAE (15). Cada critério só pontua quando há dados reais; sem dados,
        informamos &quot;dados insuficientes&quot; em vez de zerar ou atribuir pontuação.
      </p>
    </div>
  );
}

function PerfilItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}
