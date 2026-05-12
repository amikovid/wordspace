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
        hueShift: (Math.random() - 0.5) * 0.03,  // tight red jitter only
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

      // Pure red with small per-particle hue jitter — visually distinct
      // from the amber-gold stars. Lightness shimmers with the flicker.
      const hue   = 0.005 + s.hueShift  // ~ red (just shy of pure)
      const sat   = 0.95
      const light = 0.38 + 0.20 * flicker
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

// ─── Distant warm stars (Mindspace-like fallback) ──────────────────────
function WarmStars() {
  return (
    <Stars radius={100} depth={50} count={1800} factor={3} saturation={0.35} fade speed={0.5} />
  )
}

export default function Atmosphere({ mode = 'embers' }) {
  if (mode === 'off')     return null
  if (mode === 'stars')   return <WarmStars />
  if (mode === 'motes')   return <DustMotes />
  return <Embers />
}
