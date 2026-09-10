import Logo from '@/components/layout/logo'
import ThemeToggle from '@/components/layout/theme-toggle'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#0b1120]">
      {/* Left branding panel */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-gradient-to-br from-primary via-secondary to-accent">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <Logo href="/" dark size="lg" />

          <div>
            <h2 className="text-4xl font-extrabold font-display leading-tight mb-4">
              Sua central de inteligência em licitações públicas
            </h2>
            <p className="text-white/90 text-lg mb-8 max-w-md">
              Encontre, analise e acompanhe as oportunidades mais relevantes. Inclui Pesquisa de Preços
              Inteligente com geração de relatório para contratação pública.
            </p>
            <div className="space-y-3">
              {['Pesquisa de Preços Inteligente', 'Geração de relatório de preços', 'Busca inteligente no PNCP', 'Score de oportunidade', 'Alertas e radar personalizado', 'Mapa de preços'].map(item => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm">✓</div>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-white/70 text-sm">Dados públicos do PNCP · Atualização contínua</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="lg:hidden mb-8">
          <Logo href="/" size="lg" />
        </div>
        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>
    </div>
  )
}
