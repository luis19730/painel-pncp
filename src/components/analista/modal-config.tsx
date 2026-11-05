'use client'

import { useEffect, useState } from 'react'
import { X, Save, Plus, Trash2, Truck, Percent, Settings2 } from 'lucide-react'
import Button from '@/components/ui/button'
import { CampoNumero, CampoSelect, Secao } from '@/components/analista/campos'
import { REGIMES } from '@/lib/analista/config'
import { UFS_BRASIL } from '@/data/municipios'
import type { ConfigAnalista } from '@/lib/analista/types'

function clonar<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

export default function ModalConfig({
  aberto,
  config,
  onFechar,
  onSalvar,
}: {
  aberto: boolean
  config: ConfigAnalista
  onFechar: () => void
  onSalvar: (config: ConfigAnalista) => Promise<void>
}) {
  const [local, setLocal] = useState<ConfigAnalista>(clonar(config))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [novaOrigem, setNovaOrigem] = useState('SP')
  const [novoDestino, setNovoDestino] = useState('RJ')

  useEffect(() => {
    if (aberto) {
      setLocal(clonar(config))
      setErro('')
    }
  }, [aberto, config])

  useEffect(() => {
    if (!aberto) return
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [aberto, onFechar])

  if (!aberto) return null

  const detalhado = local.regime === 'presumido' || local.regime === 'real'

  const salvar = async () => {
    setSalvando(true)
    setErro('')
    try {
      await onSalvar(local)
      onFechar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.')
    } finally {
      setSalvando(false)
    }
  }

  const adicionarUf = () => {
    const chave = `${novaOrigem}>${novoDestino}`
    setLocal((c) => ({
      ...c,
      tabelaFrete: {
        ...c.tabelaFrete,
        porUf: {
          ...c.tabelaFrete.porUf,
          [chave]: c.tabelaFrete.porUf[chave] || { porKg: c.tabelaFrete.porKg, porM3: c.tabelaFrete.porM3, minimo: c.tabelaFrete.minimo },
        },
      },
    }))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-config-analista"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onFechar()
      }}
    >
      <div className="my-4 w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Settings2 className="h-5 w-5" />
            </span>
            <div>
              <h2 id="titulo-config-analista" className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Configurações do analista
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Aplicadas como padrão em novas análises. Salvas na sua conta.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
          <Secao titulo="Padrões financeiros" icone={<Percent className="h-4 w-4" />}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <CampoNumero
                id="cfg-margem"
                label="Margem mínima"
                sufixo="%"
                valor={local.margemMinima}
                onChange={(v) => setLocal({ ...local, margemMinima: v })}
                min={0}
                max={90}
                step={1}
                dica="Margem líquida mínima aceitável sobre a receita. Abaixo disso a análise fica amarela/vermelha."
              />
              <CampoSelect
                id="cfg-regime"
                label="Regime tributário"
                valor={local.regime}
                onChange={(v) => setLocal({ ...local, regime: v as ConfigAnalista['regime'] })}
                opcoes={REGIMES.map((r) => ({ value: r.id, label: r.label }))}
              />
              <CampoNumero
                id="cfg-capital"
                label="Custo de capital"
                sufixo="% a.m."
                valor={local.custoCapital}
                onChange={(v) => setLocal({ ...local, custoCapital: v })}
                min={0}
                step={0.1}
                dica="Quanto custa o dinheiro parado até o órgão pagar (juros, capital de giro)."
              />
              <CampoNumero
                id="cfg-risco"
                label="Risco / contingência"
                sufixo="%"
                valor={local.riscoPct}
                onChange={(v) => setLocal({ ...local, riscoPct: v })}
                min={0}
                step={0.5}
                dica="Percentual sobre o custo direto para imprevistos, multas e retrabalho."
              />
              <CampoNumero
                id="cfg-despesas"
                label="Despesas administrativas"
                sufixo="%"
                valor={local.despesasPct}
                onChange={(v) => setLocal({ ...local, despesasPct: v })}
                min={0}
                step={0.5}
                dica="Rateio da estrutura da empresa sobre a receita."
              />
              <CampoNumero
                id="cfg-cubagem"
                label="Fator de cubagem"
                sufixo="kg/m³"
                valor={local.fatorCubagem}
                onChange={(v) => setLocal({ ...local, fatorCubagem: v })}
                min={0}
                step={10}
                dica="Padrão do transporte rodoviário: 300 kg por m³. Peso cubado = volume × fator."
              />
              <CampoNumero
                id="cfg-frete-max"
                label="Alerta de frete acima de"
                sufixo="%"
                valor={local.freteMaxPct}
                onChange={(v) => setLocal({ ...local, freteMaxPct: v })}
                min={0}
                step={1}
                dica="Se o frete consumir mais que isso da receita, o veredito mostra um alerta."
              />
              <CampoNumero
                id="cfg-prazo-max"
                label="Alerta de prazo de pagamento"
                sufixo="dias"
                valor={local.prazoMaxDias}
                onChange={(v) => setLocal({ ...local, prazoMaxDias: v })}
                min={0}
                step={1}
                dica="Prazos acima deste valor geram alerta de capital de giro."
              />
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                Alíquotas {detalhado ? 'por tributo' : 'efetiva'}
              </p>
              {detalhado ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {([
                    ['icms', 'ICMS'],
                    ['iss', 'ISS'],
                    ['pis', 'PIS'],
                    ['cofins', 'COFINS'],
                    ['irpj', 'IRPJ'],
                    ['csll', 'CSLL'],
                    ['stDifal', 'ST / DIFAL'],
                  ] as const).map(([campo, label]) => (
                    <CampoNumero
                      key={campo}
                      id={`cfg-al-${campo}`}
                      label={label}
                      sufixo="%"
                      valor={local.aliquotas[campo]}
                      onChange={(v) => setLocal({ ...local, aliquotas: { ...local.aliquotas, [campo]: v } })}
                      min={0}
                      step={0.01}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <CampoNumero
                    id="cfg-al-simples"
                    label={local.regime === 'mei' ? 'Alíquota efetiva MEI' : 'Alíquota efetiva Simples'}
                    sufixo="%"
                    valor={local.aliquotas.simples}
                    onChange={(v) => setLocal({ ...local, aliquotas: { ...local.aliquotas, simples: v } })}
                    min={0}
                    step={0.1}
                    dica="Some os tributos que incidem sobre a receita e informe a alíquota efetiva."
                  />
                </div>
              )}
            </div>
          </Secao>

          <Secao titulo="Tabela de frete" icone={<Truck className="h-4 w-4" />} dica="Usada quando o modo de frete é 'Estimativa pela tabela'. O valor considerado é o maior entre peso, cubagem e mínimo.">
            <div className="grid grid-cols-3 gap-3">
              <CampoNumero
                id="cfg-frete-kg"
                label="R$ por kg"
                valor={local.tabelaFrete.porKg}
                onChange={(v) => setLocal({ ...local, tabelaFrete: { ...local.tabelaFrete, porKg: v } })}
                min={0}
                step={0.1}
              />
              <CampoNumero
                id="cfg-frete-m3"
                label="R$ por m³"
                valor={local.tabelaFrete.porM3}
                onChange={(v) => setLocal({ ...local, tabelaFrete: { ...local.tabelaFrete, porM3: v } })}
                min={0}
                step={1}
              />
              <CampoNumero
                id="cfg-frete-min"
                label="Frete mínimo"
                valor={local.tabelaFrete.minimo}
                onChange={(v) => setLocal({ ...local, tabelaFrete: { ...local.tabelaFrete, minimo: v } })}
                min={0}
                step={1}
              />
            </div>

            <p className="mt-4 text-xs font-semibold text-slate-600 dark:text-slate-300">Faixas por distância</p>
            <div className="mt-2 space-y-2">
              {local.tabelaFrete.faixas.map((faixa, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-end gap-2">
                  <CampoNumero
                    id={`cfg-faixa-km-${i}`}
                    label={i === 0 ? 'Até (km)' : undefined}
                    valor={faixa.ateKm}
                    onChange={(v) =>
                      setLocal((c) => {
                        const faixas = [...c.tabelaFrete.faixas]
                        faixas[i] = { ...faixas[i], ateKm: v }
                        return { ...c, tabelaFrete: { ...c.tabelaFrete, faixas } }
                      })
                    }
                    min={0}
                  />
                  <CampoNumero
                    id={`cfg-faixa-kg-${i}`}
                    label={i === 0 ? 'R$/kg' : undefined}
                    valor={faixa.porKg}
                    onChange={(v) =>
                      setLocal((c) => {
                        const faixas = [...c.tabelaFrete.faixas]
                        faixas[i] = { ...faixas[i], porKg: v }
                        return { ...c, tabelaFrete: { ...c.tabelaFrete, faixas } }
                      })
                    }
                    min={0}
                  />
                  <CampoNumero
                    id={`cfg-faixa-m3-${i}`}
                    label={i === 0 ? 'R$/m³' : undefined}
                    valor={faixa.porM3}
                    onChange={(v) =>
                      setLocal((c) => {
                        const faixas = [...c.tabelaFrete.faixas]
                        faixas[i] = { ...faixas[i], porM3: v }
                        return { ...c, tabelaFrete: { ...c.tabelaFrete, faixas } }
                      })
                    }
                    min={0}
                  />
                  <CampoNumero
                    id={`cfg-faixa-min-${i}`}
                    label={i === 0 ? 'Mínimo' : undefined}
                    valor={faixa.minimo}
                    onChange={(v) =>
                      setLocal((c) => {
                        const faixas = [...c.tabelaFrete.faixas]
                        faixas[i] = { ...faixas[i], minimo: v }
                        return { ...c, tabelaFrete: { ...c.tabelaFrete, faixas } }
                      })
                    }
                    min={0}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setLocal((c) => ({
                        ...c,
                        tabelaFrete: { ...c.tabelaFrete, faixas: c.tabelaFrete.faixas.filter((_, j) => j !== i) },
                      }))
                    }
                    className="mb-0.5 rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                    aria-label={`Remover faixa ${i + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<Plus className="h-4 w-4" />}
                onClick={() =>
                  setLocal((c) => ({
                    ...c,
                    tabelaFrete: {
                      ...c.tabelaFrete,
                      faixas: [...c.tabelaFrete.faixas, { ateKm: 0, porKg: 0, porM3: 0, minimo: 0 }],
                    },
                  }))
                }
              >
                Adicionar faixa
              </Button>
            </div>

            <p className="mt-4 text-xs font-semibold text-slate-600 dark:text-slate-300">Tarifas por par de UF (opcional)</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Prioridade sobre as faixas. Chave no formato origem&gt;destino (ex.: SP&gt;RJ).
            </p>
            <div className="mt-2 space-y-2">
              {Object.entries(local.tabelaFrete.porUf).map(([chave, tarifa]) => (
                <div key={chave} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-end gap-2">
                  <div className="pb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">{chave}</div>
                  <CampoNumero
                    id={`cfg-uf-kg-${chave}`}
                    valor={tarifa.porKg}
                    onChange={(v) =>
                      setLocal((c) => ({
                        ...c,
                        tabelaFrete: {
                          ...c.tabelaFrete,
                          porUf: { ...c.tabelaFrete.porUf, [chave]: { ...c.tabelaFrete.porUf[chave], porKg: v } },
                        },
                      }))
                    }
                    min={0}
                  />
                  <CampoNumero
                    id={`cfg-uf-m3-${chave}`}
                    valor={tarifa.porM3}
                    onChange={(v) =>
                      setLocal((c) => ({
                        ...c,
                        tabelaFrete: {
                          ...c.tabelaFrete,
                          porUf: { ...c.tabelaFrete.porUf, [chave]: { ...c.tabelaFrete.porUf[chave], porM3: v } },
                        },
                      }))
                    }
                    min={0}
                  />
                  <CampoNumero
                    id={`cfg-uf-min-${chave}`}
                    valor={tarifa.minimo}
                    onChange={(v) =>
                      setLocal((c) => ({
                        ...c,
                        tabelaFrete: {
                          ...c.tabelaFrete,
                          porUf: { ...c.tabelaFrete.porUf, [chave]: { ...c.tabelaFrete.porUf[chave], minimo: v } },
                        },
                      }))
                    }
                    min={0}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setLocal((c) => {
                        const porUf = { ...c.tabelaFrete.porUf }
                        delete porUf[chave]
                        return { ...c, tabelaFrete: { ...c.tabelaFrete, porUf } }
                      })
                    }
                    className="mb-0.5 rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                    aria-label={`Remover tarifa ${chave}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                <CampoSelect
                  id="cfg-nova-origem"
                  label="Origem"
                  valor={novaOrigem}
                  onChange={setNovaOrigem}
                  opcoes={UFS_BRASIL.map((uf) => ({ value: uf, label: uf }))}
                />
                <CampoSelect
                  id="cfg-novo-destino"
                  label="Destino"
                  valor={novoDestino}
                  onChange={setNovoDestino}
                  opcoes={UFS_BRASIL.map((uf) => ({ value: uf, label: uf }))}
                />
                <Button type="button" variant="secondary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={adicionarUf}>
                  Adicionar UF
                </Button>
              </div>
            </div>
          </Secao>

          {erro && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{erro}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onFechar}>Cancelar</Button>
          <Button type="button" loading={salvando} icon={<Save className="h-4 w-4" />} onClick={salvar}>
            Salvar configurações
          </Button>
        </div>
      </div>
    </div>
  )
}
