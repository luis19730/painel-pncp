import { NextResponse } from 'next/server'
import { autorizarCron } from '@/lib/cron/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { verificarLinksSicx } from '@/lib/sicx/links'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/sicx-links
 *
 * Verificação semanal dos links do diretório SICX. Protegido por CRON_SECRET
 * (x-cron-secret, ?token= ou Authorization: Bearer). Usa service role porque
 * roda sem sessão de usuário.
 *
 * Regra: 2 falhas consecutivas → `em_revisao`, e o item deixa de aparecer na
 * listagem pública. Ao voltar a responder, a situação anterior é restaurada.
 */
export async function GET(req: Request) {
  const auth = autorizarCron(req)
  if (!auth.ok) return auth.response

  const client = createAdminClient()
  if (!client) {
    return NextResponse.json(
      { ok: false, erro: 'SUPABASE_SERVICE_ROLE_KEY não configurada.' },
      { status: 503 }
    )
  }

  try {
    const resumo = await verificarLinksSicx(client)
    return NextResponse.json({ ok: true, ...resumo })
  } catch {
    return NextResponse.json(
      { ok: false, erro: 'Falha ao verificar os links do SICX.' },
      { status: 500 }
    )
  }
}
