import { query, queryOne } from '../lib/db.js'

export default {
  name: 'wordspace_update_profile',
  description:
    "Update the user profile. Pass any of about / current_focus / constraints / facts. `facts` REPLACES the existing array — to add or remove a fact, call wordspace_get_profile first, modify the array, then send the full new array. ALWAYS show the user proposed changes before calling this — never silently mutate the profile.",
  inputSchema: {
    type: 'object',
    properties: {
      about:         { type: 'string', description: '1–3 sentence prose summary of who the user is right now.' },
      current_focus: { type: 'string', description: 'What is alive for them now — the questions or projects they are actively working with.' },
      constraints:   { type: 'string', description: 'Time, energy, life context the practice layer should respect.' },
      facts: {
        type: 'array',
        description: 'Replaces the existing facts array. Each fact is a short observation of pattern, not aspiration.',
        items: {
          type: 'object',
          properties: {
            id:         { type: 'string' },
            fact:       { type: 'string' },
            source:     { type: 'string', description: 'Where this came from (e.g. "inferred from excerpt 6", "stated 2026-05-14").' },
            confidence: { type: 'string', description: 'low | medium | high' },
            added_at:   { type: 'string', description: 'ISO timestamp; will be auto-set if omitted.' },
          },
          required: ['fact'],
        },
      },
    },
  },
  handler: async (args) => {
    // Ensure the singleton row exists
    await query(`insert into profile (id) values (1) on conflict do nothing`)

    const sets = []
    const values = []

    const textField = (k) => {
      if (args[k] !== undefined) {
        values.push(args[k])
        sets.push(`${k} = $${values.length}`)
      }
    }
    textField('about')
    textField('current_focus')
    textField('constraints')

    if (Array.isArray(args.facts)) {
      const normalized = args.facts.map((f, i) => ({
        id:         f.id || `f_${Date.now()}_${i}`,
        fact:       f.fact,
        source:     f.source || null,
        confidence: f.confidence || 'medium',
        added_at:   f.added_at || new Date().toISOString(),
      }))
      values.push(JSON.stringify(normalized))
      sets.push(`facts = $${values.length}::jsonb`)
    }

    if (sets.length === 0) return { error: 'Nothing to update.' }
    sets.push('updated_at = now()')

    const row = await queryOne(
      `update profile set ${sets.join(', ')} where id = 1
       returning id, about, current_focus, constraints, facts, updated_at`,
      values
    )
    return row
  },
}
