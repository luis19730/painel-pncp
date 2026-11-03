// ============================================================================
// INTERRUPTOR GERAL DAS CAMPANHAS DE E-MAIL
//
// Campanhas = e-mails de marketing/relacionamento enviados em lote, sem uma
// acao direta do usuario naquele momento:
//   - outreach para contatos extraidos dos editais (/api/cron/enviar-contatos)
//   - reativacao de trial expirado (/api/cron/email-reativacao)
//   - sequencia de lembretes de trial (/api/cron/trial-expirando)
//   - aviso de trial expirado (/api/cron/trial-expirado)
//
// NAO afeta e-mails transacionais/acionados pelo usuario:
//   - confirmacao de cadastro / redefinicao de senha
//   - alertas que o proprio usuario criou (/api/cron/alertas)
//   - alerta de prazos da Estacao de Trabalho (/api/cron/alerta-prazos)
//   - avisos administrativos do ASAAS
//
// DESLIGADO POR PADRAO. Para religar as campanhas, defina a variavel
// EMAIL_CAMPANHAS_ATIVAS=1 no Worker (Cloudflare > Settings > Variables) e
// reative os `schedule:` dos workflows em .github/workflows/.
// ============================================================================

/** true somente quando EMAIL_CAMPANHAS_ATIVAS estiver explicitamente ligada. */
export function campanhasEmailAtivas(): boolean {
  const v = String(process.env.EMAIL_CAMPANHAS_ATIVAS || '').trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'sim' || v === 'on' || v === 'yes'
}

/** Resposta padrao dos endpoints de campanha quando o envio esta desligado. */
export const CAMPANHAS_DESATIVADAS = {
  ok: true,
  desativado: true,
  enviados: 0,
  falhas: 0,
  mensagem: 'Campanhas de e-mail desativadas. Nenhum e-mail foi enviado.',
} as const
