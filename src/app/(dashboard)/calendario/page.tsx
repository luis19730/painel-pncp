'use client';

import { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { formatDate, getDaysUntil } from '@/lib/utils';
import { mapItems } from '@/lib/pncp';
import PageHeader from '@/components/ui/page-header';
import EmptyState from '@/components/ui/empty-state';
import { CardSkeleton } from '@/components/ui/skeleton';

function getDeadlineBg(days: number) {
  if (days < 0) return 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700';
  if (days === 0) return 'bg-danger-soft dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30';
  if (days <= 3) return 'bg-warning-soft dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30';
  return 'bg-success-soft dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30';
}

function getDotColor(days: number) {
  if (days < 0) return 'bg-slate-400 dark:bg-slate-600';
  if (days === 0) return 'bg-danger';
  if (days <= 3) return 'bg-warning';
  return 'bg-success';
}

export default function CalendarioPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/pncp/search/?q=pregao&tipos_documento=edital&pagina=1')
      .then((res) => res.json())
      .then((data) => {
        const mapped = mapItems(data.data || data.items || []);
        const withDeadlines = mapped
          .filter((i: any) => i.dataEncerramento)
          .sort((a: any, b: any) => new Date(a.dataEncerramento).getTime() - new Date(b.dataEncerramento).getTime());
        setItems(withDeadlines);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const upcoming = items.filter((i) => getDaysUntil(i.dataEncerramento) >= 0);
  const past = items.filter((i) => getDaysUntil(i.dataEncerramento) < 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Calendário de Prazos" description="Visualize os prazos de encerramento das licitações" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendário de Prazos"
        description="Visualize os prazos de encerramento das licitações"
      />

      <div className="flex items-center gap-4 text-sm flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-danger" />
          <span className="text-slate-600 dark:text-slate-300">Encerra hoje</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-warning" />
          <span className="text-slate-600 dark:text-slate-300">Até 3 dias</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-success" />
          <span className="text-slate-600 dark:text-slate-300">7+ dias</span>
        </div>
      </div>

      {upcoming.length === 0 && past.length === 0 ? (
        <EmptyState
          icon={<CalendarIcon className="w-8 h-8" />}
          title="Nenhum prazo encontrado"
          description="Os prazos aparecerão aqui quando houver licitações ativas."
          className="border border-dashed border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900"
        />
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide mb-3">Próximos encerramentos</h2>
              <div className="space-y-2">
                {upcoming.map((item) => {
                  const days = getDaysUntil(item.dataEncerramento);
                  return (
                    <a
                      key={item.id}
                      href={`/oportunidades/${item.id}`}
                      className={`block p-4 rounded-xl border ${getDeadlineBg(days)} hover:shadow-md transition-shadow`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${getDotColor(days)}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{item.objeto}</p>
                            <p className="text-xs opacity-70 truncate">{item.orgao}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold">{formatDate(item.dataEncerramento)}</p>
                          <p className="text-xs opacity-70 flex items-center justify-end gap-1">
                            <Clock className="w-3 h-3" />
                            {days === 0 ? 'Encerra hoje' : `${days} dia(s)`}
                          </p>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide mb-3">Encerradas</h2>
              <div className="space-y-2">
                {past.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.objeto}</p>
                        <p className="text-xs truncate">{item.orgao}</p>
                      </div>
                      <p className="text-sm shrink-0">{formatDate(item.dataEncerramento)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
