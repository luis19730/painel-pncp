import { NextRequest, NextResponse } from 'next/server'

import { requirePaidAccess } from '@/lib/auth/require-access'
import { buscarPropostas } from '@/lib/calendario/service'
import { normalizar } from '@/lib/utils'
import type { CalendarioEvento, ResultadoCalendario } from '@/lib/calendario/types'

// ============================================================================
// GET /api/radar
// Busca oportunidades REAIS do PNCP que correspondem a uma busca salva do
// "Meu Radar". Usa a mesma fonte comprovada do Calendário
// (/consulta/v1/contratacoes/proposta = contratações RECEBENDO PROPOSTAS),
// aplicando no servidor todos os filtros da busca do radar:
//   q          -> palavra-chave (objeto / órgão / município)
//   uf         -> sigla da UF
//   modalidade -> nome da modalidade (substring)
//   municipio  -> lista de municípios separados por vírgula
//   valorMin / valorMax -> faixa de valor estimado
// A fonte oficial só retorna contratações abertas (recebendo propostas), por
// isso "Encerrada" não gera resultados — nada é inventado.
// ============================================================================

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_PAGINAS_PADRAO = 4

function hojeBR(): Date {
  const now = new Date()
  const br = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  return new Date(br.getUTCFullYear(), br.getUTCMonth(), br.getUTCDate())
}

function fmt(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${dd}`
}

const CACHE_TTL_MS = 4 * 60 * 1000
const cache = new Map<string, { ts: number; val: ResultadoCalendario }>()

function cacheHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=600',
  }
}

export async function GET(request: NextRequest) {
  const guard = await requirePaidAccess()
  if (!guard.ok) return guard.response

  const sp = request.nextUrl.searchParams

  const keyword = (sp.get('q') || '').trim()
  const uf = (sp.get('uf') || '').toUpperCase()
  const modalidade = (sp.get('modalidade') || '').trim()
  const municipios = (sp.get('municipio') || '')
    .split(',')
    .map((s) => normalizar(s.trim()))
    .filter(Boolean)
  const valorMin = parseFloat(sp.get('valorMin') || '')
  const valorMax = parseFloat(sp.get('valorMax') || '')
  const situacao = (sp.get('situacao') || '').toLowerCase()
  const force = sp.get('force') === '1'

  const maxPaginas = Math.min(
    Math.max(parseInt(sp.get('paginas') || String(MAX_PAGINAS_PADRAO), 10) || MAX_PAGINAS_PADRAO, 1),
    8
  )

  // Horizonte: captura propostas abertas encerrando até ~150 dias à frente,
  // para que o radar enxergue as oportunidades atuais e as recém-abertas.
  const base = hojeBR()
  const dataFinal = fmt(new Date(base.getTime() + 150 * 86400000))

  const cacheKey = [
    normToken(keyword),
    uf,
    normToken(modalidade),
    municipios.join('|'),
    valorMin || '',
    valorMax || '',
    situacao,
    dataFinal,
    maxPaginas,
  ].join('|')

  const hit = cache.get(cacheKey)
  if (!force && hit && Date.now() - hit.ts < CACHE_TTL_MS) {
    return NextResponse.json(hit.val, { headers: cacheHeaders() })
  }

  // A fonte oficial (/proposta) só retorna contratações abertas (recebendo
  // propostas). Para "Encerrada", o resultado honesto é vazio — não inventamos
  // registros encerrados.
  if (situacao === 'encerrada') {
    const vazio: ResultadoCalendario = {
      ok: true,
      fonte: 'live',
      consultadoEm: new Date().toISOString(),
      eventos: [],
      totalDisponivel: 0,
      paginasLidas: 0,
      facetas: { modalidades: [], municipios: [], situacoes: ['Encerrada'] },
      mensagem: 'O radar consulta contratações abertas (recebendo propostas) do PNCP; não há resultados para a situação encerrada.',
    }
    cache.set(cacheKey, { ts: Date.now(), val: vazio })
    return NextResponse.json(vazio, { headers: cacheHeaders() })
  }

  const eventos: CalendarioEvento[] = []
  const vistos = new Set<string>()
  let totalDisponivel = 0
  let paginasLidas = 0
  let falhou = false

  // Modalidade por código: o PNCP exige código numérico. Mapeamos os nomes
  // conhecidos; se não reconhecer, busca sem filtro e filtra por nome abaixo.
  const codigoModalidade = CODIGO_MODALIDADE[normToken(modalidade)]

  try {
    for (let p = 1; p <= maxPaginas; p++) {
      const r = await buscarPropostas({
        dataFinal,
        uf: uf || undefined,
        modalidade: codigoModalidade,
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

  // Filtros locais finais (modalidade por nome, municípios, palavra-chave,
  // faixa de valor) sobre os dados REAIS carregados.
  const knorm = normToken(keyword)
  const mnorm = normToken(modalidade)
  const filtrados = eventos.filter((e) => {
    if (mnorm && !normToken(e.modalidade).includes(mnorm)) return false
    if (municipios.length && !municipios.some((m) => normalizar(e.municipio).includes(m))) return false
    if (knorm) {
      const alvo = `${e.objeto} ${e.orgao} ${e.municipio}`
      if (!normToken(alvo).includes(knorm)) return false
    }
    if (Number.isFinite(valorMin) && (e.valor == null || e.valor < valorMin)) return false
    if (Number.isFinite(valorMax) && (e.valor == null || e.valor > valorMax)) return false
    return true
  })

  const res: ResultadoCalendario = {
    ok: true,
    fonte: 'live',
    consultadoEm: new Date().toISOString(),
    eventos: filtrados,
    totalDisponivel,
    paginasLidas,
    facetas: { modalidades: [], municipios: [], situacoes: [] },
    mensagem: null,
  }
  cache.set(cacheKey, { ts: Date.now(), val: res })
  return NextResponse.json(res, { headers: cacheHeaders() })
}

// Normaliza um texto ignorando acentos, espaços e hífens (ex.: "Pregão -
// Eletrônico" e "Pregão-Eletrônico" ficam idênticos: "pregaoelectronico"),
// tornando a correspondência de modalidade robusta às variações do PNCP.
function normToken(s: string): string {
  return normalizar(s).replace(/[^a-z0-9]/g, '')
}

const CODIGO_MODALIDADE: Record<string, number | undefined> = {
  leiloeletronico: 1,
  leilaopresencial: 13,
  dialogocompetitivo: 2,
  concurso: 3,
  concorrenciaeletronica: 4,
  concorrenciapresencial: 5,
  pregaoeletronico: 6,
  pregaopresencial: 7,
  dispensa: 8,
  dispensedelicitao: 8,
  inexigibilidade: 9,
  manifestacaodeinteresse: 10,
  prequalificacao: 11,
  credenciamento: 12,
}
