'use client';

import { Radar, Settings, ShieldCheck } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import EmptyState from '@/components/ui/empty-state';

export default function MeuRadarPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Meu Radar"
        description="Oportunidades personalizadas com base no seu perfil"
      />

      <EmptyState
        icon={<Radar className="w-8 h-8" />}
        title="Configure seu perfil para usar o Radar"
        description="Para que o Radar encontre as melhores oportunidades para você, precisamos conhecer sua empresa. Configure seu perfil com CNPJ, segmentos de atuação, produtos e serviços."
        action="Configurar Perfil"
        actionHref="/perfil"
        className="border border-dashed border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-5 text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-3">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">1. Configure o perfil</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Informe os dados da sua empresa</p>
        </div>
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-5 text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center mb-3">
            <Radar className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">2. Radar encontra</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Buscamos licitações compatíveis</p>
        </div>
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-5 text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center mb-3">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">3. Você decide</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Analise as melhores oportunidades</p>
        </div>
      </div>
    </div>
  );
}
