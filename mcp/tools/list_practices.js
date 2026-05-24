import { query } from '../lib/db.js'

export default {
  name: 'wordspace_list_practices',
  description:
    "List practices. Default (no status filter) returns the active set — proposed | accepted | tried. ALWAYS call this before adding a new practice; if 2+ are already active, ask the user before piling on.",
  inputSchema: {
    type: 'object',
    properties: {
      status: { type: 'string', description: 'Filter to one status. Omit for active set (proposed | accepted | tried).' },
      limit:  { type: 'integer', default: 20 },
    },
  },
  handler: async ({ status, limit = 20 }) => {
    let where, params
    if (status) {
      where = `where status = $1`
      params = [status, limit]
    } else {
      where = `where status in ('proposed', 'accepted', 'tried')`
      params = [limit]
    }
    const { rows } = await query(
      `select id, body, excerpt_refs, theme_refs, status, scope, outcome,
              created_at, accepted_at, tried_at, completed_at
       from practices
       ${where}
       order by created_at desc
       limit $${params.length}`,
      params
    )
    return { practices: rows, count: rows.length }
  },
}
