'use client';

import { useState } from 'react';
import { FileSearch, CheckCircle2, AlertCircle, ClipboardList } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import StatCard from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const ETP_SECTIONS = [
  {
    titulo: 'Definição do objeto',
    descricao: 'O objeto deve ser claro, padronizado e mensurável, com especificações técnicas completas.',
    itens: [
      'Descrição sucinta do objeto',
      'Especificações técnicas detalhadas',
      'Quantitativos estimados',
      'Requisitos de qualidade e desempenho',
      'Prazo de entrega/execução definido',
    ],
  },
  {
    titulo: 'Justificativa da necessidade',
    descricao: 'Comprova a necessidade da contratação, vinculada ao planejamento institucional.',
    itens: [
      'Alinhamento ao planejamento do órgão',
      'Relação com o problema a ser resolvido',
      'Análise de alternativas consideradas',
      'Necessidade e oportunidade da compra',
    ],
  },
  {
    titulo: 'Demonstrativo do resultado esperado',
    descricao: 'Define os resultados e benefícios diretos e indiretos da contratação.',
    itens: [
      'Resultados esperados mensuráveis',
      'Benefícios à sociedade',
      'Indicadores de acompanhamento',
      'Impacto esperado na entrega do serviço público',
    ],
  },
  {
    titulo: 'Estimativa de preço e pesquisa',
    descricao: 'Fundamenta o valor de referência com base em pesquisa de mercado.',
    itens: [
      'Pesquisa em painéis de preços',
      'Contratos anteriores e notas fiscais',
      'Comparativo de fornecedores',
      'Documentação do valor de referência',
    ],
  },
  {
    titulo: 'Fiscalização e gestão',
    descricao: 'Define como o contrato será gerido e fiscalizado durante a execução.',
    itens: [
      'Designação de fiscal de contrato',
      'Rotina de verificação e medição',
      'Critérios de aceite e rejeição',
      'Sanções e penalidades previstas',
    ],
  },
  {
    titulo: 'Adequação orçamentária',
    descricao: 'Garante a disponibilidade de dotação orçamentária para a contratação.',
    itens: [
      'Indicação da dotação orçamentária',
      'Fonte de recurso identificada',
      'Compatibilidade com LOA',
      'Previsão de despesa plurianual',
    ],
  },
];

export default function EstudoTecnicoPage() {
  const [progress, setProgress] = useState<Record<number, boolean>>({});
  const total = ETP_SECTIONS.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estudo Técnico Preliminar"
        description="Roteiro orientativo para elaborar o ETP exigido pela Lei 14.133/2021"
      >
        <Badge variant="secondary" icon={<ClipboardList className="w-3 h-3" />}>{Math.round((Object.keys(progress).length / total) * 100)}% concluído</Badge>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Seções do ETP" value={total} icon={<FileSearch className="w-5 h-5" />} accent="primary" hint="base legal" />
        <StatCard label="Seções concluídas" value={Object.keys(progress).length} icon={<CheckCircle2 className="w-5 h-5" />} accent="success" hint="seu progresso" />
        <StatCard label="Base legal" value="Art. 18" icon={<AlertCircle className="w-5 h-5" />} accent="warning" hint="Lei 14.133/2021" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {ETP_SECTIONS.map((s, idx) => {
          const done = !!progress[idx];
          return (
            <div key={s.titulo} className={cn('card bg-white dark:bg-slate-900 dark:border-slate-800 p-5 transition-all', done && 'border-emerald-300 dark:border-emerald-700')}>
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold',
                    done ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  )}
                >
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{s.titulo}</h3>
                    <button
                      onClick={() => setProgress((p) => ({ ...p, [idx]: !done }))}
                      className={cn(
                        'text-xs font-semibold px-2.5 py-1 rounded-full transition-colors',
                        done
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-400 hover:text-primary'
                      )}
                    >
                      {done ? 'Concluído ✓' : 'Marcar'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{s.descricao}</p>
                  <ul className="space-y-1.5">
                    {s.itens.map((it) => (
                      <li key={it} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 p-6">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">O que diz a lei</h4>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          O <b>Estudo Técnico Preliminar (ETP)</b> é documento constitutivo da fase preparatória da licitação
          (Art. 18 da Lei 14.133/2021) e deve conter, entre outros, a descrição da necessidade, as alternativas
          consideradas, o resultado esperado e a estimativa de preços. Nas contratações de obras e serviços de
          engenharia, o ETP é especialmente relevante para a definição do projeto básico.
        </p>
      </div>
    </div>
  );
}
