import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/alerts/db'
import { authorizeAdmin } from '@/lib/admin/auth'
import { parsePeriodo } from '@/lib/admin/periodo'
import { listarUsuariosComPlano } from '@/lib/admin/usuario-plano'
import { precoMensalEquivalente, formatReais, type CicloId, type PlanoId } from '@/lib/asaas/types'

export const dynamic = 'force-dynamic'

const CICLOS: CicloId[] = ['mensal', 'trimestral', 'semestral', 'anual']

/** Converte o plano do banco para o id de preço (empresa == business). */
function planoIdDeDb(plano: string): PlanoId {
  return plano === 'business' ? 'empresa' : 'pro'
}

/**
 * GET /api/admin/revenue?periodo=30d
 * Receita com dados REAIS:
 *  - ASSINANTES ATIVOS: contagem, MRR (valor mensal equivalente) e total
 *    contratado por ciclo (valor do ciclo pago).
 *  - RECEITA NO PERÍODO: pagamentos confirmados/recebidos via webhook ASAAS
 *    dentro do intervalo (quantidade + soma dos valores).
 *  - Distribuição por ciclo e por meio de pagamento dos assinantes ativos.
 *  - Projeção de próximas cobranças em 30 dias (marcada como projeção).
 */
export async function GET(req: Request) {
  const auth = await authorizeAdmin(req)
  if (!auth.ok) return auth.response

  const url = new URL(req.url)
  const parsed = parsePeriodo(url)
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, erro: parsed.erro }, { status: 400 })
  }
  const { periodo } = parsed

  let client
  try {
    client = createServiceClient()
  } catch {
    return NextResponse.json({ ok: false, erro: 'Banco de dados não configurado.' }, { status: 503 })
  }

  let lista
  try {
    lista = await listarUsuariosComPlano(client)
  } catch {
    return NextResponse.json({ ok: false, erro: 'Não foi possível listar os planos.' }, { status: 500 })
  }

  const ativos = lista.filter((u) => u.statusPagamento === 'active')
  let mrr = 0
  let contratadoPorCiclo = 0
  const porCiclo: Record<string, number> = {}
  const porMeio: Record<string, number> = {}

  const agora = new Date()
  for (const a of ativos) {
    const planoId = planoIdDeDb(a.plano)
    const ciclo = (a.ciclo as CicloId) || 'mensal'
    if (!CICLOS.includes(ciclo)) continue
    mrr += precoMensalEquivalente(planoId, ciclo)
    contratadoPorCiclo += a.valorCiclo
    porCiclo[ciclo] = (porCiclo[ciclo] || 0) + 1
    porMeio[a.paymentMethod] = (porMeio[a.paymentMethod] || 0) + 1
  }

  // Próximas cobranças em 30 dias (projeção, valor total do ciclo de cada ativo).
  const daqui30 = new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000).getTime()
  let projQtd = 0
  let projValor = 0
  for (const a of ativos) {
    const prox = a.nextDueDate || a.proximaCobranca30d
    if (!prox) continue
    const t = new Date(prox).getTime()
    if (!Number.isNaN(t) && t <= daqui30) {
      projQtd += 1
      projValor += a.valorCiclo
    }
  }

  // Receita real do período: eventos ASAAS de pagamento confirmado/recebido.
  let q = client
    .from('asaas_webhook_events')
    .select('id,payload,event_type,created_at')
    .in('event_type', ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'])
    .gte('created_at', periodo.inicio)
  if (periodo.fim) q = q.lt('created_at', periodo.fim)
  q = q.order('created_at', { ascending: false }).limit(5000)
  const { data: pagamentos, error: pagErr } = await q
  if (pagErr) {
    return NextResponse.json({ ok: false, erro: 'Falha ao ler pagamentos.' }, { status: 500 })
  }

  let receitaPeriodo = 0
  for (const p of pagamentos || []) {
    const raw = (p.payload as { payment?: { value?: number | string } } | null)?.payment?.value
    if (raw === undefined || raw === null) continue
    const v = Number(raw)
    if (Number.isNaN(v) || v <= 0) continue
    receitaPeriodo += Math.round(v * 100)
  }

  return NextResponse.json({
    ok: true,
    agora: agora.toISOString(),
    periodo,
    assinantes: {
      ativos: ativos.length,
      mrr,
      mrrLabel: formatReais(mrr),
      contratadoPorCiclo,
      contratadoPorCicloLabel: formatReais(contratadoPorCiclo),
    },
    periodoReceita: {
      pagamentos_confirmados: (pagamentos || []).length,
      receita: receitaPeriodo,
      receitaLabel: formatReais(receitaPeriodo),
    },
    distribuicao: {
      porCiclo,
      porMeio,
    },
    projecao30d: {
      quantidade: projQtd,
      valor: projValor,
      valorLabel: formatReais(projValor),
    },
  })
}