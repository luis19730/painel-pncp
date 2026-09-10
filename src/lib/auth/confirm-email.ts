/**
 * E-mail de confirmação de conta — HTML + texto simples.
 * Só usado pelas rotas /api/auth/cadastro e /api/auth/resend.
 */

export function confirmationEmailHtml(name: string, link: string): string {
  const safeName = escapeHtml(name)
  const safeLink = escapeHtml(link)
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:520px;margin:0 auto;padding:32px 16px;">
      <div style="background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">
        <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a;">Confirme seu e-mail</h1>
        <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6;">
          Olá <strong>${safeName}</strong>! Ative sua conta no <strong>Painel PNCP</strong>
          confirmando seu endereço de e-mail. O link é válido por 24 horas.
        </p>
        <p style="margin:0 0 24px;text-align:center;">
          <a href="${safeLink}"
             style="display:inline-block;background:#d946ef;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 28px;border-radius:12px;">
            Confirmar e-mail
          </a>
        </p>
        <p style="margin:0 0 16px;font-size:12px;color:#64748b;line-height:1.7;">
          Se o botão não funcionar, copie este link no navegador:<br/>
          <span style="word-break:break-all;color:#0f172a;">${safeLink}</span>
        </p>
        <p style="margin:0;font-size:12px;color:#94a3b8;">
          Se você não criou esta conta, basta ignorar este e-mail.
        </p>
      </div>
    </div>
  </body>
</html>`
}

export function confirmationEmailText(name: string, link: string): string {
  return `Olá${name ? ` ${name}` : ''}!\n\nPara ativar sua conta no Painel PNCP, confirme seu e-mail clicando neste link (válido por 24 horas):\n\n${link}\n\nSe você não criou uma conta, ignore este e-mail.`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}