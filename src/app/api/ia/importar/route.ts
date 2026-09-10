import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePaidAccess } from '@/lib/auth/require-access'
import { MAX_INPUT_CHARS } from '@/lib/ia/analisar'
import { extractPdfTextWithOcr, validatePdfBytes } from '@/lib/ia/pdf'
import { getEditaisKV, salvarEdital } from '@/lib/ia/kv-edital'

/**
 * POST /api/ia/importar
 *
 * Importa o conteúdo de um edital para a sessão de chat (sem chamar a IA).
 * Autenticado.
 *
 * Aceita dois formatos:
 *   1) JSON:      { "texto": "conteúdo do edital" }
 *   2) Multipart: FormData com arquivo "arquivo" (PDF)
 *
 * Retorna { ok, conteudo, origem, nomeArquivo, chars, aviso } em caso de
 * sucesso, ou { ok, error } com o motivo REAL da falha. Nunca devolve texto
 * fabricado.
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
    const kv = await getEditaisKV()

    // --- Formato JSON (colar texto) ----------------------------------------
    if (contentType.includes('application/json')) {
      const raw: unknown = await req.json().catch(() => null)
      const texto = String((raw as Record<string, unknown>)?.texto || '').trim()
      if (!texto) {
        return NextResponse.json(
          { ok: false, error: 'Nenhum texto de edital foi fornecido.' },
          { status: 400 }
        )
      }
      if (texto.length > MAX_INPUT_CHARS) {
        return NextResponse.json(
          {
            ok: false,
            error: `Texto muito longo. O limite é de ${(MAX_INPUT_CHARS / 1000).toFixed(0)} mil caracteres.`,
          },
          { status: 400 }
        )
      }
      const salvo = kv ? await salvarEdital(kv, user.id, { conteudo: texto, origem: 'texto', nomeArquivo: null, chars: texto.length }) : false
      return NextResponse.json({
        ok: true,
        conteudo: texto,
        origem: 'texto',
        nomeArquivo: null,
        chars: texto.length,
        salvo,
        aviso:
          texto.length > MAX_INPUT_CHARS
            ? `Documento extenso (${texto.length.toLocaleString('pt-BR')} caracteres); a IA lerá o conteúdo por partes e pode demorar mais na análise.`
            : null,
      })
    }

    // --- Formato Multipart (upload de PDF) ----------------------------------
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      const arquivo = form.get('arquivo')

      if (!arquivo || typeof arquivo !== 'object' || !('arrayBuffer' in arquivo)) {
        return NextResponse.json(
          { ok: false, error: 'Envie um arquivo PDF para importar.' },
          { status: 400 }
        )
      }

      const file = arquivo as File
      const name = (file.name || '').toLowerCase()
      if (!name.endsWith('.pdf')) {
        return NextResponse.json(
          { ok: false, error: 'Envie um arquivo no formato .pdf.' },
          { status: 400 }
        )
      }

      const err = validatePdfBytes(file.size)
      if (err) {
        return NextResponse.json({ ok: false, error: err }, { status: 400 })
      }

      const bytes = new Uint8Array(await file.arrayBuffer())
      const extraido = await extractPdfTextWithOcr(bytes, file.name)
      if (!extraido.ok) {
        return NextResponse.json({ ok: false, error: extraido.error }, { status: 422 })
      }
      const conteudo = (extraido.text || '').trim()
      if (!conteudo) {
        return NextResponse.json(
          { ok: false, error: 'Não foi possível extrair texto deste PDF.' },
          { status: 422 }
        )
      }

      const salvo2 = kv ? await salvarEdital(kv, user.id, { conteudo, origem: 'pdf', nomeArquivo: file.name, chars: conteudo.length }) : false
      console.log(`[ia] import pdf ok: nome=${file.name} chars=${conteudo.length} ocr=${!!extraido.ocr} salvo=${salvo2} primeiro="${conteudo.slice(0, 60).replace(/\n/g, ' ')}"`)
      return NextResponse.json({
        ok: true,
        conteudo,
        origem: 'pdf',
        nomeArquivo: file.name,
        chars: conteudo.length,
        salvo: salvo2,
        ocr: Boolean(extraido.ocr),
        aviso:
          conteudo.length > MAX_INPUT_CHARS
            ? `Documento extenso (${conteudo.length.toLocaleString('pt-BR')} caracteres); a IA lerá o conteúdo por partes e pode demorar mais na análise.`
            : extraido.ocr
              ? 'PDF escaneado: o texto foi reconhecido por OCR. Confira se a leitura ficou correta e fiel ao documento.'
              : null,
      })
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
