import { NextResponse } from 'next/server'
import { contextoUsuario, respostaErro } from '@/lib/estacao/server'
import { texto } from '@/lib/sicx/validacao'

export const dynamic = 'force-dynamic'

/**
 * POST /api/sicx/reportar — denúncia pública de link quebrado/desatualizado.
 * Entra numa fila (`sicx_link_reports`) que o admin revisa.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return respostaErro('Corpo inválido.')
  }

  const motivo = texto(body.motivo, 1000)
  if (!motivo) return respostaErro('Descreva o problema encontrado.')

  const almoxarifadoId = texto(body.almoxarifado_id, 60)
  const { supabase, user } = await contextoUsuario()

  if (almoxarifadoId) {
    const { data: existe } = await supabase
      .from('sicx_almoxarifados')
      .select('id')
      .eq('id', almoxarifadoId)
      .maybeSingle()
    if (!existe) return respostaErro('Registro não encontrado.', 404)
  }

  const { error } = await supabase.from('sicx_link_reports').insert({
    almoxarifado_id: almoxarifadoId || null,
    user_id: user?.id ?? null,
    motivo,
  })

  if (error) return respostaErro('Não foi possível enviar o relato.', 500)
  return NextResponse.json({ ok: true })
}
