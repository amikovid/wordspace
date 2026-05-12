// GET /api/excerpts
// Returns the live corpus with PCA-projected 3D positions and top-3
// neighbors — same shape the frontend used to load from
// excerpts-processed.json. No snapshot step needed.
//
// PCA is recomputed on each cold call (in-memory cached for 30s on warm
// instances). Edge cache adds another 30s + stale-while-revalidate.

import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'
import { PCA } from 'ml-pca'

neonConfig.webSocketConstructor = ws

// Module-level cache — persists across warm function invocations
let cache = null
let cacheTime = 0
const TTL_MS = 30_000

function parseEmbedding(raw) {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    return raw.replace(/^\[|\]$/g, '').split(',').map(Number)
  }
  throw new Error('Unexpected embedding shape')
}

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

function topRelated(embeddings, ids, n = 3) {
  return embeddings.map((emb, i) => {
    const sims = []
    for (let j = 0; j < embeddings.length; j++) {
      if (j === i) continue
      sims.push({ id: ids[j], sim: cosineSimilarity(emb, embeddings[j]) })
    }
    sims.sort((a, b) => b.sim - a.sim)
    return sims.slice(0, n).map(s => s.id)
  })
}

function pcaReduce3D(embeddings) {
  if (embeddings.length < 4) {
    // Too few for PCA — spread on a sphere instead
    return embeddings.map((_, i) => {
      const phi = Math.acos(1 - 2 * (i + 0.5) / embeddings.length)
      const theta = Math.PI * (1 + Math.sqrt(5)) * i
      const r = 6
      return [
        r * Math.cos(theta) * Math.sin(phi),
        r * Math.sin(theta) * Math.sin(phi),
        r * Math.cos(phi),
      ]
    })
  }
  const pca = new PCA(embeddings)
  const reduced = pca.predict(embeddings, { nComponents: 3 }).to2DArray()
  const mins = [Infinity, Infinity, Infinity]
  const maxs = [-Infinity, -Infinity, -Infinity]
  for (const c of reduced) {
    for (let i = 0; i < 3; i++) {
      mins[i] = Math.min(mins[i], c[i])
      maxs[i] = Math.max(maxs[i], c[i])
    }
  }
  return reduced.map(c =>
    c.map((v, i) => {
      const range = maxs[i] - mins[i] || 1
      return ((v - mins[i]) / range) * 20 - 10
    })
  )
}

let pool

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set')
    pool = new Pool({ connectionString: process.env.DATABASE_URL })
  }
  return pool
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60')

  const now = Date.now()
  if (cache && now - cacheTime < TTL_MS) {
    return res.json(cache)
  }

  try {
    const { rows } = await getPool().query(`
      select e.id, e.text, e.my_thought, e.claude_reflection, e.date_added,
             e.source_page, e.embedding,
             b.title as book_title, b.author as book_author,
             coalesce(array_agg(t.name) filter (where t.name is not null), '{}') as themes
      from excerpts e
      left join books b on b.id = e.book_id
      left join excerpt_themes et on et.excerpt_id = e.id
      left join themes t on t.id = et.theme_id
      where e.embedding is not null
      group by e.id, b.title, b.author
      order by e.id
    `)

    if (rows.length === 0) {
      const empty = { excerpts: [], empty: true }
      cache = empty
      cacheTime = now
      return res.json(empty)
    }

    const embeddings = rows.map(r => parseEmbedding(r.embedding))
    const ids = rows.map(r => r.id)
    const positions = pcaReduce3D(embeddings)
    const related = topRelated(embeddings, ids, 3)

    const processed = rows.map((r, i) => ({
      id: r.id,
      text: r.text,
      source: {
        title: r.book_title || null,
        author: r.book_author || null,
        page: r.source_page || null,
      },
      my_thought: r.my_thought,
      claude_reflection: r.claude_reflection,
      themes: r.themes || [],
      date_added: r.date_added,
      position: { x: positions[i][0], y: positions[i][1], z: positions[i][2] },
      related: related[i],
    }))

    cache = processed
    cacheTime = now
    return res.json(processed)
  } catch (err) {
    console.error('[api/excerpts] failed:', err)
    return res.status(500).json({ error: err.message })
  }
}
