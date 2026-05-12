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

// ─── Embers — short-lived irregular sparks that ignite + extinguish ────
// Each ember has a full lifecycle:
//   age 0.00 → 0.10  fade in, hottest (orange-yellow)
//   age 0.10 → 0.55  bright red, steady drift
//   age 0.55 → 1.00  cools and dims, fades to nothing
//   age >= lifetime  respawns at a new random position with new motion
//
// Non-uniform per-particle scale + low-poly sphere + bloom yields an
// irregular pebble-of-glow look. Additive blending means "opacity" is
// faked by multiplying the RGB color by the lifecycle envelope —
// when envelope hits 0, the ember contributes zero light and is gone.
function Embers({ count = 200 }) {
  const meshRef = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const colorBuffer = useMemo(() => new Float32Array(count * 3), [count])

  const BOX = { x: 38, y: 28, z: 32 }

  // Random respawn — called both at init and whenever an ember dies
  const respawn = (s) => {
    const dirX = (Math.random() - 0.5) * 2
    const dirY = Math.random() * 1.6 - 0.4   // weakly biased upward
    const dirZ = (Math.random() - 0.5) * 2
    const mag = Math.hypot(dirX, dirY, dirZ) || 1
    const speed = 0.15 + Math.random() * 0.55
    s.x  = (Math.random() - 0.5) * BOX.x * 2
    s.y  = (Math.random() - 0.5) * BOX.y * 2
    s.z  = (Math.random() - 0.5) * BOX.z * 2 - 2
    s.vx = (dirX / mag) * speed
    s.vy = (dirY / mag) * speed
    s.vz = (dirZ / mag) * speed
    s.size       = 0.05 + Math.random() * 0.11
    s.aspectX    = 0.7 + Math.random() * 0.6   // irregular shape
    s.aspectY    = 0.9 + Math.random() * 0.9
    s.aspectZ    = 0.7 + Math.random() * 0.6
    s.age        = 0
    s.lifetime   = 4 + Math.random() * 6        // seconds
    s.flickerSeed = Math.random() * Math.PI * 2
    s.hueShift   = (Math.random() - 0.5) * 0.025
    return s
  }

  const seeds = useMemo(() => {
    const arr = Array.from({ length: count }, () => respawn({}))
    // Stagger initial ages so embers don't all ignite + die in unison
    arr.forEach(s => { s.age = Math.random() * s.lifetime })
    return arr
  }, [count])

  useFrame(({ clock }, delta) => {
    if (!meshRef.current) return
    const t = clock.elapsedTime
    const dt = Math.min(delta, 0.05)
    const tmpColor = new THREE.Color()

    for (let i = 0; i < seeds.length; i++) {
      const s = seeds[i]
      s.age += dt
      if (s.age >= s.lifetime) respawn(s)

      // Motion
      s.x += s.vx * dt
      s.y += s.vy * dt
      s.z += s.vz * dt
      if (s.x >  BOX.x) s.x = -BOX.x
      if (s.x < -BOX.x) s.x =  BOX.x
      if (s.y >  BOX.y) s.y = -BOX.y
      if (s.y < -BOX.y) s.y =  BOX.y
      if (s.z >  BOX.z) s.z = -BOX.z
      if (s.z < -BOX.z) s.z =  BOX.z

      const life = s.age / s.lifetime   // 0 → 1

      // Lifecycle envelope: smooth rise 0→0.1, plateau 0.1→0.55,
      // ease-out 0.55→1.0
      let env
      if (life < 0.10)      env = life / 0.10
      else if (life < 0.55) env = 1.0
      else                  env = 1.0 - (life - 0.55) / 0.45
      env = Math.max(0, Math.min(1, env))
      // Soften the curve so transitions don't pop
      env = env * env * (3 - 2 * env)

      // Per-frame flicker so even mid-life embers shimmer
      const flicker = 0.78 + 0.22 * Math.sin(t * 6 + s.flickerSeed)
                          + 0.08 * Math.sin(t * 14.3 + s.flickerSeed * 1.7)

      dummy.position.set(s.x, s.y, s.z)
      // Size grows slightly past birth then settles — ember "ignites"
      const sizeEnv = life < 0.1 ? (0.6 + 0.4 * (life / 0.1)) : 1.0
      const baseScale = s.size * flicker * sizeEnv
      dummy.scale.set(baseScale * s.aspectX, baseScale * s.aspectY, baseScale * s.aspectZ)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)

      // Color sweeps from hot orange at birth → red middle → cool red at death
      // hue: 0.07 (orange) at life=0 → 0.005 (red) at life=0.4+
      const hueBase = life < 0.4
        ? 0.07 - (life / 0.4) * 0.065
        : 0.005
      const hue = hueBase + s.hueShift
      // Saturation tapers slightly at the very end so it looks like ash
      const sat = 0.95 * (1 - 0.3 * Math.max(0, life - 0.8) * 5)
      // Lightness: hot at birth, steady mid, dimmer at death; flicker on top
      const lightBase = life < 0.1
        ? 0.55 + 0.15 * (life / 0.1)
        : life < 0.55
          ? 0.50
          : 0.50 - (life - 0.55) / 0.45 * 0.30
      const light = lightBase * (0.85 + 0.15 * flicker)

      tmpColor.setHSL(hue, Math.max(0, sat), Math.max(0, light))
      // Multiply by envelope — additive blending lets us "fade out" only
      // by dimming the color contribution to zero
      tmpColor.multiplyScalar(env)
      tmpColor.toArray(colorBuffer, i * 3)
    }

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.geometry.attributes.color) {
      meshRef.current.geometry.attributes.color.needsUpdate = true
    }
  })

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      {/* Low-poly sphere — bloom + non-uniform scale do the rest */}
      <sphereGeometry args={[1, 6, 6]}>
        <instancedBufferAttribute attach="attributes-color" args={[colorBuffer, 3]} />
      </sphereGeometry>
      <meshBasicMaterial
        vertexColors
        transparent
        opacity={0.9}
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
