'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, Calendar, MapPin, Building2, FileText, DollarSign, Clock } from 'lucide-react';
import { ScoreBadge } from '@/components/opportunities/score-badge';
import FavoriteButton from '@/components/opportunities/favorite-button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import { getOpportunityById, mapItem } from '@/lib/pncp';

export default function OportunidadeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getOpportunityById(id)
      .then((result) => {
        setItem(result ? mapItem(result) : null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
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
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <p className="text-slate-500 dark:text-slate-400">Oportunidade não encontrada.</p>
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

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </button>
        <div>
          <h1 className="text-xl font-bold font-display text-slate-900 dark:text-white">Detalhes da Oportunidade</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">ID: {item.id}</p>
        </div>
        <div className="ml-auto hidden sm:block">
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

        <div className="mt-6 flex gap-3">
          <a
            href={`https://pncp.gov.br/app/editais?q=${item.numero || item.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
          >
            Ver no PNCP
            <ExternalLink className="w-4 h-4" />
          </a>
          <button
            onClick={() => router.back()}
            className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`h-4 rounded bg-slate-100 dark:bg-slate-800 animate-pulse ${className}`} />
}
