'use client';

import { useState, useEffect } from 'react';
import { Save, Plus, X, Building2, Briefcase, MapPin, DollarSign, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import Input from '@/components/ui/input';
import Button from '@/components/ui/button';

const UF_OPTIONS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

interface CompanyProfile {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnaes: string[];
  segmentos: string[];
  produtos: string[];
  servicos: string[];
  palavrasChave: string[];
  estados: string[];
  valorMinimo: string;
  valorMaximo: string;
}

const EMPTY: CompanyProfile = {
  cnpj: '',
  razaoSocial: '',
  nomeFantasia: '',
  cnaes: [],
  segmentos: [],
  produtos: [],
  servicos: [],
  palavrasChave: [],
  estados: [],
  valorMinimo: '',
  valorMaximo: '',
};

function MultiInput({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState('');

  const addItem = () => {
    const val = input.trim();
    if (val && !items.includes(val)) {
      onChange([...items, val]);
      setInput('');
    }
  };

  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem())}
          placeholder={placeholder || `Adicionar ${label.toLowerCase()}...`}
          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
        />
        <Button type="button" onClick={addItem} icon={<Plus className="w-4 h-4" />} aria-label={`Adicionar ${label}`} />
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {items.map((item) => (
            <span key={item} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-soft text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 rounded-full text-xs font-medium">
              {item}
              <button type="button" onClick={() => onChange(items.filter((i) => i !== item))} className="hover:text-blue-900 dark:hover:text-blue-300">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionCard({ Icon, title, children }: { Icon?: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6 space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shrink-0">
          {Icon ? <Icon className="w-4 h-4" /> : null}
        </div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function PerfilPage() {
  const [profile, setProfile] = useState<CompanyProfile>(EMPTY);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('companyProfile');
      if (stored) setProfile(JSON.parse(stored));
    } catch {}
  }, []);

  const update = (field: keyof CompanyProfile, value: any) => {
    setProfile((p) => ({ ...p, [field]: value }));
    setSaved(false);
  };

  const save = () => {
    localStorage.setItem('companyProfile', JSON.stringify(profile));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Perfil da Empresa"
        description="Configure os dados da empresa para personalizar o Radar"
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-gradient-to-r from-secondary to-accent text-white border-transparent">
            <Sparkles className="w-3 h-3" />
            Premium
          </span>
        }
      >
        <Button onClick={save} variant="premium" icon={<Save className="w-4 h-4" />}>
          {saved ? 'Salvo!' : 'Salvar'}
        </Button>
      </PageHeader>

      <SectionCard Icon={Building2} title="Dados Cadastrais">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="CNPJ"
            type="text"
            value={profile.cnpj}
            onChange={(e) => update('cnpj', e.target.value)}
            placeholder="00.000.000/0000-00"
          />
          <Input
            label="Razão Social"
            type="text"
            value={profile.razaoSocial}
            onChange={(e) => update('razaoSocial', e.target.value)}
            placeholder="Razão social da empresa"
          />
          <div className="sm:col-span-2">
            <Input
              label="Nome Fantasia"
              type="text"
              value={profile.nomeFantasia}
              onChange={(e) => update('nomeFantasia', e.target.value)}
              placeholder="Nome fantasia da empresa"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard Icon={Briefcase} title="Atuação">
        <MultiInput
          label="CNAEs"
          items={profile.cnaes}
          onChange={(v) => update('cnaes', v)}
          placeholder="Ex: 4751-2/01"
        />
        <MultiInput
          label="Segmentos"
          items={profile.segmentos}
          onChange={(v) => update('segmentos', v)}
          placeholder="Ex: Tecnologia da Informação"
        />
        <MultiInput
          label="Produtos"
          items={profile.produtos}
          onChange={(v) => update('produtos', v)}
          placeholder="Ex: Computadores"
        />
        <MultiInput
          label="Serviços"
          items={profile.servicos}
          onChange={(v) => update('servicos', v)}
          placeholder="Ex: Consultoria"
        />
        <MultiInput
          label="Palavras-chave"
          items={profile.palavrasChave}
          onChange={(v) => update('palavrasChave', v)}
          placeholder="Ex: licitação eletrônica"
        />
      </SectionCard>

      <SectionCard Icon={MapPin} title="Estados de Atuação">
        <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
          {UF_OPTIONS.map((uf) => (
            <button
              key={uf}
              type="button"
              onClick={() => {
                const estados = profile.estados.includes(uf)
                  ? profile.estados.filter((e) => e !== uf)
                  : [...profile.estados, uf];
                update('estados', estados);
              }}
              className={`px-2 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                profile.estados.includes(uf)
                  ? 'bg-gradient-to-r from-primary to-secondary text-white border-transparent shadow-sm'
                  : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {uf}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard Icon={DollarSign} title="Faixa de Valores">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Valor Mínimo (R$)"
            type="number"
            value={profile.valorMinimo}
            onChange={(e) => update('valorMinimo', e.target.value)}
            placeholder="0"
          />
          <Input
            label="Valor Máximo (R$)"
            type="number"
            value={profile.valorMaximo}
            onChange={(e) => update('valorMaximo', e.target.value)}
            placeholder="0"
          />
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <Button onClick={save} variant="primary" size="lg" icon={<Save className="w-4 h-4" />}>
          {saved ? 'Perfil salvo com sucesso!' : 'Salvar Perfil'}
        </Button>
      </div>
    </div>
  );
}
