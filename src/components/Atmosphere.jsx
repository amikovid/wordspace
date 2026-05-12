import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ─── Dust motes drifting in firelight ──────────────────────────────────
// A few hundred small warm spheres slowly floating upward with a sideways
// sine sway. Wraps around vertically so the density stays constant.
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
      tint: 0.85 + Math.random() * 0.15,  // 0.85–1.0
    }))
  ), [count])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.elapsedTime
    motes.forEach((m, i) => {
      const sway = Math.sin(t * 0.4 + m.phase) * m.swayAmp
      // y wraps 0→50 cycle so motes don't all collect at the top
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

// ─── Rising embers ─────────────────────────────────────────────────────
// Fewer, larger particles that rise from below with horizontal sway,
// brightening then fading as they go. Respawns near the bottom.
function Embers({ count = 90 }) {
  const meshRef = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const materialRef = useRef()

  const seeds = useMemo(() => (
    Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 50,
      yOffset: Math.random() * 40,    // staggered starting y so they don't all rise in unison
      z: (Math.random() - 0.5) * 30 - 5,  // slightly behind the stars
      size: 0.06 + Math.random() * 0.12,
      speed: 0.4 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2,
      swayAmp: 0.4 + Math.random() * 0.9,
    }))
  ), [count])

  // For per-instance color so we can fade ember as it rises
  const colorBuffer = useMemo(() => new Float32Array(count * 3), [count])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.elapsedTime
    const tmpColor = new THREE.Color()

    seeds.forEach((s, i) => {
      const yRaw = (s.yOffset + t * s.speed) % 40
      const y = yRaw - 16    // -16 → +24
      const lifeT = yRaw / 40  // 0 (bottom) → 1 (top)
      const sway = Math.sin(t * 0.6 + s.phase) * s.swayAmp

      dummy.position.set(s.x + sway, y, s.z)
      const scale = s.size * (1 - lifeT * 0.4)
      dummy.scale.setScalar(scale)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)

      // Color: hot orange-amber near bottom → fades toward ember red toward top
      const hue = 0.08 - lifeT * 0.02         // 0.08 (orange) → 0.06 (red)
      const sat = 0.85 - lifeT * 0.15
      const light = 0.6 * (1 - lifeT * 0.85)  // brightness drops to ~0.09 at top
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
        <instancedBufferAttribute
          attach="attributes-color"
          args={[colorBuffer, 3]}
        />
      </sphereGeometry>
      <meshBasicMaterial
        ref={materialRef}
        vertexColors
        transparent
        opacity={0.85}
        depthWrite={false}
      />
    </instancedMesh>
  )
}

// ─── Distant warm stars (Mindspace fallback, kept as an option) ────────
import { Stars } from '@react-three/drei'
function WarmStars() {
  return (
    <Stars
      radius={100}
      depth={50}
      count={1800}
      factor={3}
      saturation={0.35}
      fade
      speed={0.5}
    />
  )
}

export default function Atmosphere({ mode = 'motes' }) {
  if (mode === 'off')    return null
  if (mode === 'stars')  return <WarmStars />
  if (mode === 'embers') return <Embers />
  return <DustMotes />
}
