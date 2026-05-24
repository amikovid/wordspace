import { queryOne } from '../lib/db.js'

const STATUS_TIMESTAMPS = {
  accepted:  'accepted_at',
  tried:     'tried_at',
  completed: 'completed_at',
}

const VALID_STATUSES = ['accepted', 'declined', 'tried', 'completed']

export default {
  name: 'wordspace_log_practice_outcome',
  description:
    "Record an outcome on a practice — closes the feedback loop. status: accepted | declined | tried | completed. body: optional text describing what happened (encouraged — outcomes are what teach the library about the user). After logging, consider whether the outcome reveals a new profile fact worth adding via wordspace_update_profile.",
  inputSchema: {
    type: 'object',
    properties: {
      id:     { type: 'integer' },
      status: { type: 'string', description: 'accepted | declined | tried | completed' },
      body:   { type: 'string', description: 'What happened. Optional but encouraged.' },
    },
    required: ['id', 'status'],
  },
  handler: async ({ id, status, body }) => {
    if (!VALID_STATUSES.includes(status)) {
      return { error: `status must be one of ${VALID_STATUSES.join(', ')}` }
    }

    const sets = [`status = $2`]
    const values = [id, status]
    if (body !== undefined) {
      values.push(body)
      sets.push(`outcome = $${values.length}`)
    }
    const ts = STATUS_TIMESTAMPS[status]
    if (ts) sets.push(`${ts} = now()`)

    const row = await queryOne(
      `update practices set ${sets.join(', ')} where id = $1
       returning id, body, status, outcome, accepted_at, tried_at, completed_at`,
      values
    )
    if (!row) return { error: `No practice with id ${id}` }
    return row
  },
}
