// ============================================================================
// Registro de eventos de analytics a partir do SERVIDOR (best-effort).
//
// Usado por fluxos que só existem no backend (webhook ASAAS, criação de trial,
// cron de expiração) para gravar eventos de alto valor na MESMA tabela
// `analytics_events` usada pelo tracker do cliente. Nunca lança: analytics não
// pode quebrar um fluxo de cadastro/pagamento.
// ============================================================================

import type { SupabaseClient } from '@supabase/supabase-js'

type AnyClient = SupabaseClient<any, 'public', any>

export interface EventoInterno {
  event: string
  user_id?: string | null
  client_id?: string | null
  page?: string | null
  path?: string | null
  props?: Record<string, unknown> | null
}

/** Grava um evento (fire-and-forget). Retorna true se inseriu. */
export async function registrarEvento(client: AnyClient, ev: EventoInterno): Promise<boolean> {
  try {
    const { error } = await client.from('analytics_events').insert({
      event: ev.event,
      user_id: ev.user_id ?? null,
      client_id: ev.client_id ?? null,
      page: ev.page ?? null,
      path: ev.path ?? null,
      props: ev.props ?? null,
    })
    return !error
  } catch {
    return false
  }
}
