import { query } from '../lib/db.js'
import { embed } from '../lib/openai.js'

export default {
  name: 'wordspace_search',
  description:
    'Semantic search over the excerpts. Embeds the query and returns top-k excerpts by cosine similarity, with author, book, themes, and the user\'s own thoughts.',
  inputSchema: {
    type: 'object',
    properties: {
      query:    { type: 'string', description: 'Natural-language query (e.g. "what have I read about attention").' },
      k:        { type: 'integer', description: 'How many results to return. Default 10.', default: 10 },
    },
    required: ['query'],
  },
  handler: async ({ query: q, k = 10 }) => {
    const vec = await embed(q)
    const { rows } = await query(
      `
      select e.id, e.text, e.my_thought, e.claude_reflection, e.date_added,
             b.title as book_title, b.author as book_author, e.source_page,
             coalesce(array_agg(t.name) filter (where t.name is not null), '{}') as themes,
             1 - (e.embedding <=> $1::vector) as similarity
      from excerpts e
      left join books b on b.id = e.book_id
      left join excerpt_themes et on et.excerpt_id = e.id
      left join themes t on t.id = et.theme_id
      where e.embedding is not null
      group by e.id, b.title, b.author
      order by e.embedding <=> $1::vector
      limit $2
      `,
      [JSON.stringify(vec), k]
    )
    return { results: rows, count: rows.length }
  },
}
