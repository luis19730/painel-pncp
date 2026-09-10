import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/alerts/db'
import { authorizeAdmin } from '@/lib/admin/auth'
import { listarUsuariosComPlano } from '@/lib/admin/usuario-plano'
import { listAllUsers } from '@/lib/supabase/admin'
import { getPlano, setPlanoManual, setBloqueio, setTrialFim, backfillTrialLegados } from '@/lib/planos/db'
import { computePlanoInfo, type PlanoNome } from '@/lib/planos/plano'

export const dynamic = 'force-dynamic'

const PLANOS_VALIDOS: PlanoNome[] = ['free', 'pro', 'business']

// Fallback de desenvolvimento apenas quando o secret não está definido.
// Em produção, define-se ADMIN_DELETE_PASSWORD como secret do worker.
const DEV_DELETE_PASSWORD = 'a23741'

/**
 * GET /api/admin/planos
 * Lista todos os usuários com e-mail, plano, status do trial e data de expiração.
 * Usuários sem registro em user_planos aparecem como "sem registro".
 */
export async function GET(req: Request) {
  const auth = await authorizeAdmin(req)
  if (!auth.ok) return auth.response

  let client
  try {
    client = createServiceClient()
  } catch {
    return NextResponse.json({ ok: false, erro: 'Banco de dados não configurado.' }, { status: 503 })
  }

  const agora = new Date()

  let lista: Awaited<ReturnType<typeof listarUsuariosComPlano>>
  try {
    lista = await listarUsuariosComPlano(client)
  } catch {
    return NextResponse.json({ ok: false, erro: 'Não foi possível listar os usuários.' }, { status: 500 })
  }

  const assinaturas = lista.filter((u) => u.statusPagamento !== 'none')

  return NextResponse.json({ ok: true, agora: agora.toISOString(), usuarios: lista, assinaturas })
}

/**
 * POST /api/admin/planos
 * Promove/altera o plano ou bloqueia/desbloqueia o acesso de um usuário.
 *
 * Body plano:  { user_id, plano }            (free | pro | business)
 * Body bloqueio: { user_id, acao: 'bloquear' | 'desbloquear' }
 */
export async function POST(req: Request) {
  const auth = await authorizeAdmin(req)
  if (!auth.ok) return auth.response

  let body: { user_id?: string; plano?: string; acao?: string; trial_fim?: string; confirm_password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido.' }, { status: 400 })
  }
  const userId = String(body?.user_id || '').trim()
  if (!userId) {
    return NextResponse.json({ ok: false, erro: 'Informe o user_id.' }, { status: 400 })
  }

  let client
  try {
    client = createServiceClient()
  } catch {
    return NextResponse.json({ ok: false, erro: 'Banco de dados não configurado.' }, { status: 503 })
  }

  // Ação de bloqueio/desbloqueio
  if (body.acao === 'bloquear' || body.acao === 'desbloquear') {
    try {
      await setBloqueio(client, userId, body.acao === 'bloquear')
    } catch {
      return NextResponse.json(
        { ok: false, erro: 'Não foi possível atualizar o bloqueio. Confirme se a coluna bloqueado existe.' },
        { status: 500 }
      )
    }
    const rec = await getPlano(client, userId)
    const info = computePlanoInfo(rec)
    return NextResponse.json({ ok: true, bloqueado: info.bloqueado, plano: info.plano, origem: info.origem })
  }

  // Alteração manual da data de fim do trial
  if (body.acao === 'definir_trial') {
    const trialFim = String(body.trial_fim ?? '').trim()
    if (!trialFim) {
      return NextResponse.json({ ok: false, erro: 'Informe a data de fim do teste.' }, { status: 400 })
    }
    const fim = new Date(trialFim)
    if (Number.isNaN(fim.getTime())) {
      return NextResponse.json({ ok: false, erro: 'Data de fim do teste inválida.' }, { status: 400 })
    }
    try {
      await setTrialFim(client, userId, fim.toISOString())
    } catch {
      return NextResponse.json(
        { ok: false, erro: 'Não foi possível atualizar a data do teste. Confirme se a tabela user_planos existe.' },
        { status: 500 }
      )
    }
    const rec = await getPlano(client, userId)
    const info = computePlanoInfo(rec)
    return NextResponse.json({ ok: true, trialFim: info.trial_fim, statusTrial: info.statusTrial })
  }

  // Trial retroativo para usuários legados (sem registro em user_planos)
  if (body.acao === 'retroativar_trial') {
    try {
      const { users, error: usersErr } = await listAllUsers(client)
      if (usersErr) throw usersErr
      const legados = users.map((u) => ({ id: u.id, created_at: u.created_at || null }))
      const resultado = await backfillTrialLegados(client, legados)
      return NextResponse.json({ ok: true, ...resultado })
    } catch {
      return NextResponse.json(
        { ok: false, erro: 'Não foi possível retroativar os trials.' },
        { status: 500 }
      )
    }
  }

  // Exclusão de usuário (ação destrutiva — exige senha de confirmação)
  if (body.acao === 'excluir') {
    const confirmPassword = String(body.confirm_password ?? '')
    const expected = process.env.ADMIN_DELETE_PASSWORD || DEV_DELETE_PASSWORD
    if (!confirmPassword || confirmPassword !== expected) {
      return NextResponse.json({ ok: false, erro: 'Senha de exclusão inválida.' }, { status: 403 })
    }
    try {
      const { error } = await client.auth.admin.deleteUser(userId)
      if (error) throw error
    } catch {
      return NextResponse.json(
        { ok: false, erro: 'Não foi possível excluir o usuário.' },
        { status: 500 }
      )
    }
    return NextResponse.json({ ok: true })
  }

  // Alteração de plano
  const plano = String(body?.plano || '').trim() as PlanoNome
  if (!PLANOS_VALIDOS.includes(plano)) {
    return NextResponse.json({ ok: false, erro: 'Plano inválido.' }, { status: 400 })
  }

  try {
    await setPlanoManual(client, userId, plano)
  } catch {
    return NextResponse.json(
      { ok: false, erro: 'Não foi possível atualizar o plano. Confirme se a tabela user_planos existe.' },
      { status: 500 }
    )
  }

  const rec = await getPlano(client, userId)
  const info = computePlanoInfo(rec)
  return NextResponse.json({ ok: true, plano: info.plano, origem: info.origem, bloqueado: info.bloqueado })
}
