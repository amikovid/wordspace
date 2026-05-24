import { queryOne } from '../lib/db.js'

export default {
  name: 'wordspace_get_profile',
  description:
    "Get the user's profile — about (prose summary), current_focus (what's alive right now), constraints (time/energy/life), and facts (array of short pattern observations sourced to excerpts or thoughts). Read this at the start of a fresh chat for voice grounding, and always before suggesting a practice.",
  inputSchema: { type: 'object', properties: {} },
  handler: async () => {
    const row = await queryOne(
      `select id, about, current_focus, constraints, facts, updated_at from profile where id = 1`
    )
    if (!row || (!row.about && !row.current_focus && (!row.facts || row.facts.length === 0))) {
      return {
        about: row?.about ?? null,
        current_focus: row?.current_focus ?? null,
        constraints: row?.constraints ?? null,
        facts: row?.facts ?? [],
        empty: true,
        note: 'Profile is empty. Before suggesting a practice, ask the user if they want you to draft one from their existing library (read excerpts + thoughts + reflections, propose a draft, get confirmation, then save via wordspace_update_profile).',
      }
    }
    return row
  },
}
