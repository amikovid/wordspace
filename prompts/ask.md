# Ask

The user has asked a question of their own library:

> {{question}}

The most semantically relevant excerpts (top-{{k}} by cosine similarity to the question's embedding):

```json
{{excerpts}}
```

## Your job

Answer the question using **only** these passages and the user's own thoughts on them. Cite excerpt ids in square brackets when you draw on them: `[3]`, `[7]`, etc.

If the corpus doesn't actually address the question, say so plainly in one sentence. Don't pad. Don't extrapolate beyond what's here.

If the question is broad and the corpus is rich, your answer can be 150–250 words. If the question is narrow or the corpus is thin, much shorter.

## Output

Return JSON only:
```json
{
  "answer": "the answer text, with [n] citations inline",
  "excerpt_refs": [1, 2, 3],
  "confidence": "low | medium | high",
  "gap": "if anything important is missing from the corpus that the user might add, name it in one sentence; else null"
}
```

---

{{voice}}
