'use client'

import { useEffect, useState } from 'react'
import { Users, Activity, Eye, TrendingUp, MapPin, Monitor, FileText, Search, Target, MousePointerClick } from 'lucide-react'
import StatCard from '@/components/ui/stat-card'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import PageHeader from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'

export default function AdminPage() {
  const [lastSync, setLastSync] = useState<string | null>(null)

  useEffect(() => {
    setLastSync(new Date().toLocaleString('pt-BR'))
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120]">
      <header className="bg-white dark:bg-[#0b1120] border-b border-slate-200 dark:border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-extrabold font-display text-slate-900 dark:text-white">Admin · Painel PNCP</h1>
          <Badge variant="success">● Sistema ativo</Badge>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Analytics stats */}
        <div>
          <PageHeader title="Analytics em tempo real" description="Métricas reais de uso e engajamento da plataforma" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Visitantes" value={0} icon={<Users className="w-5 h-5" />} accent="primary" hint="únicos hoje" />
            <StatCard label="Visitas" value={0} icon={<Activity className="w-5 h-5" />} accent="accent" hint="sessões hoje" />
            <StatCard label="Pageviews" value={0} icon={<Eye className="w-5 h-5" />} accent="success" hint="visualizações" />
            <StatCard label="Online agora" value={0} icon={<TrendingUp className="w-5 h-5" />} accent="warning" hint="usuários ativos" />
          </div>
        </div>

        {/* Engagement */}
        <div>
          <PageHeader title="Engajamento" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Pesquisas" value={0} icon={<Search className="w-5 h-5" />} accent="secondary" hint="buscas realizadas" />
            <StatCard label="Oport. visualizadas" value={0} icon={<FileText className="w-5 h-5" />} accent="primary" hint="detalhes abertos" />
            <StatCard label="Favoritos" value={0} icon={<Target className="w-5 h-5" />} accent="danger" hint="oportunidades salvas" />
            <StatCard label="Alertas ativos" value={0} icon={<Activity className="w-5 h-5" />} accent="warning" hint="configurados" />
            <StatCard label="Cadastros" value={0} icon={<Users className="w-5 h-5" />} accent="success" hint="novos usuários" />
            <StatCard label="Conversões" value={0} icon={<MousePointerClick className="w-5 h-5" />} accent="accent" hint="cadastro → assinatura" />
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Trafico por localizacao */}
          <Card>
            <CardHeader>
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                <MapPin className="w-5 h-5 text-primary" /> Visitantes por localização
              </h2>
            </CardHeader>
            <CardBody>
              <EmptyMetric />
            </CardBody>
          </Card>

          {/* Dispositivos */}
          <Card>
            <CardHeader>
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                <Monitor className="w-5 h-5 text-secondary" /> Dispositivos
              </h2>
            </CardHeader>
            <CardBody>
              <EmptyMetric />
            </CardBody>
          </Card>
        </div>

        {/* Paginas mais acessadas */}
        <Card>
          <CardHeader>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <FileText className="w-5 h-5 text-accent" /> Páginas mais acessadas
            </h2>
          </CardHeader>
          <CardBody>
            <EmptyMetric />
          </CardBody>
        </Card>

        {/* Sync */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Sincronização PNCP</h2>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
              <span className="text-sm text-slate-600 dark:text-slate-300">
                Última sincronização: {lastSync ?? 'Carregando...'}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              Dados obtidos da API pública do Portal Nacional de Contratações Públicas.
            </p>
          </CardBody>
        </Card>
      </main>
    </div>
  )
}

function EmptyMetric() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 text-slate-400">
        <TrendingUp className="w-6 h-6" />
      </div>
      <p className="text-sm text-slate-400 dark:text-slate-500">Aguardando dados de analytics</p>
      <p className="text-xs text-slate-400 dark:text-slate-600 mt-1">Os dados reais aparecerão aqui automaticamente.</p>
    </div>
  )
}
