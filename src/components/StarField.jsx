import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import Star from './Star'

export default function StarField({ excerpts, selectedExcerpt, onStarClick, searchQuery }) {
  const { camera, controls } = useThree()
  const targetPosition = useRef(new THREE.Vector3())
  const targetLookAt = useRef(new THREE.Vector3())
  const isAnimating = useRef(false)

  useEffect(() => {
    if (!selectedExcerpt) return
    const star = excerpts.find(e => e.id === selectedExcerpt.id)
    if (!star) return
    targetPosition.current.set(
      star.position.x,
      star.position.y,
      star.position.z + 8
    )
    targetLookAt.current.set(star.position.x, star.position.y, star.position.z)
    isAnimating.current = true
  }, [selectedExcerpt, excerpts])

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

  // Search match: text, author, title, or any theme matches the query
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
        const isRelated = selectedExcerpt?.related?.includes(excerpt.id)
        const isDimmed = searchQuery ? !matchesQuery(excerpt, searchQuery) : false

        return (
          <Star
            key={excerpt.id}
            excerpt={excerpt}
            isSelected={isSelected}
            isRelated={isRelated}
            isDimmed={isDimmed}
            targetPosition={excerpt.position}
            onClick={() => onStarClick(excerpt)}
          />
        )
      })}

      {/* Copper-gold connection lines from selected → related */}
      {selectedExcerpt && selectedExcerpt.related?.map((relatedId) => {
        const a = excerpts.find(e => e.id === selectedExcerpt.id)
        const b = excerpts.find(e => e.id === relatedId)
        if (!a || !b) return null
        return (
          <Line
            key={`line-${selectedExcerpt.id}-${relatedId}`}
            points={[
              [a.position.x, a.position.y, a.position.z],
              [b.position.x, b.position.y, b.position.z]
            ]}
            color="#c9a14a"  /* copper-500 */
            lineWidth={1}
            opacity={0.42}
            transparent
          />
        )
      })}
    </group>
  )
}
