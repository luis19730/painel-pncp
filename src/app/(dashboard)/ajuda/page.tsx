'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, ChevronDown, Mail, BookOpen, CircleHelp, GraduationCap, ArrowRight, FileText } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import Input from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { GUIAS, GUIA_AVISO, GUIA_ATUALIZADO_EM_LABEL } from '@/content/guias';

const FAQS = [
  {
    q: 'Como funciona o score de oportunidade?',
    a: 'O score calcula a aderência de cada licitação ao seu perfil de empresa (palavras-chave, localização, faixa de valor, segmento/CNAE e prazo). Ele vai de 0 a 100 e é mostrado nas listagens e no detalhe da oportunidade, com a explicação do porquê de cada nota.',
  },
  {
    q: 'De onde vêm os dados?',
    a: 'Buscamos oportunidades no portal PNCP (Portal Nacional de Contratações Públicas). Quando o serviço externo não está disponível, o sistema apresenta dados demonstrativos para que você continue explorando as funcionalidades.',
  },
  {
    q: 'Os meus dados são salvos?',
    a: 'Perfil, favoritos, alertas, radar e preferências são persistidos localmente no seu navegador. Nenhuma conta de banco de dados separada é usada nesta versão, então tudo fica restrito a este dispositivo.',
  },
  {
    q: 'Como configuro meu perfil para receber melhores resultados?',
    a: 'Em "Meu Perfil", preencha seus CNAEs, segmentos, palavras-chave, estados de interesse e a faixa de valor das suas propostas. O score e os alertas usam exatamente essas informações.',
  },
  {
    q: 'O que é o Meu Radar?',
    a: 'O radar são pesquisas salvas (palavras, modalidade, UF) que você cria para monitorar. A ferramenta cruza essas buscas com novas oportunidades do PNCP e alimenta os seus alertas.',
  },
  {
    q: 'Como gero uma justificativa de preço?',
    a: 'Acesse a página "Justificativa". Informe o tipo de solução, localidade e fornecedores e o sistema gera um texto de fundamentação. O resultado pode ser copiado ou baixado em formato texto.',
  },
];

const CATEGORIAS = [
  { icon: BookOpen, titulo: 'Como começar', desc: 'Primeiros passos, cadastro de perfil e navegação', link: '/dashboard' },
  { icon: CircleHelp, titulo: 'Usando o score', desc: 'Entenda o cálculo e como melhorar suas notas', link: '/score' },
  { icon: Mail, titulo: 'Alertas e Radar', desc: 'Monitore novas licitações automaticamente', link: '/meu-radar' },
];

export default function AjudaPage() {
  const [query, setQuery] = useState('');
  const [aberta, setAberta] = useState<number | null>(0);

  const q = query.trim().toLowerCase();
  const guiasFiltrados = GUIAS.filter(
    (g) => !q || g.titulo.toLowerCase().includes(q) || g.resumo.toLowerCase().includes(q)
  );
  const filtered = FAQS.filter(
    (f) => !q || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Central de Ajuda"
        description="Guias práticos de licitação e respostas sobre o uso da plataforma"
      />

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar um guia ou dúvida (ex.: habilitação, preço, edital, ME/EPP)..."
          className="pl-11 py-3"
        />
      </div>

      {/* Guias práticos */}
      <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <GraduationCap className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Guias práticos de licitação</h2>
        </div>

        {guiasFiltrados.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum guia encontrado para "{query}".</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {guiasFiltrados.map((g) => (
              <Link
                key={g.slug}
                href={`/ajuda/${g.slug}`}
                title={g.resumo}
                className="group rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:border-primary/40 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 dark:bg-primary/15 flex items-center justify-center text-primary shrink-0">
                    <FileText className="w-[18px] h-[18px]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{g.titulo}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{g.resumo}</p>
                  </div>
                </div>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  Abrir guia <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Atalhos por categoria */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {CATEGORIAS.map((c) => (
          <Link
            key={c.titulo}
            href={c.link}
            className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-5 hover:border-primary transition-colors group"
          >
            <div className="w-11 h-11 rounded-xl bg-accent-soft dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 flex items-center justify-center mb-3">
              <c.icon className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{c.titulo}</p>
            <p className="text-xs text-slate-400 mt-1">{c.desc}</p>
          </Link>
        ))}
      </div>

      {/* FAQ */}
      <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Perguntas frequentes</h2>
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhuma pergunta encontrada para "{query}".</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((faq, i) => (
              <div key={faq.q}>
                <button
                  onClick={() => setAberta(aberta === i ? null : i)}
                  className="w-full flex items-center justify-between gap-3 py-4 text-left"
                >
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{faq.q}</span>
                  <ChevronDown className={cn('w-4 h-4 text-slate-400 shrink-0 transition-transform', aberta === i && 'rotate-180')} />
                </button>
                {aberta === i && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 pb-4 pr-8 leading-relaxed">{faq.a}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contato */}
      <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-6 flex items-start gap-3">
        <Mail className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Ainda precisa de ajuda?</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Nossa equipe está disponível para responder suas dúvidas sobre uso, licitações e preparação de propostas.
          </p>
          <a
            href="mailto:painelpncp@gmail.com"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline mt-3"
          >
            <Mail className="w-4 h-4" />
            painelpncp@gmail.com
          </a>
        </div>
      </div>

      {/* Aviso */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-5">
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{GUIA_AVISO}</p>
        <p className="text-[11px] text-slate-400 mt-2">Última atualização: {GUIA_ATUALIZADO_EM_LABEL}.</p>
      </div>
    </div>
  );
}
