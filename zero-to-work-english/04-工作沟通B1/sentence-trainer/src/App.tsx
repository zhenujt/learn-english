import { useEffect, useMemo, useState } from 'react'
import { BarChart3, BookOpen, Download, Flame, Library, UserRound } from 'lucide-react'
import { AuthView, LibraryView, NavButton, ProgressView, StudyView } from './components'
import { onAuthStateChange, supabase } from './auth'
import cardsJson from './data/cards.json'
import { AudioController, CloudProgressSync, ReviewScheduler } from './services'
import type { AppView, ReviewGrade, StudyCard } from './types'
import type { Session } from '@supabase/supabase-js'
import './App.css'

const cards = cardsJson as StudyCard[]
const scheduler = new ReviewScheduler()
const audioController = new AudioController()
const cloudProgressSync = new CloudProgressSync(scheduler)
const EMPTY_PREVIEW: Record<ReviewGrade, string> = { again: '', hard: '', good: '', easy: '' }

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function App() {
  const [activeView, setActiveView] = useState<AppView>('study')
  const [queue, setQueue] = useState(() => scheduler.createQueue(cards))
  const [cardIndex, setCardIndex] = useState(0)
  const [reviewedCards, setReviewedCards] = useState<StudyCard[]>([])
  const [revealed, setRevealed] = useState(false)
  const [reviewRevision, setReviewRevision] = useState(0)
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [resetRequested, setResetRequested] = useState(false)
  const card = queue[cardIndex]
  const stats = scheduler.getStats()
  const preview = useMemo(() => (card && revealed ? scheduler.preview(card.id) : EMPTY_PREVIEW), [card, revealed])

  useEffect(() => {
    const handlePrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handlePrompt)
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt)
  }, [])

  useEffect(() => {
    if (!session) return
    void cloudProgressSync.sync()
      .then(() => {
        setQueue(scheduler.createQueue(cards))
        setCardIndex(0)
        setReviewedCards([])
        setReviewRevision((value) => value + 1)
      })
      .catch(() => undefined)
  }, [session])

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => setSession(data.session))
    return onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      if (event === 'PASSWORD_RECOVERY') {
        setResetRequested(true)
        setActiveView('auth')
      }
    })
  }, [])

  const gradeCard = (grade: ReviewGrade) => {
    if (!card) return
    audioController.stop()
    setReviewedCards((reviewed) => reviewed.some((item) => item.id === card.id) ? reviewed : [...reviewed, card])
    const updated = scheduler.review(card.id, grade)
    void cloudProgressSync.sync().catch(() => undefined)
    if (scheduler.isDueThisSession(updated)) setQueue((value) => [...value, card])
    setReviewRevision((value) => value + 1)
    setRevealed(false)
    setCardIndex((value) => value + 1)
  }

  const startNextSession = () => {
    setQueue(scheduler.createQueue(cards))
    setCardIndex(0)
    setReviewedCards([])
    setRevealed(false)
  }

  const resetProgress = async () => {
    audioController.stop()
    await cloudProgressSync.clear()
    startNextSession()
    setReviewRevision((value) => value + 1)
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
          <button className="account-button" type="button" onClick={() => setActiveView('auth')} title={session ? '账号设置' : '登录账号'}>
            <UserRound size={18} />
            <span>{session?.user.email?.split('@')[0] ?? '登录'}</span>
          </button>
          {installPrompt && (
            <button className="icon-button" type="button" onClick={installApp} title="安装到手机">
              <Download size={20} />
            </button>
          )}
        </div>
      </header>

      <main>
        {activeView === 'study' && <StudyView key={card?.id ?? 'complete'} card={card} current={cardIndex} total={queue.length} reviewedCards={reviewedCards} revealed={revealed} onReveal={() => setRevealed(true)} onGrade={gradeCard} preview={preview} onPlay={playAudio} onToggleLoop={toggleAudioLoop} onRestart={startNextSession} />}
        {activeView === 'library' && <LibraryView cards={cards} onPlay={playAudio} />}
        {activeView === 'progress' && <ProgressView cards={cards} scheduler={scheduler} onReset={resetProgress} />}
        {activeView === 'auth' && <AuthView email={session?.user.email} resetRequested={resetRequested} onSignedOut={() => { setSession(null); setResetRequested(false); setActiveView('study') }} />}
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
