import { motion } from 'framer-motion'

const MODES = [
  { id: 'semantic', label: 'Meaning',   desc: 'Semantic constellation (default)' },
  { id: 'book',     label: 'Book',      desc: 'Group excerpts by source book' },
  { id: 'author',   label: 'Author',    desc: 'Group excerpts by author' },
  { id: 'theme',    label: 'Theme',     desc: 'Cluster by primary theme' },
  { id: 'timeline', label: 'Time',      desc: 'Newest at top, oldest at bottom' },
]

// Persistent, always-visible. The atmosphere toggle stays hidden behind
// the resistance UX (the gear), but reorganizing the constellation is a
// frequent enough operation that it earns surface area.
export default function LayoutSwitcher({ mode, onChange }) {
  return (
    <div
      className="fixed top-5 left-5 z-50 flex items-center gap-1 p-1 rounded-full"
      style={{
        background: 'rgba(26, 15, 8, 0.65)',
        border: '1px solid rgba(232, 169, 66, 0.16)',
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
            title={m.desc}
            className="px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] rounded-full transition-colors duration-200"
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
