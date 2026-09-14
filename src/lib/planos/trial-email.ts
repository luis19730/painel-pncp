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

// ---------------------------------------------------------------------------
// Aviso D-7: enviado quando faltam 7 dias para o trial terminar.
// Assunto definido no cron (/api/cron/trial-expirando).
// ---------------------------------------------------------------------------

export function trialExpirando7dEmailHtml(nome: string, assinaturaLink: string): string {
  const saudacao = nome ? `Olá, ${nome},` : 'Olá,'
  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1f2937">
      <h2 style="color:#1f3a4d;margin:0 0 12px">Seu período de teste termina em 7 dias</h2>
      <p>${saudacao}</p>
      <p>Notamos que faltam apenas <strong>7 dias</strong> para o encerramento do seu período de teste gratuito no <strong>Painel PNCP</strong>.</p>
      <p>Esperamos que você já tenha aproveitado a agilidade e a inteligência da plataforma para encontrar e analisar as melhores oportunidades de licitação.</p>
      <p style="font-weight:600;margin:18px 0 8px">🚀 O que você continua aproveitando ao assinar um plano:</p>
      <ul style="padding-left:18px;margin:0 0 16px">
        <li>🔍 <strong>Busca Avançada e Inteligente:</strong> filtre editais com precisão e configure alertas no seu radar.</li>
        <li>📊 <strong>Pesquisa de Preços Automatizada:</strong> economize horas cruzando dados históricos de compras públicas.</li>
        <li>📄 <strong>Análise de Edital com IA:</strong> identifique riscos, exigências e pontos críticos instantaneamente.</li>
        <li>📈 <strong>Relatórios e Concorrentes:</strong> monitore o mercado com decisões baseadas em dados reais.</li>
      </ul>
      <p>Não interrompa seu fluxo de trabalho nem perca o acesso aos seus editais salvos.</p>
      <p style="text-align:center;margin:24px 0">
        <a href="${assinaturaLink}" style="background:#2560db;color:#ffffff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600">Gerenciar minha assinatura</a>
      </p>
      <p>Se tiver dúvidas, basta responder a este e-mail. Nossa equipe está à disposição!</p>
      <p style="color:#374151">Atenciosamente,<br/>Equipe Painel PNCP</p>
      <p style="color:#9ca3af;font-size:12px">Se você já assinou um plano, pode ignorar esta mensagem.</p>
    </div>`
}

export function trialExpirando7dEmailText(nome: string, assinaturaLink: string): string {
  return `${nome ? `Olá, ${nome},` : 'Olá,'} faltam 7 dias para o fim do seu período de teste no Painel PNCP. Continue com busca avançada, pesquisa de preços, análise de edital com IA e relatórios. Gerencie sua assinatura em: ${assinaturaLink}`
}

// ---------------------------------------------------------------------------
// Sequência de LEMBRETES de trial.
//
// `dias` > 0  → faltam N dias (marcos: 7, 6, 4, 3, 2, 1)
// `dias` <= 0 → expirou há |N| dias (marcos: -2, -3, -6)
//
// Enviados pelo cron /api/cron/trial-expirando enquanto o usuário NÃO confirmar
// uma assinatura ativa. Mesmo CTA (/minha-assinatura) em todos os marcos.
// ---------------------------------------------------------------------------

export function trialLembreteAssunto(dias: number): string {
  if (dias > 0) {
    const quando = dias === 1 ? '1 dia' : `${dias} dias`
    return `⏰ Faltam ${quando} para o fim do seu teste no Painel PNCP — não perca o acesso`
  }
  return '🚫 Seu período de teste no Painel PNCP terminou — reative seu acesso'
}

export function trialLembreteEmailHtml(dias: number, nome: string, assinaturaLink: string): string {
  const saudacao = nome ? `Olá, ${nome},` : 'Olá,'
  const titulo =
    dias > 0
      ? dias === 1
        ? 'Seu período de teste termina amanhã'
        : `Faltam ${dias} dias para o fim do seu teste`
      : 'Seu período de teste terminou'
  const abertura =
    dias > 0
      ? `Notamos que ${dias === 1 ? 'falta apenas 1 dia' : `faltam apenas ${dias} dias`} para o encerramento do seu período de teste gratuito no <strong>Painel PNCP</strong>.`
      : `Seu período de teste gratuito no <strong>Painel PNCP</strong> chegou ao fim${dias === 0 ? '' : ` há ${Math.abs(dias)} dia(s)`}. Para não perder o acesso aos seus editais salvos e às ferramentas, ative um plano agora.`

  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1f2937">
      <h2 style="color:#1f3a4d;margin:0 0 12px">${titulo}</h2>
      <p>${saudacao}</p>
      <p>${abertura}</p>
      <p>Esperamos que você já tenha aproveitado a agilidade e a inteligência da plataforma para encontrar e analisar as melhores oportunidades de licitação.</p>
      <p style="font-weight:600;margin:18px 0 8px">🚀 O que você continua aproveitando ao assinar um plano:</p>
      <ul style="padding-left:18px;margin:0 0 16px">
        <li>🔍 <strong>Busca Avançada e Inteligente:</strong> filtre editais com precisão e configure alertas no seu radar.</li>
        <li>📊 <strong>Pesquisa de Preços Automatizada:</strong> economize horas cruzando dados históricos de compras públicas.</li>
        <li>📄 <strong>Análise de Edital com IA:</strong> identifique riscos, exigências e pontos críticos instantaneamente.</li>
        <li>📈 <strong>Relatórios e Concorrentes:</strong> monitore o mercado com decisões baseadas em dados reais.</li>
      </ul>
      <p>Não interrompa seu fluxo de trabalho nem perca o acesso aos seus editais salvos.</p>
      <p style="text-align:center;margin:24px 0">
        <a href="${assinaturaLink}" style="background:#2560db;color:#ffffff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600">Gerenciar minha assinatura</a>
      </p>
      <p>Se tiver dúvidas, basta responder a este e-mail. Nossa equipe está à disposição!</p>
      <p style="color:#374151">Atenciosamente,<br/>Equipe Painel PNCP</p>
      <p style="color:#9ca3af;font-size:12px">Se você já assinou um plano, pode ignorar esta mensagem.</p>
    </div>`
}

export function trialLembreteEmailText(dias: number, nome: string, assinaturaLink: string): string {
  const inicio = nome ? `Olá, ${nome},` : 'Olá,'
  const corpo =
    dias > 0
      ? `faltam ${dias === 1 ? '1 dia' : `${dias} dias`} para o fim do seu período de teste no Painel PNCP.`
      : `seu período de teste no Painel PNCP terminou${dias === 0 ? '' : ` há ${Math.abs(dias)} dia(s)`}.`
  return `${inicio} ${corpo} Continue com busca avançada, pesquisa de preços, análise de edital com IA e relatórios. Gerencie sua assinatura em: ${assinaturaLink}`
}
