// ============================================================================
// Conteúdo das notificações (e-mail HTML + Telegram texto).
// Usa os dados REAIS da oportunidade correspondente.
// ============================================================================

export interface AlertOpportunity {
  id: string
  objeto: string
  orgao: string
  modalidade: string
  valor: number
  uf: string
  municipio: string
  dataAbertura: string | null
  dataEncerramento: string | null
  score: number
  link: string
}

function fmtMoney(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtDate(d: string | null): string {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString('pt-BR')
}
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string)
  )
}

export function buildTelegramText(o: AlertOpportunity): string {
  const lines = [
    '🚨 NOVA OPORTUNIDADE ENCONTRADA',
    '',
    `Objeto: ${o.objeto}`,
    `Órgão: ${o.orgao || '—'}`,
    `Modalidade: ${o.modalidade || '—'}`,
    `Valor estimado: ${o.valor ? fmtMoney(o.valor) : '—'}`,
    `UF: ${o.uf || '—'}`,
    `Data de abertura: ${fmtDate(o.dataAbertura)}`,
    `Data limite: ${fmtDate(o.dataEncerramento)}`,
    o.score > 0 ? `Score: ${o.score}/100` : null,
    '',
    '🔗 Ver oportunidade:',
    o.link || '—',
  ].filter((l) => l !== null)
  return lines.join('\n')
}

export function buildEmailHtml(o: AlertOpportunity, alertNome: string): string {
  const rows: Array<[string, string]> = [
    ['Objeto', escapeHtml(o.objeto)],
    ['Órgão', escapeHtml(o.orgao || '—')],
    ['Modalidade', escapeHtml(o.modalidade || '—')],
    ['Valor estimado', o.valor ? fmtMoney(o.valor) : '—'],
    ['UF', escapeHtml(o.uf || '—')],
    ['Data de abertura', fmtDate(o.dataAbertura)],
    ['Data limite', fmtDate(o.dataEncerramento)],
    ['Score', o.score > 0 ? `${o.score}/100` : '—'],
  ]
  const rowHtml = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 0;color:#64748b;font-weight:600;white-space:nowrap;padding-right:16px;">${k}</td><td style="padding:8px 0;color:#0f172a;">${v}</td></tr>`
    )
    .join('')

  return `
<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:560px;margin:0 auto;">
  <div style="background:linear-gradient(135deg,#2563eb,#7c3aed);border-radius:12px 12px 0 0;padding:20px 24px;">
    <h2 style="margin:0;color:#fff;font-size:18px;">🚨 Nova oportunidade encontrada</h2>
  </div>
  <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
    <p style="margin:0 0 16px;color:#64748b;font-size:13px;">Alerta: <b style="color:#0f172a;">${escapeHtml(alertNome)}</b></p>
    <table style="border-collapse:collapse;width:100%;font-size:14px;">${rowHtml}</table>
    <p style="margin:24px 0 0;">
      <a href="${escapeHtml(o.link || '#')}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">🔗 Ver oportunidade</a>
    </p>
  </div>
</div>`
}

export function buildEmailText(o: AlertOpportunity, alertNome: string): string {
  return [
    '🚨 NOVA OPORTUNIDADE ENCONTRADA',
    `Alerta: ${alertNome}`,
    '',
    `Objeto: ${o.objeto}`,
    `Órgão: ${o.orgao || '—'}`,
    `Modalidade: ${o.modalidade || '—'}`,
    `Valor estimado: ${o.valor ? fmtMoney(o.valor) : '—'}`,
    `UF: ${o.uf || '—'}`,
    `Data de abertura: ${fmtDate(o.dataAbertura)}`,
    `Data limite: ${fmtDate(o.dataEncerramento)}`,
    o.score > 0 ? `Score: ${o.score}/100` : null,
    '',
    '🔗 Ver oportunidade:',
    o.link || '—',
  ]
    .filter((l) => l !== null)
    .join('\n')
}
