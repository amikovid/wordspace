import { queryOne } from '../lib/db.js'

export default {
  name: 'wordspace_add_question',
  description: 'File an open question — something the user is circling, surfaced by Claude or proposed by the user.',
  inputSchema: {
    type: 'object',
    properties: {
      text:         { type: 'string' },
      excerpt_refs: { type: 'array', items: { type: 'integer' } },
      theme_refs:   { type: 'array', items: { type: 'integer' } },
      status:       { type: 'string', description: 'open | exploring | answered | retired. Defaults to open.' },
    },
    required: ['text'],
  },
  handler: async ({ text, excerpt_refs = [], theme_refs = [], status = 'open' }) => {
    const row = await queryOne(
      `insert into questions (text, excerpt_refs, theme_refs, status)
       values ($1, $2, $3, $4)
       returning id, created_at`,
      [text, excerpt_refs, theme_refs, status]
    )
    return { question_id: row.id, created_at: row.created_at }
  },
}
