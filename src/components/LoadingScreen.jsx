import { motion } from 'framer-motion'

export default function LoadingScreen() {
  return (
    <div className="w-full h-full bg-umber-900 flex items-center justify-center">
      <div className="text-center">
        <motion.div
          className="inline-block"
          animate={{ scale: [1, 1.2, 1], opacity: [0.45, 0.95, 0.45] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div
            className="w-16 h-16 rounded-full blur-xl"
            style={{ background: 'radial-gradient(circle, #f0c465 0%, #e8a942 60%, transparent 100%)' }}
          />
        </motion.div>
        <motion.p
          className="text-parchment-50/50 text-sm mt-4"
          style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 0.5 }}
        >
          Lighting the candles…
        </motion.p>
      </div>
    </div>
  )
}
