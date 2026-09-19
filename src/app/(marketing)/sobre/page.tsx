import type { Metadata } from 'next'
import { Shield, Globe, Database, Users } from 'lucide-react'
import { Section, SectionHead } from '@/components/marketing/section'

export const metadata: Metadata = {
  title: 'Sobre o Painel PNCP',
  description:
    'Conheça o Painel PNCP, a plataforma independente de consulta e análise de dados públicos de licitações do Brasil.',
}

const PILARES = [
  {
    icon: Globe,
    titulo: 'Dados Públicos',
    texto:
      'Todos os dados utilizados na plataforma são de fontes públicas e oficiais, disponibilizados pelo PNCP e pelos órgãos públicos responsáveis.',
  },
  {
    icon: Shield,
    titulo: 'Plataforma Independente',
    texto:
      'O Painel PNCP não possui vínculo institucional com o Portal Nacional de Contratações Públicas ou com órgãos do Governo Federal.',
  },
  {
    icon: Database,
    titulo: 'Análise Inteligente',
    texto:
      'Combinamos dados públicos com ferramentas de análise e inteligência artificial para gerar insights valiosos sobre oportunidades de licitação.',
  },
  {
    icon: Users,
    titulo: 'Para Empresas',
    texto:
      'Desenvolvido para empresas que participam ou desejam participar de licitações públicas, de qualquer porte e segmento.',
  },
]

export default function SobrePage() {
  return (
    <Section narrow>
      <SectionHead
        align="center"
        eyebrow="Institucional"
        title="Sobre o Painel PNCP"
        subtitle="Uma plataforma independente de consulta e análise de dados públicos de licitações."
        as="h1"
      />

      <div className="card p-8 md:p-12 mb-8">
        <h2 className="text-2xl font-extrabold font-display text-slate-900 dark:text-white mb-4">
          O que é o Painel PNCP?
        </h2>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
          O Painel PNCP é uma plataforma independente de consulta, análise e monitoramento de
          licitações públicas brasileiras. Nosso objetivo é transformar dados públicos dispersos em
          informações acessíveis e úteis para empresas de todos os portes.
        </p>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
          Utilizamos dados provenientes do{' '}
          <strong>Portal Nacional de Contratações Públicas (PNCP)</strong>, a fonte oficial e pública
          de informações sobre licitações no Brasil, complementando com ferramentas de análise e
          inteligência artificial para facilitar a busca e avaliação de oportunidades.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PILARES.map(({ icon: Icon, titulo, texto }) => (
          <div key={titulo} className="card p-6">
            <div className="w-11 h-11 rounded-xl bg-primary/10 dark:bg-primary/15 flex items-center justify-center mb-4 text-primary">
              <Icon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{titulo}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{texto}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-8 md:p-10">
        <h2 className="text-2xl font-extrabold font-display text-slate-900 dark:text-white mb-4">
          Aviso importante
        </h2>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          O Painel PNCP é uma ferramenta de consulta e análise de dados públicos. Não somos um órgão
          governamental e não temos poder decisório sobre licitações ou contratações públicas.
        </p>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
          Os dados apresentados são provenientes de fontes públicas e estão sujeitos às informações
          disponibilizadas pelos órgãos responsáveis. Recomendamos sempre consultar a fonte oficial
          (pncp.gov.br) para informações atualizadas e oficiais.
        </p>
      </div>
    </Section>
  )
}
