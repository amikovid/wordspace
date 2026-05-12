import { query } from '../lib/db.js'

export default {
  name: 'wordspace_recent_reflections',
  description: "List recent reflections. Useful at the start of a chat to pick up the user's recent thinking, or to maintain voice consistency across sessions.",
  inputSchema: {
    type: 'object',
    properties: {
      kind:  { type: 'string', description: 'Filter by kind. Optional.' },
      limit: { type: 'integer', default: 10 },
    },
  },
  handler: async ({ kind, limit = 10 }) => {
    const params = []
    let where = ''
    if (kind) { params.push(kind); where = `where kind = $${params.length}` }
    params.push(limit)
    const { rows } = await query(
      `select id, kind, body, excerpt_refs, theme_refs, metadata, created_at
       from reflections
       ${where}
       order by created_at desc
       limit $${params.length}`,
      params
    )
    return { reflections: rows, count: rows.length }
  },
}
