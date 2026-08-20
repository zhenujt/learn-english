import { createEmptyCard, fsrs, Rating, State, type Card as FsrsCard, type FSRS, type Grade } from 'ts-fsrs'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CardProgress, ReviewGrade, ReviewLogEntry, ReviewStats, StudyCard } from './types'
import { supabase } from './auth'

const PROGRESS_KEY = 'sentence-trainer-progress-v2'
const LEGACY_PROGRESS_KEY = 'sentence-trainer-progress-v1'
const ACTIVITY_KEY = 'sentence-trainer-activity-v1'
const REVIEW_LOG_KEY = 'sentence-trainer-review-logs-v1'
const LEECH_LAPSES = 8
const MASTERED_STABILITY_DAYS = 21
const SESSION_HORIZON_MS = 20 * 60_000
const MAX_STORED_LOGS = 5000

const RATING_BY_GRADE: Record<ReviewGrade, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
}

/** Progress shape written by the pre-FSRS scheduler. */
interface LegacyCardProgress {
  cardId: number
  dueAt: number
  intervalDays: number
  repetitions: number
  lapses: number
  updatedAt?: number
}

interface SchedulerSettings {
  requestRetention?: number
  maximumInterval?: number
  newCardsPerDay?: number
  reviewsPerDay?: number
}

/** Renders a due date as a short human-readable waiting time. */
function formatInterval(due: Date, now: Date): string {
  const minutes = Math.max(1, Math.round((due.getTime() - now.getTime()) / 60_000))
  if (minutes < 60) return `${minutes} 分钟`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} 小时`
  const days = Math.round(hours / 24)
  if (days < 31) return `${days} 天`
  const months = Math.round(days / 30)
  if (months < 12) return `${months} 个月`
  return `${(days / 365).toFixed(1)} 年`
}

/** Schedules cards with FSRS-6 and keeps review history for later parameter optimization. */
export class ReviewScheduler {
  private readonly engine: FSRS
  private readonly newCardsPerDay: number
  private readonly reviewsPerDay: number

  constructor({
    requestRetention = 0.9,
    maximumInterval = 365,
    newCardsPerDay = 10,
    reviewsPerDay = 60,
  }: SchedulerSettings = {}) {
    this.engine = fsrs({
      request_retention: requestRetention,
      maximum_interval: maximumInterval,
      enable_fuzz: true,
      enable_short_term: true,
    })
    this.newCardsPerDay = newCardsPerDay
    this.reviewsPerDay = reviewsPerDay
  }

  private parse<T>(key: string, fallback: T): T {
    try {
      return JSON.parse(localStorage.getItem(key) ?? 'null') as T ?? fallback
    } catch {
      return fallback
    }
  }

  private readProgress(): Record<number, CardProgress> {
    const stored = this.parse<Record<number, CardProgress>>(PROGRESS_KEY, {})
    if (Object.keys(stored).length > 0) return stored
    const migrated = this.migrateLegacyProgress()
    if (Object.keys(migrated).length > 0) this.writeProgress(migrated)
    return migrated
  }

  private writeProgress(progress: Record<number, CardProgress>): void {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
  }

  /** Converts pre-FSRS records, treating the previous interval as initial stability. */
  private migrateLegacyProgress(): Record<number, CardProgress> {
    const legacy = this.parse<Record<number, LegacyCardProgress>>(LEGACY_PROGRESS_KEY, {})
    const migrated: Record<number, CardProgress> = {}
    for (const entry of Object.values(legacy)) {
      const interval = Math.max(entry.intervalDays, 0)
      migrated[entry.cardId] = {
        cardId: entry.cardId,
        due: entry.dueAt,
        stability: Math.max(interval, 0.5),
        difficulty: 5,
        elapsedDays: interval,
        scheduledDays: interval,
        learningSteps: 0,
        reps: entry.repetitions,
        lapses: entry.lapses,
        state: interval > 0 ? State.Review : State.Learning,
        lastReview: entry.dueAt - interval * 86_400_000,
        updatedAt: entry.updatedAt ?? Date.now(),
      }
    }
    return migrated
  }

  private toFsrsCard(cardId: number, now: Date): FsrsCard {
    const stored = this.readProgress()[cardId]
    if (!stored) return createEmptyCard(now)
    return {
      due: new Date(stored.due),
      stability: stored.stability,
      difficulty: stored.difficulty,
      elapsed_days: stored.elapsedDays,
      scheduled_days: stored.scheduledDays,
      learning_steps: stored.learningSteps,
      reps: stored.reps,
      lapses: stored.lapses,
      state: stored.state as State,
      last_review: stored.lastReview === undefined ? undefined : new Date(stored.lastReview),
    }
  }

  /** Returns the current local progress for cloud synchronization. */
  getProgress(): Record<number, CardProgress> {
    return this.readProgress()
  }

  /** Merges remote progress, retaining the most recently updated card. */
  mergeProgress(remoteProgress: Record<number, CardProgress>): void {
    const localProgress = this.readProgress()
    const merged = { ...localProgress }
    for (const [cardId, remote] of Object.entries(remoteProgress)) {
      const local = localProgress[Number(cardId)]
      if (!local || remote.updatedAt >= local.updatedAt) merged[Number(cardId)] = remote
    }
    this.writeProgress(merged)
  }

  /** Returns the stored review history used to optimize FSRS parameters. */
  getLogs(): ReviewLogEntry[] {
    return this.parse<ReviewLogEntry[]>(REVIEW_LOG_KEY, [])
  }

  /** Merges remote review history, keeping one entry per card and review time. */
  mergeLogs(remoteLogs: ReviewLogEntry[]): void {
    const byKey = new Map<string, ReviewLogEntry>()
    for (const log of [...this.getLogs(), ...remoteLogs]) byKey.set(`${log.cardId}:${log.review}`, log)
    const merged = [...byKey.values()].sort((a, b) => a.review - b.review).slice(-MAX_STORED_LOGS)
    localStorage.setItem(REVIEW_LOG_KEY, JSON.stringify(merged))
  }

  /** Returns overdue cards first, then a limited batch of unseen cards. */
  createQueue(cards: StudyCard[]): StudyCard[] {
    const progress = this.readProgress()
    const now = Date.now()
    const due = cards
      .filter((card) => progress[card.id] !== undefined && progress[card.id].due <= now)
      .sort((first, second) => progress[first.id].due - progress[second.id].due)
      .slice(0, this.reviewsPerDay)
    const unseen = cards.filter((card) => progress[card.id] === undefined).slice(0, this.newCardsPerDay)
    return [...due, ...unseen]
  }

  /** Returns the waiting time each grade would schedule for one card. */
  preview(cardId: number): Record<ReviewGrade, string> {
    const now = new Date()
    const scheduled = this.engine.repeat(this.toFsrsCard(cardId, now), now)
    return {
      again: formatInterval(scheduled[Rating.Again].card.due, now),
      hard: formatInterval(scheduled[Rating.Hard].card.due, now),
      good: formatInterval(scheduled[Rating.Good].card.due, now),
      easy: formatInterval(scheduled[Rating.Easy].card.due, now),
    }
  }

  /** Applies a grade through FSRS, persists the new memory state, and records the review. */
  review(cardId: number, grade: ReviewGrade): CardProgress {
    const now = new Date()
    const { card, log } = this.engine.next(this.toFsrsCard(cardId, now), now, RATING_BY_GRADE[grade])
    const updated: CardProgress = {
      cardId,
      due: card.due.getTime(),
      stability: card.stability,
      difficulty: card.difficulty,
      elapsedDays: card.elapsed_days,
      scheduledDays: card.scheduled_days,
      learningSteps: card.learning_steps,
      reps: card.reps,
      lapses: card.lapses,
      state: card.state,
      lastReview: card.last_review?.getTime(),
      updatedAt: Date.now(),
    }

    const progress = this.readProgress()
    progress[cardId] = updated
    this.writeProgress(progress)

    this.mergeLogs([{
      cardId,
      rating: log.rating,
      state: log.state,
      due: log.due.getTime(),
      stability: log.stability,
      difficulty: log.difficulty,
      elapsedDays: log.elapsed_days,
      lastElapsedDays: log.last_elapsed_days,
      scheduledDays: log.scheduled_days,
      review: log.review.getTime(),
    }])
    this.recordActivity()
    return updated
  }

  /** True when the card is still in a short-term step and should return this session. */
  isDueThisSession(progress: CardProgress): boolean {
    return progress.due - Date.now() <= SESSION_HORIZON_MS
  }

  /** Calculates coverage, retention, memory strength, and streak metrics. */
  getStats(): ReviewStats {
    const entries = Object.values(this.readProgress())
    const reviewLogs = this.getLogs().filter((log) => log.state === State.Review)
    const recalled = reviewLogs.filter((log) => log.rating !== Rating.Again).length
    const stabilities = entries.filter((entry) => entry.state === State.Review).map((entry) => entry.stability)
    return {
      learned: entries.length,
      mastered: entries.filter((entry) => entry.stability >= MASTERED_STABILITY_DAYS).length,
      due: entries.filter((entry) => entry.due <= Date.now()).length,
      totalReviews: entries.reduce((sum, entry) => sum + entry.reps, 0),
      streak: this.getStreak(),
      retention: reviewLogs.length === 0 ? 0 : recalled / reviewLogs.length,
      averageStability: stabilities.length === 0 ? 0 : stabilities.reduce((sum, value) => sum + value, 0) / stabilities.length,
      leeches: entries.filter((entry) => entry.lapses >= LEECH_LAPSES).length,
    }
  }

  /** Removes all local study history after explicit user confirmation. */
  reset(): void {
    localStorage.removeItem(PROGRESS_KEY)
    localStorage.removeItem(LEGACY_PROGRESS_KEY)
    localStorage.removeItem(REVIEW_LOG_KEY)
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

/** Synchronizes FSRS memory state and review history with the authenticated Supabase user. */
export class CloudProgressSync {
  private readonly scheduler: ReviewScheduler

  constructor(scheduler: ReviewScheduler) {
    this.scheduler = scheduler
  }

  /** Pulls remote rows, merges them locally, then uploads the merged result. */
  async sync(): Promise<void> {
    const client = supabase
    if (!client) return
    const { data: userData } = await client.auth.getUser()
    const user = userData.user
    if (!user) return
    await this.syncProgress(client, user.id)
    await this.syncLogs(client, user.id)
  }

  private async syncProgress(client: SupabaseClient, userId: string): Promise<void> {
    const { data, error } = await client
      .from('review_progress')
      .select('card_id,due,stability,difficulty,elapsed_days,scheduled_days,learning_steps,reps,lapses,state,last_review,updated_at')
    if (error) throw error

    this.scheduler.mergeProgress(Object.fromEntries((data ?? []).map((row) => [row.card_id, {
      cardId: row.card_id,
      due: new Date(row.due).getTime(),
      stability: row.stability,
      difficulty: row.difficulty,
      elapsedDays: row.elapsed_days,
      scheduledDays: row.scheduled_days,
      learningSteps: row.learning_steps,
      reps: row.reps,
      lapses: row.lapses,
      state: row.state,
      lastReview: row.last_review === null ? undefined : new Date(row.last_review).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
    }])))

    const rows = Object.values(this.scheduler.getProgress()).map((progress) => ({
      user_id: userId,
      card_id: progress.cardId,
      due: new Date(progress.due).toISOString(),
      stability: progress.stability,
      difficulty: progress.difficulty,
      elapsed_days: progress.elapsedDays,
      scheduled_days: progress.scheduledDays,
      learning_steps: progress.learningSteps,
      reps: progress.reps,
      lapses: progress.lapses,
      state: progress.state,
      last_review: progress.lastReview === undefined ? null : new Date(progress.lastReview).toISOString(),
      updated_at: new Date(progress.updatedAt).toISOString(),
    }))
    if (rows.length === 0) return
    const { error: upsertError } = await client.from('review_progress').upsert(rows, { onConflict: 'user_id,card_id' })
    if (upsertError) throw upsertError
  }

  private async syncLogs(client: SupabaseClient, userId: string): Promise<void> {
    const { data, error } = await client
      .from('review_logs')
      .select('card_id,rating,state,due,stability,difficulty,elapsed_days,last_elapsed_days,scheduled_days,review')
    if (error) throw error

    this.scheduler.mergeLogs((data ?? []).map((row) => ({
      cardId: row.card_id,
      rating: row.rating,
      state: row.state,
      due: new Date(row.due).getTime(),
      stability: row.stability,
      difficulty: row.difficulty,
      elapsedDays: row.elapsed_days,
      lastElapsedDays: row.last_elapsed_days,
      scheduledDays: row.scheduled_days,
      review: new Date(row.review).getTime(),
    })))

    const rows = this.scheduler.getLogs().map((log) => ({
      user_id: userId,
      card_id: log.cardId,
      rating: log.rating,
      state: log.state,
      due: new Date(log.due).toISOString(),
      stability: log.stability,
      difficulty: log.difficulty,
      elapsed_days: log.elapsedDays,
      last_elapsed_days: log.lastElapsedDays,
      scheduled_days: log.scheduledDays,
      review: new Date(log.review).toISOString(),
    }))
    if (rows.length === 0) return
    const { error: upsertError } = await client.from('review_logs').upsert(rows, { onConflict: 'user_id,card_id,review' })
    if (upsertError) throw upsertError
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