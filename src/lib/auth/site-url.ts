/** URL base do site para montar links de e-mail (aponta pro próprio domínio). */
export function siteBaseUrl(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL
  if (configured && /^https?:\/\//.test(configured)) {
    return configured.replace(/\/+$/, '')
  }
  const proto =
    (req.headers.get('x-forwarded-proto') || '').split(',')[0].trim() || 'https'
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || ''
  if (!host) return 'https://painel-pncp.luis19730.workers.dev'
  return `${proto}://${host}`
}