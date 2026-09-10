// ============================================================================
// Camada de persistência do módulo de CONTRATAÇÕES (SINAPI + processos).
//
// Todas as funções recebem um cliente Supabase (browser autenticado ou server).
// A segurança é feita via RLS: user_id = auth.uid() nas tabelas.
// Nada aqui inventa dados — só lê/grava o que veio de fonte real (planilha
// SINAPI oficial do usuário ou entradas preenchidas pelo usuário no processo).
// ============================================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ProcessoInstrucao, ProcessoItem, ProcessoPreco, ProcessoRisco,
  ProcessoDocumento, SinapiCabecalho, SinapiItem, DocStatus,
} from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, 'public', any>

// ---------------------------------------------------------------------------
// PROCESSOS
// ---------------------------------------------------------------------------

export async function insertProcesso(
  client: AnyClient,
  userId: string,
  dados: Record<string, unknown>
): Promise<ProcessoInstrucao> {
  const { data, error } = await client
    .from('processos_instrucao')
    .insert({ user_id: userId, ...dados })
    .select()
    .single()
  if (error) throw error
  return data as ProcessoInstrucao
}

export async function updateProcesso(
  client: AnyClient,
  userId: string,
  id: string,
  dados: Record<string, unknown>
): Promise<ProcessoInstrucao | null> {
  const { data, error } = await client
    .from('processos_instrucao')
    .update({ ...dados, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .maybeSingle()
  if (error) throw error
  return (data as ProcessoInstrucao) || null
}

export async function getProcesso(
  client: AnyClient,
  userId: string,
  id: string
): Promise<ProcessoInstrucao | null> {
  const { data, error } = await client
    .from('processos_instrucao')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return (data as ProcessoInstrucao) || null
}

export async function listProcessos(
  client: AnyClient,
  userId: string,
  limit = 100
): Promise<ProcessoInstrucao[]> {
  const { data, error } = await client
    .from('processos_instrucao')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data || []) as ProcessoInstrucao[]
}

export async function deleteProcesso(
  client: AnyClient,
  userId: string,
  id: string
): Promise<void> {
  await client.from('processos_instrucao').delete().eq('id', id).eq('user_id', userId)
}

// ---------------------------------------------------------------------------
// ITENS (orçamento / SINAPI)
// ---------------------------------------------------------------------------

export async function listItens(
  client: AnyClient,
  userId: string,
  processoId: string
): Promise<ProcessoItem[]> {
  const { data, error } = await client
    .from('processo_itens')
    .select('*')
    .eq('user_id', userId)
    .eq('processo_id', processoId)
    .order('posicao', { ascending: true })
  if (error) throw error
  return (data || []) as ProcessoItem[]
}

export async function saveItem(
  client: AnyClient,
  userId: string,
  item: Partial<ProcessoItem> & { processo_id: string }
): Promise<ProcessoItem | null> {
  if (item.id) {
    const { data, error } = await client
      .from('processo_itens')
      .update(item)
      .eq('id', item.id)
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw error
    return data as ProcessoItem
  }
  const { data, error } = await client
    .from('processo_itens')
    .insert({ user_id: userId, ...item })
    .select()
    .single()
  if (error) throw error
  return data as ProcessoItem
}

export async function deleteItem(
  client: AnyClient,
  userId: string,
  id: string
): Promise<void> {
  await client.from('processo_itens').delete().eq('id', id).eq('user_id', userId)
}

export async function replaceItens(
  client: AnyClient,
  userId: string,
  processoId: string,
  itens: Array<Partial<ProcessoItem>>
): Promise<void> {
  await client.from('processo_itens').delete().eq('processo_id', processoId).eq('user_id', userId)
  if (itens.length === 0) return
  const rows = itens.map((it, i) => ({
    user_id: userId,
    processo_id: processoId,
    posicao: i,
    ...it,
  }))
  const { error } = await client.from('processo_itens').insert(rows)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// PREÇOS (pesquisa)
// ---------------------------------------------------------------------------

export async function listPrecos(
  client: AnyClient,
  userId: string,
  processoId: string
): Promise<ProcessoPreco[]> {
  const { data, error } = await client
    .from('processo_precos')
    .select('*')
    .eq('user_id', userId)
    .eq('processo_id', processoId)
    .order('criado_em', { ascending: true })
  if (error) throw error
  return (data || []) as ProcessoPreco[]
}

export async function savePreco(
  client: AnyClient,
  userId: string,
  p: Partial<ProcessoPreco> & { processo_id: string }
): Promise<ProcessoPreco | null> {
  if (p.id) {
    const { data, error } = await client
      .from('processo_precos')
      .update(p).eq('id', p.id).eq('user_id', userId).select().single()
    if (error) throw error
    return data as ProcessoPreco
  }
  const { data, error } = await client
    .from('processo_precos')
    .insert({ user_id: userId, ...p }).select().single()
  if (error) throw error
  return data as ProcessoPreco
}

export async function deletePreco(
  client: AnyClient,
  userId: string,
  id: string
): Promise<void> {
  await client.from('processo_precos').delete().eq('id', id).eq('user_id', userId)
}

export async function replacePrecos(
  client: AnyClient,
  userId: string,
  processoId: string,
  precos: Array<Partial<ProcessoPreco>>
): Promise<void> {
  await client.from('processo_precos').delete().eq('processo_id', processoId).eq('user_id', userId)
  if (precos.length === 0) return
  const rows = precos.map((p) => ({ user_id: userId, processo_id: processoId, ...p }))
  const { error } = await client.from('processo_precos').insert(rows)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// RISCOS
// ---------------------------------------------------------------------------

export async function listRiscos(
  client: AnyClient,
  userId: string,
  processoId: string
): Promise<ProcessoRisco[]> {
  const { data, error } = await client
    .from('processo_riscos')
    .select('*')
    .eq('user_id', userId)
    .eq('processo_id', processoId)
    .order('criado_em', { ascending: true })
  if (error) throw error
  return (data || []) as ProcessoRisco[]
}

export async function saveRisco(
  client: AnyClient,
  userId: string,
  r: Partial<ProcessoRisco> & { processo_id: string }
): Promise<ProcessoRisco | null> {
  if (r.id) {
    const { data, error } = await client
      .from('processo_riscos').update(r).eq('id', r.id).eq('user_id', userId).select().single()
    if (error) throw error
    return data as ProcessoRisco
  }
  const { data, error } = await client
    .from('processo_riscos').insert({ user_id: userId, ...r }).select().single()
  if (error) throw error
  return data as ProcessoRisco
}

export async function deleteRisco(client: AnyClient, userId: string, id: string): Promise<void> {
  await client.from('processo_riscos').delete().eq('id', id).eq('user_id', userId)
}

export async function replaceRiscos(
  client: AnyClient,
  userId: string,
  processoId: string,
  riscos: Array<Partial<ProcessoRisco>>
): Promise<void> {
  await client.from('processo_riscos').delete().eq('processo_id', processoId).eq('user_id', userId)
  if (riscos.length === 0) return
  const rows = riscos.map((r) => ({ user_id: userId, processo_id: processoId, ...r }))
  const { error } = await client.from('processo_riscos').insert(rows)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// DOCUMENTOS (checklist)
// ---------------------------------------------------------------------------

export async function listDocumentos(
  client: AnyClient,
  userId: string,
  processoId: string
): Promise<ProcessoDocumento[]> {
  const { data, error } = await client
    .from('processo_documentos')
    .select('*')
    .eq('user_id', userId)
    .eq('processo_id', processoId)
    .order('criado_em', { ascending: true })
  if (error) throw error
  return (data || []) as ProcessoDocumento[]
}

export async function replaceDocumentos(
  client: AnyClient,
  userId: string,
  processoId: string,
  docs: Array<Partial<ProcessoDocumento>>
): Promise<void> {
  await client.from('processo_documentos').delete().eq('processo_id', processoId).eq('user_id', userId)
  if (docs.length === 0) return
  const rows = docs.map((d) => ({
    user_id: userId,
    processo_id: processoId,
    obrigatorio: true,
    status: 'pendente' as DocStatus,
    ...d,
  }))
  const { error } = await client.from('processo_documentos').insert(rows)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// HISTÓRICO
// ---------------------------------------------------------------------------

export async function addHistorico(
  client: AnyClient,
  userId: string,
  processoId: string,
  acao: string,
  detalhe?: Record<string, unknown>
): Promise<void> {
  await client
    .from('processo_historico')
    .insert({ user_id: userId, processo_id: processoId, acao, detalhe })
}

export async function listHistorico(
  client: AnyClient,
  userId: string,
  processoId: string,
  limit = 50
): Promise<Array<{ id: string; acao: string; detalhe: unknown; criado_em: string }>> {
  const { data, error } = await client
    .from('processo_historico')
    .select('id, acao, detalhe, criado_em')
    .eq('user_id', userId)
    .eq('processo_id', processoId)
    .order('criado_em', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data || []) as Array<{ id: string; acao: string; detalhe: unknown; criado_em: string }>
}

// ---------------------------------------------------------------------------
// SINAPI (base importada pelo usuário)
// ---------------------------------------------------------------------------

export async function listSinapiCabecalhos(
  client: AnyClient,
  userId: string
): Promise<SinapiCabecalho[]> {
  const { data, error } = await client
    .from('sinapi_cabecalhos')
    .select('*')
    .eq('user_id', userId)
    .order('criado_em', { ascending: false })
  if (error) throw error
  return (data || []) as SinapiCabecalho[]
}

export interface SinapiImportInput {
  nome_arquivo: string
  competencia: string | null
  uf: string | null
  deson_base: string | null
  itens: Array<{
    codigo: string | null
    descricao: string
    unidade: string | null
    tipo: string | null
    custo_nao_deson: number | null
    custo_deson: number | null
    origem_insumo: string | null
  }>
}

export async function importSinapiBase(
  client: AnyClient,
  userId: string,
  input: SinapiImportInput
): Promise<SinapiCabecalho | null> {
  // Cabeçalho
  const { data: cab, error: errCab } = await client
    .from('sinapi_cabecalhos')
    .insert({
      user_id: userId,
      nome_arquivo: input.nome_arquivo,
      competencia: input.competencia,
      uf: input.uf,
      deson_base: input.deson_base,
      total_itens: input.itens.length,
    })
    .select()
    .single()
  if (errCab) throw errCab

  // Itens em lotes (evita payloads gigantes no insert)
  const lote = 500
  for (let i = 0; i < input.itens.length; i += lote) {
    const fatia = input.itens.slice(i, i + lote).map((it) => ({
      user_id: userId,
      cabecalho_id: cab.id,
      ...it,
    }))
    const { error } = await client.from('sinapi_itens').insert(fatia)
    if (error) throw error
  }
  return cab as SinapiCabecalho
}

export async function deleteSinapiBase(
  client: AnyClient,
  userId: string,
  cabecalhoId: string
): Promise<void> {
  await client
    .from('sinapi_cabecalhos')
    .delete()
    .eq('id', cabecalhoId)
    .eq('user_id', userId)
}

export async function searchSinapiItens(
  client: AnyClient,
  userId: string,
  opts: {
    cabecalhoId: string
    codigo?: string
    termo?: string
    tipo?: string
    limit?: number
  }
): Promise<SinapiItem[]> {
  let q = client
    .from('sinapi_itens')
    .select('*')
    .eq('user_id', userId)
    .eq('cabecalho_id', opts.cabecalhoId)
    .limit(Math.min(opts.limit || 200, 500))

  if (opts.codigo) q = q.ilike('codigo', `%${opts.codigo}%`)
  if (opts.tipo) q = q.eq('tipo', opts.tipo)
  if (opts.termo) q = q.ilike('descricao', `%${opts.termo}%`)

  const { data, error } = await q
  if (error) throw error
  return (data || []) as SinapiItem[]
}
