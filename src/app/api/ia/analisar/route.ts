import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePaidAccess } from '@/lib/auth/require-access'
import { analisarEdital, MAX_INPUT_CHARS } from '@/lib/ia/analisar'
import { extractPdfText, validatePdfBytes } from '@/lib/ia/pdf'
import { aiConfigured } from '@/lib/ia/workers-ai'
import { getEditaisKV, carregarEdital, salvarEdital } from '@/lib/ia/kv-edital'

/**
 * POST /api/ia/analisar
 *
 * Analisa um edital de licitação com IA (Workers AI). Autenticado.
 *
 * Aceita dois formatos:
 *   1) JSON:         { "texto": "conteúdo do edital" }
 *   2) Multipart:    FormData com campo "texto" (opcional) e/ou arquivo "arquivo" (PDF)
 *
 * Retorna { ok, markdown, modelo } em caso de sucesso, ou { ok, error } com o
 * motivo REAL da falha. Nunca devolve análise fabricada.
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
    const contentType = req.headers.get('content-type') || ''

    // --- Formato JSON -------------------------------------------------------
    if (contentType.includes('application/json')) {
      const raw: unknown = await req.json().catch(() => null)
      const texto = String((raw as Record<string, unknown>)?.texto || '').trim()
      const kv = await getEditaisKV()

      let alvo = texto
      if (!alvo) {
        const salvo = kv ? await carregarEdital(kv, user.id) : null
        if (salvo) alvo = salvo.conteudo
      }

      if (!alvo) {
        return NextResponse.json(
          { ok: false, error: 'Nenhum texto de edital foi fornecido (e não há edital salvo).' },
          { status: 400 }
        )
      }

      if (texto && texto.length > MAX_INPUT_CHARS) {
        return NextResponse.json(
          { ok: false, error: `Texto muito longo. O limite é de ${(MAX_INPUT_CHARS / 1000).toFixed(0)} mil caracteres.` },
          { status: 400 }
        )
      }

      if (texto && kv) {
        await salvarEdital(kv, user.id, { conteudo: texto, origem: 'texto', nomeArquivo: null, chars: texto.length })
      }

      const r = await analisarEdital(alvo)
      if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: 502 })
      return NextResponse.json({ ok: true, markdown: r.markdown, modelo: r.modelo })
    }

    // --- Formato Multipart (upload de PDF / texto) --------------------------
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      const textoCampo = String(form.get('texto') || '').trim()
      const arquivo = form.get('arquivo')
      const kv = await getEditaisKV()

      let texto = textoCampo
      let origem: 'texto' | 'pdf' = 'texto'
      let nomeArquivo: string | null = null

      if (arquivo && typeof arquivo === 'object' && 'arrayBuffer' in arquivo) {
        const file = arquivo as File
        const name = (file.name || '').toLowerCase()

        if (!name.endsWith('.pdf')) {
          return NextResponse.json(
            { ok: false, error: 'Envie um arquivo no formato .pdf ou cole o texto do edital.' },
            { status: 400 }
          )
        }

        const err = validatePdfBytes(file.size)
        if (err) {
          return NextResponse.json({ ok: false, error: err }, { status: 400 })
        }

        const bytes = new Uint8Array(await file.arrayBuffer())
        const extraido = await extractPdfText(bytes)
        if (!extraido.ok) {
          return NextResponse.json({ ok: false, error: extraido.error }, { status: 422 })
        }
        texto = extraido.text || ''
        origem = 'pdf'
        nomeArquivo = file.name
      }

      if (!texto) {
        const salvo = kv ? await carregarEdital(kv, user.id) : null
        if (salvo) {
          texto = salvo.conteudo
          origem = salvo.origem
          nomeArquivo = salvo.nomeArquivo
        }
      }

      if (!texto) {
        return NextResponse.json(
          { ok: false, error: 'Nenhum conteúdo para analisar. Forneça texto ou um arquivo PDF.' },
          { status: 400 }
        )
      }

      if (origem === 'texto' && textoCampo && textoCampo.length > MAX_INPUT_CHARS) {
        return NextResponse.json(
          { ok: false, error: `Texto muito longo. O limite é de ${(MAX_INPUT_CHARS / 1000).toFixed(0)} mil caracteres.` },
          { status: 400 }
        )
      }

      const salvo2 =
        origem === 'texto' && textoCampo && kv
          ? await salvarEdital(kv, user.id, { conteudo: textoCampo, origem: 'texto', nomeArquivo: null, chars: textoCampo.length })
          : origem === 'pdf' && arquivo && kv
            ? await salvarEdital(kv, user.id, { conteudo: texto, origem: 'pdf', nomeArquivo, chars: texto.length })
            : false

      const r = await analisarEdital(texto)
      if (!r.ok) return NextResponse.json({ ok: false, error: r.error, origem }, { status: 502 })
      return NextResponse.json({ ok: true, markdown: r.markdown, modelo: r.modelo, origem, nomeArquivo, salvo: salvo2 })
    }

    return NextResponse.json(
      { ok: false, error: 'Formato de requisição não suportado. Use JSON ou FormData.' },
      { status: 415 }
    )
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `Erro inesperado: ${(e as Error)?.message || 'desconhecido'}` },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ia/analisar — usado pelo frontend para saber se a IA está configurada
 * (evita chamar o POST que iria gastar/falhar sem binding).
 */
export async function GET() {
  const guard = await requirePaidAccess()
  if (!guard.ok) return guard.response
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, erro: 'Não autenticado.' }, { status: 401 })
  }
  return NextResponse.json({ ok: true, configurada: aiConfigured() })
}
