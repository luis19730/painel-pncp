// ============================================================================
// E-mail de ALERTA DE PRAZOS da Estação de Trabalho.
//
// Isolado de propósito: toda a montagem/envio de e-mail fica aqui. Usa o
// MESMO provedor transacional do projeto (`sendEmail` → Brevo, com fallback
// Resend). Se nenhum provedor estiver configurado, `sendEmail` devolve
// { ok:false, notConfigured:true, erro } e o cron apenas NÃO marca como enviado
// (tentará de novo) — nada é "fingido".
//
// Configuração necessária: BREVO_API_KEY + BREVO_FROM_EMAIL (já configurados em
// produção). Nenhuma variável nova.
// ============================================================================

import { sendEmail } from '@/lib/alerts/notifications/email'
import { TIPOS_PRAZO } from '@/lib/estacao/config'

export interface PrazoAlerta {
  titulo: string | null
  tipo: string
  dataHora: string
  itemLabel: string
}

const TZ = 'America/Sao_Paulo'

function labelTipo(tipo: string): string {
  return TIPOS_PRAZO.find((t) => t.id === tipo)?.label || 'Prazo'
}

function fmt(dt: string): string {
  try {
    return new Date(dt).toLocaleString('pt-BR', {
      timeZone: TZ,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dt
  }
}

export function montarEmailAlerta(prazos: PrazoAlerta[], baseUrl: string): { subject: string; html: string; text: string } {
  const plural = prazos.length === 1
  const subject = plural
    ? `Prazo em até 24h: ${prazos[0].titulo || labelTipo(prazos[0].tipo)}`
    : `${prazos.length} prazos nas próximas 24 horas`

  const linhas = prazos
    .map(
      (p) =>
        `<tr><td style="padding:8px 10px;border-bottom:1px solid #e5e7eb"><b>${p.titulo || labelTipo(p.tipo)}</b><br/><span style="color:#64748b">${p.itemLabel}</span></td>` +
        `<td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;white-space:nowrap;color:#b91c1c;font-weight:600">${fmt(p.dataHora)}</td></tr>`
    )
    .join('')

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto">
    <h2 style="color:#0f172a">Prazos se aproximando na sua Estação</h2>
    <p style="color:#334155">Você tem ${prazos.length} prazo(s) nas próximas 24 horas:</p>
    <table style="width:100%;border-collapse:collapse">${linhas}</table>
    <p style="margin-top:20px"><a href="${baseUrl}/estacao" style="background:#2563eb;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Abrir Minha Estação</a></p>
    <p style="color:#94a3b8;font-size:12px;margin-top:16px">Painel PNCP — acompanhe suas licitações do edital ao resultado.</p>
  </div>`

  const text = [
    'Prazos se aproximando na sua Estação:',
    ...prazos.map((p) => `- ${p.titulo || labelTipo(p.tipo)} — ${p.itemLabel} — ${fmt(p.dataHora)}`),
    '',
    `Abrir: ${baseUrl}/estacao`,
  ].join('\n')

  return { subject, html, text }
}

export async function enviarEmailAlerta(
  to: string,
  prazos: PrazoAlerta[],
  baseUrl: string
): Promise<{ ok: boolean; erro?: string; notConfigured?: boolean }> {
  const { subject, html, text } = montarEmailAlerta(prazos, baseUrl)
  return sendEmail({ to, subject, html, text })
}
