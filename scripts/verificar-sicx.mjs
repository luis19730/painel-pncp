import { readFileSync } from 'node:fs'
import { Client } from 'pg'

const env = readFileSync('.env.local', 'utf8')
const linha = env.split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='))
const connectionString = linha.slice('DATABASE_URL='.length).replace(/^["']|["']$/g, '')
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })
await client.connect()

const tabelas = await client.query(`
  select c.relname as tabela, c.relrowsecurity as rls,
         (select count(*) from pg_policies p where p.tablename = c.relname) as policies
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and (c.relname like 'sicx\\_%' escape '\\')
  order by c.relname
`)
console.table(tabelas.rows)

const contagens = await client.query(`
  select 'status' as t, count(*) from public.sicx_status
  union all select 'normas', count(*) from public.sicx_normas
  union all select 'almoxarifados', count(*) from public.sicx_almoxarifados
`)
console.table(contagens.rows)

await client.end()
