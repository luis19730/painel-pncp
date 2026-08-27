'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, FileText, Clock, AlertTriangle, Heart, DollarSign, Search, Radar, ArrowRight } from 'lucide-react';
import FavoriteButton from '@/components/opportunities/favorite-button';
import OpportunityCard from '@/components/opportunities/opportunity-card';
import StatCard from '@/components/ui/stat-card';
import PageHeader from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { StatsSkeleton, CardSkeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate, getDaysUntil, getDeadlineColor, getStatusColor } from '@/lib/utils';
import { mapItems } from '@/lib/pncp';
import { calculateScore } from '@/lib/scoring';
import type { CompanyProfile } from '@/types';

function loadProfile(): CompanyProfile | null {
  try {
    const raw = localStorage.getItem('perfilEmpresa')
    if (!raw) return null
    const data = JSON.parse(raw)
    return {
      id: '', user_id: '',
      cnpj: data.cnpj || null,
      razao_social: data.razaoSocial || null,
      nome_fantasia: data.nomeFantasia || null,
      cnaes: data.cnaes || [],
      segmentos: data.segmentos || [],
      produtos: data.produtos || [],
      servicos: data.servicos || [],
      palavras_chave: data.palavrasChave || [],
      estados: data.estados || [],
      municipios: data.municipios || [],
      valor_minimo: data.valorMinimo || null,
      valor_maximo: data.valorMaximo || null,
      modalidades: data.modalidades || [],
    } as CompanyProfile
  } catch { return null }
}

export default function DashboardPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/pncp/search/?q=pregao&tipos_documento=edital&pagina=1')
      .then((res) => res.json())
      .then((data) => {
        const mapped = mapItems(data.data || data.items || []);
        const profile = loadProfile();
        mapped.forEach(item => {
          if (profile) {
            const { total } = calculateScore(item, profile);
            item.score = total;
          }
        });
        setItems(mapped);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Sua central de inteligência em licitações públicas" />
      <StatsSkeleton />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
      </div>
    </div>
  );

  const todayItems = items.filter((i) => getDaysUntil(i.dataEncerramento) === 0);
  const soonItems = items.filter((i) => {
    const d = getDaysUntil(i.dataEncerramento);
    return d > 0 && d <= 3;
  });
  const totalValue = items.reduce((acc, i) => acc + (i.valor || 0), 0);
  const hotItems = [...items].filter((i) => (i.score || 0) >= 70).sort((a, b) => (b.score || 0) - (a.score || 0));

  const cardItems = [
    { href: '/oportunidades', title: 'Encontrar oportunidades', icon: Search, desc: 'Explore licitações relevantes', color: 'bg-primary text-white shadow-primary/25', cta: 'Explorar' },
    { href: '/precos', title: 'Analisar preços', icon: TrendingUp, desc: 'Preços históricos do PNCP', color: 'bg-secondary text-white shadow-secondary/25', cta: 'Analisar' },
    { href: '/meu-radar', title: 'Ativar radar', icon: Radar, desc: 'Receba só o que interessa', color: 'bg-success text-white shadow-success/25', cta: 'Ativar' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Visão geral das oportunidades para sua empresa"
        badge={<Badge variant="success">Ao vivo</Badge>}
      >
        <Link
          href="/busca"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
        >
          <Search className="w-4 h-4" /> Buscar oportunidades
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Novas oportunidades" value={items.length} icon={<FileText className="w-5 h-5" />} accent="primary" hint="neste mês" />
        <StatCard label="Compatíveis" value={items.filter((i) => (i.score || 0) >= 70).length} icon={<TrendingUp className="w-5 h-5" />} accent="success" hint="alta pontuação" />
        <StatCard label="Encerram hoje" value={todayItems.length} icon={<Clock className="w-5 h-5" />} accent="danger" hint="oportunidades" />
        <StatCard label="Encerram em 3 dias" value={soonItems.length} icon={<AlertTriangle className="w-5 h-5" />} accent="warning" hint="atenção" />
        <StatCard label="Favoritas" value={0} icon={<Heart className="w-5 h-5" />} accent="danger" hint="salvas" />
        <StatCard label="Valor total" value={formatCurrency(totalValue)} icon={<DollarSign className="w-5 h-5" />} accent="secondary" hint="em licitações" />
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cardItems.map((card) => {
          const Icon = card.icon
          return (
            <Link key={card.title} href={card.href} className={`group relative overflow-hidden rounded-2xl ${card.color} p-5 transition-all hover:-translate-y-0.5 hover:shadow-xl`}>
              <div className="relative z-10">
                <Icon className="w-8 h-8 mb-3 text-white/90" />
                <h3 className="text-lg font-bold text-white mb-1">{card.title}</h3>
                <p className="text-sm text-white/80 mb-4">{card.desc}</p>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white">
                  {card.cta} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-xl" />
            </Link>
          )
        })}
      </div>

      {/* Oportunidades quentes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              🔥 Oportunidades quentes
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Maior compatibilidade com seu perfil</p>
          </div>
          <Link href="/oportunidades" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover">
            Ver todas <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(hotItems.length > 0 ? hotItems : items).slice(0, 6).map((item) => (
            <OpportunityCard key={item.id} item={item} />
          ))}
        </div>
      </div>

      {/* Recommended list */}
      <div className="card">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recomendadas para você</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Licitações com maior compatibilidade com seu perfil</p>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.length === 0 ? (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500">
              Nenhuma oportunidade encontrada no momento.
            </div>
          ) : (
            items.slice(0, 8).map((item) => (
              <div key={item.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{item.score || 0}/100</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(item.situacao)}`}>
                        {item.situacao || 'Aberta'}
                      </span>
                    </div>
                    <h3 className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.objeto}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.orgao}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {item.valor > 0 && (
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(item.valor)}</p>
                    )}
                    <p className={`text-xs mt-1 font-medium ${getDeadlineColor(getDaysUntil(item.dataEncerramento))}`}>
                      {getDaysUntil(item.dataEncerramento) === 0
                        ? 'Encerra hoje'
                        : `${getDaysUntil(item.dataEncerramento)} dias restantes`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 dark:text-slate-500">
                  <FavoriteButton pncpId={item.id} />
                  {item.modalidade && <span>{item.modalidade}</span>}
                  {item.uf && <span>{item.uf}</span>}
                  {item.dataEncerramento && <span>Prazo: {formatDate(item.dataEncerramento)}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
