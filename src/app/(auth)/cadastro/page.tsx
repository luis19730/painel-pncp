import type { Metadata } from 'next'
import Link from 'next/link'
import CadastroForm from '@/components/auth/cadastro-form'

export const metadata: Metadata = {
  title: 'Criar conta — Pesquisa de Preços Inteligente',
  description:
    'Crie sua conta no Painel PNCP e tenha acesso à Pesquisa de Preços Inteligente para licitações: pesquise preços, organize e compare referências e gere relatórios para auxiliar na preparação dos seus processos de contratação pública.',
  openGraph: {
    title: 'Criar conta — Pesquisa de Preços Inteligente',
    description:
      'Acesso à Pesquisa de Preços Inteligente e a outras ferramentas do Painel PNCP para compras públicas e contratações.',
    type: 'website',
    siteName: 'Painel PNCP',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Criar conta — Pesquisa de Preços Inteligente',
    description:
      'Crie sua conta e utilize ferramentas inteligentes de pesquisa de preços para contratação pública.',
  },
}

export default function CadastroPage() {
  return (
    <div className="space-y-6">
      {/* Bloco comercial acima do formulário */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 shadow-xl shadow-slate-200/40 dark:shadow-none">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-soft dark:bg-primary/10 text-primary text-xs font-semibold mb-4">
          Pesquisa de Preços Inteligente
        </div>
        <h2 className="text-2xl font-extrabold font-display text-slate-900 dark:text-white mb-2">
          Tenha acesso à Pesquisa de Preços Inteligente
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
          Crie sua conta e utilize ferramentas inteligentes para pesquisar preços, analisar referências e gerar
          relatórios para auxiliar na preparação dos seus processos de contratação pública.
        </p>

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          {[
            'Pesquisa de preços inteligente',
            'Organização das referências encontradas',
            'Comparação de preços',
            'Geração de relatório',
            'Ferramentas para apoio à contratação pública',
            'Acesso a outras funcionalidades do Painel PNCP',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="w-5 h-5 shrink-0 rounded-full bg-success-soft dark:bg-emerald-500/10 flex items-center justify-center mt-0.5">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-success">
                  <path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.79 6.8-6.8a1 1 0 0 1 1.4 0Z" clipRule="evenodd" />
                </svg>
              </span>
              <span className="text-slate-600 dark:text-slate-300">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Formulário (funcionalidade inalterada) */}
      <CadastroForm />

      {/* Destaque de marketing */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 p-7 shadow-xl shadow-slate-200/40 dark:shadow-none text-center">
        <h2 className="text-xl font-extrabold font-display text-slate-900 dark:text-white mb-2">
          Mais inteligência. Menos trabalho manual.
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5">
          Automatize etapas da sua pesquisa de preços e tenha as informações organizadas para facilitar a
          elaboração e instrução do processo.
        </p>
        <Link href="/precos-inteligentes">
          <span className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 hover:opacity-95 transition-all hover:scale-[1.02]">
            Conhecer o Painel PNCP
          </span>
        </Link>
        <p className="block mt-4 text-[11px] text-slate-400">
          A Pesquisa de Preços inteligente auxilia na busca e organização de referências. A análise,
          decisão e a aprovação permanecem sob responsabilidade dos agentes competentes.
        </p>
      </div>
    </div>
  )
}