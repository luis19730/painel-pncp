'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Zap, Scale, RefreshCw, ShieldCheck, ArrowRight, Search } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import DataSourceNotice, { type DataSource } from '@/components/ui/data-source-notice';
import EmptyState from '@/components/ui/empty-state';
import { CardSkeleton } from '@/components/ui/skeleton';
import OpportunityCard from '@/components/opportunities/opportunity-card';
import { searchLiveOpportunities } from '@/lib/pncp-data';
import { searchItems } from '@/lib/market-data';
import { itemToOpportunity } from '@/lib/opportunity';
import { calculateScore, scoreOpportunities } from '@/lib/scoring';
import { normalizar } from '@/lib/utils';
import type { Opportunity, CompanyProfile } from '@/types';

function loadProfile(): CompanyProfile | null {
  try {
    const raw = localStorage.getItem('perfilEmpresa');
    if (!raw) return null;
    const data = JSON.parse(raw);
    return {
      id: '',
      user_id: '',
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
    } as CompanyProfile;
  } catch {
    return null;
  }
}

// Identifica processos ligados ao SICX / comércio eletrônico (credenciamento).
const SICX_RE = /credenciament|com[ré]rcio eletr[ôo]nico|compras expressas|\bsicx\b/i;

function isSicx(o: Opportunity): boolean {
  return SICX_RE.test(`${o.modalidade} ${o.objeto}`);
}

const BASES_LEGAIS = [
  {
    titulo: 'Credenciamento — art. 79, IV, da Lei nº 14.133/2021',
    texto:
      'O SICX usa o credenciamento por comércio eletrônico como procedimento auxiliar de contratação. Não é uma nova modalidade de licitação: coexiste com as modalidades já previstas na Lei de Licitações.',
  },
  {
    titulo: 'Lei nº 15.266/2025',
    texto:
      'Alterou o art. 79 da Lei nº 14.133/2021 para incluir o comércio eletrônico como hipótese de credenciamento, criando a base do Sistema de Compras Expressas (SICX).',
  },
  {
    titulo: 'Decreto nº 13.106/2026',
    texto:
      'Regulamenta o sistema, em vigor desde 8 de setembro de 2026. A operação plena ainda depende da disponibilização da plataforma e de normas complementares.',
  },
];

export default function SicxDashboardPage() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<DataSource>('live');
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [reload, setReload] = useState(0);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    setProfile(loadProfile());
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const live = await searchLiveOpportunities('credenciamento');
        let list: Opportunity[];
        let src: DataSource;
        if (live && live.length > 0) {
          const onlySicx = live.filter(isSicx);
          list = onlySicx.length > 0 ? onlySicx : live;
          src = 'live';
        } else {
          list = searchItems('credenciamento').map(itemToOpportunity).filter(isSicx);
          src = 'local';
        }
        const scored = list.map((o) => ({ ...o, score: calculateScore(o, profile).total }));
        if (!cancelled) {
          setItems(scoreOpportunities(scored, profile));
          setSource(src);
        }
      } catch {
        if (!cancelled) {
          setItems([]);
          setSource('local');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile, reload]);

  const termo = normalizar(busca.trim());
  const filtrados = termo
    ? items.filter((o) =>
        normalizar(`${o.objeto} ${o.orgao} ${o.municipio} ${o.uf} ${o.modalidade}`).includes(termo)
      )
    : items;

  return (
    <div className="space-y-6">
      <PageHeader
        title="SICX — Sistema de Compras Expressas"
        description="Oportunidades de credenciamento (comércio eletrônico) publicadas no PNCP"
      >
        <button
          type="button"
          onClick={() => setReload((n) => n + 1)}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-primary hover:text-primary-hover border border-slate-200 dark:border-slate-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Atualizar
        </button>
      </PageHeader>

      {!loading && <DataSourceNotice source={source} />}

      <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <p>
              O <strong>SICX</strong> é o sistema de compras expressas criado pela Lei nº 15.266/2025
              e regulamentado pelo Decreto nº 13.106/2026. Funciona como um marketplace público:
              fornecedores credenciados cadastram ofertas de bens e serviços comuns e o comprador
              contrata dentro das regras do edital de credenciamento, sem abrir um novo pregão a cada
              necessidade.
            </p>
            <p className="mt-2">
              Esta página lista os processos de <strong>credenciamento</strong> publicados no PNCP — o
              instrumento usado pelo SICX/comércio eletrônico. Seu perfil é usado para pontuar os
              resultados.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          {BASES_LEGAIS.map((b) => (
            <div key={b.titulo} className="rounded-xl border border-slate-100 dark:border-slate-800 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Scale className="w-4 h-4 text-primary shrink-0" />
                <p className="text-xs font-semibold text-slate-900 dark:text-white">{b.titulo}</p>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{b.texto}</p>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-2 mt-4 text-xs text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <p>
            Plataforma independente de consulta a dados públicos, sem vínculo com o SICX, o PNCP ou
            órgãos do Governo Federal.{' '}
            <Link href="/sicx" className="font-semibold text-primary hover:underline">
              Entenda o SICX
            </Link>{' '}
            e confira sempre a fonte oficial em{' '}
            <a
              href="https://pncp.gov.br"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:underline"
            >
              pncp.gov.br
            </a>
            .
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Zap className="w-8 h-8" />}
          title="Nenhum processo de credenciamento encontrado"
          description="Não localizamos processos de credenciamento (SICX/comércio eletrônico) publicados no PNCP neste momento. Tente atualizar mais tarde."
          action="Ver todas as oportunidades"
          actionHref="/oportunidades"
        />
      ) : (
        <>
          <form onSubmit={(e) => e.preventDefault()} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar nos credenciamentos (objeto, órgão, município)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </form>

          {filtrados.length === 0 ? (
            <EmptyState
              icon={<Search className="w-8 h-8" />}
              title="Nenhum resultado para sua busca"
              description="Tente outro termo ou apague a busca para ver todos os credenciamentos."
            />
          ) : (
            <>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {filtrados.length} processo(s) de credenciamento encontrado(s)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtrados.slice(0, 12).map((item) => (
                  <OpportunityCard key={item.id} item={item} />
                ))}
              </div>
            </>
          )}
          <div>
            <Link
              href="/oportunidades?modalidade=Credenciamento"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover"
            >
              Ver todos os credenciamentos <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
