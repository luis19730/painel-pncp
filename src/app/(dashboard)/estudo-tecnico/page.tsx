'use client';

import { useState } from 'react';
import {
  FileSearch, CheckCircle2, AlertCircle, ClipboardList, Sparkles, Copy, Download, ExternalLink, FileText,
} from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import StatCard from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';
import { buildPncpEditalUrl } from '@/lib/pncp';
import { exportarWord, abrirImpressaoProcesso, escapeHtml } from '@/lib/contratacoes/export';

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

const INPUT_CLS =
  'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary';

interface EtpForm {
  orgao: string;
  processo: string;
  objeto: string;
  necessidade: string;
  pca: string;
  requisitos: string;
  quantidade: string;
  unidade: string;
  baseQuantidade: string;
  alternativas: string;
  valor: string;
  solucao: string;
  parcelamento: string;
  resultados: string;
  providencias: string;
  correlatas: string;
  responsavel: string;
  dotacao: string;
  linkPncp: string;
}

const EMPTY: EtpForm = {
  orgao: '', processo: '', objeto: '', necessidade: '', pca: '', requisitos: '',
  quantidade: '', unidade: '', baseQuantidade: '', alternativas: '', valor: '',
  solucao: '', parcelamento: '', resultados: '', providencias: '', correlatas: '',
  responsavel: '', dotacao: '', linkPncp: '',
};

/** Normaliza a referência do PNCP (link, nº de controle CNPJ-1-SEQ/ANO) para
 *  o deep link oficial da página do edital. Retorna '' se não reconhecer. */
function refPncp(input: string): string {
  const t = (input || '').trim();
  if (!t) return '';
  const url = buildPncpEditalUrl({ link: t.startsWith('http') ? t : null, id: t });
  return url.includes('/app/editais/') ? url : '';
}

/** Extrai cnpj/ano/seq de um link ou número de controle do PNCP. */
function parseRef(input: string): { cnpj: string; ano: string; seq: string } | null {
  const t = (input || '').trim();
  let m = t.match(/(?:editais|compras)\/(\d{14})\/(\d{4})\/(\d+)/);
  if (m) return { cnpj: m[1], ano: m[2], seq: m[3] };
  m = t.match(/^(\d{14})-\d+-(\d+)\/(\d{4})$/);
  if (m) return { cnpj: m[1], ano: m[3], seq: m[2] };
  return null;
}

function gerarEtpSecoes(d: EtpForm): Array<{ titulo: string; corpo: string }> {
  const hoje = new Date().toLocaleDateString('pt-BR');
  const link = refPncp(d.linkPncp);
  return [
    {
      titulo: 'Identificação',
      corpo: [
        `Órgão/Unidade: ${d.orgao || '[órgão/unidade]'}`,
        `Processo: ${d.processo || '[nº do processo]'}`,
        `Objeto: ${d.objeto}`,
        `Data de elaboração: ${hoje}`,
        link ? `Referência no PNCP: ${link}` : '',
      ].filter(Boolean).join('\n'),
    },
    { titulo: 'I – Descrição da necessidade', corpo: `A contratação de ${d.objeto} justifica-se pela seguinte necessidade: ${d.necessidade || '[descrever o problema/necessidade que motiva a contratação]'}.` },
    { titulo: 'II – Previsão no Plano de Contratações Anual (PCA)', corpo: d.pca || 'A contratação está prevista no PCA do órgão (indicar o item/estimativa).' },
    { titulo: 'III – Requisitos da contratação', corpo: d.requisitos || 'Requisitos técnicos, de sustentabilidade, de qualidade e de habilitação a serem observados.' },
    { titulo: 'IV – Estimativa das quantidades', corpo: `Quantidade estimada: ${d.quantidade || '[quantidade]'} ${d.unidade || ''}. Base de cálculo: ${d.baseQuantidade || '[série histórica, consumo, planejamento ou demanda reprimida]'}.` },
    { titulo: 'V – Levantamento de mercado e alternativas', corpo: `${d.alternativas || 'Foram analisadas as alternativas disponíveis no mercado; a solução escolhida mostrou-se a mais vantajosa em custo-benefício.'}${link ? `\nConsulta pública no PNCP: ${link}` : ''}` },
    { titulo: 'VI – Estimativa do valor', corpo: `Valor estimado: ${d.valor || '[valor estimado]'}, apurado por pesquisa de preços (painel de preços, contratações similares e/ou cotações), conforme o art. 23 da Lei nº 14.133/2021.` },
    { titulo: 'VII – Descrição da solução como um todo', corpo: d.solucao || 'A solução abrange o bem/serviço, as entregas, o ciclo de vida e as condições de execução.' },
    { titulo: 'VIII – Parcelamento', corpo: d.parcelamento || 'A contratação não será parcelada / será parcelada conforme indicado, observada a vantajosidade.' },
    { titulo: 'IX – Resultados pretendidos', corpo: (d.resultados || '[resultados e benefícios esperados, com indicadores de acompanhamento]') + '.' },
    { titulo: 'X – Providências a serem adotadas', corpo: d.providencias || 'Adoção das providências prévias: adequação orçamentária, elaboração do Termo de Referência/Projeto e designação de fiscais.' },
    { titulo: 'XI – Contratações correlatas e/ou interdependentes', corpo: d.correlatas || 'Não foram identificadas contratações correlatas ou interdependentes.' },
    { titulo: 'XII – Responsáveis', corpo: d.responsavel || '[nome, cargo/matrícula do responsável pela elaboração do ETP]' },
    { titulo: 'XIII – Adequação orçamentária', corpo: d.dotacao || 'Indicar programa/ação/elemento de despesa e a disponibilidade orçamentária para a contratação.' },
    { titulo: 'Observação', corpo: 'Documento gerado como MINUTA de apoio. Não substitui a análise jurídica nem a conferência dos requisitos legais aplicáveis.' },
  ];
}

function secoesParaTexto(sections: Array<{ titulo: string; corpo: string }>): string {
  return [
    'ESTUDO TÉCNICO PRELIMINAR (ETP)',
    '(Art. 18 da Lei nº 14.133/2021)',
    '',
    ...sections.map((s) => `${s.titulo.toUpperCase()}\n${s.corpo}`),
  ].join('\n\n');
}

export default function EstudoTecnicoPage() {
  const [progress, setProgress] = useState<Record<number, boolean>>({});
  const [form, setForm] = useState<EtpForm>(EMPTY);
  const [resultado, setResultado] = useState<string | null>(null);
  const [secoes, setSecoes] = useState<Array<{ titulo: string; corpo: string }>>([]);
  const [copiado, setCopiado] = useState(false);
  const [aviso, setAviso] = useState('');
  const [gerando, setGerando] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const total = ETP_SECTIONS.length;

  const set = (k: keyof EtpForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const gerar = () => {
    if (!form.objeto.trim()) {
      setAviso('Informe o objeto da contratação para gerar o ETP.');
      return;
    }
    setAviso('');
    setGerando(true);
    setCopiado(false);
    const s = gerarEtpSecoes(form);
    setSecoes(s);
    setResultado(secoesParaTexto(s));
    setGerando(false);
  };

  const buscarNoPncp = async () => {
    const ref = parseRef(form.linkPncp);
    if (!ref) {
      setAviso('Informe um link ou número de controle válido do PNCP para buscar os dados.');
      return;
    }
    setBuscando(true);
    setAviso('');
    try {
      const path = `pncp/v1/orgaos/${ref.cnpj}/compras/${ref.ano}/${Number(ref.seq)}`;
      let data: any = null;
      for (const u of [`/api/pncp/${path}`, `https://pncp.gov.br/api/${path}`]) {
        try {
          const r = await fetch(u, { headers: { Accept: 'application/json' } });
          if (!r.ok) continue;
          data = await r.json();
          if (data) break;
        } catch {
          /* tenta o próximo */
        }
      }
      if (!data) {
        setAviso('Não foi possível carregar os dados do PNCP agora.');
        return;
      }
      const valorTxt = data.valorTotalEstimado ? formatCurrency(Number(data.valorTotalEstimado)) : '';
      setForm((f) => ({
        ...f,
        orgao: f.orgao || data.orgaoEntidade?.razaoSocial || '',
        processo: f.processo || String(data.numeroCompra || ''),
        objeto: f.objeto || data.objetoCompra || '',
        valor: f.valor || valorTxt,
      }));
      setAviso('Dados do processo carregados do PNCP. Revise e complete o restante.');
    } finally {
      setBuscando(false);
    }
  };

  const copiar = async () => {
    if (!resultado) return;
    try {
      await navigator.clipboard.writeText(resultado);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {}
  };

  const baixar = () => {
    if (!resultado) return;
    const blob = new Blob([resultado], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'estudo-tecnico-preliminar.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const linkPncp = refPncp(form.linkPncp);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estudo Técnico Preliminar"
        description="Gere uma minuta de ETP (Art. 18 da Lei 14.133/2021) e vincule ao processo no PNCP quando houver"
      >
        <Badge variant="secondary" icon={<ClipboardList className="w-3 h-3" />}>{Math.round((Object.keys(progress).length / total) * 100)}% do roteiro</Badge>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Seções do ETP" value={total} icon={<FileSearch className="w-5 h-5" />} accent="primary" hint="base legal" />
        <StatCard label="Seções do roteiro concluídas" value={Object.keys(progress).length} icon={<CheckCircle2 className="w-5 h-5" />} accent="success" hint="seu progresso" />
        <StatCard label="Base legal" value="Art. 18" icon={<AlertCircle className="w-5 h-5" />} accent="warning" hint="Lei 14.133/2021" />
      </div>

      {/* GERADOR DE ETP */}
      <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" /> Gerar ETP
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Preencha os campos (o que faltar entra como “preencher”). Informe o link/número do PNCP para vincular o processo.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Órgão / Unidade</label>
            <input value={form.orgao} onChange={(e) => set('orgao', e.target.value)} placeholder="Ex.: Prefeitura Municipal — Secretaria de Saúde" className={INPUT_CLS} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Nº do processo</label>
            <input value={form.processo} onChange={(e) => set('processo', e.target.value)} placeholder="Ex.: 0001/2026" className={INPUT_CLS} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Objeto da contratação *</label>
            <input value={form.objeto} onChange={(e) => set('objeto', e.target.value)} placeholder="Ex.: aquisição de 20 notebooks" className={INPUT_CLS} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Necessidade / problema</label>
            <textarea value={form.necessidade} onChange={(e) => set('necessidade', e.target.value)} rows={2} placeholder="Ex.: substituir equipamentos obsoletos que travam as atividades" className={INPUT_CLS} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Previsão no PCA</label>
            <input value={form.pca} onChange={(e) => set('pca', e.target.value)} placeholder="Ex.: item 12 do PCA 2026" className={INPUT_CLS} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Requisitos da contratação</label>
            <input value={form.requisitos} onChange={(e) => set('requisitos', e.target.value)} placeholder="Ex.: garantia de 12 meses, entrega em 30 dias" className={INPUT_CLS} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Quantidade estimada</label>
            <input value={form.quantidade} onChange={(e) => set('quantidade', e.target.value)} placeholder="Ex.: 20" className={INPUT_CLS} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Unidade</label>
            <input value={form.unidade} onChange={(e) => set('unidade', e.target.value)} placeholder="Ex.: unidade" className={INPUT_CLS} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Base da quantidade</label>
            <input value={form.baseQuantidade} onChange={(e) => set('baseQuantidade', e.target.value)} placeholder="Ex.: consumo médio dos últimos 12 meses" className={INPUT_CLS} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Levantamento de mercado / alternativas</label>
            <input value={form.alternativas} onChange={(e) => set('alternativas', e.target.value)} placeholder="Ex.: comparadas 3 soluções; escolhida a de melhor custo-benefício" className={INPUT_CLS} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Valor estimado</label>
            <input value={form.valor} onChange={(e) => set('valor', e.target.value)} placeholder="Ex.: R$ 120.000,00" className={INPUT_CLS} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Parcelamento</label>
            <input value={form.parcelamento} onChange={(e) => set('parcelamento', e.target.value)} placeholder="Ex.: não parcelado / por item" className={INPUT_CLS} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Descrição da solução como um todo</label>
            <input value={form.solucao} onChange={(e) => set('solucao', e.target.value)} placeholder="Ex.: fornecimento, instalação e suporte por 12 meses" className={INPUT_CLS} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Resultados pretendidos</label>
            <input value={form.resultados} onChange={(e) => set('resultados', e.target.value)} placeholder="Ex.: reduzir tempo de atendimento em 30%" className={INPUT_CLS} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Responsável (nome/cargo)</label>
            <input value={form.responsavel} onChange={(e) => set('responsavel', e.target.value)} placeholder="Ex.: João Silva — Chefe de Compras" className={INPUT_CLS} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Link ou nº do processo no PNCP (opcional)</label>
            <input value={form.linkPncp} onChange={(e) => set('linkPncp', e.target.value)} placeholder="https://pncp.gov.br/app/editais/... ou CNPJ-1-000123/2026" className={INPUT_CLS} />
            {form.linkPncp.trim() && (
              <p className="mt-1.5 text-[11px]">
                {linkPncp ? (
                  <a href={linkPncp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                    Ver no PNCP (gov.br) <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">Referência não reconhecida (use o link do PNCP ou CNPJ-1-SEQ/ANO).</span>
                )}
              </p>
            )}
            <div className="mt-2">
              <button
                type="button"
                onClick={buscarNoPncp}
                disabled={buscando || !form.linkPncp.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" /> {buscando ? 'Buscando dados...' : 'Buscar dados no PNCP'}
              </button>
            </div>
          </div>
        </div>

        {aviso && <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">{aviso}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={gerar}
            disabled={gerando}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            <Sparkles className="w-4 h-4" /> {gerando ? 'Gerando...' : 'Gerar ETP'}
          </button>
          {linkPncp && (
            <a
              href={linkPncp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> Abrir no PNCP
            </a>
          )}
        </div>
        <p className="mt-3 text-[11px] text-slate-400">
          O ETP é uma minuta de apoio gerada a partir dos dados informados. Não substitui a análise
          jurídica nem a conferência dos requisitos legais aplicáveis.
        </p>
      </div>

      {/* RESULTADO */}
      {resultado !== null && (
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> ETP gerado
            </h2>
            <div className="flex gap-2">
              <button
                onClick={copiar}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors',
                  copiado
                    ? 'border-emerald-200 text-emerald-600 dark:border-emerald-500/30 dark:text-emerald-400'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                )}
              >
                <Copy className="w-3.5 h-3.5" /> {copiado ? 'Copiado!' : 'Copiar'}
              </button>
              <button
                onClick={baixar}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Baixar .txt
              </button>
              <button
                onClick={() => exportarWord('Estudo Técnico Preliminar (ETP)', secoes, 'estudo-tecnico-preliminar')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" /> Word
              </button>
              <button
                onClick={() => {
                  const html = secoes
                    .map((s) => `<h2>${escapeHtml(s.titulo)}</h2><p>${escapeHtml(s.corpo).replace(/\n/g, '<br/>')}</p>`)
                    .join('');
                  abrirImpressaoProcesso(null, 'Estudo Técnico Preliminar (ETP)', html);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" /> PDF (imprimir/salvar)
              </button>
            </div>
          </div>
          <pre className="whitespace-pre-wrap font-sans text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 leading-relaxed">
            {resultado}
          </pre>
          {linkPncp && (
            <a
              href={linkPncp}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              Ver o processo no PNCP (gov.br) <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}

      {/* ROTEIRO (referência) */}
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
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Fonte oficial:{' '}
          <a href="https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/L14133.htm" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
            Lei nº 14.133/2021 (Planalto)
          </a>{' '}
          ·{' '}
          <a href="https://pncp.gov.br" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
            PNCP
          </a>
          .
        </p>
      </div>
    </div>
  );
}
