import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const LAYOUT_MODES = [
  { id: 'semantic', label: 'Meaning'  },
  { id: 'book',     label: 'By Book'  },
  { id: 'timeline', label: 'Timeline' },
]

const BACKGROUND_MODES = [
  { id: 'off',    label: 'Bare'   },
  { id: 'motes',  label: 'Motes'  },
  { id: 'embers', label: 'Embers' },
  { id: 'stars',  label: 'Stars'  },
]

function PillRow({ modes, current, onChange }) {
  return (
    <div className="flex items-center gap-0.5">
      {modes.map((m) => {
        const active = current === m.id
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className="px-2 py-1 text-[9px] uppercase tracking-[0.16em] rounded-md transition-colors duration-200"
            style={{
              color: active ? '#1a0f08' : 'rgba(250, 243, 229, 0.55)',
              background: active ? '#f0c465' : 'transparent',
              fontWeight: active ? 500 : 400,
            }}
          >
            {m.label}
          </button>
        )
      })}
    </div>
  )
}

export default function Controls({ layoutMode, onLayoutChange, backgroundMode, onBackgroundChange }) {
  const [stage, setStage] = useState('hidden')   // hidden → resisting → open

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col items-end gap-2">
      {/* The trigger — small, faint, scales on hover */}
      <motion.button
        onClick={() => {
          if (stage === 'hidden')  setStage('resisting')
          else                     setStage('hidden')
        }}
        whileHover={{ scale: 1.08, opacity: 1 }}
        whileTap={{ scale: 0.92 }}
        className="w-7 h-7 flex items-center justify-center rounded-full"
        style={{
          background: stage !== 'hidden' ? 'rgba(232, 169, 66, 0.16)' : 'rgba(26, 15, 8, 0.55)',
          border: `1px solid rgba(232, 169, 66, ${stage !== 'hidden' ? '0.32' : '0.14'})`,
          opacity: stage === 'hidden' ? 0.55 : 1,
        }}
        title="Adjust the room"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="5"  r="1.6" fill="#f0c465" />
          <circle cx="12" cy="12" r="1.6" fill="#f0c465" />
          <circle cx="12" cy="19" r="1.6" fill="#f0c465" />
        </svg>
      </motion.button>

      {/* Resistance card */}
      <AnimatePresence>
        {stage === 'resisting' && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="text-center px-5 py-4 max-w-[16rem] glass-parchment"
            style={{ borderRadius: '1rem' }}
          >
            <p
              className="text-parchment-50/70 text-[12px] leading-relaxed mb-3"
              style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic' }}
            >
              The room is already dressed.<br />
              Settled lighting reads more deeply.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setStage('hidden')}
                className="px-3 py-1 text-[10px] text-parchment-50/45 font-light hover:text-parchment-50/80 transition-colors"
              >
                leave it
              </button>
              <button
                onClick={() => setStage('open')}
                className="px-3 py-1 text-[10px] text-ember-300/75 font-light hover:text-ember-100 transition-colors rounded-md"
                style={{ border: '1px solid rgba(232, 169, 66, 0.25)' }}
              >
                tweak anyway
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The actual controls — only revealed after resistance is bypassed */}
      <AnimatePresence>
        {stage === 'open' && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="p-3 flex flex-col gap-2.5"
            style={{
              background: 'rgba(26, 15, 8, 0.78)',
              border: '1px solid rgba(232, 169, 66, 0.20)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              borderRadius: '0.85rem',
              boxShadow: '0 6px 24px rgba(0,0,0,0.45)',
            }}
          >
            <div>
              <p className="text-[8.5px] uppercase tracking-[0.22em] text-ember-300/55 mb-1 px-1">
                Layout
              </p>
              <PillRow modes={LAYOUT_MODES} current={layoutMode} onChange={onLayoutChange} />
            </div>
            <div>
              <p className="text-[8.5px] uppercase tracking-[0.22em] text-ember-300/55 mb-1 px-1">
                Atmosphere
              </p>
              <PillRow modes={BACKGROUND_MODES} current={backgroundMode} onChange={onBackgroundChange} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
