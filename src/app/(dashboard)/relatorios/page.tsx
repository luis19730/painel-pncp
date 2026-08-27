'use client';

import { BarChart3, TrendingUp, PieChart, FileText } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import StatCard from '@/components/ui/stat-card';

export default function RelatoriosPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description="Análises e indicadores do seu desempenho em licitações"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Analisadas"
          value="—"
          hint="Oportunidades"
          icon={<FileText className="w-5 h-5" />}
          accent="accent"
        />
        <StatCard
          label="Score Médio"
          value="—"
          hint="Compatibilidade"
          icon={<TrendingUp className="w-5 h-5" />}
          accent="success"
        />
        <StatCard
          label="Valor Total"
          value="—"
          hint="Em licitações"
          icon={<BarChart3 className="w-5 h-5" />}
          accent="primary"
        />
        <StatCard
          label="UFs Cobertas"
          value="—"
          hint="Estados"
          icon={<PieChart className="w-5 h-5" />}
          accent="warning"
        />
      </div>

      <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
            <BarChart3 className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Oportunidades por Mês</h2>
        </div>
        <div className="h-64 flex items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
          <div className="text-center">
            <BarChart3 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400 dark:text-slate-500">Gráficos serão disponibilizados em breve</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Por Modalidade</h3>
          <div className="space-y-3">
            {['Pregão Eletrônico', 'Dispensa', 'Inexigibilidade', 'Concorrência'].map((m) => (
              <div key={m} className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">{m}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full" style={{ width: '0%' }} />
                  </div>
                  <span className="text-sm text-slate-400 dark:text-slate-500 w-8 text-right">—</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Por UF</h3>
          <div className="space-y-3">
            {['SP', 'RJ', 'MG', 'PR', 'RS'].map((uf) => (
              <div key={uf} className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">{uf}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-success to-teal-500 rounded-full" style={{ width: '0%' }} />
                  </div>
                  <span className="text-sm text-slate-400 dark:text-slate-500 w-8 text-right">—</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
