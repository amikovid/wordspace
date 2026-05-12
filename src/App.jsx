import { useState, Suspense } from 'react'
import Scene from './components/Scene'
import DetailPanel from './components/DetailPanel'
import AudioController from './components/AudioController'
import LoadingScreen from './components/LoadingScreen'
import LandingScreen from './components/LandingScreen'
import SearchBar from './components/SearchBar'
import ModeSwitcher from './components/ModeSwitcher'
import BackgroundToggle from './components/BackgroundToggle'
import FireGlow from './components/FireGlow'
import excerptsData from './data/excerpts-processed.json'

function App() {
  const [selectedExcerpt, setSelectedExcerpt] = useState(null)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [showLanding, setShowLanding] = useState(true)
  const [isEntering, setIsEntering] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [layoutMode, setLayoutMode] = useState('semantic')    // semantic | book | timeline
  const [backgroundMode, setBackgroundMode] = useState('embers') // off | motes | embers | spines | stars

  const handleEnter = () => {
    setIsEntering(true)
    setTimeout(() => setShowLanding(false), 800)
    setTimeout(() => setIsEntering(false), 1300)
  }

  const handleStarClick = (excerpt) => setSelectedExcerpt(excerpt)
  const handleClose = () => setSelectedExcerpt(null)
  const handleRelatedClick = (relatedId) => {
    const related = excerptsData.find(e => e.id === relatedId)
    if (related) setSelectedExcerpt(related)
  }

  return (
    <div className="w-full h-full bg-umber-900 canvas-vignette">
      <div
        className="w-full h-full transition-all duration-1000"
        style={showLanding ? { filter: 'blur(3px) brightness(0.6)' } : {}}
      >
        <Suspense fallback={<LoadingScreen />}>
          <Scene
            excerpts={excerptsData}
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
              excerpts={excerptsData}
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
          <ModeSwitcher mode={layoutMode} onChange={setLayoutMode} />
          <BackgroundToggle mode={backgroundMode} onChange={setBackgroundMode} />
        </>
      )}
    </div>
  )
}

export default App
