// ============================================================================
// Unidades da Federação (26 estados + DF) — lista fixa usada como FONTE do
// filtro e da grade de UF, para que TODAS as 27 UFs apareçam sempre, mesmo
// com zero registros.
// ============================================================================

export interface Uf {
  sigla: string
  nome: string
}

/** As 27 UFs em ordem alfabética pela sigla. */
export const UFS: Uf[] = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' },
]

const SIGLAS = new Set(UFS.map((u) => u.sigla))

/** Remove acentos para casar nomes por extenso ("sao paulo" -> "sao paulo"). */
function semAcentos(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

const NOME_PARA_SIGLA: Record<string, string> = UFS.reduce(
  (mapa, uf) => {
    mapa[semAcentos(uf.nome)] = uf.sigla
    return mapa
  },
  {} as Record<string, string>
)

/**
 * Normaliza um valor de UF para a sigla canônica (2 letras, maiúscula).
 * - "sp", " SP " → "SP"
 * - "São Paulo", "SAO PAULO" → "SP"
 * - valor inválido/nulo → null
 */
export function normalizarUf(valor: string | null | undefined): string | null {
  if (!valor) return null
  const limpo = valor.trim().toUpperCase()
  if (!limpo) return null
  if (SIGLAS.has(limpo)) return limpo
  const porNome = NOME_PARA_SIGLA[semAcentos(limpo)]
  if (porNome) return porNome
  return null
}

/** Nome por extenso de uma sigla (para tooltip / acessibilidade). */
export function nomeUf(sigla: string | null | undefined): string {
  if (!sigla) return ''
  const uf = UFS.find((u) => u.sigla === sigla)
  return uf ? uf.nome : sigla
}
