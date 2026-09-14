// ============================================================================
// Exportação CSV (client-side) para o painel de conversão.
//
// Separador `;` (padrão pt-BR / Excel) e BOM UTF-8 para acentuação correta.
// Nunca exporta senhas ou segredos — apenas os campos recebidos explicitamente.
// ============================================================================

export function csvEscape(valor: unknown): string {
  const s = valor == null ? '' : String(valor)
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function paraCsv(cabecalhos: string[], linhas: Array<Array<string | number | null | undefined>>): string {
  const head = cabecalhos.map(csvEscape).join(';')
  const body = linhas.map((l) => l.map(csvEscape).join(';')).join('\r\n')
  return `\uFEFF${head}\r\n${body}`
}

/** Dispara o download de um CSV no navegador. */
export function baixarCsv(
  nomeArquivo: string,
  cabecalhos: string[],
  linhas: Array<Array<string | number | null | undefined>>
): void {
  if (typeof window === 'undefined') return
  const csv = paraCsv(cabecalhos, linhas)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo.endsWith('.csv') ? nomeArquivo : `${nomeArquivo}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
