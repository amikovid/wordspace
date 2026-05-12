import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function SearchBar({ onSearch }) {
  const [stage, setStage] = useState('idle')   // idle → resisting → active
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (stage === 'active' && inputRef.current) inputRef.current.focus()
  }, [stage])

  useEffect(() => {
    onSearch(stage === 'active' ? query : '')
  }, [query, stage])

  const handleIconClick = () => {
    if (stage === 'idle') setStage('resisting')
    else if (stage === 'active') {
      setStage('idle')
      setQuery('')
    }
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3">
      <AnimatePresence>
        {stage === 'resisting' && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="text-center px-6 py-5 max-w-xs glass-parchment"
            style={{ borderRadius: '1.25rem' }}
          >
            <p
              className="text-parchment-50/65 text-[13px] font-light leading-relaxed mb-4"
              style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic' }}
            >
              The constellation rewards wandering.<br />
              Let serendipity lead first.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setStage('idle')}
                className="px-4 py-1.5 text-xs text-parchment-50/45 font-light hover:text-parchment-50/80 transition-colors"
              >
                you're right
              </button>
              <button
                onClick={() => setStage('active')}
                className="px-4 py-1.5 text-xs text-ember-300/75 font-light hover:text-ember-100 transition-colors rounded-lg"
                style={{ border: '1px solid rgba(232, 169, 66, 0.25)' }}
              >
                search anyway
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {stage === 'active' && (
          <motion.div
            initial={{ opacity: 0, width: 32, y: 4 }}
            animate={{ opacity: 1, width: 240, y: 0 }}
            exit={{ opacity: 0, width: 32, y: 4 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            style={{
              background: 'rgba(26, 15, 8, 0.78)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(232, 169, 66, 0.25)',
              borderRadius: '999px',
              overflow: 'hidden',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="passage, author, theme…"
              className="w-full px-5 py-2.5 bg-transparent text-parchment-50/90 text-xs font-light placeholder-parchment-50/30 focus:outline-none"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={handleIconClick}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
        className="w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300"
        style={{
          background: stage === 'active' ? 'rgba(232, 169, 66, 0.18)' : 'rgba(26, 15, 8, 0.65)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: `1px solid rgba(232, 169, 66, ${stage === 'active' ? '0.35' : '0.18'})`,
        }}
        title={stage === 'active' ? 'Close search' : 'Search'}
      >
        {stage === 'active' ? (
          <svg className="w-3.5 h-3.5 text-ember-300/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 text-ember-300/65" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        )}
      </motion.button>
    </div>
  )
}
