import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function LandingScreen({ onEnter }) {
  const [exiting, setExiting] = useState(false)

  const handleEnter = () => {
    setExiting(true)
    onEnter()
  }

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.85, ease: [0.4, 0, 0.2, 1] }}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              backdropFilter: 'blur(7px)',
              WebkitBackdropFilter: 'blur(7px)',
              backgroundColor: 'rgba(13, 8, 5, 0.5)',
            }}
            exit={{
              backdropFilter: 'blur(0px)',
              WebkitBackdropFilter: 'blur(0px)',
              backgroundColor: 'rgba(13, 8, 5, 0)',
              scale: 1.05,
            }}
            transition={{ duration: 0.85, ease: [0.4, 0, 0.2, 1] }}
          />

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, scale: 1.04 }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            className="relative z-10 text-center px-10 py-12 max-w-xs w-full mx-6 glass-parchment"
            style={{ borderRadius: '2rem' }}
          >
            {/* Top highlight line — warm */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(240, 196, 101, 0.35), transparent)',
              }}
            />

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.6 }}
              className="relative z-10"
            >
              <h1
                className="text-4xl font-light text-parchment-50 mb-3 tracking-wide"
                style={{ fontFamily: '"EB Garamond", Georgia, serif' }}
              >
                Wordspace
              </h1>

              <div
                className="w-6 h-px mx-auto mb-5"
                style={{ background: 'rgba(240, 196, 101, 0.35)' }}
              />

              <p className="text-parchment-50/55 text-sm font-light leading-relaxed mb-10">
                A constellation of excerpts,<br />
                thoughts, and reflections.
              </p>

              <motion.button
                onClick={handleEnter}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="w-full py-3.5 rounded-xl text-parchment-50 text-sm font-light transition-all duration-300"
                style={{
                  background: 'rgba(232, 169, 66, 0.10)',
                  border: '1px solid rgba(232, 169, 66, 0.28)',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'rgba(232, 169, 66, 0.18)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'rgba(232, 169, 66, 0.10)')
                }
              >
                Enter
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
