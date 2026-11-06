// ============================================================================
// Acesso a dados do SICX no SERVIDOR.
//
// Conteúdo público é lido com a chave anon (sem cookies) para preservar a
// renderização no servidor/SEO. Se o banco estiver indisponível ou vazio,
// devolvemos o fallback estático de `conteudo.ts` — a página nunca quebra.
//
// Dados de usuário são sempre acessados pelo cliente de sessão nas rotas de
// API (RLS: auth.uid() = user_id).
// ============================================================================

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import {
  ALMOXARIFADOS_PADRAO,
  NORMAS_PADRAO,
  STATUS_OBJETO_PADRAO,
} from './conteudo'
import { normalizarUf } from './ufs'
import type { SicxAlmoxarifado, SicxConteudo, SicxNorma, SicxStatus } from './types'

function clientePublico() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key || key.includes('placeholder')) return null
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

/** Conteúdo público: status, normas e almoxarifados (RLS já filtra). */
export async function carregarConteudoSicx(): Promise<SicxConteudo> {
  const supabase = clientePublico()
  if (!supabase) {
    return {
      status: STATUS_OBJETO_PADRAO,
      normas: NORMAS_PADRAO,
      almoxarifados: ALMOXARIFADOS_PADRAO,
      fonte: 'estatico',
    }
  }

  try {
    const [statusRes, normasRes, almoxRes] = await Promise.all([
      supabase
        .from('sicx_status')
        .select('id, titulo, descricao, fonte_label, fonte_url, atualizado_em')
        .order('atualizado_em', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('sicx_normas')
        .select('id, titulo, tipo, orgao, data_publicacao, url, verificado_em, status_link, destaque, ordem')
        .eq('ativo', true)
        .order('ordem', { ascending: true })
        .order('data_publicacao', { ascending: false }),
      supabase
        .from('sicx_almoxarifados')
        .select('id, nome, orgao, esfera, uf, tipo, situacao, descricao, como_participar, url_site, url_norma, url_edital, verificado_em, status_link, ordem, criado_em')
        .eq('ativo', true)
        .neq('situacao', 'em_revisao')
        .order('ordem', { ascending: true })
        .order('nome', { ascending: true })
        .limit(5000),
    ])

    if (statusRes.error && normasRes.error && almoxRes.error) {
      return {
        status: STATUS_OBJETO_PADRAO,
        normas: NORMAS_PADRAO,
        almoxarifados: ALMOXARIFADOS_PADRAO,
        fonte: 'estatico',
      }
    }

    const status = (statusRes.data as SicxStatus | null) ?? STATUS_OBJETO_PADRAO
    const normas = (normasRes.data as SicxNorma[] | null) ?? []
    const almoxarifados = ((almoxRes.data as SicxAlmoxarifado[] | null) ?? []).map((a) => ({
      ...a,
      uf: normalizarUf(a.uf),
    }))

    return {
      status,
      normas: normas.length ? normas : NORMAS_PADRAO,
      almoxarifados: almoxarifados.length ? almoxarifados : ALMOXARIFADOS_PADRAO,
      fonte: normas.length || almoxarifados.length ? 'banco' : 'estatico',
    }
  } catch {
    return {
      status: STATUS_OBJETO_PADRAO,
      normas: NORMAS_PADRAO,
      almoxarifados: ALMOXARIFADOS_PADRAO,
      fonte: 'estatico',
    }
  }
}

/** true se o usuário autenticado é administrador do conteúdo SICX. */
export async function usuarioEhAdminSicx(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  email?: string | null
): Promise<boolean> {
  try {
    const { data } = await supabase.rpc('sicx_is_admin')
    if (data === true) return true
  } catch {
    // cai no fallback por e-mail
  }
  if (!email) return false
  const { isAdminEmail } = await import('@/lib/auth/admin-emails')
  return isAdminEmail(email)
}

/** Última atualização do conteúdo (ISO) para o rodapé e o JSON-LD. */
export function ultimaAtualizacao(conteudo: SicxConteudo): string {
  const datas = [
    conteudo.status?.atualizado_em,
    ...conteudo.normas.map((n) => n.verificado_em),
    ...conteudo.almoxarifados.map((a) => a.verificado_em),
  ].filter(Boolean) as string[]

  if (!datas.length) return new Date().toISOString()
  return datas.sort().at(-1) as string
}
