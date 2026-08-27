'use client';

import { useState } from 'react';
import {
  Search, TrendingUp, Package, Trophy, TrendingDown, Medal,
} from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import StatCard from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function PrecosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [tab, setTab] = useState<'estatisticas' | 'vencedores' | 'evolucao'>('estatisticas');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mapa de Preços"
        description="Análise estatística de preços com dados reais do PNCP"
      />

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar produto ou serviço (ex: notebook, combustível, limpeza...)"
          className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
        />
        {searchTerm && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            Pressione Enter para buscar
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Preço de referência" value="R$ 3.187,50" icon={<Medal className="w-5 h-5" />} accent="secondary" hint="valor orientador" />
        <StatCard label="Mediana" value="R$ 3.150" icon={<TrendingUp className="w-5 h-5" />} accent="primary" hint="50% dos registros" />
        <StatCard label="Média" value="R$ 3.241" icon={<TrendingUp className="w-5 h-5" />} accent="accent" hint="todos os registros" />
        <StatCard label="Menor" value="R$ 2.780" icon={<TrendingDown className="w-5 h-5" />} accent="success" hint="mínimo histórico" />
        <StatCard label="Maior" value="R$ 4.120" icon={<TrendingUp className="w-5 h-5" />} accent="danger" hint="máximo histórico" />
        <StatCard label="Amostra" value="127" icon={<Package className="w-5 h-5" />} accent="warning" hint="registros analisados" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        {[
          { key: 'estatisticas' as const, label: '📊 Estatísticas', icon: TrendingUp },
          { key: 'vencedores' as const, label: '🏆 Vencedores', icon: Trophy },
          { key: 'evolucao' as const, label: '📈 Evolução', icon: TrendingUp },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors',
              tab === t.key
                ? 'border-primary text-primary border-b-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card p-6">
        {tab === 'estatisticas' && <Estatisticas />}
        {tab === 'vencedores' && <Vencedores />}
        {tab === 'evolucao' && <Evolucao />}
      </div>
    </div>
  );
}

function Estatisticas() {
  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Distribuição de preços</h3>
        <div className="space-y-3">
          <Bar label="Menor" value="R$ 2.780" width="w-[67%]" color="bg-success" />
          <Bar label="Mediana" value="R$ 3.150" width="w-[76%]" color="bg-primary" />
          <Bar label="Média" value="R$ 3.241" width="w-[79%]" color="bg-accent" />
          <Bar label="Referência" value="R$ 3.187,50" width="w-[77%]" color="bg-secondary" />
          <Bar label="Maior" value="R$ 4.120" width="w-full" color="bg-danger" />
        </div>

        <div className="mt-8 rounded-xl bg-slate-50 dark:bg-slate-800 p-5">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Faixa competitiva</h4>
          <div className="relative h-3 rounded-full bg-slate-200 dark:bg-slate-700">
            <div className="absolute inset-y-0 left-[5%] w-[70%] rounded-full bg-gradient-to-r from-success via-primary to-secondary"></div>
          </div>
          <div className="flex justify-between mt-1.5 text-[11px] text-slate-400">
            <span>R$ 2.780</span>
            <span className="font-bold text-slate-600 dark:text-slate-300">Preço vencedor típico: R$ 3.150</span>
            <span>R$ 4.120</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Competitividade</h3>
        <div className="rounded-xl p-5 bg-success-soft dark:bg-emerald-500/10 border border-success/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 dark:text-slate-300">Preço histórico</span>
            <span className="font-bold text-slate-900 dark:text-white">R$ 3.150</span>
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-slate-600 dark:text-slate-300">Seu preço</span>
            <span className="font-bold text-primary">R$ 3.100</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Competitividade</span>
            <Badge variant="success">🟢 ALTA</Badge>
          </div>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Esta é uma análise estatística baseada em dados históricos do PNCP.
          Não é garantia de vitória — sempre avalie o edital completo antes de propor.
        </p>
      </div>
    </div>
  );
}

function Bar({ label, value, width, color }: { label: string; value: string; width: string; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-500 dark:text-slate-400">{label}</span>
        <span className="font-semibold text-slate-700 dark:text-slate-200">{value}</span>
      </div>
      <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
        <div className={cn('h-full rounded-full', width, color)}></div>
      </div>
    </div>
  )
}

function Vencedores() {
  const winners = [
    { name: 'TechSol Comércio', cnpj: '12.345.678/0001-90', price: 'R$ 2.980', uf: 'SP', pct: '94%' },
    { name: 'InfoMax Distribuidora', cnpj: '98.765.432/0001-10', price: 'R$ 3.050', uf: 'MG', pct: '88%' },
    { name: 'Prime Supply Ltda', cnpj: '55.555.555/0001-55', price: 'R$ 3.120', uf: 'PR', pct: '82%' },
    { name: 'NovaTech Equipamentos', cnpj: '44.444.444/0001-44', price: 'R$ 3.240', uf: 'RJ', pct: '75%' },
  ]
  return (
    <div className="overflow-x-auto">
      <p className="text-xs text-slate-400 mb-4">Vencedores históricos para este item (dados ilustrativos do PNCP)</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800 text-left">
            <th className="px-4 py-3 font-medium text-slate-500">Empresa</th>
            <th className="px-4 py-3 font-medium text-slate-500">CNPJ</th>
            <th className="px-4 py-3 font-medium text-slate-500">UF</th>
            <th className="px-4 py-3 font-medium text-slate-500">Preço</th>
            <th className="px-4 py-3 font-medium text-slate-500">Desconto</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
          {winners.map(w => (
            <tr key={w.cnpj} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
              <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{w.name}</td>
              <td className="px-4 py-3 text-slate-500">{w.cnpj}</td>
              <td className="px-4 py-3 text-slate-600">{w.uf}</td>
              <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{w.price}</td>
              <td className="px-4 py-3 text-success font-medium">{w.pct}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Evolucao() {
  const points = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago']
  const values = [2900, 3050, 2980, 3150, 3240, 3100, 3250, 3187]
  const max = Math.max(...values)
  const min = Math.min(...values)
  return (
    <div>
      <p className="text-xs text-slate-400 mb-4">Evolução do preço médio do produto nos últimos 8 meses</p>
      <div className="flex items-end gap-3 h-48">
        {points.map((p, i) => (
          <div key={p} className="flex-1 flex flex-col items-center gap-2">
            <div className="relative w-full max-w-[40px] rounded-t-lg bg-gradient-to-t from-primary to-secondary"
              style={{ height: `${((values[i] - min) / (max - min)) * 100 + 10}%` }}>
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                {values[i].toLocaleString('pt-BR')}
              </span>
            </div>
            <span className="text-[11px] text-slate-400">{p}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
