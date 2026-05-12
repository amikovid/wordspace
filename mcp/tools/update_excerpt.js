import { query, queryOne } from '../lib/db.js'
import { embed, embeddingInput } from '../lib/openai.js'

const TEXT_FIELDS = ['text', 'my_thought', 'claude_reflection', 'source_page']

export default {
  name: 'wordspace_update_excerpt',
  description:
    "Patch an existing excerpt. Can update text, my_thought, claude_reflection, page, book/author, and themes (replaces existing theme set). If text or my_thought changes, the embedding is automatically regenerated and the 3D position will refresh on the next page load.",
  inputSchema: {
    type: 'object',
    properties: {
      id:               { type: 'integer' },
      text:             { type: 'string' },
      my_thought:       { type: 'string' },
      claude_reflection:{ type: 'string' },
      source_page:      { type: 'integer' },
      book:             { type: 'string', description: 'Book title. Pair with author. Will find-or-create the book.' },
      author:           { type: 'string' },
      themes:           { type: 'array', items: { type: 'string' }, description: 'Replaces the existing theme set for this excerpt.' },
    },
    required: ['id'],
  },
  handler: async (args) => {
    const { id, book, author, themes, ...rest } = args
    const fields = Object.keys(rest).filter(k => TEXT_FIELDS.includes(k))
    const updates = []
    const summary = []

    // ─── Book / author ─────────────────────────────────────────────────
    let bookId
    if (book !== undefined || author !== undefined) {
      const existing = await queryOne(
        `select id from books where lower(title) = lower($1) and lower(coalesce(author, '')) = lower(coalesce($2, ''))`,
        [book || '', author || '']
      )
      if (existing) bookId = existing.id
      else {
        const inserted = await queryOne(
          `insert into books (title, author) values ($1, $2) returning id`,
          [book || '(unknown)', author || null]
        )
        bookId = inserted.id
      }
      summary.push(`book → "${book ?? '(unchanged)'}" by ${author ?? '(unchanged)'}`)
    }

    // ─── Themes (replace existing set) ─────────────────────────────────
    if (themes !== undefined) {
      await query(`delete from excerpt_themes where excerpt_id = $1`, [id])
      const attached = []
      for (const name of themes) {
        const clean = String(name).trim()
        if (!clean) continue
        let row = await queryOne(`select id from themes where lower(name) = lower($1)`, [clean])
        if (!row) {
          row = await queryOne(`insert into themes (name) values ($1) returning id`, [clean.toLowerCase()])
        }
        await query(
          `insert into excerpt_themes (excerpt_id, theme_id) values ($1, $2) on conflict do nothing`,
          [id, row.id]
        )
        attached.push(clean)
      }
      summary.push(`themes → [${attached.join(', ')}]`)
    }

    // ─── Re-embed if text or my_thought changed ────────────────────────
    let newEmbedding = null
    if (fields.includes('text') || fields.includes('my_thought')) {
      // Fetch current row to fill in fields not being updated
      const current = await queryOne(
        `select e.text, e.my_thought, b.author from excerpts e left join books b on b.id = e.book_id where e.id = $1`,
        [id]
      )
      if (!current) return { error: `No excerpt with id ${id}` }
      const text       = rest.text       ?? current.text
      const my_thought = rest.my_thought ?? current.my_thought
      const eAuthor    = author          ?? current.author
      newEmbedding = await embed(embeddingInput({ text, author: eAuthor, my_thought }))
      summary.push('embedding → regenerated')
    }

    // ─── Build and run the UPDATE ──────────────────────────────────────
    const setClauses = []
    const values = [id]

    for (const f of fields) {
      values.push(rest[f])
      setClauses.push(`${f} = $${values.length}`)
      summary.push(`${f} updated`)
    }
    if (bookId !== undefined) {
      values.push(bookId)
      setClauses.push(`book_id = $${values.length}`)
    }
    if (newEmbedding) {
      values.push(JSON.stringify(newEmbedding))
      setClauses.push(`embedding = $${values.length}::vector`)
    }

    if (setClauses.length > 0) {
      const row = await queryOne(
        `update excerpts set ${setClauses.join(', ')} where id = $1 returning id`,
        values
      )
      if (!row) return { error: `No excerpt with id ${id}` }
    }

    // ─── If we re-embedded, recompute the 3 nearest neighbors ──────────
    if (newEmbedding) {
      const { rows: neighbors } = await query(
        `select id from excerpts where embedding is not null and id != $1
         order by embedding <=> $2::vector limit 3`,
        [id, JSON.stringify(newEmbedding)]
      )
      await query(
        `update excerpts set related_ids = $1 where id = $2`,
        [neighbors.map(n => n.id), id]
      )
    }

    return {
      excerpt_id: id,
      summary,
      note: summary.length === 0 ? 'Nothing to update.' : undefined,
    }
  },
}
