import { useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { TrackballControls, Stars } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import StarField from './StarField'

function ConstellationGroup({ excerpts, selectedExcerpt, onStarClick, isEntering, searchQuery }) {
  const groupRef = useRef()
  const spinStart = useRef(null)
  const { camera } = useThree()

  const SPIN_DURATION = 1.4
  const SPIN_X = 0.52
  const CAM_START_Z = 30
  const CAM_END_Z = 22

  useFrame((state) => {
    if (!groupRef.current) return
    if (isEntering) {
      if (spinStart.current === null) spinStart.current = state.clock.elapsedTime
      const elapsed = state.clock.elapsedTime - spinStart.current
      const t = Math.min(elapsed / SPIN_DURATION, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      groupRef.current.rotation.x = eased * SPIN_X
      groupRef.current.rotation.y = 0
      camera.position.z = CAM_START_Z + (CAM_END_Z - CAM_START_Z) * t
    } else {
      spinStart.current = null
    }
  })

  return (
    <group ref={groupRef}>
      <StarField
        excerpts={excerpts}
        selectedExcerpt={selectedExcerpt}
        onStarClick={onStarClick}
        searchQuery={searchQuery}
      />
    </group>
  )
}

export default function Scene({ excerpts, selectedExcerpt, onStarClick, isEntering, searchQuery }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 30], fov: 60 }}
      style={{ background: '#1a0f08' }}  /* umber-900 — candlelit study */
    >
      {/* Distant warm-tinted starfield as backdrop. Low saturation, low density. */}
      <Stars
        radius={100}
        depth={50}
        count={2400}
        factor={3}
        saturation={0.25}
        fade
        speed={0.6}
      />

      {/* Warm ambient + a directional fill that reads as firelight from below-left */}
      <ambientLight intensity={0.45} color="#3a2614" />
      <pointLight position={[10, 10, 10]} intensity={0.9} color="#f0c465" />
      <pointLight position={[-12, -8, 6]} intensity={0.4} color="#e8a942" />

      <ConstellationGroup
        excerpts={excerpts}
        selectedExcerpt={selectedExcerpt}
        onStarClick={onStarClick}
        isEntering={isEntering}
        searchQuery={searchQuery}
      />

      <TrackballControls
        noPan={true}
        noZoom={false}
        noRotate={false}
        dynamicDampingFactor={0.1}
        minDistance={5}
        maxDistance={50}
        rotateSpeed={1.5}
        zoomSpeed={1.2}
        enableKeys={false}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN
        }}
      />

      <EffectComposer>
        {/* Bloom tuned warmer/softer — firelight, not starburst */}
        <Bloom
          luminanceThreshold={0.28}
          luminanceSmoothing={0.85}
          intensity={1.2}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  )
}
