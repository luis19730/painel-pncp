'use client';

import { useState, useEffect } from 'react';
import { Heart, Trash2, ExternalLink } from 'lucide-react';
import { ScoreBadge } from '@/components/opportunities/score-badge';
import PageHeader from '@/components/ui/page-header';
import EmptyState from '@/components/ui/empty-state';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';

export default function FavoritosPage() {
  const [favoritos, setFavoritos] = useState<any[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('favoritos');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setFavoritos(parsed);
      }
    } catch {
      setFavoritos([]);
    }
  }, []);

  const removeFavorito = (id: string) => {
    const updated = favoritos.filter((f) => f.id !== id);
    setFavoritos(updated);
    localStorage.setItem('favoritos', JSON.stringify(updated));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Favoritos"
        description="Oportunidades salvas para consulta rápida"
        badge={
          favoritos.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-primary-soft text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30">
              {favoritos.length} salvo(s)
            </span>
          ) : undefined
        }
      />

      {favoritos.length === 0 ? (
        <EmptyState
          icon={<Heart className="w-8 h-8" />}
          title="Nenhum favorito ainda"
          description="Salve oportunidades interessantes clicando no ícone de favorito nas listagens."
          action="Explorar oportunidades"
          actionHref="/oportunidades"
          className="border border-dashed border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900"
        />
      ) : (
        <div className="space-y-3">
          {favoritos.map((item) => (
            <div
              key={item.id}
              className="card card-hover dark:bg-slate-900 dark:border-slate-800 p-4 flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <ScoreBadge score={item.score || 0} />
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(item.situacao)}`}>
                    {item.situacao || 'Aberta'}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.objeto}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.orgao}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 dark:text-slate-500">
                  {item.valor && <span>{formatCurrency(item.valor)}</span>}
                  {item.dataEncerramento && <span>Prazo: {formatDate(item.dataEncerramento)}</span>}
                  {item.uf && <span>{item.uf}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`/oportunidades/${item.id}`}
                  className="p-2 text-primary hover:bg-primary-soft dark:hover:bg-primary/10 rounded-xl transition-colors"
                  title="Ver detalhes"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => removeFavorito(item.id)}
                  className="p-2 text-danger hover:bg-danger-soft dark:hover:bg-danger/10 rounded-xl transition-colors"
                  title="Remover dos favoritos"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
