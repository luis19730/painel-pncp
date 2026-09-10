// ============================================================================
// Camada de persistência das ANÁLISES DE EDITAL (/analise-edital).
//
// Todas as funções recebem um cliente Supabase como parâmetro. A UI acessa via
// cliente autenticado do browser -> RLS isola por auth.uid() (mesmo padrão de
// /alertas). Nada aqui inventa dados: só lê/grava o que foi produzido pela IA.
// ============================================================================

import type { SupabaseClient } from '@supabase/supabase-js'

export type AnaliseOrigem = 'texto' | 'pdf' | 'pncp'
export type AnaliseStatus = 'concluida' | 'erro'

/** Avaliações mínimas para calcular uma precisão estatisticamente válida. */
export const MIN_AVALIACOES_PRECISAO = 5

export interface AnaliseRecord {
  id: string
  user_id: string
  pncp_id: string | null
  objeto: string | null
  orgao: string | null
  unidade: string | null
  modalidade: string | null
  cnpj: string | null
  numero: string | null
  uf: string | null
  municipio: string | null
  valor: number | null
  data_publicacao: string | null
  data_encerramento: string | null
  link_edital: string | null
  origem: AnaliseOrigem
  nome_arquivo: string | null
  conteudo_chars: number | null
  status: AnaliseStatus
  modelo: string | null
  inicio_em: string | null
  conclusao_em: string | null
  tempo_ms: number | null
  markdown: string | null
  erro: string | null
  classificacao_correta: boolean | null
  avaliada_em: string | null
  created_at: string
  updated_at: string | null
}

export interface AnaliseInput {
  pncp_id?: string | null
  objeto?: string | null
  orgao?: string | null
  unidade?: string | null
  modalidade?: string | null
  cnpj?: string | null
  numero?: string | null
  uf?: string | null
  municipio?: string | null
  valor?: number | null
  data_publicacao?: string | null
  data_encerramento?: string | null
  link_edital?: string | null
  origem: AnaliseOrigem
  nome_arquivo?: string | null
  conteudo_chars?: number | null
  status: AnaliseStatus
  modelo?: string | null
  inicio_em?: string | null
  conclusao_em?: string | null
  tempo_ms?: number | null
  markdown?: string | null
  erro?: string | null
}

export interface AnaliseMetrics {
  /** Editais efetivamente processados com sucesso (sem duplicidade). */
  editais_processados: number
  concluidas: number
  com_erro: number
  total_tempo_ms: number
  /** Qtd de classificações já avaliadas. */
  avaliadas: number
  /** Qtd de classificações consideradas corretas. */
  corretas: number
  /** Precisão em % (0-100) quando há dados suficientes; null caso contrário. */
  precisao: number | null
}

// Cliente Supabase de uso genérico (mesmo padrão da camada de /alertas).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, 'public', any>

/** Insere uma análise e devolve o registro criado. */
export async function insertAnalise(
  client: AnyClient,
  userId: string,
  input: AnaliseInput
): Promise<AnaliseRecord> {
  const { data, error } = await client
    .from('analises')
    .insert({ user_id: userId, ...input })
    .select()
    .single()
  if (error) throw error
  return data as AnaliseRecord
}

/** Lista o histórico do usuário (mais recentes primeiro). */
export async function listAnalises(
  client: AnyClient,
  userId: string,
  limit = 30
): Promise<AnaliseRecord[]> {
  const { data, error } = await client
    .from('analises')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data || []) as AnaliseRecord[]
}

/** Remove uma análise (apenas do próprio usuário). */
export async function deleteAnalise(
  client: AnyClient,
  userId: string,
  id: string
): Promise<void> {
  const { error } = await client
    .from('analises')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
}

/**
 * Busca uma análise CONCLUÍDA já existente para um edital PNCP (usuário
 * específico). Usada para evitar reprocessamento/duplicidade: se existir, a
 * rota reutiliza o resultado sem incrementar o contador.
 */
export async function getConcluidaByPncp(
  client: AnyClient,
  userId: string,
  pncpId: string
): Promise<AnaliseRecord | null> {
  const { data, error } = await client
    .from('analises')
    .select('*')
    .eq('user_id', userId)
    .eq('pncp_id', pncpId)
    .eq('status', 'concluida')
    .maybeSingle()
  if (error) throw error
  return (data as AnaliseRecord) || null
}

/**
 * Avalia uma classificação de uma análise (marca como correta/incorreta).
 * A qualquer momento o usuário pode reavaliar; o timestamp é atualizado pelo
 * banco (trigger). Retorna o registro atualizado.
 */
export async function avaliarAnalise(
  client: AnyClient,
  userId: string,
  id: string,
  correta: boolean
): Promise<AnaliseRecord | null> {
  const { data, error } = await client
    .from('analises')
    .update({ classificacao_correta: correta })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw error
  return (data as AnaliseRecord) || null
}

/** Métricas reais agregadas do histórico do usuário. */
export async function analiseMetrics(
  client: AnyClient,
  userId: string
): Promise<AnaliseMetrics> {
  const { data, error } = await client
    .from('analises')
    .select('id, pncp_id, status, tempo_ms, classificacao_correta')
    .eq('user_id', userId)
  if (error) throw error

  const rows = (data || []) as Array<{
    id: string
    pncp_id: string | null
    status: string
    tempo_ms: number | null
    classificacao_correta: boolean | null
  }>

  const concluidas = rows.filter((r) => r.status === 'concluida')

  // Editais processados SEM duplicidade: um mesmo pncp_id conta apenas uma vez
  // (a constraint única já evita inserir duplicado; aqui deduplicamos por garantia).
  const vistos = new Set<string>()
  let editaisProcessados = 0
  for (const r of concluidas) {
    if (r.pncp_id) {
      if (vistos.has(r.pncp_id)) continue
      vistos.add(r.pncp_id)
    }
    editaisProcessados++
  }

  const avaliacoes = concluidas.filter((r) => r.classificacao_correta != null)
  const corretas = avaliacoes.filter((r) => r.classificacao_correta === true).length

  return {
    editais_processados: editaisProcessados,
    concluidas: concluidas.length,
    com_erro: rows.length - concluidas.length,
    total_tempo_ms: concluidas.reduce((acc, r) => acc + (r.tempo_ms || 0), 0),
    avaliadas: avaliacoes.length,
    corretas,
    precisao:
      avaliacoes.length >= MIN_AVALIACOES_PRECISAO
        ? Number((corretas / avaliacoes.length) * 100)
        : null,
  }
}
