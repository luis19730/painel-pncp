'use client';

import { Users, Building2, FileSearch, Layers } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import EmptyState from '@/components/ui/empty-state';
import StatCard from '@/components/ui/stat-card';

export default function ConcorrentesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Concorrentes"
        description="Analise o perfil e histórico de licitações de concorrentes"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Empresas mapeadas"
          value="—"
          hint="Concorrentes"
          icon={<Building2 className="w-5 h-5" />}
          accent="primary"
        />
        <StatCard
          label="Licitações analisadas"
          value="—"
          hint="Histórico"
          icon={<FileSearch className="w-5 h-5" />}
          accent="accent"
        />
        <StatCard
          label="Segmentos cobertos"
          value="—"
          hint="Mercado"
          icon={<Layers className="w-5 h-5" />}
          accent="secondary"
        />
      </div>

      <EmptyState
        icon={<Users className="w-8 h-8" />}
        title="Módulo em desenvolvimento"
        description="Em breve você poderá visualizar o perfil de empresas que participam de licitações no seu segmento. Entenda quem são seus concorrentes, seus padrões de vitória e faixas de preço."
        className="border border-dashed border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900"
      />
    </div>
  );
}
