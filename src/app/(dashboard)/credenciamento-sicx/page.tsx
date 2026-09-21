'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Zap, Scale, RefreshCw, ShieldCheck, ArrowRight, Search, Sparkles, Copy, Download, FileText, ExternalLink } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import DataSourceNotice, { type DataSource } from '@/components/ui/data-source-notice';
import EmptyState from '@/components/ui/empty-state';
import { CardSkeleton } from '@/components/ui/skeleton';
import OpportunityCard from '@/components/opportunities/opportunity-card';
import { searchLiveOpportunities } from '@/lib/pncp-data';
import { searchItems } from '@/lib/market-data';
import { itemToOpportunity } from '@/lib/opportunity';
import { calculateScore, scoreOpportunities } from '@/lib/scoring';
import { cn, normalizar } from '@/lib/utils';
import { buildPncpEditalUrl } from '@/lib/pncp';
import { exportarWord, abrirImpressaoProcesso, escapeHtml } from '@/lib/contratacoes/export';
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

// ---------------------------------------------------------------------------
// Gerador de documento de CREDENCIAMENTO (SICX / Compras Expressas).
// ---------------------------------------------------------------------------
interface CreForm {
  razaoSocial: string;
  cnpj: string;
  objeto: string;
  unidade: string;
  preco: string;
  localidades: string;
  entrega: string;
  pagamento: string;
  validade: string;
  responsavel: string;
  contato: string;
  editalRef: string;
}

const CRE_EMPTY: CreForm = {
  razaoSocial: '', cnpj: '', objeto: '', unidade: '', preco: '', localidades: '',
  entrega: '', pagamento: '', validade: '', responsavel: '', contato: '', editalRef: '',
};

const CRE_INPUT =
  'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary';

function refPncp(input: string): string {
  const t = (input || '').trim();
  if (!t) return '';
  const url = buildPncpEditalUrl({ link: t.startsWith('http') ? t : null, id: t });
  return url.includes('/app/editais/') ? url : '';
}

function gerarCredenciamentoSecoes(d: CreForm): Array<{ titulo: string; corpo: string }> {
  const hoje = new Date().toLocaleDateString('pt-BR');
  const link = refPncp(d.editalRef);
  return [
    {
      titulo: 'Identificação do fornecedor',
      corpo: [
        `Razão social: ${d.razaoSocial || '[razão social]'}`,
        `CNPJ: ${d.cnpj || '[CNPJ]'}`,
        `Responsável: ${d.responsavel || '[nome e cargo]'}`,
        `Contato: ${d.contato || '[e-mail/telefone]'}`,
        `Data: ${hoje}`,
      ].join('\n'),
    },
    {
      titulo: 'Objeto da oferta (bem ou serviço comum padronizado)',
      corpo: `${d.objeto || '[descrever o bem/serviço ofertado]'}${d.unidade ? `\nUnidade: ${d.unidade}` : ''}`,
    },
    {
      titulo: 'Base legal',
      corpo:
        'Credenciamento por comércio eletrônico, na forma do art. 79, IV, da Lei nº 14.133/2021, incluído pela Lei nº 15.266/2025 e regulamentado pelo Decreto nº 13.106/2026 (SICX — Sistema de Compras Expressas).',
    },
    {
      titulo: 'Condições da oferta',
      corpo: [
        `Preço ofertado: ${d.preco || '[preço]'}`,
        `Localidade(s) atendida(s): ${d.localidades || '[município/UF ou âmbito de atendimento]'}`,
        `Condições de entrega/prestação: ${d.entrega || '[prazo e forma de entrega]'}`,
        `Condições de pagamento: ${d.pagamento || '[condições conforme o edital]'}`,
        `Validade da proposta: ${d.validade || '[prazo de validade]'}`,
      ].join('\n'),
    },
    {
      titulo: 'Referência no PNCP (edital de credenciamento)',
      corpo: link
        ? `Edital de credenciamento de referência: ${link}`
        : 'Edital de credenciamento de referência: [informar o link/nº do PNCP, se houver]',
    },
    {
      titulo: 'Declaração',
      corpo:
        'O fornecedor declara que as informações e a oferta acima são verdadeiras, que conhece e aceita as regras do edital de credenciamento do órgão contratante e que mantém as condições de habilitação exigidas. Esta é uma MINUTA de apoio e não substitui as regras do edital nem a análise jurídica.',
    },
  ];
}

function secoesParaTexto(titulo: string, sections: Array<{ titulo: string; corpo: string }>, subtitulo?: string): string {
  return [titulo, subtitulo || '', '', ...sections.map((s) => `${s.titulo.toUpperCase()}\n${s.corpo}`)]
    .filter((l) => l !== '')
    .join('\n\n');
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

  // Gerador de documento de credenciamento.
  const [cre, setCre] = useState<CreForm>(CRE_EMPTY);
  const [creSecoes, setCreSecoes] = useState<Array<{ titulo: string; corpo: string }>>([]);
  const [creTexto, setCreTexto] = useState<string | null>(null);
  const [creCopiado, setCreCopiado] = useState(false);
  const [creAviso, setCreAviso] = useState('');

  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    if (p) {
      setCre((f) => ({ ...f, razaoSocial: f.razaoSocial || p.razao_social || '', cnpj: f.cnpj || p.cnpj || '' }));
    }
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

  const setCreField = (k: keyof CreForm, v: string) => setCre((f) => ({ ...f, [k]: v }));
  const creLinkPncp = refPncp(cre.editalRef);

  const gerarCredenciamento = () => {
    if (!cre.objeto.trim()) {
      setCreAviso('Informe o objeto da oferta para gerar o documento de credenciamento.');
      return;
    }
    setCreAviso('');
    setCreCopiado(false);
    const s = gerarCredenciamentoSecoes(cre);
    setCreSecoes(s);
    setCreTexto(
      secoesParaTexto(
        'PROPOSTA DE CREDENCIAMENTO — SICX (SISTEMA DE COMPRAS EXPRESSAS)',
        s,
        '(Art. 79, IV, da Lei nº 14.133/2021 · Lei nº 15.266/2025 · Decreto nº 13.106/2026)'
      )
    );
  };

  const copiarCre = async () => {
    if (!creTexto) return;
    try {
      await navigator.clipboard.writeText(creTexto);
      setCreCopiado(true);
      setTimeout(() => setCreCopiado(false), 2000);
    } catch {}
  };

  const baixarCreTxt = () => {
    if (!creTexto) return;
    const blob = new Blob([creTexto], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'credenciamento-sicx.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

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

      {/* Gerador de documento de credenciamento (SICX) */}
      <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" /> Gerar documento de credenciamento (SICX)
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Preencha os dados da oferta. O documento sai em <b>.txt</b>, <b>Word</b> e <b>PDF</b>, e pode ser
          vinculado ao edital de credenciamento no PNCP.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Razão social</label>
            <input value={cre.razaoSocial} onChange={(e) => setCreField('razaoSocial', e.target.value)} placeholder="Ex.: Fornecedor Ltda." className={CRE_INPUT} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">CNPJ</label>
            <input value={cre.cnpj} onChange={(e) => setCreField('cnpj', e.target.value)} placeholder="00.000.000/0000-00" className={CRE_INPUT} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Objeto da oferta (bem/serviço comum padronizado) *</label>
            <input value={cre.objeto} onChange={(e) => setCreField('objeto', e.target.value)} placeholder="Ex.: fornecimento de água mineral em garrafão de 20L" className={CRE_INPUT} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Unidade</label>
            <input value={cre.unidade} onChange={(e) => setCreField('unidade', e.target.value)} placeholder="Ex.: garrafão 20L" className={CRE_INPUT} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Preço ofertado</label>
            <input value={cre.preco} onChange={(e) => setCreField('preco', e.target.value)} placeholder="Ex.: R$ 12,00/unidade" className={CRE_INPUT} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Localidade(s) atendida(s)</label>
            <input value={cre.localidades} onChange={(e) => setCreField('localidades', e.target.value)} placeholder="Ex.: Município de São Paulo/SP e região" className={CRE_INPUT} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Condições de entrega/prestação</label>
            <input value={cre.entrega} onChange={(e) => setCreField('entrega', e.target.value)} placeholder="Ex.: entrega em até 5 dias úteis" className={CRE_INPUT} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Condições de pagamento</label>
            <input value={cre.pagamento} onChange={(e) => setCreField('pagamento', e.target.value)} placeholder="Ex.: conforme o edital (30 dias)" className={CRE_INPUT} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Validade da proposta</label>
            <input value={cre.validade} onChange={(e) => setCreField('validade', e.target.value)} placeholder="Ex.: 60 dias" className={CRE_INPUT} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Responsável</label>
            <input value={cre.responsavel} onChange={(e) => setCreField('responsavel', e.target.value)} placeholder="Ex.: Maria Souza — Sócia" className={CRE_INPUT} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Contato</label>
            <input value={cre.contato} onChange={(e) => setCreField('contato', e.target.value)} placeholder="Ex.: vendas@fornecedor.com · (11) 90000-0000" className={CRE_INPUT} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Edital de credenciamento no PNCP (opcional)</label>
            <input value={cre.editalRef} onChange={(e) => setCreField('editalRef', e.target.value)} placeholder="https://pncp.gov.br/app/editais/... ou CNPJ-1-000123/2026" className={CRE_INPUT} />
            {cre.editalRef.trim() && (
              <p className="mt-1.5 text-[11px]">
                {creLinkPncp ? (
                  <a href={creLinkPncp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                    Ver o edital no PNCP (gov.br) <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">Referência não reconhecida (use o link do PNCP ou CNPJ-1-SEQ/ANO).</span>
                )}
              </p>
            )}
          </div>
        </div>

        {creAviso && <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">{creAviso}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={gerarCredenciamento}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            <Sparkles className="w-4 h-4" /> Gerar documento
          </button>
          {creLinkPncp && (
            <a href={creLinkPncp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <ExternalLink className="w-4 h-4" /> Abrir edital no PNCP
            </a>
          )}
        </div>
        <p className="mt-3 text-[11px] text-slate-400">
          Minuta de apoio. O credenciamento deve seguir as regras do edital do órgão; este documento não
          substitui o edital nem a análise jurídica.
        </p>
      </div>

      {/* Resultado do credenciamento */}
      {creTexto !== null && (
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Documento de credenciamento
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={copiarCre}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors',
                  creCopiado
                    ? 'border-emerald-200 text-emerald-600 dark:border-emerald-500/30 dark:text-emerald-400'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                )}
              >
                <Copy className="w-3.5 h-3.5" /> {creCopiado ? 'Copiado!' : 'Copiar'}
              </button>
              <button
                onClick={baixarCreTxt}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Baixar .txt
              </button>
              <button
                onClick={() => exportarWord('Proposta de Credenciamento — SICX', creSecoes, 'credenciamento-sicx')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" /> Word
              </button>
              <button
                onClick={() => {
                  const html = creSecoes
                    .map((s) => `<h2>${escapeHtml(s.titulo)}</h2><p>${escapeHtml(s.corpo).replace(/\n/g, '<br/>')}</p>`)
                    .join('');
                  abrirImpressaoProcesso(null, 'Proposta de Credenciamento — SICX', html);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" /> PDF (imprimir/salvar)
              </button>
            </div>
          </div>
          <pre className="whitespace-pre-wrap font-sans text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 leading-relaxed">
            {creTexto}
          </pre>
          {creLinkPncp && (
            <a href={creLinkPncp} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
              Ver o edital de credenciamento no PNCP (gov.br) <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}

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
