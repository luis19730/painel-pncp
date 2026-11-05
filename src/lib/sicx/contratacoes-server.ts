// Helpers de servidor do Kanban "Minhas contratações" (Parte 7.4).

import type { SupabaseClient } from '@supabase/supabase-js'
import { COLUNAS_CONTRATACOES } from './kanban'

/** Cria as 8 colunas padrão no primeiro acesso (idempotente). */
export async function garantirColunasContratacoes(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { data: existentes } = await supabase
    .from('sicx_contratacoes_colunas')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
  if (existentes && existentes.length > 0) return

  await supabase.from('sicx_contratacoes_colunas').upsert(
    COLUNAS_CONTRATACOES.map((c, i) => ({
      user_id: userId,
      nome: c.nome,
      ordem: i,
      cor: c.cor,
    })),
    { onConflict: 'user_id,nome', ignoreDuplicates: true }
  )
}

export async function colunaDoUsuario(
  supabase: SupabaseClient,
  userId: string,
  colunaId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('sicx_contratacoes_colunas')
    .select('id')
    .eq('id', colunaId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}
