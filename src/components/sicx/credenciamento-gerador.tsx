'use client'

import { useEffect, useState } from 'react'
import { Copy, Download, ExternalLink, FileText, Sparkles } from 'lucide-react'
import { buildPncpEditalUrl } from '@/lib/pncp'
import { exportarWord, abrirImpressaoProcesso, escapeHtml } from '@/lib/contratacoes/export'
import { cn } from '@/lib/utils'

interface CreForm {
  razaoSocial: string
  cnpj: string
  objeto: string
  unidade: string
  preco: string
  localidades: string
  entrega: string
  pagamento: string
  validade: string
  responsavel: string
  contato: string
  editalRef: string
}

const VAZIO: CreForm = {
  razaoSocial: '', cnpj: '', objeto: '', unidade: '', preco: '', localidades: '',
  entrega: '', pagamento: '', validade: '', responsavel: '', contato: '', editalRef: '',
}

const INPUT =
  'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary'

function refPncp(entrada: string): string {
  const t = (entrada || '').trim()
  if (!t) return ''
  const url = buildPncpEditalUrl({ link: t.startsWith('http') ? t : null, id: t })
  return url.includes('/app/editais/') ? url : ''
}

function secoes(d: CreForm): Array<{ titulo: string; corpo: string }> {
  const hoje = new Date().toLocaleDateString('pt-BR')
  const link = refPncp(d.editalRef)
  return [
    {
      titulo: 'Identificação do fornecedor',
      corpo: [
        `Razão social: ${d.razaoSocial || '[razão social]'}`,
        `CNPJ: ${d.cnpj || '[CNPJ]'}`,
        `Responsável: ${d.responsavel || '[nome e cargo]'}`,
        `Contato: ${d.contato || '[e-mail/telefone]'}`,
        `Data: ${hoje}`,
      ].join('\n'),
    },
    {
      titulo: 'Objeto da oferta (bem ou serviço comum padronizado)',
      corpo: `${d.objeto || '[descrever o bem/serviço ofertado]'}${d.unidade ? `\nUnidade: ${d.unidade}` : ''}`,
    },
    {
      titulo: 'Base legal',
      corpo:
        'Credenciamento por comércio eletrônico, na forma do art. 79, IV, da Lei nº 14.133/2021, incluído pela Lei nº 15.266/2025 e regulamentado pelo Decreto nº 13.106/2026 (SICX — Sistema de Compras Expressas).',
    },
    {
      titulo: 'Condições da oferta',
      corpo: [
        `Preço ofertado: ${d.preco || '[preço]'}`,
        `Localidade(s) atendida(s): ${d.localidades || '[município/UF ou âmbito de atendimento]'}`,
        `Condições de entrega/prestação: ${d.entrega || '[prazo e forma de entrega]'}`,
        `Condições de pagamento: ${d.pagamento || '[condições conforme o edital]'}`,
        `Validade da proposta: ${d.validade || '[prazo de validade]'}`,
      ].join('\n'),
    },
    {
      titulo: 'Referência no PNCP (edital de credenciamento)',
      corpo: link
        ? `Edital de credenciamento de referência: ${link}`
        : 'Edital de credenciamento de referência: [informar o link/nº do PNCP, se houver]',
    },
    {
      titulo: 'Declaração',
      corpo:
        'O fornecedor declara que as informações e a oferta acima são verdadeiras, que conhece e aceita as regras do edital de credenciamento do órgão contratante e que mantém as condições de habilitação exigidas. Esta é uma MINUTA de apoio e não substitui as regras do edital nem a análise jurídica.',
    },
  ]
}

function textoFinal(titulo: string, partes: Array<{ titulo: string; corpo: string }>): string {
  return [titulo, '(Art. 79, IV, da Lei nº 14.133/2021 · Lei nº 15.266/2025 · Decreto nº 13.106/2026)', '', ...partes.map((s) => `${s.titulo.toUpperCase()}\n${s.corpo}`)].join('\n\n')
}

/** Gerador de minuta de credenciamento (funcionalidade preservada da página antiga). */
export default function GeradorCredenciamento() {
  const [form, setForm] = useState<CreForm>(VAZIO)
  const [partes, setPartes] = useState<Array<{ titulo: string; corpo: string }>>([])
  const [texto, setTexto] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    // Lido em um callback para não chamar setState no corpo do efeito.
    const id = window.setTimeout(() => {
      try {
        const bruto = localStorage.getItem('perfilEmpresa')
        if (!bruto) return
        const p = JSON.parse(bruto)
        setForm((f) => ({ ...f, razaoSocial: f.razaoSocial || p.razaoSocial || '', cnpj: f.cnpj || p.cnpj || '' }))
      } catch {
        // perfil local inválido: segue em branco
      }
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

  const linkPncp = refPncp(form.editalRef)
  const campo = (k: keyof CreForm, v: string) => setForm((f) => ({ ...f, [k]: v }))

  function gerar() {
    if (!form.objeto.trim()) {
      setAviso('Informe o objeto da oferta para gerar a minuta.')
      return
    }
    setAviso('')
    setCopiado(false)
    const s = secoes(form)
    setPartes(s)
    setTexto(textoFinal('PROPOSTA DE CREDENCIAMENTO — SICX (SISTEMA DE COMPRAS EXPRESSAS)', s))
  }

  async function copiar() {
    if (!texto) return
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setAviso('Não foi possível copiar automaticamente. Selecione o texto e copie.')
    }
  }

  function baixarTxt() {
    if (!texto) return
    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'credenciamento-sicx.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="card p-5 dark:bg-slate-900 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-primary" /> Minuta de credenciamento (SICX)</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">Preencha a oferta. A minuta sai em .txt, Word e PDF (impressão).</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Razão social</label><input className={INPUT} value={form.razaoSocial} onChange={(e) => campo('razaoSocial', e.target.value)} placeholder="Fornecedor Ltda." /></div>
          <div><label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">CNPJ</label><input className={INPUT} value={form.cnpj} onChange={(e) => campo('cnpj', e.target.value)} placeholder="00.000.000/0000-00" /></div>
          <div className="md:col-span-2"><label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Objeto da oferta *</label><input className={INPUT} value={form.objeto} onChange={(e) => campo('objeto', e.target.value)} placeholder="Ex.: fornecimento de água mineral em garrafão de 20L" /></div>
          <div><label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Unidade</label><input className={INPUT} value={form.unidade} onChange={(e) => campo('unidade', e.target.value)} placeholder="garrafão 20L" /></div>
          <div><label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Preço ofertado</label><input className={INPUT} value={form.preco} onChange={(e) => campo('preco', e.target.value)} placeholder="R$ 12,00/unidade" /></div>
          <div className="md:col-span-2"><label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Localidade(s) atendida(s)</label><input className={INPUT} value={form.localidades} onChange={(e) => campo('localidades', e.target.value)} placeholder="Município/UF" /></div>
          <div><label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Condições de entrega</label><input className={INPUT} value={form.entrega} onChange={(e) => campo('entrega', e.target.value)} placeholder="Até 5 dias úteis" /></div>
          <div><label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Condições de pagamento</label><input className={INPUT} value={form.pagamento} onChange={(e) => campo('pagamento', e.target.value)} placeholder="Conforme o edital (30 dias)" /></div>
          <div><label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Validade da proposta</label><input className={INPUT} value={form.validade} onChange={(e) => campo('validade', e.target.value)} placeholder="60 dias" /></div>
          <div><label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Responsável</label><input className={INPUT} value={form.responsavel} onChange={(e) => campo('responsavel', e.target.value)} placeholder="Nome — cargo" /></div>
          <div className="md:col-span-2"><label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Contato</label><input className={INPUT} value={form.contato} onChange={(e) => campo('contato', e.target.value)} placeholder="vendas@fornecedor.com · (11) 90000-0000" /></div>
          <div className="md:col-span-2">
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Edital no PNCP (opcional)</label>
            <input className={INPUT} value={form.editalRef} onChange={(e) => campo('editalRef', e.target.value)} placeholder="https://pncp.gov.br/app/editais/... ou CNPJ-1-000123/2026" />
            {form.editalRef.trim() && (
              <p className="mt-1 text-[11px]">
                {linkPncp ? <a href={linkPncp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">Ver referência no PNCP <ExternalLink className="w-3 h-3" /></a> : <span className="text-amber-600 dark:text-amber-400">Referência não reconhecida.</span>}
              </p>
            )}
          </div>
        </div>

        {aviso && <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">{aviso}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={gerar} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"><Sparkles className="w-4 h-4" /> Gerar minuta</button>
          {linkPncp && <a href={linkPncp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200"><ExternalLink className="w-4 h-4" /> Abrir no PNCP</a>}
        </div>
        <p className="mt-2 text-[11px] text-slate-400">Minuta de apoio. Não substitui o edital do órgão nem análise jurídica.</p>
      </div>

      {texto !== null && (
        <div className="card p-5 dark:bg-slate-900 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5"><FileText className="w-4 h-4 text-primary" /> Documento gerado</h3>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={copiar} className={cn('inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold', copiado ? 'border-emerald-200 text-emerald-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300')}><Copy className="w-3 h-3" /> {copiado ? 'Copiado!' : 'Copiar'}</button>
              <button type="button" onClick={baixarTxt} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300"><Download className="w-3 h-3" /> .txt</button>
              <button type="button" onClick={() => exportarWord('Proposta de Credenciamento — SICX', partes, 'credenciamento-sicx')} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300"><FileText className="w-3 h-3" /> Word</button>
              <button type="button" onClick={() => abrirImpressaoProcesso(null, 'Proposta de Credenciamento — SICX', partes.map((s) => `<h2>${escapeHtml(s.titulo)}</h2><p>${escapeHtml(s.corpo).replace(/\n/g, '<br/>')}</p>`).join(''))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300"><FileText className="w-3 h-3" /> PDF</button>
            </div>
          </div>
          <pre className="whitespace-pre-wrap font-sans text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 leading-relaxed">{texto}</pre>
        </div>
      )}
    </div>
  )
}
