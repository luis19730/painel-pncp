// ============================================================================
// Mensagem de apresentação do Painel PNCP enviada aos contatos extraídos dos
// editais (outreach — 1x por contato, disparado por cron).
//
// Tom: profissional, direto, sem promessa de resultado. Identifica claramente
// o remetente como plataforma INDEPENDENTE (sem vínculo com governo/PNCP) e
// traz aviso de descadastro (opt-out) — requisito de boa prática de e-mail.
// ============================================================================

export function outreachAssunto(orgao?: string | null): string {
  return orgao
    ? `Painel PNCP — inteligência em licitações para ${orgao}`
    : 'Painel PNCP — inteligência em licitações e compras públicas'
}

export function outreachEmailHtml(orgao: string | null, cadastroLink: string): string {
  const saudacao = orgao ? `Olá, equipe ${orgao},` : 'Olá,'
  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1f2937">
      <p style="font-size:13px;color:#6b7280;margin:0 0 16px">Painel PNCP · inteligência em contratações públicas</p>
      <p>${saudacao}</p>
      <p>
        Somos o <strong>Painel PNCP</strong>, uma plataforma independente de inteligência em
        contratações públicas. Reunimos, em um só lugar, o que você precisa para acompanhar
        licitações e analisar oportunidades com mais rapidez:
      </p>
      <ul style="padding-left:18px;margin:12px 0 16px">
        <li>🔍 <strong>Busca e alertas</strong> de editais por palavra-chave, UF, modalidade e valor.</li>
        <li>📊 <strong>Pesquisa de preços</strong> e histórico de compras públicas.</li>
        <li>📄 <strong>Análise de edital com IA</strong> — riscos, exigências e pontos críticos.</li>
        <li>📈 <strong>Relatórios e concorrentes</strong> para decidir com base em dados.</li>
      </ul>
      <p>
        A análise e a decisão final são sempre do agente público responsável. O Painel PNCP é uma
        ferramenta de apoio e <strong>não possui vínculo institucional</strong> com o PNCP ou com órgãos
        do Governo Federal — os dados vêm de fontes públicas e oficiais.
      </p>
      <p style="text-align:center;margin:24px 0">
        <a href="${cadastroLink}" style="background:#2560db;color:#ffffff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600">Começar gratuitamente</a>
      </p>
      <p>Qualquer dúvida, basta responder a este e-mail.</p>
      <p style="color:#374151">Atenciosamente,<br/>Equipe Painel PNCP</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0" />
      <p style="color:#9ca3af;font-size:12px">
        Você recebeu este contato porque seu e-mail é público nos editais do PNCP. Se não quiser
        receber mensagens, responda com <strong>"remover"</strong> e não enviaremos mais.
      </p>
    </div>`
}

export function outreachEmailText(orgao: string | null, cadastroLink: string): string {
  const saudacao = orgao ? `Olá, equipe ${orgao},` : 'Olá,'
  return `${saudacao}

Somos o Painel PNCP, uma plataforma independente de inteligência em contratações públicas: busca e alertas de editais, pesquisa de preços, análise de edital com IA e relatórios de concorrentes.

A decisão final é sempre do agente público responsável; não temos vínculo com o PNCP ou órgãos do Governo Federal.

Comece gratuitamente: ${cadastroLink}

Qualquer dúvida, responda a este e-mail.
Equipe Painel PNCP

Você recebeu este contato porque seu e-mail é público nos editais do PNCP. Para não receber mais, responda com "remover".`
}
