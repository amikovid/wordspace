import 'dotenv/config'
import pg from 'pg'
import { PCA } from 'ml-pca'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// ─────────────────────────────────────────────────────────────────────────
// Snapshot Wordspace DB → src/data/excerpts-processed.json
//
// Reads all embedded excerpts from Neon, runs PCA on the full embedding
// matrix to produce stable 3D positions, computes top-3 nearest neighbors
// per excerpt, and writes the JSON snapshot the frontend reads at build
// time.
//
// Run this after adding excerpts via the MCP server (or via the seed
// pipeline) to refresh what the 3D visualization shows.
// ─────────────────────────────────────────────────────────────────────────

const { Pool } = pg
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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

// Neon stores vector(1536) as a string like "[0.1, 0.2, ...]" by default;
// parse it back into a JS array.
function parseEmbedding(raw) {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    return raw.replace(/^\[|\]$/g, '').split(',').map(Number)
  }
  throw new Error('Unexpected embedding shape')
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set in .env')
    process.exit(1)
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })

  console.log('📥 Reading excerpts from Neon...')
  const { rows } = await pool.query(`
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
    console.log('No embedded excerpts in DB yet. Nothing to snapshot.')
    await pool.end()
    return
  }

  console.log(`✓ Loaded ${rows.length} excerpts`)

  const embeddings = rows.map(r => parseEmbedding(r.embedding))
  const ids = rows.map(r => r.id)

  console.log('📐 PCA → 3D positions')
  const positions = pcaReduce3D(embeddings)

  console.log('🔗 Top-3 neighbors')
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

  // Also write back updated position + related to DB so MCP queries see them
  console.log('💾 Persisting positions + related ids back to DB')
  for (let i = 0; i < rows.length; i++) {
    await pool.query(
      `update excerpts set position_x = $1, position_y = $2, position_z = $3, related_ids = $4 where id = $5`,
      [positions[i][0], positions[i][1], positions[i][2], related[i], rows[i].id]
    )
  }

  const outPath = path.join(__dirname, '..', 'src', 'data', 'excerpts-processed.json')
  fs.writeFileSync(outPath, JSON.stringify(processed, null, 2))
  console.log(`✓ Wrote ${outPath}`)

  await pool.end()
  console.log('\n✨ Snapshot complete.\n')
}

main().catch(err => {
  console.error('❌', err)
  process.exit(1)
})
