import { query, queryOne } from '../lib/db.js'

export default {
  name: 'wordspace_add_reflection',
  description:
    "Store a reflection. Two flavors: (a) attach a reflection to a specific excerpt — writes to excerpts.claude_reflection. (b) standalone reflection — writes to the reflections table with a kind (weekly_digest | tension | deepening | pattern | answer | note).",
  inputSchema: {
    type: 'object',
    properties: {
      excerpt_id:   { type: 'integer', description: 'If set, the body becomes that excerpt\'s claude_reflection.' },
      kind:         { type: 'string', description: 'Required for standalone reflections. One of: weekly_digest, tension, deepening, pattern, answer, note.' },
      body:         { type: 'string', description: 'The reflection text.' },
      excerpt_refs: { type: 'array', items: { type: 'integer' }, description: 'Other excerpts this reflection references.' },
      theme_refs:   { type: 'array', items: { type: 'integer' }, description: 'Themes this reflection touches.' },
      metadata:     { type: 'object', description: 'Free-form JSON metadata.' },
    },
    required: ['body'],
  },
  handler: async (args) => {
    const { excerpt_id, kind, body, excerpt_refs = [], theme_refs = [], metadata = {} } = args

    if (excerpt_id) {
      const row = await queryOne(
        `update excerpts set claude_reflection = $2 where id = $1 returning id`,
        [excerpt_id, body]
      )
      if (!row) return { error: `No excerpt with id ${excerpt_id}` }
      return { excerpt_id: row.id, stored: 'on_excerpt' }
    }

    if (!kind) return { error: 'kind is required for standalone reflections' }
    const inserted = await queryOne(
      `insert into reflections (kind, body, excerpt_refs, theme_refs, metadata)
       values ($1, $2, $3, $4, $5)
       returning id, created_at`,
      [kind, body, excerpt_refs, theme_refs, metadata]
    )
    return { reflection_id: inserted.id, created_at: inserted.created_at, stored: 'standalone' }
  },
}
