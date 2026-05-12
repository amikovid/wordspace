import { queryOne, query } from '../lib/db.js'

export default {
  name: 'wordspace_get_excerpt',
  description: 'Fetch a single excerpt by id, with its book, themes, and the 3 nearest neighbors.',
  inputSchema: {
    type: 'object',
    properties: { id: { type: 'integer' } },
    required: ['id'],
  },
  handler: async ({ id }) => {
    const excerpt = await queryOne(
      `
      select e.id, e.text, e.my_thought, e.claude_reflection,
             e.source_page, e.date_added, e.source_kind, e.related_ids,
             b.title as book_title, b.author as book_author
      from excerpts e
      left join books b on b.id = e.book_id
      where e.id = $1
      `,
      [id]
    )
    if (!excerpt) return { error: `No excerpt with id ${id}` }

    const { rows: themes } = await query(
      `select t.id, t.name, t.description, t.color, t.emoji
       from themes t
       join excerpt_themes et on et.theme_id = t.id
       where et.excerpt_id = $1`,
      [id]
    )

    let neighbors = []
    if (excerpt.related_ids?.length > 0) {
      const { rows } = await query(
        `select e.id, e.text, b.author as book_author
         from excerpts e
         left join books b on b.id = e.book_id
         where e.id = any($1)`,
        [excerpt.related_ids]
      )
      // preserve original order
      neighbors = excerpt.related_ids
        .map(nid => rows.find(r => r.id === nid))
        .filter(Boolean)
    }

    return { excerpt, themes, neighbors }
  },
}
