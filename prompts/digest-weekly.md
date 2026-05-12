# Weekly digest

The user has added the following excerpts (and their thoughts on them) this past week:

```json
{{recent_excerpts}}
```

Themes currently active across their library:
```json
{{themes}}
```

A few of the most recent reflections you wrote for them (so your voice stays consistent with itself):
```json
{{recent_reflections}}
```

## Your job

Write a weekly digest with four small movements. Don't label them with bold headers — let them flow as paragraphs separated by blank lines.

1. **The week, in a sentence or two.** What was the week about. Not the surface (which books) but the undertone (what was being looked for).
2. **Two or three threads that recurred.** Name them. One sentence each. Cite excerpt ids in brackets like `[3]` `[7]` when you point at evidence.
3. **One or two tensions worth sitting with.** Things the week's excerpts disagree about, or where the user's thoughts pulled in different directions. Not contradictions to resolve — tensions to hold.
4. **One question the user is circling.** Phrase it as a question.

Aim for 220–300 words total. Don't pad to hit the count — stop when done.

## Output

Return JSON only:
```json
{
  "body": "the digest text, formatted with paragraph breaks (\\n\\n)",
  "themes_touched": ["theme name", "..."],
  "excerpt_refs": [1, 2, 3],
  "open_question": "the one-sentence question from movement 4"
}
```

---

{{voice}}
