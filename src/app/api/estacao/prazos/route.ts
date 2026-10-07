import { NextResponse } from 'next/server'
import { contextoUsuario, resposta401, respostaErro } from '@/lib/estacao/server'

export const dynamic = 'force-dynamic'

/** GET /api/estacao/prazos — todos os prazos pendentes do usuário (calendário). */
export async function GET() {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()

  const { data, error } = await supabase
    .from('workspace_prazos')
    .select('*, workspace_itens(numero_controle_pncp, objeto, orgao, uf)')
    .eq('concluido', false)
    .order('data_hora', { ascending: true })
    .limit(500)
  if (error) return respostaErro('Não foi possível carregar os prazos.', 500)
  return NextResponse.json({ ok: true, prazos: data || [] })
}
