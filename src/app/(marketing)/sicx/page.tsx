import type { Metadata } from 'next'
import Link from 'next/link'
import { Zap, FileText, Database, Shield } from 'lucide-react'
import Button from '@/components/ui/button'
import { Section, SectionHead } from '@/components/marketing/section'

export const metadata: Metadata = {
  title: 'SICX | Painel PNCP',
  description:
    'Conheça o SICX, o sistema de compras expressas do governo federal. Entenda como funciona, a base legal, vantagens para fornecedores e licitações. Plataforma independente de consulta de dados públicos.',
}

const CARDS = [
  {
    icon: Zap,
    titulo: 'Compras mais rápidas',
    texto:
      'O SICX agiliza a contratação de bens e serviços comuns, com prazos muito menores que os das modalidades tradicionais de licitação.',
  },
  {
    icon: FileText,
    titulo: 'Base legal',
    texto:
      'Banco de dados e fluxo institucionalizado pela Lei nº 14.133/2021, com as atualizações trazidas pela Lei nº 15.266/2025 e o Decreto nº 13.106/2026, que regulamentam as compras expressas.',
  },
  {
    icon: Database,
    titulo: 'Dados abertos',
    texto:
      'As oportunidades SICX são publicadas no PNCP, com dados abertos que você pode consultar e monitorar gratuitamente aqui no Painel PNCP.',
  },
  {
    icon: Shield,
    titulo: 'Com seguro e confiança',
    texto:
      'Consultas transparentes e independentes, sem vínculo com órgãos públicos. Você acompanha tudo direto da fonte oficial.',
  },
]

export default function SicxPage() {
  return (
    <Section narrow>
      <SectionHead
        align="center"
        eyebrow="Compras Expressas"
        title="O que é o SICX?"
        subtitle="Entenda tudo sobre o sistema de compras expressas (SICX): o que é, como funciona, a base legal e como você pode participar."
        as="h1"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {CARDS.map(({ icon: Icon, titulo, texto }) => (
          <div key={titulo} className="card p-6">
            <div className="w-11 h-11 rounded-xl bg-primary/10 dark:bg-primary/15 flex items-center justify-center mb-4 text-primary">
              <Icon className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{titulo}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{texto}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-8 md:p-10">
        <h2 className="text-2xl font-extrabold font-display text-slate-900 dark:text-white mb-4">
          Aviso importante
        </h2>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          O Painel PNCP é uma plataforma independente de consulta a dados públicos. Não somos um
          órgão governamental e não temos vínculo com o SICX, com o PNCP ou com órgãos do Governo
          Federal.
        </p>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
          Os dados apresentados são de fontes públicas e oficiais e estão sujeitos às informações
          disponibilizadas pelos órgãos responsáveis. Consulte sempre a fonte oficial (pncp.gov.br)
          para informações atualizadas e oficiais.
        </p>
      </div>

      <div className="text-center mt-10">
        <h2 className="text-2xl font-extrabold font-display text-slate-900 dark:text-white mb-3">
          Pronto para acompanhar o SICX?
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          Crie sua conta gratuita e comece a monitorar compras expressas em todo o país.
        </p>
        <Link href="/cadastro">
          <Button size="lg">Começar agora</Button>
        </Link>
      </div>
    </Section>
  )
}
