import { motion } from 'framer-motion'

const MODES = [
  { id: 'semantic', label: 'Meaning',  desc: 'Semantic constellation (default)' },
  { id: 'book',     label: 'By Book',  desc: 'Group excerpts by source' },
  { id: 'timeline', label: 'Timeline', desc: 'Newest at top, oldest at bottom' },
]

export default function ModeSwitcher({ mode, onChange }) {
  return (
    <div
      className="fixed top-6 left-6 z-50 flex flex-col gap-1 p-1.5 rounded-2xl"
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
            whileTap={{ scale: 0.95 }}
            title={m.desc}
            className="px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] rounded-lg transition-colors duration-300 text-left"
            style={{
              color: active ? '#1a0f08' : 'rgba(250, 243, 229, 0.55)',
              background: active ? '#f0c465' : 'transparent',
              fontWeight: active ? 500 : 400,
              minWidth: 86,
            }}
          >
            {m.label}
          </motion.button>
        )
      })}
    </div>
  )
}
