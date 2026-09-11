import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const repo = process.cwd()
const out = join(process.env.TEMP || '/tmp', 'pncp_sides')
const ALVO = new Set([
  'src/app/(dashboard)/busca/page.tsx',
  'src/app/(dashboard)/oportunidades/page.tsx',
  'src/app/(seo)/licitacoes/page.tsx',
  'src/app/api/pncp/[...path]/route.ts',
])

function git(...args) {
  return execFileSync('git', args, { cwd: repo, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 })
}

// Limpa e recria a pasta de saída
mkdirSync(out, { recursive: true })
for (const f of readdirSync(out)) {
  if (f.startsWith('blob.'))   try {
    unlinkSync(join(out, f))
  } catch {}
}

// git ls-files -u  →  linhas "modo sha stage0000 path" para arquivos com conflito
const u = git('ls-files', '-u').split(/\r?\n/)
const sides = {}
for (const line of u) {
  const m = line.match(/^\S+\s+([0-9a-f]{40})\s+([123])\t(.+)$/)
  if (!m) continue
  const sha = m[1]
  const stage = Number(m[2])
  const path = m[3]
  if (!ALVO.has(path)) continue
  if (!sides[path]) sides[path] = {}
  sides[path][stage] = sha
}

for (const [path, st] of Object.entries(sides)) {
  const safe = path.replace(/[^A-Za-z0-9]+/g, '_')
  for (const [stage, sha] of Object.entries(st)) {
    const blob = git('cat-file', 'blob', sha)
    const stageName = stage === '1' ? 'BASE' : stage === '2' ? 'HEAD_LOCAL' : 'REMOTO_ORIGIN'
    writeFileSync(join(out, `blob.${safe}.${stageName}.tsx`), blob, 'utf8')
  }
  console.log('OK=' + path)
}

console.log('=== BLOBS EXTRAÍDOS ===')
for (const f of readdirSync(out).sort()) {
  console.log(f + '=' + statSync(join(out, f)).size)
}
console.log('FIM_EXTRACAO')
