import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const HOME = '/dashboard'

export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')
  const errorDescription = url.searchParams.get('error_description')

  const fail = (message: string) => {
    const redirect = new URL('/login', url.origin)
    redirect.searchParams.set('error', message)
    return NextResponse.redirect(redirect)
  }

  if (error) {
    return fail(errorDescription || 'Não foi possível concluir a autenticação.')
  }

  if (!code) {
    return fail('Não foi possível concluir a autenticação.')
  }

  const supabase = await createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    return fail('Não foi possível concluir a autenticação. Tente novamente.')
  }

  return NextResponse.redirect(new URL(HOME, url.origin))
}
