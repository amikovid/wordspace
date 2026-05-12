// One-shot: apply scripts/schema.sql to the Neon DB pointed to by DATABASE_URL.
// Idempotent — schema uses `create extension if not exists` / `create table if not exists`.

import 'dotenv/config'
import pg from 'pg'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set in .env')
    process.exit(1)
  }
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8')
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  console.log('📜 Applying schema to Neon...')
  await client.query(sql)
  console.log('✓ Schema applied.')
  await client.end()
}

main().catch(err => {
  console.error('❌', err)
  process.exit(1)
})
