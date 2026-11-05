// Aplica uma migration .sql no banco do Supabase usando DATABASE_URL.
// Uso: node scripts/aplicar-migration.mjs supabase/migrations/20261104_analista.sql
import { readFileSync } from 'node:fs'
import { Client } from 'pg'

const arquivo = process.argv[2]
if (!arquivo) {
  console.error('Informe o caminho da migration.')
  process.exit(1)
}

// Carrega DATABASE_URL do .env.local (sem depender de dotenv).
const env = readFileSync('.env.local', 'utf8')
const linha = env.split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='))
if (!linha) {
  console.error('DATABASE_URL não encontrada no .env.local.')
  process.exit(1)
}
const connectionString = linha.slice('DATABASE_URL='.length).replace(/^["']|["']$/g, '')

const sql = readFileSync(arquivo, 'utf8')
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })

try {
  await client.connect()
  await client.query('begin')
  await client.query(sql)
  await client.query('commit')
  console.log(`OK: ${arquivo} aplicada.`)
} catch (erro) {
  await client.query('rollback').catch(() => {})
  console.error('FALHA:', erro.message)
  process.exitCode = 1
} finally {
  await client.end()
}
