// ─── Layout strategies for the 3D constellation ───────────────────────
// Each layout takes the array of excerpts (with `position` from the
// semantic baseline) and returns a map of id → { x, y, z }.
// Star.jsx lerps from current to the new target, so switching modes
// produces a smooth animated rearrangement.

// 1. Semantic — what's already on each excerpt (PCA over embeddings)
export function semanticLayout(excerpts) {
  const map = {}
  for (const e of excerpts) map[e.id] = { ...e.position }
  return map
}

// 2. By book — cluster excerpts that share a book around a per-book
//    centroid. The centroid is the mean semantic position of that book's
//    excerpts (so books that are semantically distinct still sit apart).
//    Within each book, excerpts spiral around the centroid.
export function byBookLayout(excerpts) {
  const byBook = new Map()
  for (const e of excerpts) {
    const key = e.source?.title || e.source?.author || `__solo_${e.id}`
    if (!byBook.has(key)) byBook.set(key, [])
    byBook.get(key).push(e)
  }

  const map = {}
  for (const [, group] of byBook) {
    const cx = group.reduce((s, e) => s + e.position.x, 0) / group.length
    const cy = group.reduce((s, e) => s + e.position.y, 0) / group.length
    const cz = group.reduce((s, e) => s + e.position.z, 0) / group.length

    const r = Math.min(0.6 + group.length * 0.15, 2.5)
    group.forEach((e, i) => {
      if (group.length === 1) {
        map[e.id] = { x: cx, y: cy, z: cz }
        return
      }
      const theta = (i / group.length) * Math.PI * 2
      const phi = ((i * 1.7) % group.length) / group.length * Math.PI - Math.PI / 2
      map[e.id] = {
        x: cx + r * Math.cos(theta) * Math.cos(phi),
        y: cy + r * Math.sin(phi),
        z: cz + r * Math.sin(theta) * Math.cos(phi),
      }
    })
  }
  return map
}

// 3. Timeline — Y axis is date (newest at top), X comes from the
//    semantic projection so similar excerpts stay near each other
//    horizontally, Z gets a small deterministic jitter so same-day
//    entries don't overlap.
export function timelineLayout(excerpts) {
  const dates = excerpts
    .map(e => new Date(e.date_added || 0).getTime())
    .filter(t => !Number.isNaN(t))
  const minT = Math.min(...dates)
  const maxT = Math.max(...dates)
  const span = maxT - minT || 1  // avoid div/0 when all on one day

  const map = {}
  excerpts.forEach((e) => {
    const t = new Date(e.date_added || 0).getTime()
    const yNorm = (t - minT) / span        // 0 (oldest) → 1 (newest)
    map[e.id] = {
      x: e.position.x * 0.7,               // gentle horizontal use of semantic axis
      y: (yNorm - 0.5) * 16,               // -8 → +8
      z: ((e.id * 7) % 11 - 5) * 0.4,      // deterministic z-jitter
    }
  })
  return map
}

// 4. Theme (placeholder — needs themes from DB).
//    Falls back to semantic if no theme data is present.
export function themeLayout(excerpts) {
  return semanticLayout(excerpts)
}

export function computeLayout(mode, excerpts) {
  switch (mode) {
    case 'book':     return byBookLayout(excerpts)
    case 'timeline': return timelineLayout(excerpts)
    case 'theme':    return themeLayout(excerpts)
    case 'semantic':
    default:         return semanticLayout(excerpts)
  }
}
