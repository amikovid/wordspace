// Neon over WebSockets (port 443). Bypasses any firewall that blocks
// raw Postgres on 5432 — which most home / corporate / café networks do.
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

neonConfig.webSocketConstructor = ws

let pool

export function getPool() {
  if (!pool) {
    const conn = process.env.DATABASE_URL
    if (!conn) {
      throw new Error('DATABASE_URL is not set. Configure it in .env or in the Claude Desktop MCP env block.')
    }
    pool = new Pool({ connectionString: conn })
  }
  return pool
}

export async function query(text, params) {
  return getPool().query(text, params)
}

export async function queryOne(text, params) {
  const { rows } = await query(text, params)
  if (rows.length > 1) throw new Error(`queryOne returned ${rows.length} rows`)
  return rows[0] || null
}
