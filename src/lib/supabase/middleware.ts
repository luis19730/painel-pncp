import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/alerts/db'
import { getPlano } from '@/lib/planos/db'
import { computePlanoInfo } from '@/lib/planos/plano'
import { isAdminEmail } from '@/lib/auth/admin-emails'
import { isEmailBloqueado } from '@/lib/auth/email-validation'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isDashboard = pathname.startsWith('/dashboard') ||
    pathname.startsWith('/oportunidades') ||
    pathname.startsWith('/busca') ||
    pathname.startsWith('/meu-radar') ||
    pathname.startsWith('/favoritos') ||
    pathname.startsWith('/alertas') ||
    pathname.startsWith('/calendario') ||
    pathname.startsWith('/precos') ||
    pathname.startsWith('/precos-inteligentes') ||
    pathname.startsWith('/concorrentes') ||
    pathname.startsWith('/relatorios') ||
    pathname.startsWith('/perfil') ||
    pathname.startsWith('/configuracoes') ||
    pathname.startsWith('/ia') ||
    pathname.startsWith('/ia-licitacoes') ||
    pathname.startsWith('/analise-edital') ||
    pathname.startsWith('/estudo-tecnico') ||
    pathname.startsWith('/score') ||
    pathname.startsWith('/modalidade') ||
    pathname.startsWith('/modalidades') ||
    pathname.startsWith('/matriz-riscos') ||
    pathname.startsWith('/checklist') ||
    pathname.startsWith('/justificativa') ||
    pathname.startsWith('/documentos') ||
    pathname.startsWith('/montagem-processo') ||
    pathname.startsWith('/meus-processos') ||
    pathname.startsWith('/sinapi') ||
    pathname.startsWith('/ajuda') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/minha-assinatura')

  // Rotas que exigem LOGIN, mas NÃO exigem plano ativo: o usuário bloqueado
  // precisa conseguir acessar a área de assinatura/pagamento para contratar.
  const exigeApenasLogin =
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/minha-assinatura')

  const exigeAcessoPago = isDashboard && !exigeApenasLogin
  const isAuth = pathname.startsWith('/login') || pathname.startsWith('/cadastro')

  if ((isDashboard) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Bloqueia usuários com e-mail ainda não confirmado nas rotas protegidas.
  // Contas criadas via Google OAuth sempre têm e-mail confirmado.
  if (isDashboard && user && user.email_confirmed_at == null) {
    const provider = user.app_metadata?.provider
    if (provider !== 'google') {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set(
        'error',
        'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada para ativar sua conta.'
      )
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }
  }

  // Bloqueio automático: usuário logado cujo período de trial (15 dias) expirou
  // e que não possui assinatura com pagamento confirmado é impedido de acessar
  // as páginas protegidas. A área de assinatura/checkout permanece acessível.
  if (exigeAcessoPago && user && user.email_confirmed_at != null) {
    const acesso = await verificarAcesso({ userId: user.id, email: user.email })
    if (acesso === 'bloqueado') {
      const url = request.nextUrl.clone()
      url.pathname = '/plano-bloqueado'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }
  }

  if (isAuth && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Logado abrindo a raiz: vai direto para o painel (página inicial do app).
  if (user && pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

// Consulta o registro user_planos do usuário e decide se o acesso é permitido.
// Retorna 'ok' (permite) ou 'bloqueado' (nega) para usuários logados.
//
// IMPORTANTE: usa o SERVICE_ROLE (e não a anon key) porque a tabela user_planos
// tem RLS `user_id = auth.uid()`. Com a anon key (sem usuário), o SELECT sempre
// retorna vazio, o que fazia o bloqueio por trial NUNCA funcionar.
async function verificarAcesso(input: { userId: string; email?: string | null }): Promise<'ok' | 'bloqueado'> {
  // E-mails de bloqueio (placeholder/teste/descartáveis) nunca têm acesso.
  if (isEmailBloqueado(input.email)) return 'bloqueado'

  // Administradores contornam a regra de trial/pagamento (acesso pleno).
  if (isAdminEmail(input.email)) return 'ok'

  try {
    const client = createServiceClient()
    const rec = await getPlano(client, input.userId)
    // Sem registro em user_planos (usuário legado/Google sem trial): fail-closed.
    // Sem prova de acesso concedido (trial válido OU pagamento confirmado) o
    // usuário é bloqueado — a área de checkout/assinatura segue acessível para
    // regularizar. Sem isso o trial/validação nunca vale para essas contas.
    if (!rec) return 'bloqueado'
    const info = computePlanoInfo(rec)
    return info.acessoPermitido ? 'ok' : 'bloqueado'
  } catch {
    // Erro de infraestrutura (service role ausente, rede): falha não pode
    // liberar acesso pago sem validação — bloqueia (fail-closed).
    return 'bloqueado'
  }
}
