import { query } from '../lib/db.js'

export default {
  name: 'wordspace_list_themes',
  description: 'List all themes, with the count of excerpts attached to each.',
  inputSchema: { type: 'object', properties: {} },
  handler: async () => {
    const { rows } = await query(
      `
      select t.id, t.name, t.description, t.color, t.emoji,
             count(et.excerpt_id) as excerpt_count
      from themes t
      left join excerpt_themes et on et.theme_id = t.id
      group by t.id
      order by excerpt_count desc, t.name
      `
    )
    return { themes: rows, count: rows.length }
  },
}
