import { useEffect, useRef } from 'react'

// A subtle warm glow anchored to the bottom of the viewport, as if the
// fire producing the embers is sitting just below the screen edge.
// Three superimposed radial gradients of slightly different sizes/hues
// + a continuous low-frequency flicker on opacity & scale.

export default function FireGlow() {
  const layerARef = useRef(null)
  const layerBRef = useRef(null)
  const layerCRef = useRef(null)

  // Drive a low-frequency multi-octave flicker via JS rather than CSS
  // keyframes — keyframes loop too predictably. JS gives an irregular,
  // more "alive" pulse using sums of sine waves at non-integer ratios.
  useEffect(() => {
    let raf
    const start = performance.now()
    const tick = () => {
      const t = (performance.now() - start) / 1000
      const flicker =
        0.78 +
        0.14 * Math.sin(t * 1.7) +
        0.05 * Math.sin(t * 4.3 + 1.1) +
        0.03 * Math.sin(t * 9.1 + 2.4)
      const scale = 1 + 0.04 * Math.sin(t * 1.3 + 0.7)

      if (layerARef.current) {
        layerARef.current.style.opacity = String(flicker)
        layerARef.current.style.transform = `scale(${scale}, ${1 + 0.06 * Math.sin(t * 0.9)})`
      }
      if (layerBRef.current) {
        layerBRef.current.style.opacity = String(0.55 * (0.85 + 0.18 * Math.sin(t * 2.1 + 0.3)))
      }
      if (layerCRef.current) {
        layerCRef.current.style.opacity = String(0.4 + 0.3 * Math.sin(t * 0.7 + 1.6))
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const layer = {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 2,
    willChange: 'opacity, transform',
    transformOrigin: 'center bottom',
  }

  return (
    <>
      {/* Layer A — broad warm bed (deep orange-red, biggest spread) */}
      <div
        ref={layerARef}
        style={{
          ...layer,
          height: '55vh',
          background:
            'radial-gradient(ellipse 95% 80% at 50% 110%, ' +
              'rgba(208, 64, 32, 0.55) 0%, ' +
              'rgba(180, 48, 24, 0.32) 28%, ' +
              'rgba(120, 32, 16, 0.16) 52%, ' +
              'rgba(60, 20, 10, 0.06) 75%, ' +
              'transparent 100%)',
          mixBlendMode: 'screen',
        }}
      />

      {/* Layer B — hotter inner core, narrower */}
      <div
        ref={layerBRef}
        style={{
          ...layer,
          height: '38vh',
          background:
            'radial-gradient(ellipse 55% 70% at 50% 115%, ' +
              'rgba(255, 140, 60, 0.55) 0%, ' +
              'rgba(220, 90, 40, 0.35) 22%, ' +
              'rgba(140, 50, 20, 0.15) 50%, ' +
              'transparent 100%)',
          mixBlendMode: 'screen',
        }}
      />

      {/* Layer C — tightest hottest tip just at the edge */}
      <div
        ref={layerCRef}
        style={{
          ...layer,
          height: '22vh',
          background:
            'radial-gradient(ellipse 32% 55% at 50% 120%, ' +
              'rgba(255, 200, 110, 0.5) 0%, ' +
              'rgba(255, 130, 60, 0.28) 30%, ' +
              'transparent 80%)',
          mixBlendMode: 'screen',
        }}
      />
    </>
  )
}
