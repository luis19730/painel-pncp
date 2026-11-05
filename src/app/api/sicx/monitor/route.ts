import { NextResponse } from 'next/server'
import { contextoUsuario, resposta401, respostaErro } from '@/lib/estacao/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cnpjDigitos, formatarCnpj } from '@/lib/sicx/validacao'

export const dynamic = 'force-dynamic'

/**
 * GET /api/sicx/monitor?cnpj=00000000000000
 *
 * Monitor público de CNPJ: mostra o histórico de participações e vitórias já
 * extraído do PNCP para a base interna (`fornecedores` / `fornecedor_participacoes`).
 * Exige login (dado de negócio), mas não expõe nada além de dado público.
 * As tabelas têm RLS sem policy: só o service role lê.
 */
export async function GET(req: Request) {
  const { user } = await contextoUsuario()
  if (!user) return resposta401()

  const cnpj = cnpjDigitos(new URL(req.url).searchParams.get('cnpj'))
  if (cnpj.length !== 14) return respostaErro('Informe um CNPJ com 14 dígitos.')

  const admin = createAdminClient()
  if (!admin) return respostaErro('Consulta indisponível neste ambiente.', 503)

  const { data: fornecedor, error } = await admin
    .from('fornecedores')
    .select('cnpj, razao_social, porte, natureza_juridica, participacoes, vitorias, valor_total_homologado, primeira_participacao, ultima_participacao')
    .eq('cnpj', cnpj)
    .maybeSingle()

  if (error) return respostaErro('Não foi possível consultar a base de fornecedores.', 500)

  if (!fornecedor) {
    return NextResponse.json({
      ok: true,
      cnpj,
      cnpj_formatado: formatarCnpj(cnpj),
      encontrado: false,
      fornecedor: null,
      participacoes: [],
      aviso: 'CNPJ ainda não está na base interna do Painel. A base é alimentada a partir dos resultados publicados no PNCP.',
    })
  }

  const { data: participacoes } = await admin
    .from('fornecedor_participacoes')
    .select('pncp_id, numero_item, orgao_nome, uf, municipio, situacao, valor_total_homologado, data_resultado')
    .eq('cnpj', cnpj)
    .order('data_resultado', { ascending: false })
    .limit(50)

  return NextResponse.json({
    ok: true,
    cnpj,
    cnpj_formatado: formatarCnpj(cnpj),
    encontrado: true,
    fornecedor,
    participacoes: participacoes || [],
    aviso: 'Dados públicos extraídos do PNCP. Não representa garantia de contratação nem avaliação de idoneidade.',
  })
}
