// ─── Layout strategies for the 3D constellation ───────────────────────
// Each layout takes the array of excerpts (with `position` from the
// semantic baseline) and returns a map of id → { x, y, z }.
// Star.jsx lerps from current to the new target, so switching modes
// produces a smooth animated rearrangement.

// Generic clusterer: group excerpts by a key function, place each group's
// excerpts in a small sphere around the semantic centroid of that group.
function clusterByKey(excerpts, keyFn, soloFallbackKey) {
  const groups = new Map()
  for (const e of excerpts) {
    const key = keyFn(e) || (soloFallbackKey ? soloFallbackKey(e) : `__solo_${e.id}`)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(e)
  }

  const map = {}
  for (const [, group] of groups) {
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

// 1. Semantic — what's already on each excerpt (PCA over embeddings)
export function semanticLayout(excerpts) {
  const map = {}
  for (const e of excerpts) map[e.id] = { ...e.position }
  return map
}

// 2. By book — cluster excerpts that share a book around a per-book centroid
export function byBookLayout(excerpts) {
  return clusterByKey(
    excerpts,
    (e) => (e.source?.title || '').toLowerCase().trim() || null,
    (e) => `__solo_book_${e.id}`,
  )
}

// 3. By author — cluster around per-author centroids. Multiple books by
//    the same author land near each other.
export function byAuthorLayout(excerpts) {
  return clusterByKey(
    excerpts,
    (e) => (e.source?.author || '').toLowerCase().trim() || null,
    (e) => `__solo_author_${e.id}`,
  )
}

// 4. By theme — cluster by primary theme (the first theme attached).
//    Excerpts with no themes drift to their own loose group.
export function byThemeLayout(excerpts) {
  return clusterByKey(
    excerpts,
    (e) => (e.themes?.[0] || '').toLowerCase().trim() || null,
    () => '__no_theme',
  )
}

// 5. Timeline — Y axis is date, X uses the semantic axis, Z gets a
//    deterministic small jitter so same-day entries don't overlap.
export function timelineLayout(excerpts) {
  const dates = excerpts
    .map(e => new Date(e.date_added || 0).getTime())
    .filter(t => !Number.isNaN(t))
  const minT = Math.min(...dates)
  const maxT = Math.max(...dates)
  const span = maxT - minT || 1

  const map = {}
  excerpts.forEach((e) => {
    const t = new Date(e.date_added || 0).getTime()
    const yNorm = (t - minT) / span
    map[e.id] = {
      x: e.position.x * 0.7,
      y: (yNorm - 0.5) * 16,
      z: ((e.id * 7) % 11 - 5) * 0.4,
    }
  })
  return map
}

export function computeLayout(mode, excerpts) {
  switch (mode) {
    case 'book':     return byBookLayout(excerpts)
    case 'author':   return byAuthorLayout(excerpts)
    case 'theme':    return byThemeLayout(excerpts)
    case 'timeline': return timelineLayout(excerpts)
    case 'semantic':
    default:         return semanticLayout(excerpts)
  }
}
