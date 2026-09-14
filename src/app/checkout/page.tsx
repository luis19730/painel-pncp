'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/button'
import Input from '@/components/ui/input'
import { CheckCircle2, CreditCard, QrCode, Loader2 } from 'lucide-react'
import { CICLOS, PLANOS, precoCiclo, precoMensalEquivalente, formatReais } from '@/lib/asaas/types'
import type { CicloId } from '@/lib/asaas/types'
import { track } from '@/lib/analytics'

const TRIAL = 15

function CheckoutInner() {
  const router = useRouter()
  const params = useSearchParams()
  const plano = params.get('plano') || 'pro'
  const cicloParam = params.get('ciclo') || 'mensal'
  const metodo = (params.get('metodo') || 'pix') as 'credit_card' | 'pix'

  const plan = PLANOS.find((p) => p.id === plano) || PLANOS[0]
  const cic = (CICLOS.find((c) => c.id === cicloParam) || CICLOS[0]) as typeof CICLOS[number]
  const valorTotal = precoCiclo(plan.id, cic.id)
  const mensalEq = precoMensalEquivalente(plan.id, cic.id)

  const [payMethod, setPayMethod] = useState<'credit_card' | 'pix'>(metodo)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [resultado, setResultado] = useState<null | {
    subscriptionId: string
    trialFim: string
    pix?: { qrCode?: string; copiaECola?: string }
  }>(null)

  const [cpfCnpj, setCpfCnpj] = useState('')

  const [card, setCard] = useState({
    holderName: '',
    number: '',
    expiryMonth: '',
    expiryYear: '',
    ccv: '',
    postalCode: '',
    addressNumber: '',
    addressComplement: '',
    phone: '',
  })

  useEffect(() => {
    setPayMethod(metodo)
  }, [metodo])

  // Evento de funil: início de contratação (CHECKOUT_STARTED).
  useEffect(() => {
    track({
      event: 'checkout_started',
      page: 'checkout',
      props: { plano: plan.id, ciclo: cic.id, metodo },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const assinar = async () => {
    if (loading) return
    setErro('')
    if (!cpfCnpj.trim()) {
      setErro('Informe seu CPF ou CNPJ para continuar.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/asaas/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          ciclo: cic.id,
          paymentMethod: payMethod,
          cpfCnpj: cpfCnpj.trim(),
          ...(payMethod === 'credit_card' ? { card } : {}),
        }),
      })
      const data = await res.json()
      if (!data.ok) {
        setErro(data.erro || 'Não foi possível concluir. Tente novamente.')
        return
      }
      setResultado(data)
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const primeiraCobranca = resultado
    ? new Date(new Date(resultado.trialFim).getTime() + 24 * 3600 * 1000).toLocaleDateString('pt-BR')
    : new Date(Date.now() + (TRIAL + 1) * 24 * 3600 * 1000).toLocaleDateString('pt-BR')

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] py-12 px-4">
      <div className="max-w-lg mx-auto">
        <button
          onClick={() => router.push('/planos')}
          className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-4"
        >
          ← Voltar
        </button>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-7 shadow-sm">
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white mb-1">Checkout</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Plano {plan.name} · {cic.label}
          </p>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-4 mb-6 space-y-1 text-sm">
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Hoje</span><span>R$ 0,00</span>
            </div>
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Teste grátis</span><span>{TRIAL} dias</span>
            </div>
            <div className="flex justify-between font-semibold text-slate-900 dark:text-white">
              <span>Depois ({cic.label})</span><span>{formatReais(valorTotal)}</span>
            </div>
            <div className="flex justify-between text-slate-500 dark:text-slate-400 text-xs">
              <span>Equivale a</span><span>{formatReais(mensalEq)}/mês</span>
            </div>
            <div className="flex justify-between text-slate-500 dark:text-slate-400 text-xs pt-1">
              <span>Primeira cobrança</span><span>{primeiraCobranca}</span>
            </div>
          </div>

          {/* Método */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            <button
              onClick={() => setPayMethod('pix')}
              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                payMethod === 'pix'
                  ? 'border-primary bg-primary-soft dark:bg-primary/10 text-primary'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <QrCode className="w-4 h-4" /> PIX
            </button>
            <button
              onClick={() => setPayMethod('credit_card')}
              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                payMethod === 'credit_card'
                  ? 'border-primary bg-primary-soft dark:bg-primary/10 text-primary'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <CreditCard className="w-4 h-4" /> Cartão
            </button>
          </div>

          {/* Dados do titular (obrigatório PIX e cartão) */}
          {!resultado && (
            <div className="space-y-3 mb-5">
              <Input label="CPF ou CNPJ do titular" placeholder="000.000.000-00" value={cpfCnpj}
                onChange={(e) => setCpfCnpj(e.target.value)} />
            </div>
          )}

          {/* Cartão */}
          {payMethod === 'credit_card' && !resultado && (
            <div className="space-y-3 mb-5">
              <Input label="Nome impresso no cartão" placeholder="Nome completo" value={card.holderName}
                onChange={(e) => setCard({ ...card, holderName: e.target.value })} />
              <Input label="Número do cartão" placeholder="0000 0000 0000 0000" inputMode="numeric" value={card.number}
                onChange={(e) => setCard({ ...card, number: e.target.value })} />
              <div className="grid grid-cols-3 gap-2">
                <Input label="Mês" placeholder="MM" value={card.expiryMonth}
                  onChange={(e) => setCard({ ...card, expiryMonth: e.target.value })} />
                <Input label="Ano" placeholder="AA" value={card.expiryYear}
                  onChange={(e) => setCard({ ...card, expiryYear: e.target.value })} />
                <Input label="CVV" placeholder="123" value={card.ccv}
                  onChange={(e) => setCard({ ...card, ccv: e.target.value })} />
              </div>

              {/* Endereço do titular — obrigatório no ASAAS para cobrança por cartão */}
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 pt-2">
                Endereço do titular
              </p>
              <Input label="CEP" placeholder="00000-000" inputMode="numeric" value={card.postalCode}
                onChange={(e) => setCard({ ...card, postalCode: e.target.value })} />
              <Input label="Número do endereço" placeholder="123" value={card.addressNumber}
                onChange={(e) => setCard({ ...card, addressNumber: e.target.value })} />
              <Input label="Complemento (opcional)" placeholder="Apto, bloco..." value={card.addressComplement}
                onChange={(e) => setCard({ ...card, addressComplement: e.target.value })} />
              <Input label="Telefone com DDD" placeholder="(11) 99999-9999" inputMode="tel" value={card.phone}
                onChange={(e) => setCard({ ...card, phone: e.target.value })} />

              <p className="text-xs text-slate-400">
                Seus dados de cartão são enviados com segurança ao ASAAS e nunca são armazenados.
              </p>
            </div>
          )}

          {erro && <p className="text-sm text-danger mb-4">{erro}</p>}

          {/* PIX gerado */}
          {resultado && resultado.pix?.copiaECola && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-5">
              <p className="text-sm font-semibold mb-2 text-slate-900 dark:text-white">PIX gerado</p>
              {resultado.pix.qrCode && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resultado.pix.qrCode} alt="QR Code PIX" className="w-40 h-40 mx-auto mb-3" />
              )}
              <textarea
                readOnly
                value={resultado.pix.copiaECola}
                className="w-full h-24 rounded-lg border border-slate-200 dark:border-slate-700 text-xs p-2"
              />
              <button
                onClick={() => navigator.clipboard?.writeText(resultado.pix?.copiaECola || '')}
                className="text-xs font-semibold text-primary mt-2"
              >
                Copiar código PIX
              </button>
            </div>
          )}

          {resultado ? (
            <div className="flex items-center gap-2 text-sm text-success font-semibold mb-4">
              <CheckCircle2 className="w-5 h-5" />
              Assinatura criada! Seu teste grátis de {TRIAL} dias começou.
            </div>
          ) : (
            <Button className="w-full" size="lg" loading={loading} onClick={assinar}>
              {payMethod === 'credit_card' ? 'Assinar com Cartão' : 'Gerar PIX e Começar'}
            </Button>
          )}

          <div className="mt-4 space-y-1 text-xs text-slate-400">
            <p className="font-semibold text-slate-500 dark:text-slate-400">Resumo</p>
            <p>Hoje: R$ 0,00 · Teste: {TRIAL} dias · Depois: {formatReais(valorTotal)} por {cic.label.toLowerCase()}</p>
            <p>A primeira cobrança ocorre somente após o término do teste.</p>
            <p>Cobrança recorrente {cic.label.toLowerCase()}. Você pode cancelar a qualquer momento.</p>
          </div>

          <button
            onClick={() => router.push('/minha-assinatura')}
            className="block w-full mt-5 text-center text-sm text-primary font-semibold"
          >
            Ir para Minha Assinatura
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
      <CheckoutInner />
    </Suspense>
  )
}
