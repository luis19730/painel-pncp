import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/alerts/db'
import { getPlano, upsertPlanoTrial } from '@/lib/planos/db'
import { buildTrialRecord } from '@/lib/planos/plano'

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
  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    return fail('Não foi possível concluir a autenticação. Tente novamente.')
  }

  // Cria o trial de 15 dias para cadastros via Google (se ainda não existe),
  // contando a partir do cadastro. Falha aqui não derruba o login.
  const userId = data?.user?.id
  if (userId) {
    try {
      const svc = createServiceClient()
      const rec = await getPlano(svc, userId)
      if (!rec) {
        await upsertPlanoTrial(svc, userId, buildTrialRecord(userId))
      }
    } catch {
      console.error('[oauth] falha ao criar trial para', userId)
    }
  }

  return NextResponse.redirect(new URL(HOME, url.origin))
}
