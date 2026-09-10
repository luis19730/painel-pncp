import { NextRequest, NextResponse } from 'next/server'

import { requirePaidAccess } from '@/lib/auth/require-access'
import { buscarPropostas } from '@/lib/calendario/service'
import { normalizar } from '@/lib/utils'
import type { CalendarioEvento, Facetas, ResultadoCalendario } from '@/lib/calendario/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Máximo de páginas do PNCP lidas em uma consulta (cada página = até 50
// eventos reais). Limitar mantém o tempo de resposta aceitável; filtros que
// reduzem o escopo (UF, modalidade) permitem uma leitura mais profunda.
const MAX_PAGINAS_PADRAO = 3

// A data final da consulta (encurtada) controla o horizonte de eventos com
// propostas encerrando até aquela data.
function hojeBR(): Date {
  const now = new Date()
  const br = new Date(now.getTime() - 3 * 60 * 60 * 1000) // America/Sao_Paulo ≈ UTC-3
  return new Date(br.getUTCFullYear(), br.getUTCMonth(), br.getUTCDate())
}

function fmt(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${dd}`
}

// ---- Cache simples em memória + CDN ---------------------------------------
const CACHE_TTL_MS = 4 * 60 * 1000
const cache = new Map<string, { ts: number; val: ResultadoCalendario }>()

// ---- Construção das facetas a partir dos dados REAIS carregados -----------
function construirFacetas(eventos: CalendarioEvento[]): Facetas {
  const mod = new Set<string>()
  const mun = new Set<string>()
  const sit = new Set<string>()
  for (const e of eventos) {
    if (e.modalidade) mod.add(e.modalidade)
    if (e.municipio) mun.add(`${e.municipio} — ${e.uf}`.trim())
    if (e.situacao) sit.add(e.situacao)
  }
  const sort = (arr: string[]) => arr.sort((x, y) => x.localeCompare(y, 'pt-BR'))
  return {
    modalidades: sort(Array.from(mod)),
    municipios: sort(Array.from(mun)),
    situacoes: sort(Array.from(sit)),
  }
}

export async function GET(request: NextRequest) {
  const guard = await requirePaidAccess()
  if (!guard.ok) return guard.response

  const sp = request.nextUrl.searchParams

  // Período: usa a data final informada ou hoje+30 (horizonte padrão real).
  const base = hojeBR()
  const diasHorizonte = Math.min(Math.max(parseInt(sp.get('dias') || '30', 10) || 30, 0), 730)
  const dataFinal = fmt(new Date(base.getTime() + diasHorizonte * 86400000))

  const uf = (sp.get('uf') || '').toUpperCase()
  const modalidadeParam = sp.get('modalidade')
  const modalidade = modalidadeParam ? parseInt(modalidadeParam, 10) || undefined : undefined
  const municipio = (sp.get('municipio') || '').trim()
  const keyword = (sp.get('keyword') || '').trim()
  const maxPaginas = Math.min(Math.max(parseInt(sp.get('paginas') || String(MAX_PAGINAS_PADRAO), 10) || MAX_PAGINAS_PADRAO, 1), 6)
  const force = sp.get('force') === '1'

  const cacheKey = [uf, modalidadeParam || '', municipio, normalizar(keyword), dataFinal, maxPaginas].join('|')
  const hit = cache.get(cacheKey)
  if (!force && hit && Date.now() - hit.ts < CACHE_TTL_MS) {
    return NextResponse.json(hit.val, { headers: cacheHeaders() })
  }

  const eventos: CalendarioEvento[] = []
  const vistos = new Set<string>()
  let totalDisponivel = 0
  let paginasLidas = 0
  let falhou = false

  try {
    for (let p = 1; p <= maxPaginas; p++) {
      const r = await buscarPropostas({
        dataFinal,
        uf: uf || undefined,
        modalidade,
        pagina: p,
        tamanho: 50,
      })
      if (!r) {
        if (p === 1) falhou = true
        break
      }
      totalDisponivel = r.total
      paginasLidas++
      let novos = 0
      for (const e of r.eventos) {
        if (vistos.has(e.id)) continue
        vistos.add(e.id)
        eventos.push(e)
        novos++
      }
      if (r.eventos.length === 0 || novos === 0) break
      if (eventos.length >= 200) break
    }
  } catch {
    falhou = true
  }

  if (falhou && eventos.length === 0) {
    const res: ResultadoCalendario = {
      ok: false,
      fonte: 'erro',
      consultadoEm: new Date().toISOString(),
      eventos: [],
      totalDisponivel: 0,
      paginasLidas: 0,
      facetas: { modalidades: [], municipios: [], situacoes: [] },
      mensagem: 'Não foi possível atualizar os dados do PNCP no momento.',
      erro: 'PNCP indisponível',
    }
    cache.set(cacheKey, { ts: Date.now(), val: res })
    return NextResponse.json(res, { status: 502, headers: cacheHeaders() })
  }

  // Filtros locais (município por nome + palavra-chave no objeto).
  let filtrados = eventos
  if (municipio) {
    const m = normalizar(municipio)
    filtrados = filtrados.filter(
      (e) => normalizar(e.municipio).includes(m) || normalizar(`${e.municipio} — ${e.uf}`).includes(m)
    )
  }
  if (keyword) {
    const k = normalizar(keyword)
    filtrados = filtrados.filter(
      (e) =>
        normalizar(e.objeto).includes(k) ||
        normalizar(e.orgao).includes(k) ||
        normalizar(e.municipio).includes(k)
    )
  }

  const res: ResultadoCalendario = {
    ok: true,
    fonte: 'live',
    consultadoEm: new Date().toISOString(),
    eventos: filtrados,
    totalDisponivel,
    paginasLidas,
    facetas: construirFacetas(filtrados),
    mensagem: null,
  }
  cache.set(cacheKey, { ts: Date.now(), val: res })
  return NextResponse.json(res, { headers: cacheHeaders() })
}

function cacheHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=600',
  }
}
