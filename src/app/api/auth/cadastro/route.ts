import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/alerts/notifications/email'
import { criarVerificacao } from '@/lib/auth/verification'
import { siteBaseUrl } from '@/lib/auth/site-url'
import { confirmationEmailHtml, confirmationEmailText } from '@/lib/auth/confirm-email'
import { createServiceClient } from '@/lib/alerts/db'
import { buildTrialRecord } from '@/lib/planos/plano'
import { upsertPlanoTrial } from '@/lib/planos/db'
import { registrarEvento } from '@/lib/analytics-server'
import { validarEmailCadastro } from '@/lib/auth/email-validation'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ADMIN_NOTIFY_EMAIL = 'luis19730@gmail.com'
const MAX_EMAIL_LEN = 254
const MAX_NAME_LEN = 120
const MAX_PASSWORD_LEN = 72

/**
 * POST /api/auth/cadastro
 *
 * Cria a conta via SERVICE_ROLE com `email_confirm: false` (NUNCA cria sessão
 * no cliente — logo, o usuário não entra automaticamente) e envia o link de
 * confirmação por e-mail (provedor configurado). Conta duplicada é recusada; senhas são
 * validadas no servidor além do frontend.
 *
 * Retorno:
 *   - 200 { ok:true }                          conta criada + e-mail enviado
 *   - 400 { ok:false, erro }                   validação falhou
 *   - 409 { ok:false, erro, code:'email-existe' } e-mail já cadastrado
 *   - 500/502 { ok:false, erro, tentarReenviar:true } falha ao enviar e-mail
 *     (o usuário NÃO é confirmado; pode reenviar clicando no botão)
 */
export async function POST(req: Request) {
  const raw: unknown = await req.json().catch(() => null)
  if (!raw || typeof raw !== 'object') {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido.' }, { status: 400 })
  }
  const body = raw as Record<string, unknown>

  const name = String(body.name ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  const confirmPassword = String(body.confirmPassword ?? '')

  const fail = (erro: string, status: number, extra: Record<string, unknown> = {}) =>
    NextResponse.json({ ok: false, erro, ...extra }, { status })

  // Validação no backend (igual à do frontend + nome obrigatório).
  if (!name) return fail('Informe seu nome.', 400)
  if (name.length > MAX_NAME_LEN) return fail('Nome muito longo.', 400)
  if (!email || !EMAIL_RE.test(email) || email.length > MAX_EMAIL_LEN) {
    return fail('Informe um e-mail válido.', 400)
  }
  const resultadoEmail = validarEmailCadastro(email)
  if (!resultadoEmail.permitido) {
    return fail(resultadoEmail.erro!, 400)
  }
  if (!password || password.length < 6) {
    return fail('A senha deve ter pelo menos 6 caracteres.', 400)
  }
  if (password.length > MAX_PASSWORD_LEN) {
    return fail('A senha deve ter no máximo 72 caracteres.', 400)
  }
  if (password !== confirmPassword) {
    return fail('As senhas não coincidem.', 400)
  }

  const admin = createAdminClient()
  if (!admin) {
    return fail(
      'Serviço de autenticação não configurado no servidor. Tente novamente em instantes.',
      503,
      { tentarReenviar: true }
    )
  }

  // Criação da conta SEM confirmação automática (email_confirm: false).
  let userId: string
  try {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { name },
    })
    if (error) {
      if (/already registered|already been registered|duplic/i.test(error.message)) {
        return fail('Este e-mail já está cadastrado. Faça login ou recupere sua senha.', 409, {
          code: 'email-existe',
        })
      }
      return fail(error.message, 400)
    }
    if (!data?.user?.id) {
      return fail('Não foi possível criar a conta. Tente novamente.', 500, { tentarReenviar: true })
    }
    userId = data.user.id
  } catch {
    return fail('Não foi possível criar a conta. Tente novamente.', 500, { tentarReenviar: true })
  }

  // Plano inicial: free + trial de 15 dias. Falha aqui NÃO derruba o cadastro
  // (o plano é não-crítico; o usuário já foi criado). Se a tabela ainda não
  // existir no Supabase, registramos o erro e seguimos sem plano gravado.
  try {
    const svc = createServiceClient()
    await upsertPlanoTrial(svc, userId, buildTrialRecord(userId))
    await registrarEvento(svc, { event: 'trial_started', user_id: userId, page: 'cadastro' })
  } catch {
    // Ignorado de propósito: cadastro não pode falhar por causa do plano.
    console.error('[cadastro] falha ao gravar plano/trial para', userId)
  }

  // Notifica o admin sobre o novo cadastro (não-crítico).
  try {
    await sendEmail({
      to: ADMIN_NOTIFY_EMAIL,
      subject: `Novo cadastro — ${email}`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
          <h2 style="color:#1f3a4d;margin:0 0 12px">Novo cadastro no Painel PNCP</h2>
          <p>Um novo usuário acabou de se cadastrar no site.</p>
          <p><strong>Nome:</strong> ${name}</p>
          <p><strong>E-mail:</strong> ${email}</p>
          <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
        </div>`,
      text: `Novo cadastro no Painel PNCP: ${name} <${email}> (${new Date().toLocaleString('pt-BR')}).`,
    })
  } catch {
    console.error('[cadastro] falha ao notificar admin do novo cadastro', email)
  }

  // E-mail de boas-vindas (não-crítico).
  try {
    await sendEmail({
      to: email,
      subject: 'Bem-vindo(a) ao Painel PNCP',
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
          <h2 style="color:#1f3a4d;margin:0 0 12px">Bem-vindo(a) ao Painel PNCP</h2>
          <p>Olá, ${name}!</p>
          <p>Sua conta foi criada. Confirme seu e-mail para ativar o acesso e já aproveitar:</p>
          <ul>
            <li>Busca de editais do PNCP</li>
            <li>Análise de edital com IA</li>
            <li>Pesquisa de preços</li>
            <li>Alertas personalizados</li>
            <li>Oportunidades do SICX (Compras Expressas)</li>
          </ul>
          <p>Depois de confirmar, complete seu perfil (segmento/CNAE e UFs) para receber alertas personalizados.</p>
          <p style="color:#9ca3af;font-size:12px">Plataforma independente de consulta a dados públicos, sem vínculo com órgãos do Governo Federal.</p>
        </div>`,
      text: `Bem-vindo(a) ao Painel PNCP, ${name}! Confirme seu e-mail para ativar a conta e complete seu perfil (segmento/CNAE e UFs) para alertas personalizados.`,
    })
  } catch {
    console.error('[cadastro] falha ao enviar boas-vindas para', email)
  }

  // Token próprio (uso único, 24h) + envio do e-mail de confirmação.
  try {
    const token = await criarVerificacao(userId, email)
    if (!token) {
      return fail(
        'Não foi possível gerar o link de confirmação. Use o botão "Reenviar" para tentar de novo.',
        503,
        { tentarReenviar: true }
      )
    }

    const base = siteBaseUrl(req)
    const link = `${base}/auth/confirm?token=${encodeURIComponent(token)}`

    const html = confirmationEmailHtml(name, link)
    const result = await sendEmail({
      to: email,
      subject: 'Confirme seu e-mail — Painel PNCP',
      html,
      text: confirmationEmailText(name, link),
    })

    if (!result.ok) {
      const erro = result.erro || 'Não foi possível enviar o e-mail de confirmação.'
      return NextResponse.json(
        { ok: false, erro, tentarReenviar: true },
        { status: result.notConfigured ? 502 : 500 }
      )
    }
  } catch {
    return NextResponse.json(
      {
        ok: false,
        erro: 'Não foi possível enviar o e-mail de confirmação. Tente novamente em instantes.',
        tentarReenviar: true,
      },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}