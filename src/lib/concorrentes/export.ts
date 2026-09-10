// ============================================================================
// Exportação para o módulo de Concorrentes.
// Exporta EXATAMENTE os dados reais encontrados (nunca inventa valores) em
// CSV, Excel e um relatório textual resumido.
// ============================================================================

import type { RegistroPNCP, FornecedorPerfil, ResultadoConsulta } from './types'

export function baixarBlob(nome: string, conteudo: string, tipo = 'text/csv;charset=utf-8;') {
  const blob = new Blob(['\uFEFF' + conteudo], { type: tipo })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function csvEscape(v: unknown): string {
  if (v == null) return ''
  const s = String(v)
  return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

export function exportarCSV(nome: string, cabecalhos: string[], linhas: unknown[][]) {
  const linhasCsv = [cabecalhos, ...linhas].map((l) => l.map(csvEscape).join(';')).join('\r\n')
  baixarBlob(nome.endsWith('.csv') ? nome : nome + '.csv', linhasCsv)
}

export function exportarRegistrosCSV(registros: RegistroPNCP[]) {
  const cab = ['Fonte', 'Número de controle', 'Número', 'Objeto', 'Órgão', 'CNPJ órgão', 'UF', 'Município', 'Modalidade', 'Fornecedor', 'CNPJ fornecedor', 'Valor', 'Data publicação', 'Situação', 'Link']
  const linhas = registros.map((r) => [
    r.fonte, r.id, r.numero, r.objeto, r.orgao, r.orgaoCnpj, r.uf, r.municipio,
    r.modalidade, r.fornecedor || '', r.fornecedorCnpj || '', r.valor ?? '', r.dataPublicacao, r.situacao, r.link,
  ])
  exportarCSV('concorrentes-registros.csv', cab, linhas)
}

export function exportarExcelRegistros(registros: RegistroPNCP[]) {
  const cab = ['Fonte', 'Número de controle', 'Número', 'Objeto', 'Órgão', 'CNPJ órgão', 'UF', 'Município', 'Modalidade', 'Fornecedor', 'CNPJ fornecedor', 'Valor', 'Data publicação', 'Situação', 'Link']
  const linhas = registros.map((r) => [
    r.fonte, r.id, r.numero, r.objeto, r.orgao, r.orgaoCnpj, r.uf, r.municipio,
    r.modalidade, r.fornecedor || '', r.fornecedorCnpj || '', r.valor ?? '', r.dataPublicacao, r.situacao, r.link,
  ])
  exportarCSV('concorrentes-registros.xlsx.csv', cab, linhas)
}

export function exportarRelatorioFornecedor(
  perfil: FornecedorPerfil,
  consulta: ResultadoConsulta,
  registros: RegistroPNCP[]
) {
  const linhas: string[] = []
  linhas.push('RELATÓRIO DE CONCORRENTE')
  linhas.push('='.repeat(50))
  linhas.push(`Fornecedor: ${perfil.razaoSocial}`)
  linhas.push(`CNPJ: ${perfil.cnpj}`)
  linhas.push('')
  linhas.push(`Período analisado: ${consulta.periodo.inicio} a ${consulta.periodo.fim}`)
  linhas.push(`Filtros aplicados: ${consulta.filtros ? JSON.stringify(consulta.filtros) : '—'}`)
  linhas.push(`Registros analisados: ${perfil.registros}`)
  linhas.push('')
  linhas.push('DESEMPENHO (dados encontrados na consulta)')
  linhas.push('-'.repeat(50))
  linhas.push(`Participações identificadas: ${perfil.registros}`)
  linhas.push(`Vitórias identificadas (contratos): ${perfil.vitorias}`)
  linhas.push(`Valor total identificado: R$ ${perfil.valorTotal.toFixed(2)}`)
  linhas.push(`Ticket médio: R$ ${perfil.ticketMedio.toFixed(2)}`)
  linhas.push(`Órgãos distintos: ${perfil.orgaos}`)
  linhas.push(`Municípios distintos: ${perfil.municipios}`)
  linhas.push(`UFs distintas: ${perfil.ufs}`)
  linhas.push(`Itens/objetos distintos: ${perfil.itens}`)
  linhas.push('')
  linhas.push('POR MODALIDADE')
  for (const [m, v] of Object.entries(perfil.porModalidade)) {
    linhas.push(`${m}: ${v.registros} participação(ões) · R$ ${v.valor.toFixed(2)}`)
  }
  linhas.push('')
  linhas.push('POR ANO')
  for (const [a, v] of Object.entries(perfil.porAno).sort((a, b) => b[0].localeCompare(a[0]))) {
    linhas.push(`${a}: ${v.registros} registro(s) · R$ ${v.valor.toFixed(2)}`)
  }
  linhas.push('')
  linhas.push('HISTÓRICO (linha do tempo)')
  for (const r of registros) {
    linhas.push(`${r.dataPublicacao || '—'} | ${r.orgao} | ${r.municipio}-${r.uf} | R$ ${r.valor ?? 0} | ${r.objeto.slice(0, 120)}`)
  }
  linhas.push('')
  linhas.push('FONTE DOS DADOS')
  linhas.push(`Dados obtidos do Portal Nacional de Contratações Públicas (PNCP) em ${consulta.consultadoEm}.`)
  linhas.push('Os dados refletem os registros disponibilizados pelo PNCP no momento da consulta.')
  linhas.push('Responsabilidade pela correção dos dados: órgãos e entidades que os publicam.')
  baixarBlob(`relatorio-concorrente-${perfil.razaoSocial.replace(/\W+/g, '_')}.txt`, linhas.join('\n'), 'text/plain;charset=utf-8;')
}
