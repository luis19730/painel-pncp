// ============================================================================
// INTERRUPTOR GERAL DOS ALERTAS
//
// Desliga o ENVIO de alertas (e-mail e Telegram) em todo o sistema:
//   - /api/cron/alertas        (alertas criados pelo usuario, roda a cada 5 min)
//   - /api/cron/alerta-prazos  (prazos da Estacao de Trabalho, roda de hora em hora)
//   - /api/alerts/process      (disparo manual "processar agora")
//   - /api/alerts/test         (mensagem de teste)
//
// Os alertas cadastrados NAO sao apagados: apenas param de ser enviados.
// Ao religar, eles voltam a funcionar normalmente.
//
// DESLIGADO POR PADRAO. Para religar, defina ALERTAS_ATIVOS=1 no Worker
// (Cloudflare > Settings > Variables) e reative os `schedule:` dos workflows
// cron-alertas.yml e cron-alerta-prazos.yml.
// ============================================================================

/** true somente quando ALERTAS_ATIVOS estiver explicitamente ligada. */
export function alertasAtivos(): boolean {
  const v = String(process.env.ALERTAS_ATIVOS || '').trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'sim' || v === 'on' || v === 'yes'
}

/** Resposta padrao quando o envio de alertas esta desligado. */
export const ALERTAS_DESATIVADOS = {
  ok: true,
  desativado: true,
  enviados: 0,
  mensagem: 'Alertas desativados. Nenhum alerta foi enviado.',
} as const
