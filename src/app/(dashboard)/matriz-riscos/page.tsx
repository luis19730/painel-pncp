'use client';

import { useState } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2 } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import DemoNotice from '@/components/ui/demo-notice';
import StatCard from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MATRIZ_PADRAO, nivelRisco, type RiscoItem } from '@/lib/market-data';

export default function MatrizRiscosPage() {
  const [riscos, setRiscos] = useState<RiscoItem[]>(MATRIZ_PADRAO);

  const counts = {
    alto: riscos.filter((r) => nivelRisco(r.probabilidade, r.impacto) === 'Alto').length,
    medio: riscos.filter((r) => nivelRisco(r.probabilidade, r.impacto) === 'Médio').length,
    baixo: riscos.filter((r) => nivelRisco(r.probabilidade, r.impacto) === 'Baixo').length,
  };

  const update = (id: string, field: 'probabilidade' | 'impacto', value: RiscoItem['probabilidade'] | RiscoItem['impacto']) => {
    setRiscos((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const reset = () => setRiscos(MATRIZ_PADRAO);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Matriz de Riscos"
        description="Identifique e classifique riscos contratuais conforme a Lei 14.133/2021"
      >
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Restaurar modelo padrão
        </button>
      </PageHeader>

      <DemoNotice>Matriz de riscos genérica padrão — edite conforme o seu edital.</DemoNotice>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Riscos altos" value={counts.alto} icon={<AlertTriangle className="w-5 h-5" />} accent="danger" hint="requerem mitigação" />
        <StatCard label="Riscos médios" value={counts.medio} icon={<ShieldAlert className="w-5 h-5" />} accent="warning" hint="monitorar" />
        <StatCard label="Riscos baixos" value={counts.baixo} icon={<CheckCircle2 className="w-5 h-5" />} accent="success" hint="aceitáveis" />
      </div>

      <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-left">
                <th className="px-5 py-3 font-semibold text-slate-500">Categoria</th>
                <th className="px-5 py-3 font-semibold text-slate-500">Exemplo de risco</th>
                <th className="px-5 py-3 font-semibold text-slate-500">Nível</th>
                <th className="px-5 py-3 font-semibold text-slate-500">Probabilidade</th>
                <th className="px-5 py-3 font-semibold text-slate-500">Impacto</th>
                <th className="px-5 py-3 font-semibold text-slate-500">Mitigação sugerida</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {riscos.map((r) => (
                <RiscoRow key={r.id} risco={r} update={update} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Matriz Probabilidade × Impacto</h4>
          <div className="grid grid-cols-3 gap-2">
            {(['Baixo', 'Médio', 'Alto'] as const).map((prob) => (
              <div key={prob} className="space-y-2">
                <p className="text-[10px] text-center text-slate-400 font-medium uppercase">{prob}</p>
                {(['Baixo', 'Médio', 'Alto'] as const).map((imp) => {
                  const n = nivelRisco(prob, imp);
                  const cell = n === 'Alto' ? 'bg-rose-500/90 text-white' : n === 'Médio' ? 'bg-amber-500/80 text-white' : 'bg-emerald-500/80 text-white';
                  return (
                    <div key={imp} className={cn('h-10 rounded-lg flex flex-col items-center justify-center', cell)}>
                      <span>{n}</span>
                      <span className="text-[8px] opacity-80">impacto {imp}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Base legal</h4>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            A <b>Lei 14.133/2021</b> exige a identificação e a alocação dos riscos previsíveis entre a administração
            e o contratado, por meio da <b>matriz de riscos</b>, especialmente em obras e serviços de engenharia
            e nas contratações de grande vulto (Art. 6º, XXVII, e Art. 22).
          </p>
          <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Altere os níveis de probabilidade e impacto de cada risco na tabela acima para construir sua matriz
              própria e planejar as medidas de mitigação adequadas ao edital.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RiscoRow({
  risco,
  update,
}: {
  risco: RiscoItem
  update: (id: string, field: 'probabilidade' | 'impacto', value: RiscoItem['probabilidade'] | RiscoItem['impacto']) => void
}) {
  const nivel = nivelRisco(risco.probabilidade, risco.impacto);
  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
      <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">{risco.categoria}</td>
      <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{risco.exemplo}</td>
      <td className="px-5 py-3">
        <Badge variant={nivel === 'Alto' ? 'danger' : nivel === 'Médio' ? 'warning' : 'success'}>{nivel}</Badge>
      </td>
      <td className="px-5 py-3">
        <Sel value={risco.probabilidade} onChange={(v) => update(risco.id, 'probabilidade', v)} />
      </td>
      <td className="px-5 py-3">
        <Sel value={risco.impacto} onChange={(v) => update(risco.id, 'impacto', v)} />
      </td>
      <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{risco.mitigacao}</td>
    </tr>
  );
}

function Sel({ value, onChange }: { value: string; onChange: (v: RiscoItem['probabilidade'] | RiscoItem['impacto']) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as RiscoItem['probabilidade'] | RiscoItem['impacto'])}
      className={cn(
        'border rounded-lg px-2 py-1 text-xs font-medium bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary',
        value === 'Alto' ? 'border-rose-300 text-rose-700 dark:text-rose-400' : value === 'Médio' ? 'border-amber-300 text-amber-700 dark:text-amber-400' : 'border-emerald-300 text-emerald-700 dark:text-emerald-400'
      )}
    >
      {['Baixo', 'Médio', 'Alto'].map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}
