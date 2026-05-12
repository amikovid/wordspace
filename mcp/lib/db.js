import pg from 'pg'

const { Pool } = pg

let pool

export function getPool() {
  if (!pool) {
    const conn = process.env.DATABASE_URL
    if (!conn) {
      throw new Error('DATABASE_URL is not set. Configure it in the project .env or in the MCP client env block.')
    }
    pool = new Pool({
      connectionString: conn,
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 10_000,
    })
  }
  return pool
}

export async function query(text, params) {
  return getPool().query(text, params)
}

// One-row helper; throws if more than one row comes back
export async function queryOne(text, params) {
  const { rows } = await query(text, params)
  if (rows.length > 1) throw new Error(`queryOne returned ${rows.length} rows`)
  return rows[0] || null
}
