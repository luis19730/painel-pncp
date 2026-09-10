// ============================================================================
// Conteúdo do e-mail de expiração do trial (compartilhado entre o cron diário
// e o endpoint de teste manual do painel admin).
// ============================================================================

export function trialExpiradoEmailHtml(planoLink: string): string {
  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
      <h2 style="color:#1f3a4d;margin:0 0 12px">Seu período de teste terminou</h2>
      <p>Olá!</p>
      <p>Seu período de teste gratuito de <strong>15 dias</strong> do Painel PNCP chegou ao fim.</p>
      <p>Para continuar consultando preços públicos, gerando relatórios e usando todas as ferramentas, escolha um de nossos planos:</p>
      <p style="text-align:center;margin:24px 0">
        <a href="${planoLink}" style="background:#2560db;color:#ffffff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600">Ver planos</a>
      </p>
      <p style="color:#6b7280;font-size:13px">Se você já assinou um plano, pode ignorar esta mensagem.</p>
    </div>`
}

export function trialExpiradoEmailText(planoLink: string): string {
  return `Seu período de teste gratuito de 15 dias terminou. Escolha um plano para continuar usando o Painel PNCP: ${planoLink}`
}
