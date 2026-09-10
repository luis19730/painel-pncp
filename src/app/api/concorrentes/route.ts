import { NextRequest, NextResponse } from 'next/server'

import { requirePaidAccess } from '@/lib/auth/require-access'
import {
  buscarContratos,
  buscarContratacoes,
  cachable,
  fmtData,
} from '@/lib/concorrentes/service'
import type { ResultadoConsulta, RegistroPNCP } from '@/lib/concorrentes/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Número máximo de páginas de contratos agregadas para formar a base de análise
// (cada página pode ter até 500 registros). Limitar evita estourar o limite de
// requisições do PNCP; ainda assim é suficiente para um volume real relevante.
const MAX_PAGINAS_CONTRATOS = 5

const DIAS_PREDEF = { 30: 30, 90: 90, 180: 180, 365: 365, 730: 730 } as const

function cmpCnpj(a: string | null, b: string): boolean {
  if (!a) return false
  return a.replace(/\D/g, '') === b.replace(/\D/g, '')
}

export async function GET(request: NextRequest) {
  const guard = await requirePaidAccess()
  if (!guard.ok) return guard.response

  const sp = request.nextUrl.searchParams
  const modo = sp.get('modo') === 'contratacoes' ? 'contratacoes' : 'contratos'
  const uf = (sp.get('uf') || '').toUpperCase()
  const municipio = sp.get('municipio') || ''
  const orgao = sp.get('orgao') || '' // nome do órgão (filtro pós-normalização)
  const fornecedor = sp.get('fornecedor') || '' // nome ou CNPJ do fornecedor
  const modalidade = sp.get('modalidade') || '' // codigo (para contratacoes) ou nome
  const pagina = Math.max(1, parseInt(sp.get('pagina') || '1', 10) || 1)
  const diasParam = parseInt(sp.get('dias') || '90', 10)

  // janela de datas
  let fim = new Date()
  let inicio: Date
  if (DIAS_PREDEF[diasParam as keyof typeof DIAS_PREDEF]) {
    inicio = new Date(Date.now() - diasParam * 86400000)
  } else {
    const di = sp.get('inicio')
    const df = sp.get('fim')
    inicio = di ? new Date(di) : new Date(Date.now() - 90 * 86400000)
    if (df && !isNaN(new Date(df).getTime())) fim = new Date(df)
  }
  const fimStr = fmtData(fim)
  const inicioStr = fmtData(inicio)
  if (isNaN(new Date(inicioStr).getTime())) {
    return NextResponse.json({ error: true, message: 'Período inválido' }, { status: 400 })
  }

  const filtros = { modo, uf, municipio, orgao, fornecedor, modalidade, inicio: inicioStr, fim: fimStr }

  let registros: RegistroPNCP[] = []
  let totalDisponivel = 0
  let paginasRestantes = 0
  let totalPaginas = 1
  const parcial = false
  let mensagem: string | null = null

  try {
    const key = `cons|${modo}|${inicioStr}|${fimStr}|${uf}|${municipio}|${modalidade}`

    if (modo === 'contratos') {
      // Contratos: único modo com fornecedor real. Agrega algumas páginas p/ análise.
      const dados = await cachable(key, async () => {
        let acumulado: RegistroPNCP[] = []
        let total = 0
        let restantes = 0
        let tPag = 1
        for (let p = 1; p <= MAX_PAGINAS_CONTRATOS; p++) {
          const r = await buscarContratos({ inicio: inicioStr, fim: fimStr, pagina: p, tamanho: 500 })
          if (!r) break
          acumulado = acumulado.concat(r.registros)
          total = r.total
          restantes = r.paginasRestantes
          tPag = r.totalPaginas
          if (acumulado.length > 0 && p >= 1) {
            // se já temos uma janela ampla, podemos parar cedo mas continuamos até o teto
          }
          if (p === MAX_PAGINAS_CONTRATOS) break
          if (r.paginasRestantes <= 0) break
        }
        return { registros: acumulado, total, paginasRestantes: restantes, totalPaginas: tPag }
      })
      registros = dados.registros
      totalDisponivel = dados.total
      paginasRestantes = dados.paginasRestantes
      totalPaginas = dados.totalPaginas
    } else {
      // Contratações: exige código de modalidade na API.
      const cod = parseInt(modalidade, 10)
      if (!cod) {
        return NextResponse.json(
          { error: true, message: 'Informe a modalidade para consultar contratações.' },
          { status: 400 }
        )
      }
      const r = await cachable(key, () =>
        buscarContratacoes({
          inicio: inicioStr,
          fim: fimStr,
          codigoModalidade: cod,
          uf: uf || undefined,
          codigoMunicipioIbge: sp.get('codigoIbge') || undefined,
          pagina,
          tamanho: 50,
        })
      )
      if (r) {
        registros = r.registros
        totalDisponivel = r.total
        paginasRestantes = r.paginasRestantes
        totalPaginas = r.totalPaginas
      }
    }

    // Filtros locais (órgão por nome, fornecedor por nome/CNPJ) sobre dados reais.
    let filtrados = registros
    if (uf) filtrados = filtrados.filter((r) => r.uf === uf)
    if (municipio) filtrados = filtrados.filter((r) => r.municipio.toLowerCase().includes(municipio.toLowerCase()))
    if (orgao) filtrados = filtrados.filter((r) => r.orgao.toLowerCase().includes(orgao.toLowerCase()))
    if (fornecedor) {
      const f = fornecedor.toLowerCase()
      filtrados = filtrados.filter(
        (r) =>
          (r.fornecedor && r.fornecedor.toLowerCase().includes(f)) ||
          (r.fornecedorCnpj && cmpCnpj(r.fornecedorCnpj, f))
      )
    }

    if (modo === 'contratos' && (fornecedor || orgao) && filtrados.length === 0 && registros.length > 0) {
      mensagem = 'Nenhum registro do fornecedor/órgão nos contratos consultados no período.'
    }
  } catch (e) {
    return NextResponse.json(
      { error: true, message: 'Não foi possível consultar os dados do PNCP neste momento.' },
      { status: 502 }
    )
  }

  const res: ResultadoConsulta = {
    fonte: registros.length > 0 ? 'live' : 'erro',
    consultadoEm: new Date().toISOString(),
    periodo: { inicio: inicioStr, fim: fimStr },
    filtros,
    registros,
    registrosAnalisados: registros.length,
    totalDisponivel,
    paginasRestantes,
    pagina,
    totalPaginas,
    parcial,
    mensagem,
  }

  return NextResponse.json(res, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
