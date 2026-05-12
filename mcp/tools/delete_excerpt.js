import { queryOne, query } from '../lib/db.js'

export default {
  name: 'wordspace_delete_excerpt',
  description:
    "Permanently delete an excerpt. Cascades to its theme links. Does NOT delete the book (other excerpts may share it). Use sparingly — for cleaning up duplicates or test entries.",
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
    },
    required: ['id'],
  },
  handler: async ({ id }) => {
    // Snapshot the row first so we can return a useful confirmation
    const row = await queryOne(
      `select id, text, book_id from excerpts where id = $1`,
      [id]
    )
    if (!row) return { error: `No excerpt with id ${id}` }

    await query(`delete from excerpts where id = $1`, [id])

    // Also: scrub this id out of any other excerpts' related_ids arrays
    // so dangling references don't accumulate.
    await query(
      `update excerpts set related_ids = array_remove(related_ids, $1::bigint)
       where related_ids @> array[$1::bigint]`,
      [id]
    )

    return {
      deleted_id: id,
      preview: row.text.slice(0, 80) + (row.text.length > 80 ? '…' : ''),
    }
  },
}
