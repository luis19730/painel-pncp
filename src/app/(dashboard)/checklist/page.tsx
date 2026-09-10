'use client';

import { useState, useEffect } from 'react';
import { CheckSquare, Square, RotateCcw, Trash2, ListChecks } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const GRUPOS: Array<{ nome: string; itens: string[] }> = [
  {
    nome: 'Leitura do edital',
    itens: [
      'Leia atentamente o edital e seus anexos completos',
      'Identifique os requisitos de habilitação jurídica',
      'Identifique a qualificação econômico-financeira exigida',
      'Anote os documentos de regularidade fiscal exigidos',
      'Confira os prazos (impugnação, esclarecimento, entrega)',
    ],
  },
  {
    nome: 'Proposta',
    itens: [
      'Confira a planilha de preços e formule a proposta',
      'Verifique se os valores estão dentro da faixa estimada',
      'Valide os índices de reajuste / correção previstos',
      'Confira critérios de empate técnico e desempate',
      'Revise a proposta quanto a erros de digitação e somas',
    ],
  },
  {
    nome: 'Documentação',
    itens: [
      'Separe CNPJ, certidões e documentos societários',
      'Atualize certidões negativas (federal, estadual, municipal)',
      'Separe comprovantes de regularidade com o FGTS',
      'Confira prova de regularidade do INSS',
      'Prepare declarações exigidas (controle, idoneidade etc.)',
    ],
  },
  {
    nome: 'Entrega e acompanhamento',
    itens: [
      'Envie a proposta dentro do prazo com antecedência',
      'Guarde o protocolo / recibo de entrega',
      'Acompanhe as respostas a esclarecimentos',
      'Monitore as sessões de abertura e lances',
      'Fique atento à divulgação do resultado e prazos recursais',
    ],
  },
];

const STORAGE_KEY = 'checklistPapelaria';

export default function ChecklistPage() {
  const [feitos, setFeitos] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setFeitos(new Set(JSON.parse(raw)));
    } catch {}
  }, []);

  const total = GRUPOS.reduce((s, g) => s + g.itens.length, 0);
  const concluidos = feitos.size;
  const pct = total ? Math.round((concluidos / total) * 100) : 0;

  const toggle = (item: string) => {
    setFeitos((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const resetAll = () => {
    setFeitos(new Set());
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Checklist de Propostas"
        description="Acompanhe a preparação da sua proposta passo a passo"
        badge={
          total > 0 ? (
            <Badge variant="primary">{pct}% concluído</Badge>
          ) : undefined
        }
      >
        <button
          onClick={resetAll}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <RotateCcw className="w-4 h-4" /> Reiniciar
        </button>
      </PageHeader>

      <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {concluidos} de {total} itens concluídos
          </span>
          <span className="text-sm font-bold text-slate-900 dark:text-white">{pct}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {GRUPOS.map((grupo) => (
        <div key={grupo.nome} className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-primary" />
            {grupo.nome}
            <Badge variant="accent">
              {grupo.itens.filter((i) => feitos.has(i)).length}/{grupo.itens.length}
            </Badge>
          </h2>
          <div className="space-y-1">
            {grupo.itens.map((item) => {
              const done = feitos.has(item);
              return (
                <button
                  key={item}
                  onClick={() => toggle(item)}
                  className="w-full flex items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group"
                >
                  {done ? (
                    <CheckSquare className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-300 dark:text-slate-600 shrink-0 mt-0.5 group-hover:text-slate-400 dark:group-hover:text-slate-500" />
                  )}
                  <span
                    className={cn(
                      'text-sm',
                      done
                        ? 'text-slate-400 line-through dark:text-slate-500'
                        : 'text-slate-700 dark:text-slate-200'
                    )}
                  >
                    {item}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {concluidos === total && total > 0 && (
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6 text-center border-emerald-200 dark:border-emerald-500/30">
          <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
            Parabéns! Todos os itens foram concluídos.
          </p>
        </div>
      )}
    </div>
  );
}
