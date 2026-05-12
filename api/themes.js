// POST /api/themes
// Re-clusters the user's themes by reading all excerpts + current themes,
// asking Claude to propose a refreshed theme structure, then upserting
// themes and rewriting the excerpt_themes join.
//
// Writes a `reflections` row of kind=`themes_refresh` so you can see what
// changed and when.

import { query } from './_db.js'
import { complete, loadPrompt, parseJsonResponse } from './_claude.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  try {
    const { rows: excerpts } = await query(`
      select e.id, e.text, e.my_thought,
             b.title as book_title, b.author as book_author,
             coalesce(array_agg(t.name) filter (where t.name is not null), '{}') as themes
      from excerpts e
      left join books b on b.id = e.book_id
      left join excerpt_themes et on et.excerpt_id = e.id
      left join themes t on t.id = et.theme_id
      group by e.id, b.title, b.author
      order by e.id
    `)

    const { rows: themes } = await query(`select id, name, description, color, emoji from themes order by name`)

    if (excerpts.length < 3) {
      return res.json({
        ok: false,
        skipped: true,
        reason: 'Not enough excerpts to cluster yet — need at least 3.',
        excerpt_count: excerpts.length,
      })
    }

    const prompt = loadPrompt('themes', { excerpts, themes })
    const raw = await complete({ prompt, maxTokens: 4096 })
    const result = parseJsonResponse(raw)

    // ─── Apply: upsert themes, rebuild join ────────────────────────────
    const nameToId = new Map(themes.map(t => [t.name.toLowerCase(), t.id]))

    for (const t of result.themes || []) {
      const key = t.name.toLowerCase()
      const existing = nameToId.get(key)
      if (existing) {
        await query(
          `update themes set description = $2, color = $3, emoji = $4, updated_at = now() where id = $1`,
          [existing, t.description, t.color, t.emoji]
        )
        t._id = existing
      } else {
        const { rows } = await query(
          `insert into themes (name, description, color, emoji) values ($1, $2, $3, $4) returning id`,
          [t.name, t.description, t.color, t.emoji]
        )
        t._id = rows[0].id
        nameToId.set(key, t._id)
      }
    }

    // Rebuild excerpt_themes from scratch using the new membership
    await query(`delete from excerpt_themes`)
    for (const t of result.themes || []) {
      for (const eid of (t.member_ids || [])) {
        await query(
          `insert into excerpt_themes (excerpt_id, theme_id) values ($1, $2) on conflict do nothing`,
          [eid, t._id]
        )
      }
    }

    // Log what happened
    await query(
      `insert into reflections (kind, body, theme_refs, metadata)
       values ('themes_refresh', $1, $2, $3)`,
      [
        result.notes || 'Themes refreshed.',
        (result.themes || []).map(t => t._id).filter(Boolean),
        { merges: result.merges || [], splits: result.splits || [] },
      ]
    )

    return res.json({ ok: true, themes: result.themes, merges: result.merges, splits: result.splits, notes: result.notes })
  } catch (err) {
    console.error('themes endpoint failed:', err)
    return res.status(500).json({ error: err.message })
  }
}
