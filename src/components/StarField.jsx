import { useRef, useEffect, useMemo } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import Star from './Star'
import { computeLayout } from '../lib/layouts'

export default function StarField({ excerpts, selectedExcerpt, onStarClick, searchQuery, layoutMode }) {
  const { camera, controls } = useThree()
  const targetPosition = useRef(new THREE.Vector3())
  const targetLookAt = useRef(new THREE.Vector3())
  const isAnimating = useRef(false)

  // Recompute layout when mode or excerpts change. Star.jsx lerps from its
  // current position toward the new target so transitions are animated.
  const layout = useMemo(() => computeLayout(layoutMode, excerpts), [layoutMode, excerpts])

  useEffect(() => {
    if (!selectedExcerpt) return
    const pos = layout[selectedExcerpt.id]
    if (!pos) return
    targetPosition.current.set(pos.x, pos.y, pos.z + 8)
    targetLookAt.current.set(pos.x, pos.y, pos.z)
    isAnimating.current = true
  }, [selectedExcerpt, layout])

  useFrame(() => {
    if (isAnimating.current && controls) {
      camera.position.lerp(targetPosition.current, 0.05)
      controls.target.lerp(targetLookAt.current, 0.05)
      controls.update()
      if (camera.position.distanceTo(targetPosition.current) < 0.1) {
        isAnimating.current = false
      }
    }
  })

  const matchesQuery = (e, q) => {
    const hay = [
      e.text,
      e.source?.author,
      e.source?.title,
      e.my_thought,
      ...(e.themes || []),
    ].filter(Boolean).join(' ').toLowerCase()
    return hay.includes(q.toLowerCase())
  }

  return (
    <group>
      {excerpts.map((excerpt) => {
        const isSelected = selectedExcerpt?.id === excerpt.id
        const isRelated  = selectedExcerpt?.related?.includes(excerpt.id)
        const isDimmed   = searchQuery ? !matchesQuery(excerpt, searchQuery) : false
        const target     = layout[excerpt.id] || excerpt.position

        return (
          <Star
            key={excerpt.id}
            excerpt={excerpt}
            isSelected={isSelected}
            isRelated={isRelated}
            isDimmed={isDimmed}
            targetPosition={target}
            onClick={() => onStarClick(excerpt)}
          />
        )
      })}

      {/* Connection lines hide during a layout transition to avoid
          drawing through the rearranging stars. Cheap heuristic: only
          show them when the selected star is at its rest target. */}
      {selectedExcerpt && selectedExcerpt.related?.map((relatedId) => {
        const a = layout[selectedExcerpt.id]
        const b = layout[relatedId]
        if (!a || !b) return null
        return (
          <Line
            key={`line-${selectedExcerpt.id}-${relatedId}-${layoutMode}`}
            points={[[a.x, a.y, a.z], [b.x, b.y, b.z]]}
            color="#c9a14a"
            lineWidth={1}
            opacity={0.42}
            transparent
          />
        )
      })}
    </group>
  )
}
