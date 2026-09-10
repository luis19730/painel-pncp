'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, PieChart, FileText, Bell, Star, RefreshCw } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import StatCard from '@/components/ui/stat-card';
import { ITEMS } from '@/lib/market-data';

export default function RelatoriosPage() {
  const [favCount, setFavCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    try {
      const favs = localStorage.getItem('favoritos');
      if (favs) setFavCount(JSON.parse(favs).length);
    } catch {}
    try {
      const al = localStorage.getItem('alertas');
      if (al) setAlertCount(JSON.parse(al).length);
    } catch {}
  }, []);

  const mediana = (arr: number[]) => {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  };

  const total = ITEMS.length;
  const valorTotal = ITEMS.reduce((s, i) => s + i.valor, 0);
  const valorMediano = mediana(ITEMS.map((i) => i.valor));

  const porModalidade = ITEMS.reduce<Record<string, { qtd: number; valor: number }>>((acc, i) => {
    acc[i.modalidade] = acc[i.modalidade] || { qtd: 0, valor: 0 };
    acc[i.modalidade].qtd++;
    acc[i.modalidade].valor += i.valor;
    return acc;
  }, {});
  const modalidades = Object.entries(porModalidade).sort((a, b) => b[1].qtd - a[1].qtd);

  const porUf = ITEMS.reduce<Record<string, number>>((acc, i) => {
    acc[i.uf] = (acc[i.uf] || 0) + 1;
    return acc;
  }, {});
  const ufs = Object.entries(porUf).sort((a, b) => b[1] - a[1]);

  const porMes = ITEMS.reduce<Record<string, number>>((acc, i) => {
    const key = new Date(i.data).toLocaleString('pt-BR', { month: 'short' });
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const meses = Object.entries(porMes);
  const maxMes = Math.max(1, ...meses.map(([, v]) => v));
  const maxModal = Math.max(1, ...modalidades.map(([, v]) => v.qtd));
  const maxUf = Math.max(1, ...ufs.map(([, v]) => v));

  return (
    <div className="space-y-6">
      <PageHeader title="Relatórios" description="Indicadores consolidados sobre oportunidades e sua atividade na plataforma">
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Atualizar
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Oportunidades rastreadas" value={total.toString()} hint="Nos dados disponíveis" icon={<FileText className="w-5 h-5" />} accent="accent" />
        <StatCard label="Valor total estimado" value={formatCompact(valorTotal)} hint="Somatório" icon={<BarChart3 className="w-5 h-5" />} accent="primary" />
        <StatCard label="Favoritos salvos" value={favCount.toString()} hint="No seu dispositivo" icon={<Star className="w-5 h-5" />} accent="warning" />
        <StatCard label="Alertas ativos" value={alertCount.toString()} hint="Configurados" icon={<Bell className="w-5 h-5" />} accent="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Oportunidades por Mês</h2>
          </div>
          <div className="h-48 flex items-end gap-3">
            {meses.map(([mes, v]) => (
              <div key={mes} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                <span className="text-[10px] text-slate-400">{v}</span>
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-primary to-secondary"
                  style={{ height: `${Math.max(6, (v / maxMes) * 140)}px` }}
                />
                <span className="text-[10px] text-slate-400 truncate max-w-full">{mes}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center text-white">
              <PieChart className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Por Modalidade</h2>
          </div>
          <div className="space-y-3">
            {modalidades.map(([m, d]) => (
              <div key={m} className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300 w-40 truncate">{m}</span>
                <div className="flex-1 mx-3">
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full" style={{ width: `${(d.qtd / maxModal) * 100}%` }} />
                  </div>
                </div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 w-8 text-right">{d.qtd}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center text-white">
            <TrendingUp className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Por UF</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ufs.map(([uf, v]) => (
            <div key={uf} className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-300 w-8">{uf}</span>
              <div className="flex-1 mx-3">
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-success to-teal-500 rounded-full" style={{ width: `${(v / maxUf) * 100}%` }} />
                </div>
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 w-8 text-right">{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-5 flex items-start gap-3">
        <BarChart3 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Métricas calculadas a partir da base de referência local e da sua atividade salva no navegador
          (favoritos e alertas). Valor mediano de oportunidade: <span className="font-medium text-slate-700 dark:text-slate-200">{formatCompact(valorMediano)}</span>.
        </p>
      </div>
    </div>
  );
}

function formatCompact(v: number) {
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(1)} mi`;
  if (v >= 1e3) return `R$ ${(v / 1e3).toFixed(0)} mil`;
  return `R$ ${v.toFixed(0)}`;
}
