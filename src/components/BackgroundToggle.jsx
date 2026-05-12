import { motion } from 'framer-motion'

const MODES = [
  { id: 'off',     label: 'Bare',    description: 'Just the constellation' },
  { id: 'motes',   label: 'Motes',   description: 'Dust drifting in firelight' },
  { id: 'embers',  label: 'Embers',  description: 'Red sparks scattering' },
  { id: 'stars',   label: 'Stars',   description: 'Distant warm starfield' },
]

export default function BackgroundToggle({ mode, onChange }) {
  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-1 p-1 rounded-full"
      style={{
        background: 'rgba(26, 15, 8, 0.7)',
        border: '1px solid rgba(232, 169, 66, 0.18)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      {MODES.map((m) => {
        const active = mode === m.id
        return (
          <motion.button
            key={m.id}
            onClick={() => onChange(m.id)}
            whileTap={{ scale: 0.94 }}
            title={m.description}
            className="px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] rounded-full transition-colors duration-300"
            style={{
              color: active ? '#1a0f08' : 'rgba(250, 243, 229, 0.55)',
              background: active ? '#f0c465' : 'transparent',
              fontWeight: active ? 500 : 400,
            }}
          >
            {m.label}
          </motion.button>
        )
      })}
    </div>
  )
}
