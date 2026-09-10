'use client';

import { useState, useEffect } from 'react';
import { Moon, Bell, User, Save, Mail, Smartphone, Palette, Sun } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import Button from '@/components/ui/button';
import { useTheme } from '@/components/providers/theme-provider';

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
        checked ? 'bg-gradient-to-r from-primary to-secondary' : 'bg-slate-200 dark:bg-slate-700'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          checked ? 'translate-x-5' : ''
        }`}
      />
    </button>
  );
}

function Section({ Icon, title, children }: { Icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6 space-y-4">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function ConfiguracoesPage() {
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    novasOportunidades: true,
    prazoProximo: true,
    alertasDiarios: false,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('configuracoes');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.notifications) setNotifications(data.notifications);
      }
    } catch {}
  }, []);

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((n) => ({ ...n, [key]: !n[key] }));
    setSaved(false);
  };

  const save = () => {
    try {
      localStorage.setItem('configuracoes', JSON.stringify({ theme, notifications }));
    } catch {}
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Configurações"
        description="Personalize sua experiência no painel"
      >
        <Button onClick={save} variant="primary" icon={<Save className="w-4 h-4" />}>
          {saved ? 'Salvo!' : 'Salvar'}
        </Button>
      </PageHeader>

      <Section Icon={Palette} title="Aparência">
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Tema</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setTheme('light')}
              className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-colors text-center ${
                theme === 'light'
                  ? 'border-primary bg-primary-soft dark:bg-primary/10'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Sun className={`w-4 h-4 ${theme === 'light' ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`} />
              <span className={`text-sm font-medium ${theme === 'light' ? 'text-primary dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'}`}>Claro</span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-colors text-center ${
                theme === 'dark'
                  ? 'border-primary bg-primary-soft dark:bg-primary/10'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Moon className={`w-4 h-4 ${theme === 'dark' ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`} />
              <span className={`text-sm font-medium ${theme === 'dark' ? 'text-primary dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'}`}>Escuro</span>
            </button>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Escolha o tema que combina com você.</p>
        </div>
      </Section>

      <Section Icon={Bell} title="Notificações">
        <div className="space-y-3">
          {[
            { key: 'email' as const, Icon: Mail, title: 'Notificações por e-mail', desc: 'Receba resumos e alertas por e-mail' },
            { key: 'push' as const, Icon: Smartphone, title: 'Notificações push', desc: 'Receba notificações no navegador' },
            { key: 'novasOportunidades' as const, Icon: Bell, title: 'Novas oportunidades', desc: 'Avisar quando novas licitações compatíveis aparecerem' },
            { key: 'prazoProximo' as const, Icon: Bell, title: 'Prazo próximo', desc: 'Alertar quando o prazo de uma oportunidade estiver próximo' },
            { key: 'alertasDiarios' as const, Icon: Bell, title: 'Resumo diário', desc: 'Receber um resumo diário das oportunidades' },
          ].map((item, idx) => (
            <div key={item.key}>
              {idx === 2 && <div className="h-px bg-slate-100 dark:bg-slate-800 my-2" />}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-soft text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <item.Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{item.title}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{item.desc}</p>
                  </div>
                </div>
                <Toggle checked={notifications[item.key]} onChange={() => toggleNotification(item.key)} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section Icon={User} title="Conta">
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">E-mail</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">usuario@exemplo.com</p>
            </div>
            <button className="text-sm text-primary hover:text-primary-hover font-medium">Alterar</button>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Senha</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Última alteração há 30 dias</p>
            </div>
            <button className="text-sm text-primary hover:text-primary-hover font-medium">Alterar</button>
          </div>
          <div className="h-px bg-slate-100 dark:bg-slate-800 my-2" />
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-danger">Excluir conta</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Esta ação é irreversível</p>
            </div>
            <button className="text-sm text-danger hover:text-danger-hover font-medium">Excluir</button>
          </div>
        </div>
      </Section>
    </div>
  );
}
