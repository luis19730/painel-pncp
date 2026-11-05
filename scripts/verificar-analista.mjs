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
    and c.relname in ('analista_config','analista_analises','kanban_colunas','kanban_cartoes','kanban_notas','kanban_checklist','kanban_historico')
  order by c.relname
`)
console.log(tabelas.rows)

const colunas = await client.query(`
  select table_name, column_name, data_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name in ('kanban_notas','kanban_cartoes')
    and column_name in ('tipo','analise_id','prazo_proposta','etiquetas','anexos')
  order by table_name, column_name
`)
console.log(colunas.rows)

await client.end()
