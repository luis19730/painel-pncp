import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePaidAccess } from '@/lib/auth/require-access'
import { analisarEdital, limitInput } from '@/lib/ia/analisar'
import { validatePdfBytes, extractPdfTextWithOcr } from '@/lib/ia/pdf'
import {
  insertAnalise,
  listAnalises,
  analiseMetrics,
  deleteAnalise,
  getConcluidaByPncp,
  type AnaliseOrigem,
} from '@/lib/analises/db'

// ============================================================================
// GET  /api/analise-edital  -> histórico + métricas reais do usuário
// POST /api/analise-edital  -> analisa (PDF / texto / link PNCP) e salva
// DELETE /api/analise-edital?id=  -> remove uma análise do histórico
//
// Nunca inventa dados: a análise vem do motor de IA real (/api/ia/analisar,
// via analisarEdital) e os metadados de link PNCP vêm da API oficial.
// ============================================================================

const PNCP_BASE = process.env.NEXT_PUBLIC_PNCP_BASE || 'https://pncp.gov.br/api'

// ---------------------------------------------------------------------------
// Metadados reais a partir de um link/id do PNCP
// ---------------------------------------------------------------------------

function parsePncpRef(input: string): { cnpj: string; ano: string; seq: string } | null {
  const t = String(input || '').trim()

  // Link: https://pncp.gov.br/app/compras/<cnpj>/<ano>/<seq>
  const link = t.match(/\/compras\/(\d{14})\/(\d{4})\/(\d+)/)
  if (link) return { cnpj: link[1], ano: link[2], seq: link[3] }

  // id: CNPJ-1-SEQ/ANO
  const id = t.match(/^(\d{14})-1-(\d+)\/(\d{4})$/)
  if (id) return { cnpj: id[1], ano: id[3], seq: id[2] }

  return null
}

export interface PncpEditalMeta {
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
}

async function fetchPncpMeta(ref: string): Promise<PncpEditalMeta | null> {
  const parsed = parsePncpRef(ref)
  if (!parsed) return null

  const { cnpj, ano, seq } = parsed
  const url = `${PNCP_BASE}/consulta/v1/orgaos/${cnpj}/compras/${ano}/${Number(seq)}`

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      next: { revalidate: 120 },
    })
    clearTimeout(timer)
    if (!resp.ok) return null
    const d = await resp.json()
    if (!d || !d.numeroControlePNCP) return null

    const orgao = d.orgaoEntidade
    const unidade = d.unidadeOrgao
    return {
      objeto: d.objetoCompra || null,
      orgao: orgao?.razaoSocial || null,
      unidade: unidade?.nomeUnidade || null,
      modalidade: d.modalidadeNome || null,
      cnpj: orgao?.cnpj || cnpj,
      numero: d.numeroCompra || d.numeroControlePNCP || null,
      uf: unidade?.ufSigla || null,
      municipio: unidade?.municipioNome || null,
      valor: Number(d.valorTotalEstimado ?? d.valorTotalHomologado ?? 0) || null,
      data_publicacao: d.dataPublicacaoPncp || null,
      data_encerramento: d.dataEncerramentoProposta || null,
      link_edital: `https://pncp.gov.br/app/compras/${cnpj}/${ano}/${Number(seq)}`,
    }
  } catch {
    return null
  }
}

/** Monta o texto que o modelo vai ler a partir dos metadados reais do PNCP. */
function montarConteudoPncp(m: PncpEditalMeta): string {
  const linhas = [
    'Esta é uma análise com base nas informações oficiais disponíveis no PNCP para esta licitação (o',
    'documento integral do edital exige login gov.br no portal e não está acessível automaticamente).',
    'Analise as informações abaixo e, para tudo que não estiver presente, diga "não informado".',
    '',
    `Objeto: ${m.objeto || 'não informado'}`,
    `Órgão: ${m.orgao || 'não informado'}`,
    `Unidade: ${m.unidade || 'não informado'}`,
    `Modalidade: ${m.modalidade || 'não informado'}`,
    `CNPJ: ${m.cnpj || 'não informado'}`,
    `Número: ${m.numero || 'não informado'}`,
    `UF: ${m.uf || 'não informado'}`,
    `Município: ${m.municipio || 'não informado'}`,
    `Valor: ${m.valor != null ? m.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'não informado'}`,
    `Data de publicação: ${m.data_publicacao || 'não informado'}`,
    `Encerramento da proposta: ${m.data_encerramento || 'não informado'}`,
  ]
  return linhas.join('\n')
}

// ---------------------------------------------------------------------------
// GET — histórico + métricas
// ---------------------------------------------------------------------------

export async function GET() {
  const guard = await requirePaidAccess()
  if (!guard.ok) return guard.response
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, erro: 'Não autenticado.' }, { status: 401 })
  }

  try {
    const [historico, metricas] = await Promise.all([
      listAnalises(supabase, user.id, 30),
      analiseMetrics(supabase, user.id),
    ])
    return NextResponse.json({ ok: true, historico, metricas })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `Erro ao carregar histórico: ${(e as Error)?.message || 'desconhecido'}` },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST — analisar e persistir
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  const guard = await requirePaidAccess()
  if (!guard.ok) return guard.response

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, erro: 'Não autenticado.' }, { status: 401 })
  }

  const contentType = req.headers.get('content-type') || ''
  let texto: string | null = null
  let link: string | null = null
  let pncpId: string | null = null
  let origem: AnaliseOrigem = 'texto'
  let nomeArquivo: string | null = null
  const conteudoChars: number | null = null

  const inicio_em = new Date().toISOString()
  const inicio = Date.now()

  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      const linkCampo = String(form.get('link') || '').trim() || null
      const textoCampo = String(form.get('texto') || '').trim() || null
      const arquivo = form.get('arquivo')

      if (linkCampo && parsePncpRef(linkCampo)) {
        link = linkCampo
      }
      if (textoCampo) {
        texto = textoCampo
        origem = 'texto'
      }
      if (arquivo && typeof arquivo === 'object' && 'arrayBuffer' in arquivo) {
        const file = arquivo as File
        const name = (file.name || '').toLowerCase()
        if (!name.endsWith('.pdf')) {
          return NextResponse.json(
            { ok: false, error: 'Envie um arquivo no formato .pdf ou cole o texto do edital.' },
            { status: 400 }
          )
        }
        const err = validatePdfBytes(file.size)
        if (err) {
          return NextResponse.json({ ok: false, error: err }, { status: 400 })
        }
        const bytes = new Uint8Array(await file.arrayBuffer())
        const extraido = await extractPdfTextWithOcr(bytes, file.name)
        if (!extraido.ok) {
          return NextResponse.json({ ok: false, error: extraido.error }, { status: 422 })
        }
        texto = extraido.text || ''
        origem = 'pdf'
        nomeArquivo = file.name
      }
    } else {
      const raw: unknown = await req.json().catch(() => null)
      const body = (raw || {}) as Record<string, unknown>
      texto = String(body?.texto || '').trim() || null
      const linkBody = String(body?.link || '').trim() || null
      if (linkBody && parsePncpRef(linkBody)) link = linkBody
    }

    // Identificador único da contratação/edital do PNCP (CNPJ-1-SEQ/ANO).
    const parsedRef = link ? parsePncpRef(link) : null
    if (parsedRef) {
      pncpId = `${parsedRef.cnpj}-1-${parsedRef.seq}/${parsedRef.ano}`
    }

    // Nenhuma fonte local -> tenta metadados via link PNCP.
    let meta: PncpEditalMeta | null = null
    if (link) {
      meta = await fetchPncpMeta(link)
    }

    // Conteúdo final a analisar.
    let alvo = texto
    if (!alvo && meta) {
      alvo = montarConteudoPncp(meta)
      origem = 'pncp'
    }

    if (!alvo) {
      return NextResponse.json(
        { ok: false, error: 'Nenhum conteúdo para analisar. Envie um PDF, cole o texto ou informe um link do PNCP.' },
        { status: 400 }
      )
    }

    if (texto && texto.length > 40_000) {
      return NextResponse.json(
        { ok: false, error: 'Texto muito longo. O limite é de 40 mil caracteres.' },
        { status: 400 }
      )
    }

    // EVITA DUPLICIDADE: o mesmo edital PNCP já concluído não é reprocessado.
    // Reutilizamos o resultado salvo e NÃO incrementamos o contador.
    if (pncpId) {
      const existente = await getConcluidaByPncp(supabase, user.id, pncpId)
      if (existente) {
        const [historico, metricas] = await Promise.all([
          listAnalises(supabase, user.id, 30),
          analiseMetrics(supabase, user.id),
        ])
        return NextResponse.json({
          ok: true,
          reutilizado: true,
          markdown: existente.markdown || '',
          modelo: existente.modelo || undefined,
          origem: existente.origem,
          nomeArquivo: existente.nome_arquivo,
          tempo_ms: existente.tempo_ms || 0,
          analiseId: existente.id,
          meta: {
            objeto: existente.objeto,
            orgao: existente.orgao,
            unidade: existente.unidade,
            modalidade: existente.modalidade,
            cnpj: existente.cnpj,
            numero: existente.numero,
            uf: existente.uf,
            municipio: existente.municipio,
            valor: existente.valor,
            data_publicacao: existente.data_publicacao,
            data_encerramento: existente.data_encerramento,
            link_edital: existente.link_edital,
          },
          historico,
          metricas,
        })
      }
    }

    const r = await analisarEdital(limitInput(alvo))
    const conclusao_em = new Date().toISOString()
    const tempoMs = Date.now() - inicio

    if (!r.ok) {
      await insertAnalise(supabase, user.id, {
        pncp_id: pncpId,
        origem,
        nome_arquivo: nomeArquivo,
        conteudo_chars: conteudoChars ?? alvo.length,
        status: 'erro',
        erro: r.error?.slice(0, 400) || 'Falha na análise',
        inicio_em,
        conclusao_em,
        tempo_ms: tempoMs,
        ...(meta ? { objeto: meta.objeto, orgao: meta.orgao, modalidade: meta.modalidade, cnpj: meta.cnpj, numero: meta.numero, uf: meta.uf, municipio: meta.municipio, valor: meta.valor, data_publicacao: meta.data_publicacao, data_encerramento: meta.data_encerramento, link_edital: meta.link_edital } : {}),
      }).catch(() => null)
      return NextResponse.json({ ok: false, error: r.error, meta }, { status: 502 })
    }

    const salvo = await insertAnalise(supabase, user.id, {
      pncp_id: pncpId,
      ...(meta
        ? { objeto: meta.objeto, orgao: meta.orgao, unidade: meta.unidade, modalidade: meta.modalidade, cnpj: meta.cnpj, numero: meta.numero, uf: meta.uf, municipio: meta.municipio, valor: meta.valor, data_publicacao: meta.data_publicacao, data_encerramento: meta.data_encerramento, link_edital: meta.link_edital }
        : {}),
      origem,
      nome_arquivo: nomeArquivo,
      conteudo_chars: conteudoChars ?? alvo.length,
      status: 'concluida',
      modelo: r.modelo || null,
      inicio_em,
      conclusao_em,
      tempo_ms: tempoMs,
      markdown: r.markdown || '',
    }).catch(() => null)

    const [historico, metricas] = await Promise.all([
      listAnalises(supabase, user.id, 30),
      analiseMetrics(supabase, user.id),
    ])

    return NextResponse.json({
      ok: true,
      reutilizado: false,
      markdown: r.markdown,
      modelo: r.modelo,
      origem,
      nomeArquivo,
      tempo_ms: tempoMs,
      meta,
      analiseId: salvo?.id || null,
      historico,
      metricas,
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `Erro inesperado: ${(e as Error)?.message || 'desconhecido'}` },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// DELETE — remove uma análise do histórico
// ---------------------------------------------------------------------------

export async function DELETE(req: Request) {
  const guard = await requirePaidAccess()
  if (!guard.ok) return guard.response
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, erro: 'Não autenticado.' }, { status: 401 })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ ok: false, error: 'Informe o id da análise.' }, { status: 400 })
  }

  try {
    await deleteAnalise(supabase, user.id, id)
    const [historico, metricas] = await Promise.all([
      listAnalises(supabase, user.id, 30),
      analiseMetrics(supabase, user.id),
    ])
    return NextResponse.json({ ok: true, historico, metricas })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `Erro ao remover análise: ${(e as Error)?.message || 'desconhecido'}` },
      { status: 500 }
    )
  }
}
