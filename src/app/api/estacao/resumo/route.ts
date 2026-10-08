import { NextResponse } from 'next/server'
import { contextoUsuario, resposta401, respostaErro } from '@/lib/estacao/server'

export const dynamic = 'force-dynamic'

/** GET /api/estacao/resumo — números e próximos prazos da Estação (para o dashboard). */
export async function GET() {
  const { supabase, user } = await contextoUsuario()
  if (!user) return resposta401()

  const now = new Date()
  const nowIso = now.toISOString()
  const in48 = new Date(now.getTime() + 48 * 3_600_000).toISOString()

  const { data: itens, error } = await supabase.from('workspace_itens').select('etapa')
  if (error) return respostaErro('Não foi possível carregar a estação.', 500)
  const arr = itens || []
  const total = arr.length
  const ativas = arr.filter((i) => !['ganha', 'perdida', 'descartada'].includes(i.etapa)).length
  const ganhas = arr.filter((i) => i.etapa === 'ganha').length

  const { data: proximos } = await supabase
    .from('workspace_prazos')
    .select('id,titulo,tipo,data_hora,item_id,workspace_itens(numero_controle_pncp,objeto,orgao)')
    .eq('concluido', false)
    .gte('data_hora', nowIso)
    .order('data_hora', { ascending: true })
    .limit(4)

  const { count: p48 } = await supabase
    .from('workspace_prazos')
    .select('id', { count: 'exact', head: true })
    .eq('concluido', false)
    .gte('data_hora', nowIso)
    .lte('data_hora', in48)

  return NextResponse.json({
    ok: true,
    total,
    ativas,
    ganhas,
    prazos48h: p48 || 0,
    proximos: proximos || [],
  })
}
