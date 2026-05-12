// Shared Neon connection pool for serverless API routes.
// Vercel reuses warm function instances so a module-level pool is the
// right shape — one pool per region, reused across invocations.

import pg from 'pg'

const { Pool } = pg

let pool

export function getPool() {
  if (!pool) {
    const conn = process.env.DATABASE_URL
    if (!conn) throw new Error('DATABASE_URL is not set')
    pool = new Pool({
      connectionString: conn,
      ssl: { rejectUnauthorized: false },
      max: 3,                  // small — serverless concurrency is per-instance
      idleTimeoutMillis: 10_000,
    })
  }
  return pool
}

export async function query(text, params) {
  const p = getPool()
  return p.query(text, params)
}
