'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreditCard, QrCode, AlertTriangle } from 'lucide-react'

interface Assinatura {
  plano: string
  origem: string
  status: string
  paymentMethod: string
  ciclo: string
  cicloLabel: string
  valorCicloLabel: string
  trialInicio: string | null
  trialFim: string | null
  diasRestantes: number | null
  nextDueDate: string | null
  lastPaymentAt: string | null
  canceledAt: string | null
  acessoPermitido: boolean
  emTrial: boolean
  pix?: { qrCode?: string; copiaECola?: string; status?: string } | null
}

const statusLabel: Record<string, { texto: string; variant: 'success' | 'warning' | 'danger' | 'primary' | 'secondary' }> = {
  trial: { texto: 'Em teste', variant: 'primary' },
  active: { texto: 'Ativa', variant: 'success' },
  payment_pending: { texto: 'Pagamento pendente', variant: 'warning' },
  overdue: { texto: 'Inadimplente', variant: 'danger' },
  canceled: { texto: 'Cancelada', variant: 'secondary' },
  blocked: { texto: 'Bloqueada', variant: 'danger' },
  none: { texto: '—', variant: 'secondary' },
}

export default function MinhaAssinaturaPage() {
  const router = useRouter()
  const [dados, setDados] = useState<Assinatura | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [actionMsg, setActionMsg] = useState('')

  const carregar = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/asaas/subscription', { cache: 'no-store' })
      const data = await res.json()
      if (!data.ok) {
        if (res.status === 401) { router.push('/login'); return }
        setErro(data.erro || 'Não foi possível carregar.')
      } else {
        setDados(data.assinatura)
        setErro('')
      }
    } catch {
      setErro('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  const cancelar = async () => {
    if (!confirm('Deseja cancelar sua assinatura? Você deixará de ter acesso aos recursos pagos.')) return
    setActionMsg('')
    try {
      const res = await fetch('/api/asaas/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'cancelar' }),
      })
      const data = await res.json()
      if (!data.ok) setActionMsg(data.erro || 'Erro ao cancelar.')
      else setActionMsg('Assinatura cancelada com sucesso.')
      await carregar()
    } catch {
      setActionMsg('Erro de conexão.')
    }
  }

  const fmt = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—')

  const status = dados ? statusLabel[dados.status] || statusLabel.none : statusLabel.none
  const metodo = dados?.paymentMethod === 'credit_card' ? 'Cartão de crédito' : dados?.paymentMethod === 'pix' ? 'PIX' : '—'
  const nomePlano =
    dados?.plano === 'business' ? 'EMPRESA' : dados?.plano === 'pro' ? 'PRO' : 'Free'

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] flex items-center justify-center">
        <p className="text-slate-400">Carregando...</p>
      </div>
    )
  }

  if (erro && !dados) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] flex items-center justify-center px-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border p-8 text-center">
          <p className="text-sm text-slate-500 mb-4">{erro}</p>
          <Button variant="secondary" onClick={carregar}>Tentar novamente</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-7 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Minha Assinatura</h1>
            <Badge variant={status.variant}>{status.texto}</Badge>
          </div>

          <div className="space-y-3 text-sm">
            <Row label="Plano" value={nomePlano} />
            <Row label="Periodicidade" value={dados?.cicloLabel || '—'} />
            <Row label="Valor por ciclo" value={dados?.valorCicloLabel || '—'} />
            <Row label="Status" value={status.texto} />
            <Row label="Forma de pagamento" value={metodo} />
            <Row label="Início do teste" value={fmt(dados?.trialInicio)} />
            <Row label="Fim do teste" value={fmt(dados?.trialFim)} />
            {dados?.diasRestantes != null && dados.emTrial && (
              <Row label="Dias restantes" value={`${dados.diasRestantes} dias`} />
            )}
            <Row label="Próxima cobrança" value={fmt(dados?.nextDueDate) || 'Após o teste'} />
            <Row label="Último pagamento" value={fmt(dados?.lastPaymentAt)} />
          </div>

          {dados?.emTrial && (
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              Seu teste grátis termina em {dados.diasRestantes ?? 0} dia(s).
            </p>
          )}

          {(dados?.status === 'overdue' || dados?.status === 'payment_pending') && !dados?.emTrial && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-danger-soft dark:bg-red-500/10 p-3 text-sm text-danger">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              Existe um pagamento pendente em sua assinatura. Atualize sua forma de pagamento para continuar utilizando o Painel PNCP.
            </div>
          )}

          {dados?.pix?.copiaECola && dados.status !== 'active' && (
            <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white mb-2">
                <QrCode className="w-4 h-4" /> Pague com PIX
              </p>
              {dados.pix.qrCode && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={dados.pix.qrCode} alt="QR Code PIX" className="w-40 h-40 mx-auto mb-2" />
              )}
              <textarea readOnly value={dados.pix.copiaECola} className="w-full h-20 rounded-lg border border-slate-200 dark:border-slate-700 text-xs p-2" />
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2">
            <Button
              variant="secondary"
              onClick={() => router.push('/planos')}
            >
              <CreditCard className="w-4 h-4" /> Alterar plano ou periodicidade
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.push(`/checkout?plano=${dados?.plano === 'business' ? 'empresa' : 'pro'}&ciclo=${dados?.ciclo || 'mensal'}&metodo=pix`)}
            >
              Alterar forma de pagamento
            </Button>
            {(dados?.status === 'active' || dados?.status === 'trial' || dados?.status === 'payment_pending' || dados?.status === 'overdue') && (
              <Button variant="danger" onClick={cancelar}>
                Cancelar assinatura
              </Button>
            )}
          </div>

          {actionMsg && <p className="mt-4 text-sm text-center text-slate-500">{actionMsg}</p>}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-medium text-slate-900 dark:text-white text-right">{value}</span>
    </div>
  )
}
