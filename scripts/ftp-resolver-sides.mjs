import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const repo = process.cwd()
const out = join(process.env.TEMP || '/tmp', 'pncp_resolver_sides')

function git(...args) {
  return execFileSync('git', args, { cwd: repo, encoding: 'utf8', maxBuffer: 200 * 1024 * 1024 })
}

const allowed = new Set([
  'src/app/(dashboard)/busca/page.tsx',
  'src/app/(dashboard)/oportunidades/page.tsx',
  'src/app/(seo)/licitacoes/page.tsx',
  'src/app/api/pncp/[...path]/route.ts',
])

mkdirSync(out, { recursive: true })
// limpa só os artefatos nossos
for (const f of readdirSync(out)) {
  if (f.endsWith('.stage1') || f.endsWith('.stage2') || f.endsWith('.stage3')) {
    try { execFileSync('rm', ['-f', join(out, f)]) } catch {}
  }
}

const unmerged = git('ls-files', '-u')
const perFile = new Map()
for (const line of unmerged.split(/\r?\n/)) {
  if (!line.trim()) continue
  const m = line.match(/^(\S+)\s+([0-9a-f]{40})\s+([123])\t(.+)$/)
  if (!m) continue
  const stage = Number(m[3])
  const path = m[4]
  if (!allowed.has(path)) continue
  if (!perFile.has(path)) perFile.set(path, {})
  perFile.get(path)[stage] = m[2]
}

for (const [path, sides] of perFile) {
  const safe = path.replace(/[^a-z0-9]+/gi, '_')
  for (const st of [1, 2, 3]) {
    const sha = sides[st]
    if (!sha) { console.log(`${path} :: sem stage ${st}`); continue }
    const dest = join(out, `${safe}.${st}.stage${st}`)
    writeFileSync(dest, git('cat-file', 'blob', sha))
  }
  console.log(`${path} OK`)
}

console.log('=== TAMANHOS ===')
for (const f of readdirSync(out).sort()) {
  console.log(`${f}=${statSync(join(out, f)).size}`)
}
console.log('RESOLVER_SIDES_DONE')
