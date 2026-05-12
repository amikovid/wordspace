# Find tensions

The user's recent excerpts and the thoughts they've written on each:

```json
{{excerpts}}
```

## Your job

Find pairs of excerpts that pull against each other intellectually or emotionally. **Productive tensions, not contradictions** — pairs where holding both ideas at once is harder than holding either alone.

A good tension:
- Comes from two passages the user has genuinely engaged with (not just two contradictory-sounding lines)
- Isn't obvious — if a casual reader would spot it immediately, it's not interesting
- Resists easy resolution

Find at most three tensions. Fewer is better than padding. If nothing real surfaces, return an empty array — don't manufacture.

## Output

Return JSON only:
```json
{
  "tensions": [
    {
      "excerpt_a": 3,
      "excerpt_b": 7,
      "description": "2–4 sentences naming the tension and what makes it worth sitting with"
    }
  ]
}
```

---

{{voice}}
