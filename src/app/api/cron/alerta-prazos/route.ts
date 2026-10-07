import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/alerts/db'
import { autorizarCron } from '@/lib/cron/auth'
import { siteBaseUrl } from '@/lib/auth/site-url'
import { enviarEmailAlerta, type PrazoAlerta } from '@/lib/estacao/alerta-email'

export const dynamic = 'force-dynamic'

interface PrazoRow {
  id: string
  user_id: string
  data_hora: string
  tipo: string
  titulo: string | null
  workspace_itens?: { objeto?: string | null; orgao?: string | null; numero_controle_pncp?: string | null } | null
}

/**
 * GET /api/cron/alerta-prazos
 *
 * Roda de hora em hora: encontra prazos pendentes nas próximas 24h que ainda
 * não geraram alerta, envia UM e-mail por usuário e marca `alerta_enviado=true`.
 * Protegido por CRON_SECRET (mesmo padrão dos demais crons).
 */
export async function GET(req: Request) {
  const auth = autorizarCron(req)
  if (!auth.ok) return auth.response

  let client
  try {
    client = createServiceClient()
  } catch {
    return NextResponse.json({ ok: false, erro: 'SUPABASE_SERVICE_ROLE_KEY não configurada.' }, { status: 503 })
  }

  const baseUrl = siteBaseUrl(req)
  const agora = new Date()
  const limite = new Date(agora.getTime() + 24 * 60 * 60 * 1000)

  const { data, error } = await client
    .from('workspace_prazos')
    .select('id,user_id,data_hora,tipo,titulo,workspace_itens(objeto,orgao,numero_controle_pncp)')
    .eq('concluido', false)
    .eq('alerta_enviado', false)
    .gte('data_hora', agora.toISOString())
    .lte('data_hora', limite.toISOString())
    .order('data_hora', { ascending: true })
    .limit(500)

  if (error) {
    return NextResponse.json({ ok: false, erro: 'Falha ao ler os prazos.' }, { status: 500 })
  }

  const porUsuario = new Map<string, { prazo: PrazoRow; alerta: PrazoAlerta }[]>()
  for (const p of (data || []) as PrazoRow[]) {
    const it = p.workspace_itens || {}
    const itemLabel = [it.orgao, it.numero_controle_pncp].filter(Boolean).join(' · ') || it.objeto || 'Licitação'
    const alerta: PrazoAlerta = {
      titulo: p.titulo,
      tipo: p.tipo,
      dataHora: p.data_hora,
      itemLabel: String(itemLabel).slice(0, 160),
    }
    if (!porUsuario.has(p.user_id)) porUsuario.set(p.user_id, [])
    porUsuario.get(p.user_id)!.push({ prazo: p, alerta })
  }

  let enviados = 0
  let usuarios = 0
  let marcados = 0
  const falhas: string[] = []

  for (const [userId, lista] of porUsuario) {
    try {
      const { data: u } = await client.auth.admin.getUserById(userId)
      const email = u?.user?.email
      if (!email) {
        falhas.push(`${userId}: sem e-mail`)
        continue
      }
      const r = await enviarEmailAlerta(email, lista.map((x) => x.alerta), baseUrl)
      if (!r.ok) {
        falhas.push(`${email}: ${r.erro || 'falha no envio'}`)
        continue
      }
      enviados++
      usuarios++
      const ids = lista.map((x) => x.prazo.id)
      const { error: upErr } = await client.from('workspace_prazos').update({ alerta_enviado: true }).in('id', ids)
      if (!upErr) marcados += ids.length
    } catch (e) {
      falhas.push(`${userId}: ${(e as Error)?.message || 'erro'}`)
    }
  }

  return NextResponse.json({
    ok: true,
    prazos_encontrados: (data || []).length,
    usuarios,
    emails_enviados: enviados,
    prazos_marcados: marcados,
    falhas: falhas.slice(0, 20),
  })
}
