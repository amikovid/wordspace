import OpenAI from 'openai'

let client

export function getOpenAI() {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set.')
    }
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return client
}

// Build the embedding input from an excerpt — same shape as
// scripts/generateEmbeddings.js so a new excerpt embedded here sits in
// the same semantic space as the seed.
export function embeddingInput({ text, author, my_thought }) {
  const a = author ? ` — ${author}` : ''
  const t = my_thought ? `\n(My thought: ${my_thought})` : ''
  return `${text}${a}${t}`
}

export async function embed(input) {
  const res = await getOpenAI().embeddings.create({
    model: 'text-embedding-3-small',
    input,
  })
  return res.data[0].embedding
}
