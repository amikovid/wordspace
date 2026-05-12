import { query, queryOne } from '../lib/db.js'
import { embed, embeddingInput } from '../lib/openai.js'

export default {
  name: 'wordspace_create_excerpt',
  description:
    'Add a new excerpt to Wordspace. Embeds it, computes the 3 nearest neighbors, and links it to a book and any provided themes (creating them if needed). Returns the new excerpt id and its nearest neighbors so the caller can write a reflection.',
  inputSchema: {
    type: 'object',
    properties: {
      text:         { type: 'string', description: 'The excerpt text itself.' },
      book:         { type: 'string', description: 'Book title. Optional but recommended.' },
      author:       { type: 'string', description: 'Author. Optional but recommended.' },
      page:         { type: 'integer', description: 'Page number if known.' },
      my_thought:   { type: 'string', description: "The user's own note on the excerpt." },
      themes:       { type: 'array', items: { type: 'string' }, description: 'Theme names to attach. Existing themes are matched case-insensitively; new themes are created.' },
      image_url:    { type: 'string', description: 'URL of the original screenshot or photo, if any.' },
      source_kind:  { type: 'string', description: 'One of: manual, claude_chat, kindle, readwise, web, voice. Defaults to claude_chat.' },
    },
    required: ['text'],
  },
  handler: async (args) => {
    const {
      text, book, author, page, my_thought,
      themes = [], image_url, source_kind = 'claude_chat',
    } = args

    // 1. Find-or-create the book
    let bookId = null
    if (book || author) {
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
    }

    // 2. Embed
    const vec = await embed(embeddingInput({ text, author, my_thought }))

    // 3. Insert the excerpt
    const inserted = await queryOne(
      `insert into excerpts
         (text, book_id, source_page, my_thought, embedding, source_kind)
       values ($1, $2, $3, $4, $5::vector, $6)
       returning id, date_added`,
      [text, bookId, page || null, my_thought || null, JSON.stringify(vec), source_kind]
    )
    const excerptId = inserted.id

    // 4. Compute top-3 nearest neighbors via pgvector cosine
    const { rows: neighbors } = await query(
      `select e.id, e.text, e.my_thought,
              b.title as book_title, b.author as book_author,
              1 - (e.embedding <=> $1::vector) as similarity
       from excerpts e
       left join books b on b.id = e.book_id
       where e.embedding is not null and e.id != $2
       order by e.embedding <=> $1::vector
       limit 3`,
      [JSON.stringify(vec), excerptId]
    )

    // 5. Persist neighbor ids on the new row
    if (neighbors.length > 0) {
      await query(
        `update excerpts set related_ids = $1 where id = $2`,
        [neighbors.map(n => n.id), excerptId]
      )
    }

    // 6. Themes: find-or-create + link
    const attachedThemes = []
    for (const name of themes) {
      const clean = String(name).trim()
      if (!clean) continue
      let row = await queryOne(`select id from themes where lower(name) = lower($1)`, [clean])
      if (!row) {
        row = await queryOne(
          `insert into themes (name) values ($1) returning id`,
          [clean.toLowerCase()]
        )
      }
      await query(
        `insert into excerpt_themes (excerpt_id, theme_id) values ($1, $2) on conflict do nothing`,
        [excerptId, row.id]
      )
      attachedThemes.push({ id: row.id, name: clean })
    }

    return {
      excerpt_id:      excerptId,
      date_added:      inserted.date_added,
      book_id:         bookId,
      nearest_neighbors: neighbors,
      themes_attached: attachedThemes,
      note: 'Run `npm run snapshot` (from the wordspace repo) to refresh the 3D visualization with this new excerpt.',
    }
  },
}
