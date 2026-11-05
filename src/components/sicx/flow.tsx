'use client'

import { useEffect, useState } from 'react'
import { Building2, GraduationCap, Store } from 'lucide-react'
import { ANCORAS, PERFIS, type PerfilSicx } from '@/lib/sicx/conteudo'
import { cn } from '@/lib/utils'

const ICONES: Record<PerfilSicx, typeof Store> = {
  fornecedor: Store,
  orgao: Building2,
  estudante: GraduationCap,
}

const CHAVE = 'sicx-perfil'

/**
 * Seletor de perfil + navegação fixa por âncoras.
 *
 * O conteúdo das seções é renderizado no SERVIDOR (SEO) e passado como
 * `children`. O perfil só altera o atributo `data-perfil`, e o CSS gerado por
 * `cssOrdemSecoes()` reposiciona as seções sem desmontá-las.
 */
export default function SicxFlow({ children }: { children: React.ReactNode }) {
  const [perfil, setPerfil] = useState<PerfilSicx>('fornecedor')

  useEffect(() => {
    // Lido em um callback para não chamar setState no corpo do efeito.
    const id = window.setTimeout(() => {
      try {
        const salvo = localStorage.getItem(CHAVE)
        if (salvo === 'fornecedor' || salvo === 'orgao' || salvo === 'estudante') setPerfil(salvo)
      } catch {
        // localStorage bloqueado: mantém o padrão
      }
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

  function mudarPerfil(novo: PerfilSicx) {
    setPerfil(novo)
    try {
      localStorage.setItem(CHAVE, novo)
    } catch {
      // ignora
    }
  }

  return (
    <div>
      <div className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0b1120]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">Eu sou:</span>
            {PERFIS.map((p) => {
              const Icone = ICONES[p.id]
              const ativo = perfil === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => mudarPerfil(p.id)}
                  aria-pressed={ativo}
                  title={p.descricao}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                    ativo
                      ? 'border-primary bg-primary text-white'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary'
                  )}
                >
                  <Icone className="w-3.5 h-3.5" />
                  {p.label}
                </button>
              )
            })}
          </div>

          <nav aria-label="Seções do guia SICX" className="flex gap-1 overflow-x-auto pb-1">
            {ANCORAS.map((a) => (
              <a
                key={a.id}
                href={`#sec-${a.id}`}
                className="whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                {a.label}
              </a>
            ))}
          </nav>
        </div>
      </div>

      <div id="sicx-flow" data-perfil={perfil} className="sicx-flow">
        {children}
      </div>
    </div>
  )
}
