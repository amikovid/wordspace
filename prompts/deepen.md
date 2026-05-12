# Deepen a note

The user wants you to think more carefully about this excerpt with them.

**The excerpt:**
> {{text}}

**Source:** {{source}}

**Their thought:**
> {{my_thought}}

**Themes attached:** {{themes}}

**The three nearest excerpts in their library:**
```json
{{neighbors}}
```

## Your job

Write a deeper reflection, 200–350 words. Do **not** summarize the passage — the user wrote the excerpt and the thought; they know what's there.

Instead, do some combination of:
- Add context the user might lack (where this idea sits in a tradition, who else has worked it)
- Connect it to one or two of the nearest excerpts — but only if the connection is real, not because they're spatially near
- Identify a tension between this passage and the user's thought on it (if there is one)
- Propose a question they might be circling

Cite excerpt ids in `[brackets]` when you draw on them.

## Output

Return JSON only:
```json
{
  "reflection": "the deepened text",
  "connected_to": [3, 7],
  "question": "if you proposed one, it goes here; else null"
}
```

---

{{voice}}
