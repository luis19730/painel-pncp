import Link from 'next/link'
import Logo from '@/components/layout/logo'

export default function Footer() {
  return (
    <footer className="bg-slate-900 dark:bg-[#0b1120] border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <Logo dark />
            <p className="mt-4 text-sm text-slate-400 leading-relaxed">
              Central de inteligência para encontrar, analisar e acompanhar oportunidades públicas.
            </p>
            <p className="mt-2 text-xs text-slate-500">Inteligência para oportunidades públicas.</p>
          </div>
          <div>
            <h4 className="font-semibold text-white text-sm mb-3">Plataforma</h4>
            <div className="space-y-2">
              <FooterLink href="/oportunidades">Oportunidades</FooterLink>
              <FooterLink href="/busca">Busca</FooterLink>
              <FooterLink href="/meu-radar">Meu Radar</FooterLink>
              <FooterLink href="/planos">Planos</FooterLink>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-white text-sm mb-3">Recursos</h4>
            <div className="space-y-2">
              <FooterLink href="/precos">Mapa de Preços</FooterLink>
              <FooterLink href="/concorrentes">Concorrentes</FooterLink>
              <FooterLink href="/alertas">Alertas</FooterLink>
              <FooterLink href="/relatorios">Relatórios</FooterLink>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-white text-sm mb-3">Institucional</h4>
            <div className="space-y-2">
              <FooterLink href="/sobre">Sobre</FooterLink>
              <FooterLink href="/termos">Termos de Uso</FooterLink>
              <FooterLink href="/privacidade">Privacidade</FooterLink>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-slate-500 text-center md:text-left max-w-2xl">
              O Painel PNCP é uma plataforma independente de consulta e análise de dados públicos.
              Não possui vínculo institucional com o Portal Nacional de Contratações Públicas ou com órgãos do Governo Federal.
              Os dados apresentados são provenientes do PNCP e estão sujeitos às informações disponibilizadas pelos órgãos responsáveis.
            </p>
            <p className="text-xs text-slate-600 shrink-0">Dados públicos do PNCP</p>
          </div>
        </div>
      </div>
    </footer>
  )
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block text-sm text-slate-400 hover:text-white transition-colors">
      {children}
    </Link>
  )
}
