'use client';

import { useState, useEffect } from 'react';
import { Bell, Plus, Trash2 } from 'lucide-react';
import { getStatusColor } from '@/lib/utils';
import PageHeader from '@/components/ui/page-header';
import EmptyState from '@/components/ui/empty-state';
import Input from '@/components/ui/input';
import Button from '@/components/ui/button';

const UF_OPTIONS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];
const STATUS_OPTIONS = ['Aberta', 'Em andamento', 'Encerrada'];

interface Alert {
  id: string;
  keyword: string;
  uf: string;
  status: string;
  createdAt: string;
}

export default function AlertasPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ keyword: '', uf: '', status: '' });

  useEffect(() => {
    try {
      const stored = localStorage.getItem('alertas');
      if (stored) setAlerts(JSON.parse(stored));
    } catch {}
  }, []);

  const saveAlerts = (updated: Alert[]) => {
    setAlerts(updated);
    localStorage.setItem('alertas', JSON.stringify(updated));
  };

  const addAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.keyword.trim()) return;
    const newAlert: Alert = {
      id: Date.now().toString(),
      keyword: form.keyword.trim(),
      uf: form.uf,
      status: form.status,
      createdAt: new Date().toISOString(),
    };
    saveAlerts([...alerts, newAlert]);
    setForm({ keyword: '', uf: '', status: '' });
    setShowForm(false);
  };

  const removeAlert = (id: string) => {
    saveAlerts(alerts.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alertas"
        description="Receba notificações de novas oportunidades"
      >
        <Button onClick={() => setShowForm(!showForm)} variant="primary" icon={<Plus className="w-4 h-4" />}>
          Novo Alerta
        </Button>
      </PageHeader>

      {showForm && (
        <form onSubmit={addAlert} className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-5 space-y-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Bell className="w-4 h-4 text-primary" />
            Configurar novo alerta
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <Input
                label="Palavra-chave"
                type="text"
                value={form.keyword}
                onChange={(e) => setForm((f) => ({ ...f, keyword: e.target.value }))}
                placeholder="Ex: material hospitalar"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">UF</label>
              <select
                value={form.uf}
                onChange={(e) => setForm((f) => ({ ...f, uf: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="">Todas</option>
                {UF_OPTIONS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="">Todos</option>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="primary">Salvar Alerta</Button>
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </form>
      )}

      {alerts.length === 0 && !showForm ? (
        <EmptyState
          icon={<Bell className="w-8 h-8" />}
          title="Nenhum alerta configurado"
          description="Crie alertas para ser notificado quando novas oportunidades relevantes aparecerem."
          className="border border-dashed border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900"
        />
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-4 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-warning-soft text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{alert.keyword}</p>
                    {alert.uf && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary-soft text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 font-medium">
                        {alert.uf}
                      </span>
                    )}
                    {alert.status && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(alert.status)}`}>
                        {alert.status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Criado em {new Date(alert.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeAlert(alert.id)}
                className="p-2 text-danger hover:bg-danger-soft dark:hover:bg-danger/10 rounded-xl transition-colors shrink-0"
                title="Remover alerta"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
