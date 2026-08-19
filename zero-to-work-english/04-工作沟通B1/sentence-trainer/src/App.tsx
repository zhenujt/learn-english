import { useEffect, useState } from 'react'
import { BarChart3, BookOpen, Download, Flame, Library } from 'lucide-react'
import { LibraryView, NavButton, ProgressView, StudyView } from './components'
import cardsJson from './data/cards.json'
import { AudioController, ReviewScheduler } from './services'
import type { AppView, ReviewGrade, StudyCard } from './types'
import './App.css'

const cards = cardsJson as StudyCard[]
const scheduler = new ReviewScheduler()
const audioController = new AudioController()

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function App() {
  const [activeView, setActiveView] = useState<AppView>('study')
  const [queue, setQueue] = useState(() => scheduler.createQueue(cards))
  const [cardIndex, setCardIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [reviewRevision, setReviewRevision] = useState(0)
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const card = queue[cardIndex]
  const stats = scheduler.getStats()

  useEffect(() => {
    const handlePrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handlePrompt)
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt)
  }, [])

  const gradeCard = (grade: ReviewGrade) => {
    if (!card) return
    audioController.stop()
    scheduler.review(card.id, grade)
    setReviewRevision((value) => value + 1)
    setRevealed(false)
    setCardIndex((value) => value + 1)
  }

  const startNextSession = () => {
    setQueue(scheduler.createQueue(cards))
    setCardIndex(0)
    setRevealed(false)
  }

  const installApp = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  const playAudio = (source: string) => audioController.play(`${import.meta.env.BASE_URL}${source}`)
  const toggleAudioLoop = (sources: string[], onStateChange: (looping: boolean) => void) => {
    audioController.toggleLoop(
      sources.map((source) => `${import.meta.env.BASE_URL}${source}`),
      onStateChange,
    )
  }

  return (
    <div className="app-shell" data-review-revision={reviewRevision}>
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true"><span></span><span></span><span></span></div>
        <div className="brand-copy">
          <strong>句练</strong>
          <span>软件英语 · 100 句</span>
        </div>
        <div className="topbar-actions">
          <div className="streak" title="连续学习天数"><Flame size={18} /> {stats.streak}</div>
          {installPrompt && (
            <button className="icon-button" type="button" onClick={installApp} title="安装到手机">
              <Download size={20} />
            </button>
          )}
        </div>
      </header>

      <main>
        {activeView === 'study' && <StudyView key={card?.id ?? 'complete'} card={card} current={cardIndex} total={queue.length} revealed={revealed} onReveal={() => setRevealed(true)} onGrade={gradeCard} onPlay={playAudio} onToggleLoop={toggleAudioLoop} onRestart={startNextSession} />}
        {activeView === 'library' && <LibraryView cards={cards} onPlay={playAudio} />}
        {activeView === 'progress' && <ProgressView cards={cards} scheduler={scheduler} onReset={startNextSession} />}
      </main>

      <nav className="bottom-nav" aria-label="主导航">
        <NavButton active={activeView === 'study'} icon={<BookOpen />} label="学习" onClick={() => setActiveView('study')} />
        <NavButton active={activeView === 'library'} icon={<Library />} label="句库" onClick={() => setActiveView('library')} />
        <NavButton active={activeView === 'progress'} icon={<BarChart3 />} label="进度" onClick={() => setActiveView('progress')} />
      </nav>
    </div>
  )
}

export default App
