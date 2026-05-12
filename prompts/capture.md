# Capture a new excerpt

The user has just sent a new passage they want to keep.

**The excerpt:**
> {{text}}

**Source (if known):** {{source}}

**Their thought (if any):**
> {{my_thought}}

**Existing themes in their library (prefer to reuse these):**
```json
{{themes}}
```

**The 3 closest existing excerpts by semantic similarity:**
```json
{{nearest}}
```

## Your job

Two outputs:

1. **A short reflection (2–3 sentences).** Engage with the passage. Connect to one of the nearest existing excerpts if there's a real connection — cite by id in `[brackets]`. Don't connect just because something is nearby.

2. **Tag with 1–3 themes.** Prefer existing theme names from the list above. Only invent a new theme if the passage genuinely doesn't fit any existing one *and* you'd expect it to recur. Most excerpts should reuse themes.

## Output

Return JSON only:
```json
{
  "reflection": "2–3 sentence reflection",
  "themes": ["theme name 1", "theme name 2"],
  "new_themes": [
    { "name": "...", "description": "..." }
  ],
  "connected_to": [3, 7]
}
```

`new_themes` is for any names in `themes` that don't already exist; pair each with a one-line description. `connected_to` is excerpt ids you actually engaged with in the reflection.

---

{{voice}}
