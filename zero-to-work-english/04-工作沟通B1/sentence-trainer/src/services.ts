import type { CardProgress, ReviewGrade, ReviewStats, StudyCard } from './types'

const PROGRESS_KEY = 'sentence-trainer-progress-v1'
const ACTIVITY_KEY = 'sentence-trainer-activity-v1'

/** Stores review history and schedules cards with a lightweight spaced-repetition algorithm. */
export class ReviewScheduler {
  private readProgress(): Record<number, CardProgress> {
    try {
      return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '{}') as Record<number, CardProgress>
    } catch {
      return {}
    }
  }

  private writeProgress(progress: Record<number, CardProgress>): void {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
  }

  /** Returns due reviews first, then fills today's session with unseen cards. */
  createQueue(cards: StudyCard[], limit = 10): StudyCard[] {
    const progress = this.readProgress()
    const now = Date.now()
    const due = cards.filter((card) => progress[card.id]?.dueAt <= now)
    const unseen = cards.filter((card) => !progress[card.id])
    return [...due, ...unseen].slice(0, limit)
  }

  /** Applies a review grade and persists the card's next due date. */
  review(cardId: number, grade: ReviewGrade): void {
    const progress = this.readProgress()
    const current = progress[cardId] ?? {
      cardId,
      dueAt: Date.now(),
      intervalDays: 0,
      repetitions: 0,
      lapses: 0,
    }

    if (grade === 'again') {
      current.dueAt = Date.now() + 60_000
      current.intervalDays = 0
      current.repetitions = 0
      current.lapses += 1
    } else {
      const nextInterval = grade === 'hard'
        ? Math.max(1, Math.round(current.intervalDays * 1.4))
        : current.intervalDays === 0
          ? 3
          : Math.round(current.intervalDays * 2.3)
      current.intervalDays = nextInterval
      current.dueAt = Date.now() + nextInterval * 86_400_000
      current.repetitions += 1
    }

    progress[cardId] = current
    this.writeProgress(progress)
    this.recordActivity()
  }

  /** Calculates learned, mastered, due, review-count, and streak metrics. */
  getStats(): ReviewStats {
    const entries = Object.values(this.readProgress())
    return {
      learned: entries.length,
      mastered: entries.filter((entry) => entry.repetitions >= 3).length,
      due: entries.filter((entry) => entry.dueAt <= Date.now()).length,
      totalReviews: entries.reduce((sum, entry) => sum + entry.repetitions + entry.lapses, 0),
      streak: this.getStreak(),
    }
  }

  /** Removes all local study history after explicit user confirmation. */
  reset(): void {
    localStorage.removeItem(PROGRESS_KEY)
    localStorage.removeItem(ACTIVITY_KEY)
  }

  private recordActivity(): void {
    const date = new Date().toISOString().slice(0, 10)
    const dates = new Set<string>(JSON.parse(localStorage.getItem(ACTIVITY_KEY) ?? '[]') as string[])
    dates.add(date)
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify([...dates].sort()))
  }

  private getStreak(): number {
    const dates = new Set<string>(JSON.parse(localStorage.getItem(ACTIVITY_KEY) ?? '[]') as string[])
    let streak = 0
    const cursor = new Date()
    if (!dates.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1)
    while (dates.has(cursor.toISOString().slice(0, 10))) {
      streak += 1
      cursor.setDate(cursor.getDate() - 1)
    }
    return streak
  }
}

/** Ensures only one in-app pronunciation track plays at a time. */
export class AudioController {
  private currentAudio: HTMLAudioElement | null = null
  private finishCurrent: (() => void) | null = null
  private playbackId = 0
  private looping = false

  /** Stops the previous in-app track and starts the requested audio file. */
  async play(source: string): Promise<void> {
    this.stop()
    await this.playOnce(source)
  }

  /** Starts or stops continuous playback of the supplied tracks in order. */
  toggleLoop(sources: string[], onStateChange: (looping: boolean) => void): void {
    if (this.looping) {
      this.stop()
      onStateChange(false)
      return
    }

    this.stop()
    this.looping = true
    const playbackId = this.playbackId
    onStateChange(true)
    void this.playLoop(sources, playbackId).catch(() => {
      if (playbackId !== this.playbackId) return
      this.stop()
      onStateChange(false)
    })
  }

  /** Stops any individual track or active loop. */
  stop(): void {
    this.playbackId += 1
    this.looping = false
    this.currentAudio?.pause()
    this.finishCurrent?.()
    this.currentAudio = null
    this.finishCurrent = null
  }

  private async playLoop(sources: string[], playbackId: number): Promise<void> {
    while (this.looping && playbackId === this.playbackId) {
      for (const source of sources) {
        if (!this.looping || playbackId !== this.playbackId) return
        await this.playOnce(source)
      }
    }
  }

  private playOnce(source: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(source)
      this.currentAudio = audio
      const finish = () => {
        if (this.currentAudio === audio) this.currentAudio = null
        if (this.finishCurrent === finish) this.finishCurrent = null
        resolve()
      }
      this.finishCurrent = finish
      audio.addEventListener('ended', finish, { once: true })
      audio.addEventListener('error', () => reject(new Error(`Unable to play ${source}`)), { once: true })
      audio.play().catch(reject)
    })
  }
}