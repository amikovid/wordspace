import { queryOne } from '../lib/db.js'

const ALLOWED_FIELDS = ['text', 'my_thought', 'claude_reflection', 'source_page']

export default {
  name: 'wordspace_update_excerpt',
  description:
    "Patch fields on an existing excerpt. Note: changing `text` or `my_thought` does NOT re-embed the row automatically — run `npm run generate-embeddings` from the wordspace repo to refresh.",
  inputSchema: {
    type: 'object',
    properties: {
      id:               { type: 'integer' },
      text:             { type: 'string' },
      my_thought:       { type: 'string' },
      claude_reflection:{ type: 'string' },
      source_page:      { type: 'integer' },
    },
    required: ['id'],
  },
  handler: async (args) => {
    const { id, ...patch } = args
    const fields = Object.keys(patch).filter(k => ALLOWED_FIELDS.includes(k))
    if (fields.length === 0) return { error: 'No allowed fields to update.' }

    const setSql = fields.map((f, i) => `${f} = $${i + 2}`).join(', ')
    const values = [id, ...fields.map(f => patch[f])]
    const row = await queryOne(`update excerpts set ${setSql} where id = $1 returning id`, values)
    if (!row) return { error: `No excerpt with id ${id}` }
    return { excerpt_id: row.id, updated: fields }
  },
}
