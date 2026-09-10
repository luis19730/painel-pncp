'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Search, Users, Building2, MapPin, Filter, X, AlertCircle, Download,
  ExternalLink, Package, Layers, Trophy, ChevronRight, Calendar, ShieldCheck,
  TrendingUp, Tag, FileSpreadsheet, Info, Zap,
} from 'lucide-react'
import PageHeader from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'
import EmptyState from '@/components/ui/empty-state'
import StatCard from '@/components/ui/stat-card'
import { cn, formatCurrency, formatDateTime, formatDate, normalizar } from '@/lib/utils'
import { buildPncpEditalUrl } from '@/lib/pncp'
import { MODALIDADES_PNCP } from '@/lib/concorrentes/modalidades'
import {
  montarPerfilFornecedor, rankingFornecedores, analisarPrecoRegistros, concorrentesPorItem,
  type FornecedorAgregado,
} from '@/lib/concorrentes/analise'
import { exportarRegistrosCSV, exportarExcelRegistros, exportarRelatorioFornecedor } from '@/lib/concorrentes/export'
import type { RegistroPNCP, ResultadoConsulta, FornecedorPerfil } from '@/lib/concorrentes/types'

const UF_LIST = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

const PERIODOS = [
  { label: 'Últimos 30 dias', dias: 30 },
  { label: 'Últimos 90 dias', dias: 90 },
  { label: 'Últimos 6 meses', dias: 180 },
  { label: 'Último ano', dias: 365 },
  { label: 'Últimos 2 anos', dias: 730 },
]

interface Filtros {
  fornecedor: string
  keyword: string
  orgao: string
  uf: string
  municipio: string
  modalidade: string // codigo da modalidade (contratações) ou nome
  dias: number
  situacao: string
  tipo: string // material | servico | ambos | ''
}

const FILTROS_INI: Filtros = {
  fornecedor: '',
  keyword: '',
  orgao: '',
  uf: '',
  municipio: '',
  modalidade: '',
  dias: 90,
  situacao: '',
  tipo: '',
}

function fmtCnpj(c: string | null): string {
  if (!c) return '—'
  const d = c.replace(/\D/g, '')
  if (d.length !== 14) return c
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12,14)}`
}

function pncpId(r: RegistroPNCP): string {
  return r.id
}

export default function ConcorrentesPage() {
  const [draft, setDraft] = useState<Filtros>(FILTROS_INI)
  const [applied, setApplied] = useState<Filtros>(FILTROS_INI)
  const [modo, setModo] = useState<'contratos' | 'contratacoes'>('contratos')

  const [carregando, setCarregando] = useState(false)
  const [dados, setDados] = useState<ResultadoConsulta | null>(null)
  const [erro, setErro] = useState(false)
  const [consultaId, setConsultaId] = useState(0)

  const [selecionado, setSelecionado] = useState<string | null>(null) // cnpj fornecedor
  const [termoBusca, setTermoBusca] = useState<string | null>(null) // item pesquisado (concorrentes por item)

  const consultar = useCallback(async () => {
    setCarregando(true)
    setErro(false)
    setDados(null)
    setSelecionado(null)
    try {
      const params = new URLSearchParams({
        modo,
        dias: String(applied.dias),
      })
      if (applied.uf) params.set('uf', applied.uf)
      if (applied.municipio) params.set('municipio', applied.municipio)
      if (applied.orgao) params.set('orgao', applied.orgao)
      if (applied.fornecedor) params.set('fornecedor', applied.fornecedor)
      if (applied.modalidade) {
        if (modo === 'contratacoes') params.set('modalidade', applied.modalidade)
        else params.set('modalidade', applied.modalidade)
      }
      const res = await fetch(`/api/concorrentes?${params.toString()}`)
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setErro(true)
        setDados(body?.message ? ({ mensagem: body.message } as ResultadoConsulta) : null)
        return
      }
      const json = (await res.json()) as ResultadoConsulta
      setDados(json)
    } catch {
      setErro(true)
    } finally {
      setCarregando(false)
    }
  }, [applied, modo])

  useEffect(() => {
    if (consultaId > 0) consultar()
  }, [consultaId, consultar])

  const iniciarConsulta = () => {
    setApplied({ ...draft })
    setConsultaId((c) => c + 1)
  }

  // Registros prontos para exibição (sempre reais vindos da API).
  const registros = useMemo<RegistroPNCP[]>(() => dados?.registros || [], [dados])

  // Aplicar filtros locais que a API faz parcialmente + keyword em objeto.
  const filtrados = useMemo(() => {
    let list = registros
    const kw = normalizar(applied.keyword)
    if (kw) list = list.filter((r) => normalizar(r.objeto).includes(kw) || normalizar(r.orgao).includes(kw) || normalizar(r.fornecedor || '').includes(kw))
    return list
  }, [registros, applied.keyword])

  const ranking = useMemo(() => rankingFornecedores(filtrados), [filtrados])

  // indicadores (reais)
  const fornecedoresCount = ranking.length
  const itensCount = useMemo(() => new Set(filtrados.map((r) => r.objeto.slice(0, 200))).size, [filtrados])
  const valorIdentificado = useMemo(() => filtrados.reduce((a, r) => a + (r.valor || 0), 0), [filtrados])
  const orgaosCount = useMemo(() => new Set(filtrados.map((r) => r.orgao)).size, [filtrados])
  const ufsCount = useMemo(() => new Set(filtrados.filter((r) => r.uf).map((r) => r.uf)).size, [filtrados])

  const perfil = useMemo<FornecedorPerfil | null>(() => (selecionado && dados ? montarPerfilFornecedor(filtrados, selecionado) : null), [selecionado, filtrados, dados])

  const itemConcorrencia = useMemo(() => {
    if (!termoBusca) return null
    const kw = normalizar(termoBusca)
    const rs = registros.filter((r) => normalizar(r.objeto).includes(kw))
    return rs
  }, [termoBusca, registros])

  const temDados = dados && dados.fonte !== 'erro' && filtrados.length > 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Concorrentes"
        description="Análise de concorrentes em contratações públicas a partir dos dados reais do PNCP"
        badge={<Badge variant="primary">PNCP · dados reais</Badge>}
      />

      {/* Painel de busca */}
      <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Busca de concorrentes</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="block">
            <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Fornecedor (nome ou CNPJ)</span>
            <input
              value={draft.fornecedor}
              onChange={(e) => setDraft({ ...draft, fornecedor: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && iniciarConsulta()}
              placeholder="Ex.: razão social, nome fantasia ou CNPJ"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Item / objeto (palavra-chave)</span>
            <input
              value={draft.keyword}
              onChange={(e) => setDraft({ ...draft, keyword: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && iniciarConsulta()}
              placeholder="Ex.: coturno, papel A4, limpeza..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Órgão comprador</span>
            <input
              value={draft.orgao}
              onChange={(e) => setDraft({ ...draft, orgao: e.target.value })}
              placeholder="Ex.: prefeitura, ministério..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">UF</span>
            <select value={draft.uf} onChange={(e) => setDraft({ ...draft, uf: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm">
              <option value="">Todo Brasil</option>
              {UF_LIST.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Município</span>
            <input
              value={draft.municipio}
              onChange={(e) => setDraft({ ...draft, municipio: e.target.value })}
              placeholder="Ex.: São Paulo"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Modalidade</span>
            <select value={draft.modalidade} onChange={(e) => setDraft({ ...draft, modalidade: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm">
              <option value="">Todas</option>
              {MODALIDADES_PNCP.map((m) => <option key={m.codigo} value={String(m.codigo)}>{m.nome}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Período</span>
            <select value={draft.dias} onChange={(e) => setDraft({ ...draft, dias: Number(e.target.value) })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm">
              {PERIODOS.map((p) => <option key={p.dias} value={p.dias}>{p.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Fonte dos dados</span>
            <select value={modo} onChange={(e) => setModo(e.target.value as 'contratos' | 'contratacoes')} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm">
              <option value="contratos">Contratos (tem fornecedor)</option>
              <option value="contratacoes">Contratações publicadas</option>
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button onClick={iniciarConsulta} disabled={carregando} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors disabled:opacity-40">
              <Search className="w-4 h-4" /> {carregando ? 'Consultando...' : 'Consultar PNCP'}
            </button>
            <button onClick={() => { setDraft(FILTROS_INI); setApplied(FILTROS_INI); setDados(null); setSelecionado(null); }} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <X className="w-3.5 h-3.5" /> Limpar
            </button>
          </div>
        </div>

        {modo === 'contratos' && (
          <p className="mt-3 text-[11px] text-slate-400">
            Filtro de fornecedor aplicado sobre os contratos reais retornados no período consultado (a API pública do
            PNCP não oferece busca por fornecedor em todo o histórico). Para todo o cadastro, use a página Concorrentes
            somente sobre o que foi buscado.
          </p>
        )}
      </div>

      {/* Avisos / erros */}
      {erro && (
        <div className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger-soft dark:bg-red-500/10 px-3.5 py-2.5 text-sm text-danger">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Não foi possível consultar os dados do PNCP neste momento. Tente novamente em instantes.</span>
        </div>
      )}
      {!erro && dados?.mensagem && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-500/10 px-3.5 py-2.5 text-sm text-amber-700 dark:text-amber-300">
          <Info className="w-4 h-4 shrink-0" /> {dados.mensagem}
        </div>
      )}

      {carregando ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800" />)}
          </div>
          <div className="h-64 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        </div>
      ) : !temDados ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title={erro ? 'Consulta indisponível' : 'Aguardando consulta'}
          description={
            erro
              ? 'Não foram retornados dados reais. Nenhum número fictício é exibido.'
              : 'Informe os filtros acima e clique em Consultar PNCP para buscar dados reais de concorrentes.'
          }
        />
      ) : (
        <>
          {/* Indicadores principais — derivados dos registros reais */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="Registros encontrados" value={filtrados.length} icon={<Layers className="w-5 h-5" />} accent="primary" hint="contratos/contratações reais" />
            <StatCard label="Fornecedores" value={fornecedoresCount} icon={<Users className="w-5 h-5" />} accent="accent" hint="com CNPJ identificado" />
            <StatCard label="Itens/objetos" value={itensCount} icon={<Package className="w-5 h-5" />} accent="info" hint="objetos distintos" />
            <StatCard label="Valor identificado" value={formatCurrency(valorIdentificado)} icon={<Trophy className="w-5 h-5" />} accent="secondary" hint="soma real dos valores" />
            <StatCard label="Órgãos" value={orgaosCount} icon={<Building2 className="w-5 h-5" />} accent="info" hint="compradores distintos" />
            <StatCard label="UFs" value={ufsCount} icon={<MapPin className="w-5 h-5" />} accent="accent" hint="estados distintos" />
          </div>

          {/* Ranking de fornecedores (reais) */}
          <RankingPanel
            ranking={ranking}
            selecionado={selecionado}
            onSelecionar={(cnpj) => setSelecionado(cnpj)}
          />

          {/* Concorrência por item */}
          <ItemConcorrenciaPanel registros={filtrados} onBuscarItem={setTermoBusca} />

          {/* Resultados (tabela real) */}
          <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Registros encontrados</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => exportarRegistrosCSV(filtrados)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
                <button onClick={() => exportarExcelRegistros(filtrados)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                </button>
              </div>
            </div>
            {dados && dados.totalDisponivel > filtrados.length && (
              <p className="text-xs text-slate-400 mb-3">
                {dados.totalDisponivel > 0
                  ? `Analisando ${filtrados.length} de ${dados.totalDisponivel.toLocaleString('pt-BR')} registros disponíveis no período.`
                  : `${filtrados.length} registro(s) analisado(s).`}
              </p>
            )}
            <TabelaRegistros registros={filtrados} />
          </div>
        </>
      )}

      {/* Perfil do fornecedor */}
      {perfil && dados && (
        <PerfilFornecedorModal
          perfil={perfil}
          consulta={dados}
          registros={filtrados}
          onFechar={() => setSelecionado(null)}
        />
      )}

      {/* Concorrentes de um item pesquisado */}
      {termoBusca && (
        <ItemBuscaModal termo={termoBusca} registros={itemConcorrencia || []} onFechar={() => setTermoBusca(null)} onSelecionar={setSelecionado} />
      )}

      {/* Transparência */}
      {dados && (
        <Transparencia dados={dados} registros={filtrados.length} />
      )}
    </div>
  )
}

function RankingPanel({ ranking, selecionado, onSelecionar }: {
  ranking: FornecedorAgregado[]
  selecionado: string | null
  onSelecionar: (cnpj: string) => void
}) {
  if (ranking.length === 0) return null
  return (
    <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-4 h-4 text-secondary" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Principais fornecedores encontrados na base consultada</h3>
      </div>
      <p className="text-[11px] text-slate-400 mb-3">
        Ranking calculado exclusivamente sobre os registros reais retornados na consulta — não representa o histórico total das empresas.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {ranking.slice(0, 12).map((f, i) => (
          <button
            key={f.cnpj}
            onClick={() => onSelecionar(f.cnpj)}
            className={cn(
              'text-left p-4 rounded-xl border transition-all',
              selecionado === f.cnpj
                ? 'border-primary bg-primary/5 dark:bg-primary/10'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600'
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400 font-semibold">#{i + 1}</span>
              <Badge variant="accent">{f.ufs} UF</Badge>
            </div>
            <p className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-1">{f.razaoSocial}</p>
            <p className="text-[11px] text-slate-400 mb-2">{fmtCnpj(f.cnpj)}</p>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span><b className="text-slate-700 dark:text-slate-200">{f.registros}</b> particip.</span>
              <span><b className="text-slate-700 dark:text-slate-200">{formatCurrency(f.valorTotal)}</b></span>
            </div>
            {f.ultima && <p className="text-[11px] text-slate-400 mt-1">Última: {formatDate(f.ultima)}</p>}
          </button>
        ))}
      </div>
    </div>
  )
}

function ItemConcorrenciaPanel({ registros, onBuscarItem }: {
  registros: RegistroPNCP[]
  onBuscarItem: (termo: string) => void
}) {
  const itens = useMemo(() => concorrentesPorItem(registros), [registros])
  if (itens.length === 0) return null
  const top = itens.filter((i) => i.fornecedores.length > 1).slice(0, 6)
  return (
    <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-5">
      <div className="flex items-center gap-2 mb-2">
        <Tag className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Itens com mais concorrentes</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {top.map((it) => (
          <button key={it.objeto} onClick={() => onBuscarItem(it.objeto.slice(0, 80))} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary transition-colors text-left">
            <span className="block line-clamp-2 max-w-[240px]">{it.objeto}</span>
            <span className="block text-[11px] text-slate-400 mt-0.5">{it.fornecedores.length} concorrente(s) · {formatCurrency(it.valorTotal)}</span>
          </button>
        ))}
        {top.length === 0 && <p className="text-sm text-slate-400">Sem itens com múltiplos concorrentes nos registros consultados.</p>}
      </div>
    </div>
  )
}

function TabelaRegistros({ registros }: { registros: RegistroPNCP[] }) {
  if (registros.length === 0) return <p className="text-sm text-slate-400 py-4">Nenhum registro encontrado para os filtros informados.</p>
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm min-w-[900px]">
        <thead className="bg-slate-50 dark:bg-slate-800 text-left">
          <tr>
            <th className="px-3 py-2 font-semibold text-slate-500 dark:text-slate-400">Fornecedor</th>
            <th className="px-3 py-2 font-semibold text-slate-500 dark:text-slate-400">CNPJ</th>
            <th className="px-3 py-2 font-semibold text-slate-500 dark:text-slate-400">Órgão</th>
            <th className="px-3 py-2 font-semibold text-slate-500 dark:text-slate-400">UF</th>
            <th className="px-3 py-2 font-semibold text-slate-500 dark:text-slate-400">Objeto</th>
            <th className="px-3 py-2 font-semibold text-slate-500 dark:text-slate-400 text-right">Valor</th>
            <th className="px-3 py-2 font-semibold text-slate-500 dark:text-slate-400">Data</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {registros.slice(0, 100).map((r) => (
            <tr key={r.id + r.numero + r.orgao} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <td className="px-3 py-2.5 max-w-[180px] truncate">{r.fornecedor || <span className="text-slate-400">não identificado</span>}</td>
              <td className="px-3 py-2.5 text-xs font-mono">{fmtCnpj(r.fornecedorCnpj)}</td>
              <td className="px-3 py-2.5 max-w-[180px] truncate">{r.orgao || '—'}</td>
              <td className="px-3 py-2.5">{r.uf || '—'}</td>
              <td className="px-3 py-2.5 max-w-[300px] line-clamp-2">{r.objeto || '—'}</td>
              <td className="px-3 py-2.5 text-right font-semibold">{r.valor != null ? formatCurrency(r.valor) : '—'}</td>
              <td className="px-3 py-2.5 text-xs">{formatDate(r.dataPublicacao)}</td>
              <td className="px-3 py-2.5 text-right whitespace-nowrap">
                <a href={buildPncpEditalUrl({ id: pncpId(r), link: r.link || null })} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                  <ExternalLink className="w-3.5 h-3.5" /> Ver no PNCP
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PerfilFornecedorModal({ perfil, consulta, registros, onFechar }: {
  perfil: FornecedorPerfil
  consulta: ResultadoConsulta
  registros: RegistroPNCP[]
  onFechar: () => void
}) {
  const insuficiente = perfil.registros < 3
  const precos = analisarPrecoRegistros(registros, perfil.cnpj)
  const anos = Object.keys(perfil.porAno).sort((a, b) => b.localeCompare(a))

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto bg-black/60" onClick={onFechar}>
      <div className="w-full max-w-5xl my-6 rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-5 h-5 text-primary" />
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{perfil.razaoSocial}</h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">CNPJ {fmtCnpj(perfil.cnpj)}</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Análise baseada nos <b>{perfil.registros}</b> registro(s) reais encontrados na consulta — não no histórico total.
            </p>
          </div>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => exportarRelatorioFornecedor(perfil, consulta, registros)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <Download className="w-3.5 h-3.5" /> Relatório
          </button>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5" /> Dados reais do PNCP
          </span>
        </div>

        {insuficiente && (
          <div className="mb-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-3.5 py-2.5 text-xs text-amber-700 dark:text-amber-300">
            Dados insuficientes para esta análise (menos de 3 registros identificados).
          </div>
        )}

        {/* Desempenho */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Mini label="Participações identificadas" value={String(perfil.registros)} />
          <Mini label="Vitórias identificadas" value={String(perfil.vitorias)} />
          <Mini label="Valor identificado" value={formatCurrency(perfil.valorTotal)} />
          <Mini label="Ticket médio" value={formatCurrency(perfil.ticketMedio)} />
          <Mini label="Órgãos" value={String(perfil.orgaos)} />
          <Mini label="Municípios" value={String(perfil.municipios)} />
          <Mini label="UFs" value={String(perfil.ufs)} />
          <Mini label="Última ocorrência" value={formatDate(perfil.ultimaOcorrencia)} />
        </div>

        {/* Competividade */}
        <div className="mb-6 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-secondary" />
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Força competitiva identificada</h4>
          </div>
          <p className="text-[11px] text-slate-400 mb-3">Índice de competitividade baseado nos dados encontrados (não é informação oficial do PNCP).</p>
          {perfil.competividade ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-primary">{perfil.competividade.pontuacao}</span>
                <span className="text-xs text-slate-500">/ 100 · {perfil.competividade.registros} registros analisados</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${perfil.competividade.pontuacao}%` }} />
              </div>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {perfil.competividade.fatores.map((f) => <li key={f} className="text-[11px] px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{f}</li>)}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Dados insuficientes para esta análise.</p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Por modalidade */}
          <Secao titulo="Análise por modalidade">
            {Object.keys(perfil.porModalidade).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(perfil.porModalidade).map(([m, v]) => (
                  <div key={m} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300">{m}</span>
                    <span className="text-slate-400">{v.registros} part. · {formatCurrency(v.valor)}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-slate-400">Dados insuficientes.</p>}
          </Secao>

          {/* Por UF (geográfico) */}
          <Secao titulo="Análise geográfica (por UF)">
            {Object.keys(perfil.porUf).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(perfil.porUf).sort((a, b) => b[1].registros - a[1].registros).map(([uf, v]) => (
                  <div key={uf} className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">{uf}</span>
                    <span className="text-slate-400">{v.registros} part. · {v.vitorias} vit. · {formatCurrency(v.valor)}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-slate-400">Dados insuficientes.</p>}
          </Secao>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {/* Por item */}
          <Secao titulo="Análise por item">
            {Object.keys(perfil.porItem).length > 0 ? (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {Object.entries(perfil.porItem).sort((a, b) => b[1].registros - a[1].registros).slice(0, 15).map(([item, v]) => (
                  <div key={item} className="rounded-lg border border-slate-100 dark:border-slate-800 p-2">
                    <p className="text-xs text-slate-700 dark:text-slate-200 line-clamp-2">{item}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {v.registros} registros · {v.vitorias} vitórias · média {formatCurrency(v.media)}
                    </p>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-slate-400">Dados insuficientes.</p>}
          </Secao>

          {/* Por órgão */}
          <Secao titulo="Análise por órgão">
            {Object.keys(perfil.porOrgao).length > 0 ? (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {Object.entries(perfil.porOrgao).sort((a, b) => b[1].registros - a[1].registros).slice(0, 12).map(([org, v]) => (
                  <div key={org} className="rounded-lg border border-slate-100 dark:border-slate-800 p-2">
                    <p className="text-xs text-slate-700 dark:text-slate-200 line-clamp-1">{org}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{v.uf} · {v.municipio} · {v.registros} registros · {formatCurrency(v.valor)} · até {formatDate(v.ultima)}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-slate-400">Dados insuficientes.</p>}
          </Secao>
        </div>

        {/* Análise de preços */}
        <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Análise de preços (registros consultados)</h4>
          </div>
          {precos ? (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
              <Mini label="Menor" value={formatCurrency(precos.menor)} />
              <Mini label="Maior" value={formatCurrency(precos.maior)} />
              <Mini label="Média" value={formatCurrency(precos.media)} />
              <Mini label="Mediana" value={formatCurrency(precos.mediana)} />
              <Mini label="Preço do concorrente" value={formatCurrency(precos.precoConcorrente)} />
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">Diferença vs média</p>
                <p className={cn('text-sm font-bold', precos.diferencaPct > 0 ? 'text-danger' : 'text-emerald-600')}>
                  {precos.diferencaPct > 0 ? '+' : ''}{precos.diferencaPct.toFixed(1)}%
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Dados insuficientes para esta análise.</p>
          )}
        </div>

        {/* Histórico */}
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" /> Histórico (por ano)
          </h4>
          {anos.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {anos.map((a) => {
                const v = perfil.porAno[a]
                return (
                  <div key={a} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-center">
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{a}</p>
                    <p className="text-[11px] text-slate-400">{v.registros} registro(s)</p>
                    <p className="text-xs font-semibold text-primary mt-1">{formatCurrency(v.valor)}</p>
                  </div>
                )
              })}
            </div>
          ) : <p className="text-sm text-slate-400">Dados insuficientes.</p>}
        </div>
      </div>
    </div>
  )
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">{titulo}</h4>
      {children}
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-bold text-slate-900 dark:text-white break-words">{value}</p>
    </div>
  )
}

function ItemBuscaModal({ termo, registros, onFechar, onSelecionar }: {
  termo: string
  registros: RegistroPNCP[]
  onFechar: () => void
  onSelecionar: (cnpj: string) => void
}) {
  const ranking = useMemo(() => rankingFornecedores(registros), [registros])
  const valorTotal = registros.reduce((a, r) => a + (r.valor || 0), 0)
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto bg-black/60" onClick={onFechar}>
      <div className="w-full max-w-4xl my-6 rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" /> Concorrentes do item
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">“{termo}”</p>
            <p className="text-[11px] text-slate-400 mt-1">{registros.length} registro(s) · {formatCurrency(valorTotal)} em valor identificado</p>
          </div>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
        </div>

        {ranking.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">Nenhum fornecedor identificado para este item nos registros consultados.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {ranking.map((f, i) => (
              <button key={f.cnpj} onClick={() => { onSelecionar(f.cnpj); onFechar(); }} className="text-left p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary hover:bg-primary/5 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-semibold">#{i + 1}</span>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
                <p className="font-semibold text-sm text-slate-900 dark:text-white">{f.razaoSocial}</p>
                <p className="text-[11px] text-slate-400 mb-1">{fmtCnpj(f.cnpj)}</p>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span><b>{f.registros}</b> part.</span>
                  <span><b>{f.ufs}</b> UF</span>
                  <span><b>{formatCurrency(f.valorTotal)}</b></span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Transparencia({ dados, registros }: { dados: ResultadoConsulta; registros: number }) {
  return (
    <div className="card bg-white dark:bg-slate-900 dark:border-slate-800 p-5">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Fonte dos dados</h3>
      </div>
      <div className="grid md:grid-cols-2 gap-3 text-xs text-slate-500 dark:text-slate-400">
        <div className="space-y-1.5">
          <p><b className="text-slate-700 dark:text-slate-200">Fonte:</b> Portal Nacional de Contratações Públicas (PNCP) — dados abertos oficiais.</p>
          <p><b className="text-slate-700 dark:text-slate-200">Última consulta:</b> {formatDateTime(dados.consultadoEm)}</p>
          <p><b className="text-slate-700 dark:text-slate-200">Período pesquisado:</b> {formatDate(dados.periodo.inicio)} a {formatDate(dados.periodo.fim)}</p>
          <p><b className="text-slate-700 dark:text-slate-200">Registros analisados:</b> {registros.toLocaleString('pt-BR')}</p>
        </div>
        <div className="space-y-1.5">
          <p><b className="text-slate-700 dark:text-slate-200">Filtros aplicados:</b> {dados.filtros ? JSON.stringify(dados.filtros) : '—'}</p>
          <p><b className="text-slate-700 dark:text-slate-200">Status da consulta:</b> {dados.fonte === 'live' ? 'Concluída (PNCP respondeu)' : dados.fonte === 'erro' ? 'Falha' : 'Parcial'}</p>
          <p><b className="text-slate-700 dark:text-slate-200">API utilizada:</b> API pública de consulta do PNCP (/consulta)</p>
          {dados.totalDisponivel > registros && <p><b className="text-slate-700 dark:text-slate-200">Total disponível no PNCP:</b> {dados.totalDisponivel.toLocaleString('pt-BR')}</p>}
        </div>
      </div>
      <p className="mt-3 text-[11px] text-slate-400 leading-relaxed">
        Os dados apresentados refletem os registros disponibilizados pelo PNCP no momento da consulta. A
        responsabilidade pela correção dos dados publicados no PNCP é dos órgãos e entidades responsáveis pelo envio.
        Nenhum valor exibido é estimado ou fictício.
      </p>
    </div>
  )
}
