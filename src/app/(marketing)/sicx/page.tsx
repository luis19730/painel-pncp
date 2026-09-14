import type { Metadata } from 'next'
import Link from 'next/link'
import { Zap, FileText, Database, Shield } from 'lucide-react'
import Button from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'SICX | Painel PNCP',
  description:
    'Conheça o SICX, o sistema de compras expressas do governo federal. Entenda como funciona, a base legal, vantagens para fornecedores e licitações. Plataforma independente de consulta de dados públicos.',
}

export default function SicxPage() {
  return (
    <div className="py-20 md:py-28">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">O que é o SICX?</h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Entenda tudo sobre o sistema de compras expressas (SICX): o que é, como funciona, a
            base legal e como você pode participar.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Compras mais rápidas</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              O SICX agiliza a contratação de bens e serviços comuns, com prazos muito menores que
              os das modalidades tradicionais de licitação.
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mb-4">
              <FileText className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Base legal</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Banco de dados e fluxo institucionalizado pela Lei nº 14.133/2021, com as
              atualizações trazidas pela Lei nº 15.266/2025 e o Decreto nº 13.106/2026, que
              regulamentam as compras expressas.
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
              <Database className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Dados abertos</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              As oportunidades SICX são publicadas no PNCP, com dados abertos que você pode
              consultar e monitorar gratuitamente aqui no Painel PNCP.
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center mb-4">
              <Shield className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Com seguro e confiança</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Consultas transparentes e independentes, sem vínculo com órgãos públicos. Você
              acompanha tudo direto da fonte oficial.
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-8 md:p-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Aviso importante</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            O Painel PNCP é uma plataforma independente de consulta a dados públicos. Não somos um
            órgão governamental e não temos vínculo com o SICX, com o PNCP ou com órgãos do Governo
            Federal.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Os dados apresentados são de fontes públicas e oficiais e estão sujeitos às informações
            disponibilizadas pelos órgãos responsáveis. Consulte sempre a fonte oficial (pncp.gov.br)
            para informações atualizadas e oficiais.
          </p>
        </div>

        <div className="text-center mt-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Pronto para acompanhar o SICX?</h2>
          <p className="text-gray-500 mb-6">
            Crie sua conta gratuita e comece a monitorar compras expressas em todo o país.
          </p>
          <Link href="/cadastro">
            <Button size="lg">Começar agora</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
