import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Star color palette — amber/gold core, brighter when selected, warm-pink for related
const COLOR_DEFAULT  = '#f0c465'  // ember-300
const COLOR_SELECTED = '#ffe9b8'  // bright candle white-gold
const COLOR_RELATED  = '#e8a942'  // ember-400, slightly redder

export default function Star({ excerpt, isSelected, isRelated, isDimmed, targetPosition, onClick }) {
  const meshRef = useRef()
  const [hovered, setHovered] = useState(false)
  const opacityRef = useRef(1)
  const flickerSeed = useRef(Math.random() * Math.PI * 2)

  const currentPosRef = useRef(new THREE.Vector3(
    excerpt.position.x, excerpt.position.y, excerpt.position.z
  ))

  useFrame(({ clock }) => {
    if (!meshRef.current) return

    currentPosRef.current.lerp(
      new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z),
      0.04
    )
    meshRef.current.position.copy(currentPosRef.current)

    const targetScale = hovered ? 1.3 : isSelected ? 1.5 : isRelated ? 1.2 : 1
    meshRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.1
    )

    const targetOpacity = isDimmed ? 0.08 : 1
    opacityRef.current += (targetOpacity - opacityRef.current) * 0.08
    meshRef.current.material.opacity = opacityRef.current

    // Candle flicker — a small breathing motion baked into every star
    const t = clock.elapsedTime
    const flicker = 0.92 + 0.08 * Math.sin(t * 2.4 + flickerSeed.current)
                       + 0.04 * Math.sin(t * 7.1 + flickerSeed.current * 1.7)

    if (isRelated) {
      const pulse = Math.sin(t * 3) * 0.15 + 1.05
      meshRef.current.material.emissiveIntensity = pulse * flicker
    } else if (isSelected) {
      meshRef.current.material.emissiveIntensity = 1.75 * flicker
    } else {
      const base = isDimmed ? 0.15 : 0.95
      meshRef.current.material.emissiveIntensity = base * flicker
    }
  })

  const color = isSelected ? COLOR_SELECTED : isRelated ? COLOR_RELATED : COLOR_DEFAULT

  return (
    <mesh
      ref={meshRef}
      position={[currentPosRef.current.x, currentPosRef.current.y, currentPosRef.current.z]}
      onClick={(e) => { e.stopPropagation(); onClick() }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => { e.stopPropagation(); onClick() }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.95}
        roughness={0.35}
        metalness={0.4}
        transparent
        opacity={1}
      />
    </mesh>
  )
}
