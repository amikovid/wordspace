import { queryOne } from '../lib/db.js'

export default {
  name: 'wordspace_add_practice',
  description:
    "Propose a new practice. The body MUST satisfy: (1) a specific moment anchor (after coffee tomorrow / before bed Friday / on the walk home), (2) one single action verb + concrete object, (3) a clear stop condition, (4) < 15 minutes the first time, (5) connect to 1-2 specific excerpts cited as [id]. Forbidden: 'consider' / 'reflect on' / 'spend time' / 'be mindful' / 'set intention' / 'build a habit' / daily-recurrence-on-day-one. ONE practice per call, never a menu of options.",
  inputSchema: {
    type: 'object',
    properties: {
      body:         { type: 'string', description: "The practice text. 1-3 sentences. Brief setup citing [id]s, then the action + stop condition." },
      excerpt_refs: { type: 'array', items: { type: 'integer' }, description: 'Excerpt ids the practice draws on.' },
      theme_refs:   { type: 'array', items: { type: 'integer' }, description: 'Theme ids the practice touches.' },
      scope:        { type: 'string', description: 'weekly | on_demand | per_excerpt. Defaults to weekly.' },
    },
    required: ['body'],
  },
  handler: async ({ body, excerpt_refs = [], theme_refs = [], scope = 'weekly' }) => {
    const row = await queryOne(
      `insert into practices (body, excerpt_refs, theme_refs, scope)
       values ($1, $2, $3, $4)
       returning id, body, excerpt_refs, theme_refs, scope, status, created_at`,
      [body, excerpt_refs, theme_refs, scope]
    )
    return row
  },
}
