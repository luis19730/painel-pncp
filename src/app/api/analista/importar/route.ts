import { NextResponse } from 'next/server'
import { contextoUsuario, resposta401, respostaErro } from '@/lib/estacao/server'
import { buildPncpEditalUrl, getOpportunityById } from '@/lib/pncp'
import { novoItem } from '@/lib/analista/config'

export const dynamic = 'force-dynamic'

const PNCP_BASE = 'https://pncp.gov.br/api'
const PNCP_PROXY = 'https://pncp-proxy.luis19730.workers.dev'

async function fetchJson(path: string): Promise<unknown | null> {
  // Mesma estratégia do restante do app: PNCP direto e, se o WAF bloquear,
  // o proxy oficial do projeto.
  for (const [base, timeout] of [
    [PNCP_BASE, 14000],
    [PNCP_PROXY, 22000],
  ] as Array<[string, number]>) {
    try {
      const resp = await fetch(`${base}${path}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 PainelPNCP/1.0',
          Accept: 'application/json',
          'Accept-Language': 'pt-BR,pt;q=0.9',
          ...(base === PNCP_BASE ? { Referer: 'https://pncp.gov.br/' } : {}),
        },
        signal: AbortSignal.timeout(timeout),
      })
      if (!resp.ok) continue
      return await resp.json()
    } catch {
      /* tenta a próxima fonte */
    }
  }
  return null
}

function n(v: unknown): number {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

/**
 * GET /api/analista/importar?pncp=<numero_controle>
 * Busca os dados do edital no PNCP (órgão, objeto, datas, itens e valores)
 * para preencher a calculadora. Nunca grava nada.
 */
export async function GET(req: Request) {
  const { user } = await contextoUsuario()
  if (!user) return resposta401()

  const url = new URL(req.url)
  const numero = (url.searchParams.get('pncp') || '').trim()
  if (!numero) return respostaErro('Informe o número de controle PNCP.')

  const item = await getOpportunityById(numero)
  if (!item) {
    return respostaErro('Edital não encontrado no PNCP. Confira o número de controle e tente novamente.', 404)
  }

  // Itens da contratação (endpoint de itens do PNCP).
  let itensPncp: Record<string, unknown>[] = []
  const match = numero.match(/^(\d{14})-(\d+)-(\d+)\/(\d{4})$/)
  if (match) {
    const [, cnpj, , seq, ano] = match
    const data = await fetchJson(`/pncp/v1/orgaos/${cnpj}/compras/${ano}/${Number(seq)}/itens?pagina=1&tamanho=100`)
    const lista = Array.isArray(data)
      ? data
      : Array.isArray((data as { data?: unknown })?.data)
        ? ((data as { data: unknown[] }).data)
        : []
    itensPncp = lista as Record<string, unknown>[]
  }

  const itens = itensPncp
    .map((it) => {
      const base = novoItem()
      const descricao = String(it.descricao || '').trim()
      if (!descricao) return null
      return {
        ...base,
        descricao: descricao.slice(0, 500),
        unidade: String(it.unidadeMedida || 'UN').trim().slice(0, 20) || 'UN',
        quantidade: n(it.quantidade),
        valorReferencia: n(it.valorUnitarioEstimado),
        custoUnitario: 0,
      }
    })
    .filter((it): it is NonNullable<typeof it> => it !== null)

  const somaItens = itens.reduce((s, it) => s + n(it.quantidade) * n(it.valorReferencia), 0)
  const valorReferencia = somaItens > 0 ? somaItens : n(item.valor_global)

  const edital = {
    numero: item.numero_controle_pncp || numero,
    orgao: item.orgao_nome || '',
    uf: item.uf || '',
    municipio: item.municipio_nome || '',
    modalidade: item.modalidade_licitacao_nome || '',
    objeto: item.objeto_compra || item.description || '',
    valorReferencia,
    dataSessao: item.data_fim_vigencia || '',
    prazoProposta: item.data_fim_vigencia || '',
    prazoEntrega: '',
    link: buildPncpEditalUrl({ id: item.numero_controle_pncp || numero }),
  }

  return NextResponse.json({
    ok: true,
    edital,
    itens: itens.length ? itens : [novoItem()],
    aviso:
      itens.length === 0
        ? 'Os itens não puderam ser carregados do PNCP agora. Preencha os itens manualmente.'
        : null,
  })
}
