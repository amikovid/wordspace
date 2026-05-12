import { useRef, useMemo } from 'react'
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

// ─── Rising embers — fiery flame wisps, not spheres ────────────────────
// Cone geometry pointed upward, additive-blended, vibrant orange-red.
// Vertically elongated, flickering size + opacity. Clearly distinct from
// the round metallic amber stars.
function Embers({ count = 110 }) {
  const meshRef = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const colorBuffer = useMemo(() => new Float32Array(count * 3), [count])

  const seeds = useMemo(() => (
    Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 50,
      yOffset: Math.random() * 40,
      z: (Math.random() - 0.5) * 26 - 4,
      // Flame shape: tall, narrow
      width: 0.12 + Math.random() * 0.18,
      height: 0.5 + Math.random() * 1.2,
      speed: 0.5 + Math.random() * 0.7,
      phase: Math.random() * Math.PI * 2,
      swayAmp: 0.5 + Math.random() * 1.1,
      flickerSeed: Math.random() * Math.PI * 2,
    }))
  ), [count])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.elapsedTime
    const tmpColor = new THREE.Color()

    seeds.forEach((s, i) => {
      const yRaw = (s.yOffset + t * s.speed) % 42
      const y = yRaw - 18
      const lifeT = yRaw / 42  // 0 (bottom, hottest) → 1 (top, fading red)
      const sway = Math.sin(t * 0.7 + s.phase) * s.swayAmp * (0.4 + lifeT * 0.6)

      // Per-ember flicker — affects size, makes them feel alive
      const flicker = 0.78 + 0.22 * Math.sin(t * 5.5 + s.flickerSeed)
                          + 0.08 * Math.sin(t * 13.7 + s.flickerSeed * 1.4)

      dummy.position.set(s.x + sway, y, s.z)

      // Lifetime-driven taper — embers grow narrower + dimmer as they rise
      const lifeScale = 1 - lifeT * 0.55
      dummy.scale.set(
        s.width  * flicker * lifeScale,
        s.height * flicker * (0.85 + (1 - lifeT) * 0.3),
        s.width  * flicker * lifeScale
      )
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)

      // Color: hot yellow-orange at birth → orange → ember red → black
      // Hue 0.13 (yellow) → 0.05 (orange) → 0.02 (red)
      const hue   = 0.13 - lifeT * 0.11
      const sat   = 0.95 - lifeT * 0.15
      const light = 0.62 * (1 - lifeT * 0.78)
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
      {/* Cone pointing up = flame tip. Few segments — soft enough for bloom. */}
      <coneGeometry args={[1, 1, 8, 1, true]}>
        <instancedBufferAttribute attach="attributes-color" args={[colorBuffer, 3]} />
      </coneGeometry>
      <meshBasicMaterial
        vertexColors
        transparent
        opacity={0.88}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  )
}

// ─── Distant book spines — a library wall in deep background ────────────
// Many thin vertical rectangles arranged in horizontal shelf rows, far
// behind everything else. Warm muted leather/cloth tones. Deterministic
// per session so the wall feels permanent (no flicker between renders).
function BookSpines({ shelfCount = 5, spinesPerShelf = 60 }) {
  const meshRef = useRef()
  const total = shelfCount * spinesPerShelf

  // Deterministic-feeling PRNG so the same wall renders each mount
  const rng = useMemo(() => {
    let s = 1337
    return () => {
      s = (s * 9301 + 49297) % 233280
      return s / 233280
    }
  }, [])

  const colorBuffer = useMemo(() => {
    const buf = new Float32Array(total * 3)
    const palette = [
      [0.22, 0.13, 0.08],   // dark walnut
      [0.32, 0.18, 0.10],   // chestnut
      [0.40, 0.22, 0.12],   // tan leather
      [0.28, 0.10, 0.08],   // oxblood
      [0.18, 0.14, 0.10],   // forest brown
      [0.45, 0.32, 0.18],   // honey
      [0.16, 0.18, 0.14],   // dark olive
      [0.55, 0.42, 0.25],   // cream-tan
    ]
    for (let i = 0; i < total; i++) {
      const c = palette[Math.floor(rng() * palette.length)]
      const j = 0.85 + rng() * 0.3   // brightness jitter
      buf[i*3]   = c[0] * j
      buf[i*3+1] = c[1] * j
      buf[i*3+2] = c[2] * j
    }
    return buf
  }, [total, rng])

  const instances = useMemo(() => {
    const arr = []
    const shelfSpacing = 4.5
    const shelfYStart = -((shelfCount - 1) / 2) * shelfSpacing
    const spread = 80      // total horizontal span
    for (let r = 0; r < shelfCount; r++) {
      // Random horizontal pack — spines vary in width
      let x = -spread / 2
      for (let i = 0; i < spinesPerShelf; i++) {
        const width = 0.35 + rng() * 0.55
        const height = 2.8 + rng() * 1.3
        const lean = (rng() - 0.5) * 0.08   // subtle tilt
        arr.push({
          x: x + width / 2,
          y: shelfYStart + r * shelfSpacing,
          z: -38 - rng() * 6,
          width,
          height,
          lean,
        })
        x += width + rng() * 0.03   // tiny gap
        if (arr.length >= total) break
      }
    }
    return arr
  }, [shelfCount, spinesPerShelf, total, rng])

  useMemo(() => {
    if (!meshRef.current) return
    const dummy = new THREE.Object3D()
    instances.forEach((s, i) => {
      dummy.position.set(s.x, s.y, s.z)
      dummy.rotation.set(0, 0, s.lean)
      dummy.scale.set(s.width, s.height, 1)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [instances])

  // Re-apply matrices after the mesh ref is set (the useMemo above runs
  // before mount). One-shot on mount.
  useFrame(({ clock }, _, ) => {
    // no-op; keeps the component alive in the frame loop if we ever
    // want subtle camera-parallax later. Currently static.
  })

  return (
    <instancedMesh
      ref={(node) => {
        meshRef.current = node
        if (!node) return
        const dummy = new THREE.Object3D()
        instances.forEach((s, i) => {
          dummy.position.set(s.x, s.y, s.z)
          dummy.rotation.set(0, 0, s.lean)
          dummy.scale.set(s.width, s.height, 1)
          dummy.updateMatrix()
          node.setMatrixAt(i, dummy.matrix)
        })
        node.instanceMatrix.needsUpdate = true
      }}
      args={[null, null, total]}
    >
      <planeGeometry args={[1, 1]}>
        <instancedBufferAttribute attach="attributes-color" args={[colorBuffer, 3]} />
      </planeGeometry>
      <meshBasicMaterial
        vertexColors
        transparent
        opacity={0.42}
        depthWrite={false}
      />
    </instancedMesh>
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
