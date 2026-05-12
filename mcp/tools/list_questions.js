import { query } from '../lib/db.js'

export default {
  name: 'wordspace_list_questions',
  description: 'List open questions (or filter by status).',
  inputSchema: {
    type: 'object',
    properties: {
      status: { type: 'string', description: 'open | exploring | answered | retired. Defaults to open.' },
      limit:  { type: 'integer', default: 25 },
    },
  },
  handler: async ({ status = 'open', limit = 25 }) => {
    const { rows } = await query(
      `select id, text, status, excerpt_refs, theme_refs, created_at, updated_at
       from questions
       where status = $1
       order by created_at desc
       limit $2`,
      [status, limit]
    )
    return { questions: rows, count: rows.length }
  },
}
