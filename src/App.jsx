import { useState, useEffect, Suspense } from 'react'
import Scene from './components/Scene'
import DetailPanel from './components/DetailPanel'
import AudioController from './components/AudioController'
import LoadingScreen from './components/LoadingScreen'
import LandingScreen from './components/LandingScreen'
import SearchBar from './components/SearchBar'
import Controls from './components/Controls'
import FireGlow from './components/FireGlow'
import seedExcerpts from './data/excerpts-processed.json'

function App() {
  const [selectedExcerpt, setSelectedExcerpt] = useState(null)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [showLanding, setShowLanding] = useState(true)
  const [isEntering, setIsEntering] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [layoutMode, setLayoutMode] = useState('semantic')
  const [backgroundMode, setBackgroundMode] = useState('embers')

  // Live data from /api/excerpts (the DB). Falls back to the seed JSON if
  // the API isn't reachable (e.g. during a vite-only `npm run dev` session)
  // or if the DB is empty.
  const [excerpts, setExcerpts] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/excerpts')
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`${r.status}`)))
      .then(data => {
        if (cancelled) return
        if (Array.isArray(data) && data.length > 0) {
          setExcerpts(data)
        } else {
          // DB empty (data.empty === true) or unexpected shape → seed
          setExcerpts(seedExcerpts)
        }
      })
      .catch(() => {
        if (!cancelled) setExcerpts(seedExcerpts)
      })
    return () => { cancelled = true }
  }, [])

  const handleEnter = () => {
    setIsEntering(true)
    setTimeout(() => setShowLanding(false), 800)
    setTimeout(() => setIsEntering(false), 1300)
  }

  const handleStarClick = (excerpt) => setSelectedExcerpt(excerpt)
  const handleClose = () => setSelectedExcerpt(null)
  const handleRelatedClick = (relatedId) => {
    const related = (excerpts || []).find(e => e.id === relatedId)
    if (related) setSelectedExcerpt(related)
  }

  // Wait for the initial fetch before mounting the Scene
  if (!excerpts) {
    return (
      <div className="w-full h-full bg-umber-900">
        <LoadingScreen />
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-umber-900 canvas-vignette">
      <div
        className="w-full h-full transition-all duration-1000"
        style={showLanding ? { filter: 'blur(3px) brightness(0.6)' } : {}}
      >
        <Suspense fallback={<LoadingScreen />}>
          <Scene
            excerpts={excerpts}
            selectedExcerpt={selectedExcerpt}
            onStarClick={handleStarClick}
            isEntering={isEntering}
            searchQuery={searchQuery}
            layoutMode={layoutMode}
            backgroundMode={backgroundMode}
          />
        </Suspense>
      </div>

      {backgroundMode === 'embers' && !showLanding && <FireGlow />}

      {showLanding && <LandingScreen onEnter={handleEnter} />}

      {!showLanding && (
        <>
          {selectedExcerpt && (
            <DetailPanel
              excerpt={selectedExcerpt}
              excerpts={excerpts}
              onClose={handleClose}
              onRelatedClick={handleRelatedClick}
            />
          )}

          <AudioController
            selectedExcerpt={selectedExcerpt}
            enabled={audioEnabled}
            onToggle={() => setAudioEnabled(!audioEnabled)}
          />

          <SearchBar onSearch={setSearchQuery} />
          <Controls
            layoutMode={layoutMode}
            onLayoutChange={setLayoutMode}
            backgroundMode={backgroundMode}
            onBackgroundChange={setBackgroundMode}
          />
        </>
      )}
    </div>
  )
}

export default App
