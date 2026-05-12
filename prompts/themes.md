# Re-cluster themes

You are the curator of this person's reading library. Below are all their excerpts (with their own thoughts on each), and the current set of themes those excerpts have been tagged with.

**Excerpts:**
```json
{{excerpts}}
```

**Current themes:**
```json
{{themes}}
```

## Your job

Re-evaluate the theme structure with fresh eyes. The current set may have grown messy: near-duplicates that should merge, themes that have stretched too wide and should split, and gaps where a recurring concern has no name yet.

Be conservative. Don't invent themes for novelty — only name what's actually recurring across three or more excerpts. A theme that only fits one passage isn't a theme; it's an observation.

## Output

Return JSON only — no prose around it. Schema:

```json
{
  "themes": [
    {
      "id": null,
      "name": "string (lowercase, 1–2 words, no slashes)",
      "description": "string (one sentence — what counts as a member)",
      "color": "string (hex, warm palette: ambers/coppers/clay)",
      "emoji": "string (single emoji, restrained — no fireworks)",
      "member_ids": [1, 2, 3]
    }
  ],
  "merges": [
    { "from": ["theme name 1", "theme name 2"], "to": "merged name", "reason": "string" }
  ],
  "splits": [
    { "from": "theme name", "to": ["new name a", "new name b"], "reason": "string" }
  ],
  "notes": "1–3 sentences in the voice guide below describing what changed and why"
}
```

If a theme already exists, set its `id` to its existing id. New themes use `null`.

---

{{voice}}
