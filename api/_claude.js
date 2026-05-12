// Shared Anthropic client + prompt loader for analysis endpoints.
//
// Prompts live in /prompts/<name>.md. Substitutions use {{name}} tokens.
// Each verb expects Claude to return strict JSON, so we instruct that
// in the prompts and parse defensively here.

import Anthropic from '@anthropic-ai/sdk'
import fs from 'node:fs'
import path from 'node:path'

let client

export function getClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set')
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return client
}

let voiceCache

function getVoice() {
  if (voiceCache == null) {
    try {
      voiceCache = fs.readFileSync(
        path.join(process.cwd(), 'prompts', '_voice.md'),
        'utf-8'
      )
    } catch {
      voiceCache = ''
    }
  }
  return voiceCache
}

export function loadPrompt(name, substitutions = {}) {
  const filePath = path.join(process.cwd(), 'prompts', `${name}.md`)
  let text = fs.readFileSync(filePath, 'utf-8')
  // Auto-substitute the shared voice guide if the prompt references it
  // and the caller didn't already provide one.
  const subs = { voice: getVoice(), ...substitutions }
  for (const [k, v] of Object.entries(subs)) {
    const value = typeof v === 'string' ? v : JSON.stringify(v, null, 2)
    text = text.replaceAll(`{{${k}}}`, value)
  }
  return text
}

// Routine analysis: Sonnet 4.6 — good enough, much cheaper than Opus
const DEFAULT_MODEL = 'claude-sonnet-4-6'
// Heavy work (deepenings, weekly digest, "ask"): Opus 4.7
const DEEP_MODEL    = 'claude-opus-4-7'

export async function complete({ prompt, model = DEFAULT_MODEL, maxTokens = 4096, system }) {
  const c = getClient()
  const msg = await c.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: prompt }],
  })
  // Concatenate all text blocks
  return msg.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('')
}

export function parseJsonResponse(raw) {
  // Be forgiving: Claude sometimes wraps JSON in ```json fences or
  // prefixes it with a sentence. Pull out the first {...} or [...] block.
  const m = raw.match(/```json\s*([\s\S]*?)```/) || raw.match(/```\s*([\s\S]*?)```/)
  const candidate = m ? m[1] : raw
  const start = candidate.search(/[{[]/)
  if (start === -1) throw new Error('No JSON found in response')
  return JSON.parse(candidate.slice(start))
}

export { DEFAULT_MODEL, DEEP_MODEL }
