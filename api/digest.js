// GET /api/digest        — returns the most recent weekly digest
// POST /api/digest       — generates a new weekly digest from the last 7 days
//                          of excerpts. Used both manually and via Vercel Cron.

import { query } from './_db.js'
import { complete, loadPrompt, parseJsonResponse, DEEP_MODEL } from './_claude.js'

async function getLatest(res) {
  const { rows } = await query(`
    select id, body, excerpt_refs, theme_refs, metadata, created_at
    from reflections
    where kind = 'weekly_digest'
    order by created_at desc
    limit 1
  `)
  return res.json({ ok: true, digest: rows[0] || null })
}

async function generate(res) {
  const { rows: recent } = await query(`
    select e.id, e.text, e.my_thought, e.date_added,
           b.title as book_title, b.author as book_author,
           coalesce(array_agg(t.name) filter (where t.name is not null), '{}') as themes
    from excerpts e
    left join books b on b.id = e.book_id
    left join excerpt_themes et on et.excerpt_id = e.id
    left join themes t on t.id = et.theme_id
    where e.date_added > now() - interval '7 days'
    group by e.id, b.title, b.author
    order by e.date_added asc
  `)

  if (recent.length === 0) {
    return res.json({ ok: false, skipped: true, reason: 'No excerpts added in the last 7 days.' })
  }

  const { rows: themes } = await query(`select id, name, description from themes order by name`)
  const { rows: recentReflections } = await query(`
    select kind, body, created_at from reflections
    where kind in ('weekly_digest', 'deepening', 'tension')
    order by created_at desc limit 5
  `)

  const prompt = loadPrompt('digest-weekly', {
    recent_excerpts: recent,
    themes,
    recent_reflections: recentReflections,
  })

  // The digest is the headline output of the system — use Opus 4.7
  const raw = await complete({ prompt, model: DEEP_MODEL, maxTokens: 2048 })
  const parsed = parseJsonResponse(raw)

  const { rows: themeIds } = await query(
    `select id from themes where name = any($1)`,
    [parsed.themes_touched || []]
  )

  const { rows: inserted } = await query(
    `insert into reflections (kind, body, excerpt_refs, theme_refs, metadata)
     values ('weekly_digest', $1, $2, $3, $4) returning id, created_at`,
    [parsed.body, parsed.excerpt_refs || [], themeIds.map(r => r.id), { open_question: parsed.open_question || null }]
  )

  // If an open question was proposed, file it
  if (parsed.open_question) {
    await query(
      `insert into questions (text, excerpt_refs, theme_refs)
       values ($1, $2, $3)`,
      [parsed.open_question, parsed.excerpt_refs || [], themeIds.map(r => r.id)]
    )
  }

  return res.json({ ok: true, digest: { ...inserted[0], body: parsed.body, open_question: parsed.open_question } })
}

// Vercel Cron uses GET. Manual triggers can use either:
//   GET  /api/digest             → returns the most recent digest
//   GET  /api/digest?run=1       → generates a new one (cron uses this)
//   POST /api/digest             → generates a new one
export default async function handler(req, res) {
  try {
    const wantsGenerate =
      req.method === 'POST' ||
      (req.method === 'GET' && (req.query?.run === '1' || req.headers['x-vercel-cron']))
    if (wantsGenerate)        return await generate(res)
    if (req.method === 'GET') return await getLatest(res)
    return res.status(405).json({ error: 'GET or POST only' })
  } catch (err) {
    console.error('digest endpoint failed:', err)
    return res.status(500).json({ error: err.message })
  }
}
