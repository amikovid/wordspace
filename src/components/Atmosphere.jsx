import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'

// ─── Dust motes drifting in firelight ──────────────────────────────────
function DustMotes({ count = 320 }) {
  const meshRef = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const motes = useMemo(() => (
    Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 70,
      y: (Math.random() - 0.5) * 50,
      z: (Math.random() - 0.5) * 70,
      size: 0.02 + Math.random() * 0.06,
      driftY: 0.05 + Math.random() * 0.12,
      phase: Math.random() * Math.PI * 2,
      swayAmp: 0.05 + Math.random() * 0.15,
    }))
  ), [count])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.elapsedTime
    motes.forEach((m, i) => {
      const sway = Math.sin(t * 0.4 + m.phase) * m.swayAmp
      const y = ((m.y + t * m.driftY) % 50 + 50) % 50 - 25
      dummy.position.set(
        m.x + sway,
        y,
        m.z + Math.cos(t * 0.3 + m.phase) * m.swayAmp
      )
      dummy.scale.setScalar(m.size)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#f5d68f" transparent opacity={0.28} depthWrite={false} />
    </instancedMesh>
  )
}

// ─── Embers — small, omnidirectional sparks ────────────────────────────
// Tiny additive-blended spheres (no implied direction). Each has its
// own velocity vector — some rise, some sink, some drift sideways.
// They wrap around the box so the volume stays full. Vivid orange-red
// color with per-particle hue variation, additive over the umber bg.
function Embers({ count = 180 }) {
  const meshRef = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const colorBuffer = useMemo(() => new Float32Array(count * 3), [count])

  // Bounding box embers live in
  const BOX = { x: 36, y: 26, z: 30 }

  const seeds = useMemo(() => (
    Array.from({ length: count }, () => {
      // Random unit-ish direction, biased slightly upward (real embers
      // do rise on average), but plenty of horizontal/down motion too.
      const dirX = (Math.random() - 0.5) * 2
      const dirY = Math.random() * 1.6 - 0.4   // mostly up, some down
      const dirZ = (Math.random() - 0.5) * 2
      const mag = Math.hypot(dirX, dirY, dirZ) || 1
      const speed = 0.25 + Math.random() * 0.85
      return {
        x: (Math.random() - 0.5) * BOX.x * 2,
        y: (Math.random() - 0.5) * BOX.y * 2,
        z: (Math.random() - 0.5) * BOX.z * 2 - 2,
        vx: (dirX / mag) * speed,
        vy: (dirY / mag) * speed,
        vz: (dirZ / mag) * speed,
        size: 0.04 + Math.random() * 0.10,
        flickerSeed: Math.random() * Math.PI * 2,
        hueShift: (Math.random() - 0.5) * 0.06,  // per-particle color tint
      }
    })
  ), [count])

  useFrame(({ clock }, delta) => {
    if (!meshRef.current) return
    const t = clock.elapsedTime
    const dt = Math.min(delta, 0.05)   // clamp on tab-blur etc.
    const tmpColor = new THREE.Color()

    seeds.forEach((s, i) => {
      // Update position; wrap-around at box bounds
      s.x += s.vx * dt
      s.y += s.vy * dt
      s.z += s.vz * dt
      if (s.x >  BOX.x) s.x = -BOX.x
      if (s.x < -BOX.x) s.x =  BOX.x
      if (s.y >  BOX.y) s.y = -BOX.y
      if (s.y < -BOX.y) s.y =  BOX.y
      if (s.z >  BOX.z) s.z = -BOX.z
      if (s.z < -BOX.z) s.z =  BOX.z

      const flicker = 0.75 + 0.25 * Math.sin(t * 6 + s.flickerSeed)
                          + 0.10 * Math.sin(t * 14.3 + s.flickerSeed * 1.7)

      dummy.position.set(s.x, s.y, s.z)
      dummy.scale.setScalar(s.size * flicker)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)

      // Hot orange-red with per-particle hue jitter. Slight time-based
      // shimmer in lightness so the field "breathes" overall.
      const hue   = 0.04 + s.hueShift  // ~ orange-red
      const sat   = 0.92
      const light = 0.42 + 0.18 * flicker
      tmpColor.setHSL(hue, sat, light)
      tmpColor.toArray(colorBuffer, i * 3)
    })

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.geometry.attributes.color) {
      meshRef.current.geometry.attributes.color.needsUpdate = true
    }
  })

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <sphereGeometry args={[1, 8, 8]}>
        <instancedBufferAttribute attach="attributes-color" args={[colorBuffer, 3]} />
      </sphereGeometry>
      <meshBasicMaterial
        vertexColors
        transparent
        opacity={0.85}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  )
}

// ─── Distant book spines — three parallax layers ───────────────────────
// Three z-layers of warm-toned spine rectangles, each deeper layer
// further back + dimmer + slightly less dense. Reds/burgundies/oxblood
// dominate; honey + walnut for variety. The wall feels permanent
// (deterministic PRNG) but multi-planar (parallax depth).
function SpineLayer({ z, shelfCount, spinesPerShelf, opacity, brightness, seed }) {
  const meshRef = useRef()
  const total = shelfCount * spinesPerShelf

  // Per-layer seeded PRNG so each layer is stable
  const rng = useMemo(() => {
    let s = seed
    return () => {
      s = (s * 9301 + 49297) % 233280
      return s / 233280
    }
  }, [seed])

  const colorBuffer = useMemo(() => {
    const buf = new Float32Array(total * 3)
    // Red-leather forward palette: oxblood, burgundy, wine, rust,
    // plus a few walnut + honey accents for variety
    const palette = [
      [0.42, 0.10, 0.10],   // oxblood
      [0.50, 0.12, 0.14],   // wine
      [0.38, 0.08, 0.08],   // dark red leather
      [0.55, 0.18, 0.12],   // rust
      [0.46, 0.14, 0.13],   // claret
      [0.30, 0.08, 0.08],   // dried blood
      [0.60, 0.22, 0.14],   // brick
      [0.32, 0.18, 0.10],   // walnut accent
      [0.55, 0.40, 0.22],   // honey accent (rare)
      [0.18, 0.14, 0.10],   // shadow brown
    ]
    for (let i = 0; i < total; i++) {
      const c = palette[Math.floor(rng() * palette.length)]
      const j = (0.8 + rng() * 0.4) * brightness
      buf[i*3]   = c[0] * j
      buf[i*3+1] = c[1] * j
      buf[i*3+2] = c[2] * j
    }
    return buf
  }, [total, rng, brightness])

  const instances = useMemo(() => {
    const arr = []
    const shelfSpacing = 4.5
    const shelfYStart = -((shelfCount - 1) / 2) * shelfSpacing
    const spread = 95
    for (let r = 0; r < shelfCount; r++) {
      let x = -spread / 2
      for (let i = 0; i < spinesPerShelf; i++) {
        const width = 0.35 + rng() * 0.55
        const height = 2.6 + rng() * 1.4
        const lean = (rng() - 0.5) * 0.08
        arr.push({ x: x + width / 2, y: shelfYStart + r * shelfSpacing, width, height, lean })
        x += width + rng() * 0.03
        if (arr.length >= total) break
      }
    }
    return arr
  }, [shelfCount, spinesPerShelf, total, rng])

  // Apply matrices once on mount — static backdrop, no per-frame update
  useEffect(() => {
    if (!meshRef.current) return
    const dummy = new THREE.Object3D()
    instances.forEach((s, i) => {
      dummy.position.set(s.x, s.y, z)
      dummy.rotation.set(0, 0, s.lean)
      dummy.scale.set(s.width, s.height, 1)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [instances, z])

  return (
    <instancedMesh ref={meshRef} args={[null, null, total]}>
      <planeGeometry args={[1, 1]}>
        <instancedBufferAttribute attach="attributes-color" args={[colorBuffer, 3]} />
      </planeGeometry>
      <meshBasicMaterial vertexColors transparent opacity={opacity} depthWrite={false} />
    </instancedMesh>
  )
}

function BookSpines() {
  return (
    <>
      {/* Deepest layer — furthest, dimmest, faintest */}
      <SpineLayer z={-58} shelfCount={6} spinesPerShelf={70} opacity={0.18} brightness={0.55} seed={101} />
      {/* Mid layer — fills the depth */}
      <SpineLayer z={-42} shelfCount={5} spinesPerShelf={62} opacity={0.32} brightness={0.85} seed={733} />
      {/* Front layer — strongest, closer in */}
      <SpineLayer z={-28} shelfCount={4} spinesPerShelf={48} opacity={0.48} brightness={1.0}  seed={1337} />
    </>
  )
}

// ─── Distant warm stars (Mindspace-like fallback) ──────────────────────
function WarmStars() {
  return (
    <Stars radius={100} depth={50} count={1800} factor={3} saturation={0.35} fade speed={0.5} />
  )
}

export default function Atmosphere({ mode = 'embers' }) {
  if (mode === 'off')     return null
  if (mode === 'stars')   return <WarmStars />
  if (mode === 'spines')  return <BookSpines />
  if (mode === 'motes')   return <DustMotes />
  return <Embers />
}
