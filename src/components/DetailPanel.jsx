import { motion, AnimatePresence } from 'framer-motion'

function SourceLine({ source }) {
  if (!source) return null
  const { title, author, page } = source
  const parts = []
  if (author) parts.push(author)
  if (title) parts.push(<em key="t">{title}</em>)
  if (page) parts.push(`p. ${page}`)
  return (
    <p className="text-xs uppercase tracking-[0.18em] text-ember-300/70 mb-6">
      {parts.map((p, i) => (
        <span key={i}>
          {p}{i < parts.length - 1 ? ' · ' : ''}
        </span>
      ))}
    </p>
  )
}

export default function DetailPanel({ excerpt, excerpts, onClose, onRelatedClick }) {
  const related = (excerpt.related || [])
    .map(id => excerpts.find(e => e.id === id))
    .filter(Boolean)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        // Stop wheel/touch/pointer events from bubbling up to TrackballControls
        // — otherwise scrolling inside the panel zooms the 3D scene instead.
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="fixed bottom-0 left-0 right-0
                   md:top-1/2 md:right-8 md:left-auto md:bottom-auto md:-translate-y-1/2
                   w-full md:w-[420px]
                   max-h-[68vh] md:max-h-[82vh]
                   glass-parchment rounded-t-3xl md:rounded-3xl p-7 md:p-9
                   overflow-y-auto overscroll-contain hide-scrollbar z-50"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center
                     rounded-full bg-umber-700/50 hover:bg-umber-600/60
                     text-parchment-50/70 hover:text-parchment-50
                     transition-smooth"
          aria-label="Close"
        >
          <span className="text-lg leading-none">×</span>
        </button>

        <SourceLine source={excerpt.source} />

        {/* The excerpt itself — serif, dignified */}
        <blockquote className="excerpt-body text-[1.35rem] md:text-[1.5rem] mb-6 relative">
          <span className="absolute -left-3 -top-2 text-ember-300/30 text-3xl select-none leading-none font-serif">“</span>
          {excerpt.text}
        </blockquote>

        {/* User's thought */}
        {excerpt.my_thought && (
          <div className="mb-6 pl-4 border-l border-copper-500/30">
            <p className="text-[11px] uppercase tracking-[0.2em] text-ember-300/60 mb-2">My thought</p>
            <p className="text-sm text-parchment-50/85 leading-relaxed font-light">
              {excerpt.my_thought}
            </p>
          </div>
        )}

        {/* Claude's reflection — only shown once analysis layer has populated it */}
        {excerpt.claude_reflection && (
          <div className="mb-6 pl-4 border-l border-ember-400/40">
            <p className="text-[11px] uppercase tracking-[0.2em] text-ember-300/60 mb-2">Reflection</p>
            <p className="text-sm text-parchment-50/85 leading-relaxed font-light italic">
              {excerpt.claude_reflection}
            </p>
          </div>
        )}

        {/* Themes */}
        {excerpt.themes?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {excerpt.themes.map(theme => (
              <span
                key={theme}
                className="px-2.5 py-0.5 text-[10px] uppercase tracking-widest
                           rounded-full border border-copper-500/30 text-ember-300/75
                           bg-umber-800/40"
              >
                {theme}
              </span>
            ))}
          </div>
        )}

        {/* Related excerpts */}
        {related.length > 0 && (
          <div className="mt-7 pt-5 border-t border-copper-500/15">
            <p className="text-[11px] uppercase tracking-[0.2em] text-ember-300/60 mb-3">
              Nearby in the constellation
            </p>
            <div className="space-y-2">
              {related.map(r => (
                <motion.button
                  key={r.id}
                  onClick={() => onRelatedClick(r.id)}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full text-left p-3.5 rounded-xl
                             bg-umber-800/40 hover:bg-umber-700/55
                             border border-copper-500/10 hover:border-copper-500/25
                             transition-smooth group"
                >
                  <p className="excerpt-body text-[0.95rem] text-parchment-50/90 group-hover:text-ember-100 transition-colors line-clamp-2">
                    {r.text}
                  </p>
                  {r.source?.author && (
                    <p className="text-[10px] uppercase tracking-widest text-ember-300/50 mt-1.5">
                      {r.source.author}
                    </p>
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
