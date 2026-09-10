import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { confirmarToken, marcarUsado, limparEmailPointer } from '@/lib/auth/verification'
import { sendEmail } from '@/lib/alerts/notifications/email'

const ADMIN_NOTIFY_EMAIL = 'luis19730@gmail.com'

/**
 * GET /auth/confirm
 *
 * Novo fluxo (padrão): alvo do link do e-mail de confirmação próprio —
 * `?token=<token único>`. Valida existência, expiração (24h) e uso único;
 * confirma o e-mail via SERVICE_ROLE (`email_confirm: true`) e marca o token
 * como utilizado.
 *
 * Compat (mantido): `?code=` do fluxo antigo do Supabase (exchange PKCE).
 *
 * Redirecionamentos:
 *   - sucesso                          -> /confirmado?status=ok
 *   - token expirado                   -> /confirmado?status=expirado
 *   - token já utilizado/confirmado    -> /confirmado?status=usado
 *   - token inválido/inexistente       -> /confirmado?status=invalido
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const base = new URL('/confirmado', url.origin)

  const token = url.searchParams.get('token')
  const code = url.searchParams.get('code')

  // ----- Fluxo antigo (Supabase, `code`) — mantido por compatibilidade -----
  if (!token) {
    if (code) {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        base.searchParams.set('status', 'ok')
        return NextResponse.redirect(base)
      }
      base.searchParams.set('status', 'expirado')
      base.searchParams.set('motivo', String(error?.message || '').slice(0, 200))
      return NextResponse.redirect(base)
    }
    base.searchParams.set('status', 'invalido')
    return NextResponse.redirect(base)
  }

  // ----- Novo fluxo: token próprio ----------------------------------------
  try {
    const result = await confirmarToken(token)

    if (result.status === 'ok' && result.uid) {
      const admin = createAdminClient()
      if (!admin) {
        base.searchParams.set('status', 'invalido')
        base.searchParams.set('motivo', 'Serviço temporariamente indisponível. Tente novamente.')
        return NextResponse.redirect(base)
      }

      const { error } = await admin.auth.admin.updateUserById(result.uid, { email_confirm: true })
      if (error) {
        base.searchParams.set('status', 'invalido')
        base.searchParams.set('motivo', String(error.message || '').slice(0, 200))
        return NextResponse.redirect(base)
      }

      // Uso único: o mesmo token nunca mais confirma.
      await marcarUsado(token)
      if (result.email) await limparEmailPointer(result.email)

      // Notifica o admin sobre o novo cadastro confirmado (não-crítico).
      try {
        const novoEmail = result.email || '—'
        await sendEmail({
          to: ADMIN_NOTIFY_EMAIL,
          subject: `Novo cadastro confirmado — ${novoEmail}`,
          html: `
            <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
              <h2 style="color:#1f3a4d;margin:0 0 12px">Novo cadastro confirmado</h2>
              <p>Um novo usuário confirmou o cadastro no Painel PNCP.</p>
              <p><strong>E-mail:</strong> ${novoEmail}</p>
              <p><strong>Confirmado em:</strong> ${new Date().toLocaleString('pt-BR')}</p>
            </div>`,
          text: `Novo cadastro confirmado no Painel PNCP: ${novoEmail} (${new Date().toLocaleString('pt-BR')}).`,
        })
      } catch {
        console.error('[confirm] falha ao notificar admin do novo cadastro', result.email)
      }

      base.searchParams.set('status', 'ok')
      return NextResponse.redirect(base)
    }

    base.searchParams.set(
      'status',
      result.status === 'expirado' ? 'expirado' : result.status === 'usado' ? 'usado' : 'invalido'
    )
    return NextResponse.redirect(base)
  } catch (e) {
    base.searchParams.set('status', 'invalido')
    base.searchParams.set('motivo', String((e as Error)?.message || '').slice(0, 200))
    return NextResponse.redirect(base)
  }
}