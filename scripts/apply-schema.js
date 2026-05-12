// One-shot: apply scripts/schema.sql to the Neon DB pointed to by DATABASE_URL.
// Idempotent — schema uses `create extension if not exists` / `create table if not exists`.
//
// Uses Neon's WebSocket driver (port 443) so it works on networks that
// block raw Postgres traffic on 5432.

import 'dotenv/config'
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

neonConfig.webSocketConstructor = ws

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set in .env')
    process.exit(1)
  }
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8')
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  console.log('📜 Applying schema to Neon over WebSocket (port 443)...')
  await pool.query(sql)
  console.log('✓ Schema applied.')
  await pool.end()
}

main().catch(err => {
  console.error('❌', err)
  process.exit(1)
})
