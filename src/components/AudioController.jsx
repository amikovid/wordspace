import { useEffect, useRef } from 'react'
import * as Tone from 'tone'

// Warm, off-by-default soundscape.
// - Ambient: very slow FM pad in a low octave, mixed under noise filtered to
//   sound like distant fireplace crackle. ~-26 dB. Easy to ignore, pleasant
//   to notice.
// - Click: felt-piano-ish FM synth pitch-mapped by the excerpt's x position.
//   Plays only when audio is enabled.

export default function AudioController({ selectedExcerpt, enabled, onToggle }) {
  const padRef     = useRef(null)
  const clickRef   = useRef(null)
  const fireRef    = useRef(null)
  const reverbRef  = useRef(null)
  const startedRef = useRef(false)

  // Initialize synths once on first enable.
  useEffect(() => {
    let cancelled = false

    const init = async () => {
      if (startedRef.current || !enabled) return
      try {
        await Tone.start()
        if (cancelled) return

        const reverb = new Tone.Reverb({ decay: 5.5, wet: 0.55, preDelay: 0.02 }).toDestination()
        await reverb.generate()

        // Warm ambient pad — felt and slow
        const pad = new Tone.PolySynth(Tone.FMSynth, {
          harmonicity: 1.4,
          modulationIndex: 2.2,
          oscillator: { type: 'sine' },
          envelope: { attack: 5, decay: 3, sustain: 0.7, release: 9 },
          modulation: { type: 'triangle' },
          modulationEnvelope: { attack: 3, decay: 2, sustain: 0.5, release: 6 },
          volume: -22,
        }).connect(reverb)

        // Fireplace bed — pink noise through a low-pass filter
        const noise = new Tone.Noise('pink').start()
        const filter = new Tone.Filter({ frequency: 700, type: 'lowpass', rolloff: -24 })
        const noiseGain = new Tone.Gain(0.18) // -ish -15 dB
        noise.connect(filter)
        filter.connect(noiseGain)
        noiseGain.toDestination()

        // Felt piano-ish click
        const click = new Tone.PolySynth(Tone.FMSynth, {
          harmonicity: 2,
          modulationIndex: 4,
          oscillator: { type: 'sine' },
          envelope: { attack: 0.005, decay: 0.6, sustain: 0.08, release: 1.4 },
          modulation: { type: 'sine' },
          modulationEnvelope: { attack: 0.01, decay: 0.4, sustain: 0, release: 0.6 },
          volume: -14,
        }).connect(reverb)

        padRef.current    = pad
        clickRef.current  = click
        fireRef.current   = { noise, filter, gain: noiseGain }
        reverbRef.current = reverb
        startedRef.current = true

        // Start ambient on init (when user just enabled it)
        pad.triggerAttack(['C2', 'G2', 'C3', 'E3'], Tone.now())
      } catch (err) {
        console.warn('Audio init failed:', err.message)
      }
    }

    init()

    return () => {
      cancelled = true
    }
  }, [enabled])

  // When toggled off: silence pad + noise. When toggled on (already inited): restart.
  useEffect(() => {
    if (!startedRef.current) return
    if (enabled) {
      try {
        padRef.current?.triggerAttack(['C2', 'G2', 'C3', 'E3'], Tone.now())
        fireRef.current?.gain?.gain.rampTo(0.18, 1.2)
      } catch (_) {}
    } else {
      try {
        padRef.current?.releaseAll()
        fireRef.current?.gain?.gain.rampTo(0, 0.6)
      } catch (_) {}
    }
  }, [enabled])

  // Click sound on star selection (only while enabled)
  useEffect(() => {
    if (!enabled || !selectedExcerpt || !clickRef.current) return
    const baseMidi = 60
    const offset = Math.round((selectedExcerpt.position.x + 10) / 20 * 18) - 4
    const note = Tone.Frequency(baseMidi + offset, 'midi')
    try {
      clickRef.current.triggerAttackRelease(note, '2n', Tone.now(), 0.55)
    } catch (_) {}
  }, [selectedExcerpt, enabled])

  // Dispose on unmount
  useEffect(() => () => {
    try {
      padRef.current?.releaseAll()
      padRef.current?.dispose()
      clickRef.current?.dispose()
      fireRef.current?.noise.stop()
      fireRef.current?.noise.dispose()
      fireRef.current?.filter.dispose()
      fireRef.current?.gain.dispose()
      reverbRef.current?.dispose()
    } catch (_) {}
  }, [])

  return (
    <button
      onClick={onToggle}
      className="fixed bottom-6 left-6 w-11 h-11 rounded-full
                 flex items-center justify-center transition-smooth z-50
                 hover:scale-105"
      style={{
        background: 'rgba(26, 15, 8, 0.7)',
        border: `1px solid rgba(232, 169, 66, ${enabled ? '0.45' : '0.18'})`,
        color: enabled ? '#f0c465' : 'rgba(250, 243, 229, 0.5)',
      }}
      aria-label={enabled ? 'Silence the room' : 'Light the room'}
      title={enabled ? 'Silence the room' : 'Light the room'}
    >
      {enabled ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
        </svg>
      )}
    </button>
  )
}
