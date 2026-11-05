// ============================================================================
// Verificação automática dos links do diretório SICX.
//
// Usado pelo painel admin ("validar links agora") e pelo cron semanal.
// Regras:
//   - HEAD e, se o site recusar, GET;
//   - considera OK status 200–399;
//   - 2 falhas consecutivas => status_link 'em_revisao' e o item some da
//     listagem pública (policy de SELECT);
//   - ao voltar a responder, restaura a situação anterior.
// ============================================================================

import type { SupabaseClient } from '@supabase/supabase-js'

export interface ResultadoUrl {
  url: string
  ok: boolean
  status: number | null
  erro?: string
}

const TIMEOUT_MS = 15000

async function tentar(url: string, method: 'HEAD' | 'GET'): Promise<ResultadoUrl> {
  try {
    const resp = await fetch(url, {
      method,
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        'user-agent':
          'Mozilla/5.0 (compatible; PainelPNCP-SICX/1.0; +https://www.painelpncp.com.br)',
        accept: 'text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8',
      },
    })
    const ok = resp.status >= 200 && resp.status < 400
    return { url, ok, status: resp.status, erro: ok ? undefined : `HTTP ${resp.status}` }
  } catch (erro) {
    return { url, ok: false, status: null, erro: erro instanceof Error ? erro.message : 'Falha de rede' }
  }
}

export async function verificarUrl(url: string): Promise<ResultadoUrl> {
  const head = await tentar(url, 'HEAD')
  if (head.ok) return head
  // Muitos portais governamentais recusam HEAD (405/403) — tenta GET.
  if (head.status === 405 || head.status === 403 || head.status === null || head.status >= 500) {
    return tentar(url, 'GET')
  }
  return head
}

function urlsDoAlmoxarifado(a: {
  url_site: string | null
  url_norma: string | null
  url_edital: string | null
}): string[] {
  return [...new Set([a.url_site, a.url_norma, a.url_edital].filter(Boolean) as string[])]
}

export interface ResumoVerificacao {
  verificados: number
  falhas: number
  emRevisao: number
  detalhes: Array<{ nome: string; ok: boolean; urls: ResultadoUrl[] }>
}

export async function verificarLinksSicx(supabase: SupabaseClient): Promise<ResumoVerificacao> {
  const resumo: ResumoVerificacao = { verificados: 0, falhas: 0, emRevisao: 0, detalhes: [] }
  const agora = new Date().toISOString()

  const { data: almoxarifados } = await supabase
    .from('sicx_almoxarifados')
    .select('id, nome, url_site, url_norma, url_edital, falhas_consecutivas, situacao, situacao_anterior, status_link')
    .eq('ativo', true)

  for (const a of almoxarifados || []) {
    const urls = urlsDoAlmoxarifado(a)
    if (!urls.length) continue

    const resultados = await Promise.all(urls.map((u) => verificarUrl(u)))
    const principal = resultados.find((r) => r.url === a.url_site) || resultados[0]
    const ok = principal?.ok === true

    const falhas = ok ? 0 : Number(a.falhas_consecutivas || 0) + 1
    const emRevisao = falhas >= 2

    const atualizacao: Record<string, unknown> = {
      falhas_consecutivas: falhas,
      status_link: ok ? 'verificado' : emRevisao ? 'em_revisao' : 'a_verificar',
    }

    if (ok) {
      atualizacao.verificado_em = agora
      if (a.situacao === 'em_revisao') {
        atualizacao.situacao = a.situacao_anterior || 'a_verificar'
        atualizacao.situacao_anterior = null
      }
    } else if (emRevisao && a.situacao !== 'em_revisao') {
      atualizacao.situacao_anterior = a.situacao
      atualizacao.situacao = 'em_revisao'
    }

    await supabase.from('sicx_almoxarifados').update(atualizacao).eq('id', a.id)

    if (ok) resumo.verificados += 1
    else {
      resumo.falhas += 1
      if (emRevisao) resumo.emRevisao += 1
    }

    resumo.detalhes.push({ nome: a.nome, ok, urls: resultados })

    await supabase.from('sicx_link_verificacoes').insert(
      resultados.map((r) => ({
        entidade: 'almoxarifado',
        entidade_id: a.id,
        url: r.url,
        status_http: r.status,
        ok: r.ok,
        erro: r.erro || null,
      }))
    )
  }

  // Normas: mantém o link válido e marca em revisão após 2 falhas.
  const { data: normas } = await supabase
    .from('sicx_normas')
    .select('id, titulo, url, ativo')
    .eq('ativo', true)
    .not('url', 'is', null)

  for (const n of normas || []) {
    if (!n.url) continue
    const r = await verificarUrl(n.url)
    const novoStatus = r.ok ? 'verificado' : 'em_revisao'
    await supabase
      .from('sicx_normas')
      .update({
        status_link: novoStatus,
        ...(r.ok ? { verificado_em: agora } : {}),
      })
      .eq('id', n.id)

    await supabase.from('sicx_link_verificacoes').insert({
      entidade: 'norma',
      entidade_id: n.id,
      url: n.url,
      status_http: r.status,
      ok: r.ok,
      erro: r.erro || null,
    })

    if (r.ok) resumo.verificados += 1
    else resumo.falhas += 1
  }

  return resumo
}
