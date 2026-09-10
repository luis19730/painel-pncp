'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, Calendar, MapPin, Building2, FileText, DollarSign, Clock, Gauge } from 'lucide-react';
import { ScoreBadge } from '@/components/opportunities/score-badge';
import FavoriteButton from '@/components/opportunities/favorite-button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import { getOpportunityById, mapItem, isPncpeditalLink, buildPncpEditalUrl } from '@/lib/pncp';
import { calculateScore } from '@/lib/scoring';
import { ITEMS } from '@/lib/market-data';
import { track } from '@/lib/analytics';
import type { CompanyProfile } from '@/types';

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

type ScoreCat = 'keyword' | 'location' | 'value' | 'deadline' | 'segment';
const CRITERIOS: Array<{ key: ScoreCat; label: string }> = [
  { key: 'keyword', label: 'Aderência de palavras-chave' },
  { key: 'location', label: 'Compatibilidade de localização' },
  { key: 'value', label: 'Faixa de valor' },
  { key: 'deadline', label: 'Prazo de encerramento' },
  { key: 'segment', label: 'Segmento / CNAE' },
];

const MAXES: Record<string, number> = { keyword: 30, location: 20, value: 20, deadline: 15, segment: 15 };

export default function OportunidadeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [item, setItem] = useState<any>(null);
  const [score, setScore] = useState<ReturnType<typeof calculateScore> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const profile = loadProfile();
      try {
        const local = ITEMS.find((i) => i.id === id);
        let opp;
        if (local) {
          opp = {
            id: local.id, numero: local.id,
            objeto: `${local.nome} - ${local.descricao}`, orgao: local.orgao,
            unidade: local.orgao, cnpj: local.orgaoCnpj, modalidade: local.modalidade,
            esfera: local.municipio, uf: local.uf, municipio: local.municipio,
            situacao: 'Aberta', dataAbertura: local.data, dataEncerramento: local.data,
            valor: local.valor, link: '#', score: 0,
          };
        } else {
          const result = await getOpportunityById(id);
          opp = result ? mapItem(result) : null;
        }
        if (opp) {
          const sc = calculateScore(opp, profile);
          setScore(sc);
          setItem({ ...opp, score: sc.total });
        } else {
          setItem(null);
        }
        setLoading(false);
        track({
          event: 'view_opportunity',
          page: 'oportunidade',
          props: { id },
        });
      } catch {
        setItem(null);
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="animate-pulse space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
          <div className="card p-6 space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
            <div className="grid grid-cols-2 gap-4 mt-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    // Se o id for um número de controle PNCP válido, não exibimos apenas o erro:
    // abrimos o edital correto no portal oficial do PNCP (gov.br).
    const editalUrl = buildPncpEditalUrl({ id });
    const canOpenEdital = isPncpeditalLink(editalUrl);
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <p className="text-slate-500 dark:text-slate-400">
          {canOpenEdital
            ? 'Não foi possível carregar os detalhes agora, mas o edital está disponível no PNCP.'
            : 'Oportunidade não encontrada.'}
        </p>
        {canOpenEdital && (
          <a
            href={editalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
          >
            Abrir edital no PNCP (gov.br)
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
        <button onClick={() => router.back()} className="mt-4 text-primary hover:text-primary-hover text-sm font-medium">
          Voltar
        </button>
      </div>
    );
  }

  const infoRows = [
    { icon: Building2, label: 'Órgão', value: item.orgao },
    { icon: FileText, label: 'Unidade', value: item.unidade || '—' },
    { icon: FileText, label: 'Modalidade', value: item.modalidade || '—' },
    { icon: MapPin, label: 'UF', value: item.uf },
    { icon: MapPin, label: 'Município', value: item.municipio || '—' },
    { icon: DollarSign, label: 'Valor Estimado', value: item.valor ? formatCurrency(item.valor) : '—' },
    { icon: Calendar, label: 'Data Início', value: item.dataAbertura ? formatDate(item.dataAbertura) : '—' },
    { icon: Clock, label: 'Data Fim', value: item.dataEncerramento ? formatDate(item.dataEncerramento) : '—' },
  ];

  const editalUrl = buildPncpEditalUrl(item);
  const hasEdital = isPncpeditalLink(editalUrl);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold font-display text-slate-900 dark:text-white">Detalhes da Oportunidade</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">ID: {item.id}</p>
        </div>
        <div className="ml-auto">
          <FavoriteButton pncpId={item.id} />
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <ScoreBadge score={item.score || 0} size="md" />
              <Badge variant="accent" className={getStatusColor(item.situacao)}>
                {item.situacao || 'Aberta'}
              </Badge>
            </div>
            <h2 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-white">{item.objeto}</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {infoRows.map((row) => (
            <div key={row.label} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <row.icon className="w-4 h-4 text-slate-400 dark:text-slate-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{row.label}</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{row.value}</p>
              </div>
            </div>
          ))}
        </div>

        {item.numero && (
          <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-start gap-3">
            <FileText className="w-4 h-4 text-slate-400 dark:text-slate-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Número</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{item.numero}</p>
            </div>
          </div>
        )}

        {score && (
          <div className="mt-6 p-5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center gap-2 mb-4">
              <Gauge className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Por que este score? <span className="text-slate-400 font-normal">({score.total}/100 para sua empresa)</span>
              </h3>
            </div>
            <div className="space-y-3">
              {CRITERIOS.map((c) => (
                <div key={c.key}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600 dark:text-slate-300">{c.label}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      +{score[c.key]}/{MAXES[c.key]}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                      style={{ width: `${(score[c.key] / MAXES[c.key]) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {score.explanations.length > 0 && (
              <ul className="mt-4 space-y-1">
                {score.explanations.map((e) => (
                  <li key={e} className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                    <span className="text-primary mt-0.5">•</span> {e}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-6 space-y-3">
          {hasEdital ? (
            <>
              <a
                href={editalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
              >
                Abrir edital no PNCP (gov.br)
                <ExternalLink className="w-4 h-4" />
              </a>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                O edital e seus anexos ficam no portal oficial. Para acessar o PDF completo, é preciso
                estar logado no gov.br (e.gov) no próprio PNCP.
              </p>
            </>
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-3 py-2">
              Este registro é demonstrativo (base local) e não possui edital real no PNCP.
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => router.back()}
              className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`h-4 rounded bg-slate-100 dark:bg-slate-800 animate-pulse ${className}`} />
}
