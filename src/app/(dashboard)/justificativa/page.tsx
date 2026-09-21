'use client';

import { useState } from 'react';
import { ClipboardCopy, Download, FileText, Sparkles } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import EmptyState from '@/components/ui/empty-state';
import Input from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function JustificativaPage() {
  const [tipo, setTipo] = useState('servico');
  const [objeto, setObjeto] = useState('');
  const [localidade, setLocalidade] = useState('');
  const [fornecedores, setFornecedores] = useState('');
  const [preco, setPreco] = useState('');
  const [resultado, setResultado] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [aviso, setAviso] = useState('');
  const [gerando, setGerando] = useState(false);

  const gerar = () => {
    if (!objeto.trim()) {
      setAviso('Informe o objeto da contratação para gerar a justificativa.');
      return;
    }
    setAviso('');
    setGerando(true);
    const data = new Date().toLocaleDateString('pt-BR');
    const tipoTxt = tipo === 'servico' ? 'serviço' : tipo === 'material' ? 'material/suprimento' : 'mão de obra';
    const objetos = fornecedores.split(',')
      .map((f) => f.trim())
      .filter(Boolean)
      .map((f, i) => `  ${i + 1}. ${f};`)
      .join('\n');

    const texto = [
      `JUSTIFICATIVA DE PREÇO`,
      ``,
      `Objeto: ${objeto || '[descrição do objeto]'}`,
      `Tipo de solução: ${tipoTxt.charAt(0).toUpperCase() + tipoTxt.slice(1)}`,
      `Localidade da contratação: ${localidade || '[localidade]'}`,
      `Data de elaboração: ${data}`,
      ``,
      `1. FUNDAMENTAÇÃO`,
      ``,
      `A presente justificativa de preço visa demonstrar que os valores praticados para a contratação em questão estão compatíveis com o mercado, em atendimento aos princípios da economicidade e da transparência nas contratações públicas.`,
      ``,
      `2. PESQUISA DE MERCADO`,
      ``,
      `Foram consultadas as seguintes fontes e fornecedores para a composição do preço de referência:`,
      ``,
      objetos || `  [listar fornecedores cotados]`,
      ``,
      `3. VALOR DE REFERÊNCIA`,
      ``,
      `O valor estimado apurado para a contratação foi de ${preco || '[valor estimado]'}, obtido a partir da consolidação das cotações acima, sendo utilizado como parâmetro para a disputa na licitação.`,
      ``,
      `4. CONCLUSÃO`,
      ``,
      `Ante o exposto, considerando as cotações apresentadas e a adequação dos preços praticados ao mercado da ${localidade || 'região'}, conclui-se que o valor de referência é justo e adequado.`,
    ].join('\n');

    setResultado(texto);
    setCopiado(false);
    setGerando(false);
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
    a.download = 'justificativa-preco.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputCls = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Justificativa de Preço"
        description="Gere uma fundamentação de preço com base nos dados informados"
      />

      <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Tipo de solução</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputCls}>
              <option value="servico">Serviço</option>
              <option value="material">Material / Suprimento</option>
              <option value="mao">Mão de obra</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Valor estimado / orçado</label>
            <Input value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="Ex.: R$ 45.000,00" className="py-2.5" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Objeto da contratação</label>
            <Input value={objeto} onChange={(e) => setObjeto(e.target.value)} placeholder="Ex.: prestação de serviços de limpeza predial" className="py-2.5" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Localidade</label>
            <Input value={localidade} onChange={(e) => setLocalidade(e.target.value)} placeholder="Ex.: Município de São Paulo/SP" className="py-2.5" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Fornecedores consultados (separados por vírgula)</label>
            <Input value={fornecedores} onChange={(e) => setFornecedores(e.target.value)} placeholder="Ex.: Empresa A, Empresa B, Empresa C" className="py-2.5" />
          </div>
        </div>
        {aviso && <p className="mb-3 text-sm text-amber-600 dark:text-amber-400">{aviso}</p>}
        <button
          onClick={gerar}
          disabled={gerando}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          <Sparkles className="w-4 h-4" /> {gerando ? 'Gerando...' : 'Gerar justificativa'}
        </button>
        <p className="mt-3 text-[11px] text-slate-400">
          A justificativa é uma minuta gerada a partir dos dados informados. Não substitui a análise
          jurídica nem a conferência do edital; revise e adapte antes de usar.
        </p>
      </div>

      {resultado === null ? (
        <EmptyState
          icon={<FileText className="w-8 h-8" />}
          title="Nenhuma justificativa gerada"
          description="Preencha os campos ao lado e clique em «Gerar justificativa» para produzir o texto de fundamentação."
          className="border border-dashed border-neutral-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900"
        />
      ) : (
        <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Texto gerado
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
                <ClipboardCopy className="w-3.5 h-3.5" /> {copiado ? 'Copiado!' : 'Copiar'}
              </button>
              <button
                onClick={baixar}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Baixar .txt
              </button>
            </div>
          </div>
          <pre className="whitespace-pre-wrap font-sans text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 leading-relaxed">
            {resultado}
          </pre>
        </div>
      )}
    </div>
  );
}
