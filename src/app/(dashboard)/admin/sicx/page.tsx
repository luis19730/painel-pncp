import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import PageHeader from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'
import { contextoUsuario } from '@/lib/estacao/server'
import { usuarioEhAdminSicx } from '@/lib/sicx/server'
import AdminPainelSicx from '@/components/sicx/admin-painel'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'SICX — administração',
  robots: { index: false, follow: false },
}

export default async function AdminSicxPage() {
  const { supabase, user } = await contextoUsuario()
  if (!user) redirect('/login?redirect=%2Fadmin%2Fsicx')

  const admin = await usuarioEhAdminSicx(supabase, user.email)
  if (!admin) {
    return (
      <>
        <PageHeader
          title="SICX — administração"
          description="Área restrita à equipe responsável pelo diretório."
          badge={<Badge variant="warning">Acesso restrito</Badge>}
        />
        <div className="card p-8 max-w-2xl dark:bg-slate-900 dark:border-slate-800">
          <ShieldAlert className="w-9 h-9 text-amber-500 mb-3" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Esta conta não é administradora</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            O painel do SICX só pode ser aberto por e-mails cadastrados como administradores. Se você precisa
            de acesso, fale com a equipe do Painel PNCP.
          </p>
          <Link
            href="/credenciamento-sicx"
            className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            Voltar ao guia público do SICX
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="SICX — administração"
        description="Cadastre almoxarifados, normas e o status do sistema, revise sugestões e valide os links publicados."
        badge={<Badge variant="premium">Administração</Badge>}
      />
      <AdminPainelSicx />
    </>
  )
}
