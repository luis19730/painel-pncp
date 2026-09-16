// ============================================================================
// Envio (outreach) do e-mail de apresentação para os contatos extraídos.
//
// Regras:
//   - 1x por contato: só envia para quem tem `outreach_enviado_em` nulo;
//   - reenvio controlado: no máximo MAX_TENTATIVAS em caso de falha;
//   - respeita a lista de e-mails administrativos/teste (não envia para eles);
//   - lote controlado com pausa entre envios (rate limiting);
//   - `dryRun` permite simular sem enviar nem gravar.
// ============================================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/alerts/notifications/email'
import { emailsIgnorados } from '@/lib/admin/publico'
import { outreachAssunto, outreachEmailHtml, outreachEmailText } from '@/lib/contatos/outreach-email'
import { emailEhValido } from '@/lib/contatos/extracao'

type AnyClient = SupabaseClient<any, 'public', any>

const MAX_TENTATIVAS = 3
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export interface ResumoEnvio {
  dryRun: boolean
  limite: number
  selecionados: number
  enviados: number
  pulados: number
  falhas: number
  resultados: Array<{ email: string; orgao: string | null; status: string; motivo?: string | null }>
}

/**
 * Envia o outreach para um lote de contatos ainda não contactados.
 * Se `paraEmail` for informado, envia APENAS um teste para esse endereço
 * (não consulta nem altera a base).
 */
export async function enviarLoteContatos(
  client: AnyClient,
  limite: number,
  opts: { siteUrl: string; dryRun?: boolean; paraEmail?: string; ids?: number[] }
): Promise<ResumoEnvio> {
  const base = String(opts.siteUrl || 'https://www.painelpncp.com.br').replace(/\/$/, '')
  const cadastroLink = `${base}/cadastro`
  const dryRun = !!opts.dryRun

  // --- Teste para um e-mail específico ---
  if (opts.paraEmail) {
    const email = opts.paraEmail.trim().toLowerCase()
    const r = await sendEmail({
      to: email,
      subject: `[TESTE] ${outreachAssunto(null)}`,
      html: outreachEmailHtml(null, cadastroLink),
      text: outreachEmailText(null, cadastroLink),
    })
    return {
      dryRun,
      limite: 1,
      selecionados: 1,
      enviados: r.ok ? 1 : 0,
      pulados: 0,
      falhas: r.ok ? 0 : 1,
      resultados: [{ email, orgao: null, status: r.ok ? 'enviado' : 'falha', motivo: r.erro || null }],
    }
  }

  const idsSelecionados = Array.isArray(opts.ids) ? opts.ids.filter((n) => Number.isFinite(n)) : []
  const lim = idsSelecionados.length > 0
    ? Math.min(50, idsSelecionados.length)
    : Math.min(50, Math.max(1, Math.floor(limite) || 1))
  const ignorados = new Set(emailsIgnorados().map((e) => e.toLowerCase()))

  // Seleção explícita (checkboxes) envia exatamente os IDs escolhidos — mesmo
  // que já tenham recebido antes. Sem seleção, pega os próximos ainda não
  // contactados (comportamento do cron).
  let consulta = client
    .from('edital_contatos')
    .select('id,orgao_nome,contato_email,outreach_tentativas')
  consulta = idsSelecionados.length > 0
    ? consulta.in('id', idsSelecionados)
    : consulta.is('outreach_enviado_em', null).lt('outreach_tentativas', MAX_TENTATIVAS)

  const { data, error } = await consulta.order('id', { ascending: true }).limit(lim)

  if (error) {
    return { dryRun, limite: lim, selecionados: 0, enviados: 0, pulados: 0, falhas: 0, resultados: [] }
  }

  const alvos = (data || []).filter(
    (c) => c.contato_email && !ignorados.has(String(c.contato_email).toLowerCase()) && emailEhValido(String(c.contato_email))
  )

  const resultados: ResumoEnvio['resultados'] = []
  let enviados = 0
  let pulados = 0
  let falhas = 0

  for (const c of alvos) {
    const email = String(c.contato_email).toLowerCase()
    const orgao = (c.orgao_nome as string | null) || null
    const tentativas = Number(c.outreach_tentativas || 0)

    if (dryRun) {
      pulados++
      resultados.push({ email, orgao, status: 'dry_run', motivo: null })
      continue
    }

    const r = await sendEmail({
      to: email,
      subject: outreachAssunto(orgao),
      html: outreachEmailHtml(orgao, cadastroLink),
      text: outreachEmailText(orgao, cadastroLink),
    })

    if (r.ok) {
      await client
        .from('edital_contatos')
        .update({
          outreach_enviado_em: new Date().toISOString(),
          outreach_status: 'enviado',
          outreach_tentativas: tentativas + 1,
          outreach_erro: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', c.id)
      enviados++
      resultados.push({ email, orgao, status: 'enviado', motivo: null })
    } else {
      await client
        .from('edital_contatos')
        .update({
          outreach_status: 'falha',
          outreach_tentativas: tentativas + 1,
          outreach_erro: r.erro || 'falha no envio',
          updated_at: new Date().toISOString(),
        })
        .eq('id', c.id)
      falhas++
      resultados.push({ email, orgao, status: 'falha', motivo: r.erro || null })
    }

    await sleep(900)
  }

  return { dryRun, limite: lim, selecionados: alvos.length, enviados, pulados, falhas, resultados }
}
