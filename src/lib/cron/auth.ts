// ============================================================================
// Autenticação compartilhada dos endpoints de cron.
//
// Aceita MAIS DE UM segredo, permitindo ROTAÇÃO sem downtime e convivência com
// agendadores externos:
//   - CRON_SECRET      (principal — usado pelos workflows do GitHub)
//   - CRON_SECRET_ALT  (alternativo — ex.: agendador externo / valor em transição)
//
// O token pode vir em `x-cron-secret`, `?token=` ou `Authorization: Bearer ...`.
// Basta bater com QUALQUER segredo configurado (comparação simples; os valores
// são aleatórios longos, não há oráculo de timing relevante para HTTP).
// ============================================================================

import { NextResponse } from 'next/server'

function segredosValidos(): string[] {
  return [process.env.CRON_SECRET, process.env.CRON_SECRET_ALT].filter(
    (s): s is string => !!s && !s.includes('placeholder')
  )
}

export function tokenDoCron(req: Request): string {
  const url = new URL(req.url)
  const auth = req.headers.get('authorization') || ''
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : ''
  return req.headers.get('x-cron-secret') || url.searchParams.get('token') || bearer || ''
}

export function autorizarCron(req: Request): { ok: true } | { ok: false; response: Response } {
  const segredos = segredosValidos()
  if (segredos.length === 0) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, erro: 'CRON_SECRET não configurado.' },
        { status: 503 }
      ),
    }
  }
  const token = tokenDoCron(req)
  if (!token || !segredos.includes(token)) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, erro: 'Não autorizado.' }, { status: 401 }),
    }
  }
  return { ok: true }
}
