import type { Metadata } from 'next'
import { Shield, Globe, Database, Users } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Sobre o Painel PNCP',
  description:
    'Conheça o Painel PNCP, a plataforma independente de consulta e análise de dados públicos de licitações do Brasil.',
}

export default function SobrePage() {
  return (
    <div className="py-20 md:py-28">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Sobre o Painel PNCP</h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Uma plataforma independente de consulta e análise de dados públicos de licitações.
          </p>
        </div>

        <div className="prose prose-gray max-w-none">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 md:p-12 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">O que é o Painel PNCP?</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              O Painel PNCP é uma plataforma independente de consulta, análise e monitoramento de
              licitações públicas brasileiras. Nosso objetivo é transformar dados públicos dispersos
              em informações acessíveis e úteis para empresas de todos os portes.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Utilizamos dados provenientes do{' '}
              <strong>Portal Nacional de Contratações Públicas (PNCP)</strong>, a fonte oficial e
              pública de informações sobre licitações no Brasil, complementando com ferramentas de
              análise e inteligência artificial para facilitar a busca e avaliação de oportunidades.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                <Globe className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Dados Públicos</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Todos os dados utilizados na plataforma são de fontes públicas e oficiais,
                disponibilizados pelo PNCP e pelos órgãos públicos responsáveis.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Plataforma Independente</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                O Painel PNCP não possui vínculo institucional com o Portal Nacional de
                Contratações Públicas ou com órgãos do Governo Federal.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                <Database className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Análise Inteligente</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Combinamos dados públicos com ferramentas de análise e inteligência artificial para
                gerar insights valiosos sobre oportunidades de licitação.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Para Empresas</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Desenvolvido para empresas que participam ou desejam participar de licitações
                públicas, de qualquer porte e segmento.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 md:p-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Aviso importante</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              O Painel PNCP é uma ferramenta de consulta e análise de dados públicos. Não somos um
              órgão governamental e não temos poder decisório sobre licitações ou contratações
              públicas.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Os dados apresentados são provenientes de fontes públicas e estão sujeitos às
              informações disponibilizadas pelos órgãos responsáveis. Recomendamos sempre consultar
              a fonte oficial (pncp.gov.br) para informações atualizadas e oficiais.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
