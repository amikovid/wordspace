import { query } from '../lib/db.js'

export default {
  name: 'wordspace_list_recent',
  description: 'List the most recent excerpts, newest first. Useful for picking up context when a chat hands off mid-session.',
  inputSchema: {
    type: 'object',
    properties: {
      limit:  { type: 'integer', description: 'How many to return. Default 20.', default: 20 },
      since:  { type: 'string', description: 'ISO timestamp; only return excerpts added after this. Optional.' },
    },
  },
  handler: async ({ limit = 20, since }) => {
    const params = []
    let where = ''
    if (since) { params.push(since); where = `where e.date_added > $${params.length}` }
    params.push(limit)
    const { rows } = await query(
      `
      select e.id, e.text, e.my_thought, e.date_added,
             b.title as book_title, b.author as book_author,
             coalesce(array_agg(t.name) filter (where t.name is not null), '{}') as themes
      from excerpts e
      left join books b on b.id = e.book_id
      left join excerpt_themes et on et.excerpt_id = e.id
      left join themes t on t.id = et.theme_id
      ${where}
      group by e.id, b.title, b.author
      order by e.date_added desc
      limit $${params.length}
      `,
      params
    )
    return { excerpts: rows, count: rows.length }
  },
}
