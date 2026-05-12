// POST /api/ask
// Body: { question: string, k?: number, save?: boolean }
//
// Embeds the question, retrieves top-k excerpts by cosine similarity from
// pgvector, and asks Claude to answer using only those passages.

import OpenAI from 'openai'
import { query } from './_db.js'
import { complete, loadPrompt, parseJsonResponse, DEEP_MODEL } from './_claude.js'

let openai

function getOpenAI() {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set')
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return openai
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const { question, k = 8, save = false } = req.body || {}
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Body must include { question: string }' })
  }

  try {
    // 1. Embed the question
    const emb = await getOpenAI().embeddings.create({
      model: 'text-embedding-3-small',
      input: question,
    })
    const qvec = emb.data[0].embedding

    // 2. Retrieve top-k semantically nearest excerpts via pgvector cosine
    //    pgvector's <=> operator returns cosine distance (lower = closer)
    const { rows: excerpts } = await query(
      `
      select e.id, e.text, e.my_thought,
             b.title as book_title, b.author as book_author,
             coalesce(array_agg(t.name) filter (where t.name is not null), '{}') as themes,
             1 - (e.embedding <=> $1::vector) as similarity
      from excerpts e
      left join books b on b.id = e.book_id
      left join excerpt_themes et on et.excerpt_id = e.id
      left join themes t on t.id = et.theme_id
      where e.embedding is not null
      group by e.id, b.title, b.author
      order by e.embedding <=> $1::vector
      limit $2
      `,
      [JSON.stringify(qvec), k]
    )

    if (excerpts.length === 0) {
      return res.json({
        ok: true,
        answer: "Your library is still empty — nothing to draw on yet.",
        excerpt_refs: [],
        confidence: 'low',
      })
    }

    // 3. Ask Claude using the retrieved passages
    const prompt = loadPrompt('ask', { question, k: excerpts.length, excerpts })
    const raw = await complete({ prompt, model: DEEP_MODEL, maxTokens: 1024 })
    const parsed = parseJsonResponse(raw)

    // 4. Optionally save the answer as a reflection of kind=answer
    if (save) {
      await query(
        `insert into reflections (kind, body, excerpt_refs, metadata)
         values ('answer', $1, $2, $3)`,
        [parsed.answer, parsed.excerpt_refs || [], { question, confidence: parsed.confidence, gap: parsed.gap }]
      )
    }

    return res.json({ ok: true, ...parsed, sources: excerpts.map(e => ({ id: e.id, text: e.text, author: e.book_author, similarity: e.similarity })) })
  } catch (err) {
    console.error('ask endpoint failed:', err)
    return res.status(500).json({ error: err.message })
  }
}
