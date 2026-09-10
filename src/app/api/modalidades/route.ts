import { NextRequest, NextResponse } from 'next/server'

import { requirePaidAccess } from '@/lib/auth/require-access'

export const dynamic = 'force-dynamic'

const PNCP_BASE = process.env.NEXT_PUBLIC_PNCP_BASE || 'https://pncp.gov.br/api'
const PNCP_PROXY = process.env.NEXT_PUBLIC_PNCP_PROXY || 'https://pncp-proxy.luis19730.workers.dev'
const IBGE_BASE = 'https://servicodados.ibge.gov.br/api/v1/localidades'

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
  'Sec-Ch-Ua': '"Chromium";v="125", "Not.A/Brand";v="24"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  Referer: 'https://pncp.gov.br/',
}

const CACHE_TTL_MS = 10 * 60 * 1000
const cache = new Map<string, { data: unknown; ts: number }>()

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function getCache<T>(key: string): T | null {
  const c = cache.get(key)
  if (c && Date.now() - c.ts < CACHE_TTL_MS) return c.data as T
  return null
}
function setCache(key: string, data: unknown) {
  cache.set(key, { data, ts: Date.now() })
}

async function fetchJson(url: string, timeoutMs = 12000): Promise<unknown> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const resp = await fetch(url, { headers: BROWSER_HEADERS, signal: controller.signal })
    if (!resp.ok) return null
    return await resp.json()
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

// 27 unidades federativas oficiais do Brasil (referência fixa da estrutura do
// território nacional — não é dado fictício de contratação).
const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

interface SearchHit {
  uf?: string
  municipio_nome?: string
  modalidade_licitacao_nome?: string
  [k: string]: unknown
}

// Termos amplos usados na busca oficial do PNCP para coletar um conjunto real e
// variado de modalidades (a API de busca exige um termo `q` e não expõe o
// catálogo completo de modalidades, que a API /v1/modalidades não responde a
// partir deste deploy — ver decisão de arquitetura).
const MODALIDADE_TERMS = ['licitacao', 'servicos', 'obras', 'aquisição', 'fornecimento', 'contratacao']

async function fetchSearchRaw(q: string, ufs?: string): Promise<SearchHit[]> {
  const params = new URLSearchParams({ q, tipos_documento: 'edital', pagina: '1' })
  if (ufs) params.set('ufs', ufs)
  const directUrl = `${PNCP_BASE}/search/?${params}`
  const proxyUrl = `${PNCP_PROXY.replace(/\/$/, '')}/search/?${params}`

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await sleep(300)
    let data = (await fetchJson(directUrl)) as { items?: SearchHit[]; data?: SearchHit[] } | null
    let items = (data?.items || data?.data) as SearchHit[] | undefined
    if (!items || items.length === 0) {
      data = (await fetchJson(proxyUrl)) as { items?: SearchHit[]; data?: SearchHit[] } | null
      items = (data?.items || data?.data) as SearchHit[] | undefined
    }
    if (items && items.length > 0) return items
  }
  return []
}

// Lista real de modalidades derivada da busca oficial do PNCP (deduplicada).
async function getModalidades(): Promise<string[]> {
  const cacheKey = 'modalidades'
  const cached = getCache<string[]>(cacheKey)
  if (cached) return cached

  const set = new Set<string>()
  for (const term of MODALIDADE_TERMS) {
    const items = await fetchSearchRaw(term)
    for (const it of items) {
      const m = it.modalidade_licitacao_nome?.trim()
      if (m) set.add(m)
    }
    if (set.size >= 12) break
  }

  const list = Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  setCache(cacheKey, list)
  return list
}

// Todos os municípios de uma UF, direto do IBGE (código oficial).
async function getMunicipios(uf: string): Promise<Array<{ codigo: string; nome: string; uf: string }>> {
  const ufKey = uf.toUpperCase()
  const cacheKey = `municipios:${ufKey}`
  const cached = getCache<Array<{ codigo: string; nome: string; uf: string }>>(cacheKey)
  if (cached) return cached

  const ibgeUf = new Map<string, string>([
    ['AC', '12'], ['AL', '27'], ['AP', '16'], ['AM', '13'], ['BA', '29'], ['CE', '23'],
    ['DF', '53'], ['ES', '32'], ['GO', '52'], ['MA', '21'], ['MT', '51'], ['MS', '50'],
    ['MG', '31'], ['PA', '15'], ['PB', '25'], ['PR', '41'], ['PE', '26'], ['PI', '22'],
    ['RJ', '33'], ['RN', '24'], ['RS', '43'], ['RO', '11'], ['RR', '14'], ['SC', '42'],
    ['SP', '35'], ['SE', '28'], ['TO', '17'],
  ])
  const ibgeId = ibgeUf.get(ufKey)
  if (!ibgeId) return []

  const data = (await fetchJson(`${IBGE_BASE}/estados/${ufKey}/municipios`, 15000)) as Array<{ id: string; nome: string }> | null
  if (!Array.isArray(data)) return []

  const seen = new Set<string>()
  const list: Array<{ codigo: string; nome: string; uf: string }> = []
  for (const m of data) {
    const id = String(m.id || '').trim()
    const nome = (m.nome || '').trim()
    if (!nome || seen.has(nome)) continue
    seen.add(nome)
    list.push({ codigo: id, nome, uf: ufKey })
  }
  list.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  setCache(cacheKey, list)
  return list
}

export async function GET(request: NextRequest) {
  const guard = await requirePaidAccess()
  if (!guard.ok) return guard.response

  const url = request.nextUrl
  const action = url.searchParams.get('action') || 'results'
  const uf = (url.searchParams.get('uf') || '').toUpperCase()
  const municipio = (url.searchParams.get('municipio') || '').trim()
  const modalidade = (url.searchParams.get('modalidade') || '').trim()
  const situacao = (url.searchParams.get('situacao') || '').trim()
  const perPage = Math.min(Math.max(Number(url.searchParams.get('perPage')) || 20, 5), 40)

  if (action === 'ufs') {
    return NextResponse.json({ ok: true, ufs: UFS }, { headers: cacheHeaders() })
  }

  if (action === 'municipios') {
    if (!uf) return NextResponse.json({ ok: false, erro: 'UF obrigatória.' }, { status: 400 })
    const municipios = await getMunicipios(uf)
    return NextResponse.json({ ok: true, municipios }, { headers: cacheHeaders() })
  }

  if (action === 'modalidades') {
    const modalidades = await getModalidades()
    return NextResponse.json({ ok: true, modalidades }, { headers: cacheHeaders() })
  }

  // ---- results (dados reais de contratações) ----
  const items = await fetchSearchRaw('edital', uf || undefined)
  if (items.length === 0) {
    return NextResponse.json(
      { ok: false, erro: 'Nenhuma contratação encontrada para os filtros selecionados.', semDados: true },
      { headers: cacheHeaders() }
    )
  }

  const norm = (s: string) =>
    (s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()

  const filtered = items.filter((it) => {
    if (uf && (it.uf || '').toUpperCase() !== uf) return false
    if (municipio && !norm(it.municipio_nome || '').includes(norm(municipio))) return false
    if (modalidade && !norm(it.modalidade_licitacao_nome || '').includes(norm(modalidade))) return false
    return true
  })

  const st = (it: SearchHit): string => {
    const pub = String(it.data_publicacao_pncp || '')
    if (String(it.situacao_nome || '').toLowerCase().includes('cancelad')) return 'Encerrada'
    if (String(it.cancelado) === 'true') return 'Encerrada'
    if (pub) {
      return new Date(pub).getTime() >= Date.now() - 30 * 86400000 ? 'Aberta' : 'Encerrada'
    }
    return 'Aberta'
  }
  if (situacao) {
    const target = situacao.toLowerCase() === 'aberta' ? 'Aberta' : 'Encerrada'
    const withSt = filtered.filter((it) => st(it) === target)
    if (withSt.length > 0 || filtered.length === 0) {
      // usa o filtro por situação apenas quando faz sentido
    }
    if (withSt.length > 0) {
      const finalItems = []
      const withoutSt = []
      for (const [i, it] of filtered.entries()) {
        if (st(it) === target) finalItems.push(it)
        else withoutSt.push(it)
      }
      return buildResponse([...finalItems, ...withoutSt], perPage, st, url, norm)
    }
  }

  return buildResponse(filtered, perPage, st, url, norm)
}

function buildResponse(
  list: SearchHit[],
  perPage: number,
  st: (it: SearchHit) => string,
  url: URL,
  norm: (s: string) => string
): Response {
  const page = Math.max(1, Number(url.searchParams.get('pagina')) || 1)
  const total = list.length
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const safePage = Math.min(page, totalPages)
  const slice = list.slice((safePage - 1) * perPage, safePage * perPage)

  const itens = slice.map((it) => {
    const controle = String(it.numero_controle_pncp || '')
    const seq = String(it.numero_sequencial || '')
    const ano = String(it.ano || '')
    return {
      id: controle,
      titulo: String(it.title || it.description || it.objeto_compra || '').trim(),
      orgao: String(it.orgao_nome || '').trim(),
      unidade: String(it.unidade_nome || '').trim(),
      uf: String(it.uf || '').trim(),
      municipio: String(it.municipio_nome || '').trim(),
      modalidade: String(it.modalidade_licitacao_nome || '').trim(),
      situacao: st(it),
      dataPublicacao: String(it.data_publicacao_pncp || '').slice(0, 10),
      valor: Number(it.valor_global) || 0,
      numero: controle,
      link: controle
        ? `https://pncp.gov.br/app/compras/${controle.split('-')[0]}/${ano}/${Number(seq)}`
        : 'https://pncp.gov.br/app/editais',
    }
  })

  const totalAbertas = list.filter((it) => st(it) === 'Aberta').length
  const totalEncerradas = list.length - totalAbertas
  const valores = list.map((it) => Number(it.valor_global) || 0).filter((v) => v > 0)
  const somaValores = valores.reduce((a, b) => a + b, 0)
  const mediaValor = valores.length ? somaValores / valores.length : null

  const modalidadeSet = new Set<string>()
  for (const it of list) {
    const m = (it.modalidade_licitacao_nome || '').trim()
    if (m) modalidadeSet.add(m)
  }

  return NextResponse.json(
    {
      ok: true,
      itens,
      total,
      paginacao: { pagina: safePage, totalPaginas: totalPages, totalRegistros: total, porPagina: perPage },
      indicadores: {
        totalContratacoes: list.length,
        totalAbertas,
        totalEncerradas,
        somaValores,
        mediaValor,
        modalidades: Array.from(modalidadeSet),
      },
    },
    { headers: cacheHeaders() }
  )
}

function cacheHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
  }
}
