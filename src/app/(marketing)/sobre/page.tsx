import { Shield, Globe, Database, Users } from 'lucide-react'

export default function SobrePage() {
  return (
    <div className="py-20 md:py-28">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Sobre o Painel PNCP</h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Uma plataforma independente de consulta e analise de dados publicos de licitacoes.
          </p>
        </div>

        <div className="prose prose-gray max-w-none">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 md:p-12 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">O que e o Painel PNCP?</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              O Painel PNCP e uma plataforma independente de consulta, analise e monitoramento de
              licitacoes publicas brasileiras. Nosso objetivo e transformar dados publicos dispersos
              em informacoes acessiveis e uteis para empresas de todos os portes.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Utilizamos dados provenientes do{' '}
              <strong>Portal Nacional de Contratacoes Publicas (PNCP)</strong>, a fonte oficial e
              publica de informacoes sobre licitacoes no Brasil, complementando com ferramentas de
              analise e inteligencia artificial para facilitar a busca e avaliacao de oportunidades.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                <Globe className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Dados Publicos</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Todos os dados utilizados na plataforma sao de fontes publicas e oficiais,
                disponibilizados pelo PNCP e pelos orgaos publicos responsaveis.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Plataforma Independente</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                O Painel PNCP nao possui vinculo institucional com o Portal Nacional de
                Contratacoes Publicas ou com orgaos do Governo Federal.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                <Database className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Analise Inteligente</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Combinamos dados publicos com ferramentas de analise e inteligencia artificial para
                gerar insights valiosos sobre oportunidades de licitacao.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Para Empresas</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Desenvolvido para empresas que participam ou desejam participar de licitacoes
                publicas, de qualquer porte e segmento.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 md:p-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Aviso importante</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              O Painel PNCP e uma ferramenta de consulta e analise de dados publicos. Nao somos um
              orgao governamental e nao temos poder decisorio sobre licitacoes ou contratacoes
              publicas.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Os dados apresentados sao provenientes de fontes publicas e estao sujeitos as
              informacoes disponibilizadas pelos orgaos responsaveis. Recomendamos sempre consultar
              a fonte oficial (pncp.gov.br) para informacoes atualizadas e oficiais.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
