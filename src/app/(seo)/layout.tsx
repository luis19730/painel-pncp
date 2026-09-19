import SiteShell from '@/components/layout/site-shell'

// Route group SEO (ex.: /licitacoes): usa o mesmo shell público de marketing,
// garantindo header, navegação e footer consistentes.
export default function SeoLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell>{children}</SiteShell>
}
