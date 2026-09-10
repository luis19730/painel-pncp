import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePaidAccess } from '@/lib/auth/require-access'
import { chatSobreEdital, EDITAL_MAX_CHARS, type ChatMensagem } from '@/lib/ia/analisar'
import { getEditaisKV, carregarEdital } from '@/lib/ia/kv-edital'

/**
 * POST /api/ia/chat
 *
 * Responde a uma pergunta do usuário com base no edital carregado e no
 * histórico da conversa. Autenticado.
 *
 * Corpo (JSON):
 *   {
 *     "edital": "texto do edital carregado (pode ser vazio)",
 *     "mensagens": [ { "role": "user"|"assistant", "content": "..." }, ... ]
 *   }
 *
 * Retorna { ok, resposta, modelo } em caso de sucesso, ou { ok, error } com o
 * motivo REAL da falha. Nunca devolve resposta fabricada.
 */
export async function POST(req: Request) {
  const guard = await requirePaidAccess()
  if (!guard.ok) return guard.response

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, erro: 'Não autenticado.' }, { status: 401 })
  }

  try {
    const raw: unknown = await req.json().catch(() => null)
    if (!raw || typeof raw !== 'object') {
      return NextResponse.json({ ok: false, error: 'Corpo inválido.' }, { status: 400 })
    }
    const body = raw as Record<string, unknown>

    let edital = String(body.edital || '').slice(0, EDITAL_MAX_CHARS)
    const kv = await getEditaisKV()
    if (!edital) {
      const salvo = kv ? await carregarEdital(kv, user.id) : null
      if (salvo) edital = salvo.conteudo.slice(0, EDITAL_MAX_CHARS)
    }

    // Sem edital em lugar nenhum: responder de forma clara e honesta, sem deixar
    // a IA inventar nem gastar a chamada do modelo com um aviso genérico.
    if (!edital.trim()) {
      console.log(`[ia] chat sem edital user=${user.id}`)
      return NextResponse.json(
        {
          ok: false,
          error:
            'Nenhum edital carregado para analisar. Importe o edital (texto ou PDF) no painel à esquerda e tente novamente.',
          semEdital: true,
        },
        { status: 400 }
      )
    }
    const mensagensRaw = Array.isArray(body.mensagens) ? body.mensagens : []

    const historico: ChatMensagem[] = mensagensRaw
      .filter(
        (m): m is ChatMensagem =>
          !!m &&
          typeof m === 'object' &&
          ((m as ChatMensagem).role === 'user' || (m as ChatMensagem).role === 'assistant') &&
          typeof (m as ChatMensagem).content === 'string'
      )
      .map((m) => ({ role: m.role, content: (m.content || '').slice(0, 2000) }))

    if (historico.length === 0 || historico[historico.length - 1].role !== 'user') {
      return NextResponse.json(
        { ok: false, error: 'Nenhuma pergunta pendente a responder.' },
        { status: 400 }
      )
    }

    const r = await chatSobreEdital(edital, historico)
    console.log(`[ia] chat ok=${r.ok} editalChars=${edital.length} historico=${historico.length} err=${r.error || ''}`)
    if (!r.ok) {
      return NextResponse.json({ ok: false, error: r.error }, { status: 502 })
    }
    return NextResponse.json({ ok: true, resposta: r.resposta, modelo: r.modelo })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `Erro inesperado: ${(e as Error)?.message || 'desconhecido'}` },
      { status: 500 }
    )
  }
}
