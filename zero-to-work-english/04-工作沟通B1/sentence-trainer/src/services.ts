import { createEmptyCard, fsrs, get_fuzz_range, Rating, State, type Card as FsrsCard, type FSRS, type Grade } from 'ts-fsrs'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CardProgress, ReviewGrade, ReviewLogEntry, ReviewStats, StudyCard } from './types'
import { supabase } from './auth'

const PROGRESS_KEY = 'sentence-trainer-progress-v2'
const LEGACY_PROGRESS_KEY = 'sentence-trainer-progress-v1'
const ACTIVITY_KEY = 'sentence-trainer-activity-v1'
const REVIEW_LOG_KEY = 'sentence-trainer-review-logs-v1'
const PROGRESS_OWNER_KEY = 'sentence-trainer-progress-owner-v1'
const CLOUD_RESET_KEY = 'sentence-trainer-cloud-reset-v1'
const SYNC_MARK_KEY = 'sentence-trainer-sync-mark-v1'
const LEECH_LAPSES = 8
const MASTERED_STABILITY_DAYS = 21
const LEARN_AHEAD_MS = 1200 * 1000
const ROLLOVER_HOUR = 4
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

/** Renders a sub-day step as a short waiting time. */
function formatMinutes(due: Date, now: Date): string {
  const minutes = Math.max(1, Math.round((due.getTime() - now.getTime()) / 60_000))
  if (minutes < 60) return `${minutes} 分钟`
  return `${Math.round(minutes / 60)} 小时`
}

/** Renders whole scheduled days the way Anki labels its answer buttons. */
function formatDays(days: number): string {
  if (days < 31) return `${days} 天`
  const months = days / 30.417
  if (months < 12) return `${months.toFixed(1)} 个月`
  return `${(days / 365).toFixed(1)} 年`
}

/** Schedules cards with FSRS-6 and keeps review history for later parameter optimization. */
export class ReviewScheduler {
  private readonly engine: FSRS
  private readonly newCardsPerDay: number
  private readonly reviewsPerDay: number
  private readonly maximumInterval: number

  constructor({
    requestRetention = 0.9,
    maximumInterval = 36500,
    newCardsPerDay = 20,
    reviewsPerDay = 200,
  }: SchedulerSettings = {}) {
    this.engine = fsrs({
      request_retention: requestRetention,
      maximum_interval: maximumInterval,
      enable_fuzz: false,
      enable_short_term: true,
    })
    this.newCardsPerDay = newCardsPerDay
    this.reviewsPerDay = reviewsPerDay
    this.maximumInterval = maximumInterval
  }

  /** Start of the Anki-style study day, which rolls over at 4 a.m. local time. */
  private dayStart(timestamp: number): number {
    const start = new Date(timestamp)
    start.setHours(ROLLOVER_HOUR, 0, 0, 0)
    if (start.getTime() > timestamp) start.setDate(start.getDate() - 1)
    return start.getTime()
  }

  private addDays(timestamp: number, days: number): number {
    const shifted = new Date(timestamp)
    shifted.setDate(shifted.getDate() + days)
    return shifted.getTime()
  }

  private studyDayKey(timestamp: number): string {
    const day = new Date(this.dayStart(timestamp))
    const year = day.getFullYear()
    const month = String(day.getMonth() + 1).padStart(2, '0')
    const date = String(day.getDate()).padStart(2, '0')
    return `${year}-${month}-${date}`
  }

  /** Interday cards land on the least loaded day within the fuzz range; steps keep exact times. */
  private resolveDue(card: FsrsCard, cardId: number, now: Date): { dueTs: number; days: number } {
    if (card.scheduled_days < 1) return { dueTs: card.due.getTime(), days: card.scheduled_days }
    const days = this.balancedDays(card.scheduled_days, card.elapsed_days, cardId, now)
    return { dueTs: this.addDays(this.dayStart(now.getTime()), days), days }
  }

  /** Picks a due day near the FSRS interval that flattens review peaks, as Anki's balancer does. */
  private balancedDays(baseDays: number, elapsedDays: number, cardId: number, now: Date): number {
    const base = Math.round(baseDays)
    if (base < 3) return base
    const { min_ivl, max_ivl } = get_fuzz_range(base, elapsedDays, this.maximumInterval)
    if (max_ivl <= min_ivl) return base
    const counts = this.dueCountByDay(cardId)
    const todayStart = this.dayStart(now.getTime())
    const dayLoad = (day: number) => counts.get(this.dayStart(this.addDays(todayStart, day))) ?? 0
    let bestDays = base
    let bestLoad = dayLoad(base)
    for (let day = min_ivl; day <= max_ivl; day++) {
      if (day === base) continue
      const load = dayLoad(day)
      if (load < bestLoad) {
        bestLoad = load
        bestDays = day
      }
    }
    return bestDays
  }

  /** Counts interday cards already scheduled on each study day, excluding one card. */
  private dueCountByDay(excludeCardId: number): Map<number, number> {
    const counts = new Map<number, number>()
    for (const progress of Object.values(this.readProgress())) {
      if (progress.cardId === excludeCardId || progress.scheduledDays < 1) continue
      const dayKey = this.dayStart(progress.due)
      counts.set(dayKey, (counts.get(dayKey) ?? 0) + 1)
    }
    return counts
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

  private toFsrsCard(cardId: number, now: Date): FsrsCard & { cardId: number } {
    const stored = this.readProgress()[cardId]
    if (!stored) return { ...createEmptyCard(now), cardId }
    if (![State.New, State.Learning, State.Review, State.Relearning].includes(stored.state)) {
      return { ...createEmptyCard(now), cardId }
    }
    return {
      cardId,
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

  /** Claims anonymous local data for a user, or clears data owned by another account. */
  associateUser(userId: string): void {
    const owner = localStorage.getItem(PROGRESS_OWNER_KEY)
    if (owner && owner !== userId) this.reset()
    localStorage.setItem(PROGRESS_OWNER_KEY, userId)
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

  /** Counts distinct cards introduced and reviewed since the day rollover. */
  private todayCounts(): { newCards: number; reviews: number } {
    const start = this.dayStart(Date.now())
    const introduced = new Set<number>()
    const reviewed = new Set<number>()
    for (const log of this.getLogs()) {
      if (log.review < start) continue
      if (log.state === State.New) introduced.add(log.cardId)
      else reviewed.add(log.cardId)
    }
    for (const cardId of introduced) reviewed.delete(cardId)
    return { newCards: introduced.size, reviews: reviewed.size }
  }

  /** Mixes new cards evenly through the review queue at Anki's ratio. */
  private interleave(reviews: StudyCard[], fresh: StudyCard[]): StudyCard[] {
    const ratio = (fresh.length + 1) / (reviews.length + 1)
    const queue: StudyCard[] = []
    let reviewIndex = 0
    let newIndex = 0
    while (reviewIndex < reviews.length || newIndex < fresh.length) {
      const takeNew = newIndex < fresh.length
        && (reviewIndex >= reviews.length || newIndex < (reviewIndex + 1) * ratio)
      queue.push(takeNew ? fresh[newIndex++] : reviews[reviewIndex++])
    }
    return queue
  }

  /** Keeps learning steps available while applying daily limits to reviews and new cards. */
  createQueue(cards: StudyCard[]): StudyCard[] {
    const progress = this.readProgress()
    const now = Date.now()
    const counts = this.todayCounts()
    const reviewLimit = Math.max(0, this.reviewsPerDay - counts.reviews - counts.newCards)
    const newLimit = Math.max(0, Math.min(this.newCardsPerDay - counts.newCards, reviewLimit))

    const learning = cards
      .filter((card) => {
        const stored = progress[card.id]
        if (stored === undefined) return false
        return (stored.state === State.Learning || stored.state === State.Relearning)
          && stored.scheduledDays < 1
          && stored.due <= now + LEARN_AHEAD_MS
      })
      .sort((first, second) => progress[first.id].due - progress[second.id].due)
    const dueLearning = learning.filter((card) => progress[card.id].due <= now)
    const learnAhead = learning.filter((card) => progress[card.id].due > now)
    const reviews = cards
      .filter((card) => {
        const stored = progress[card.id]
        if (stored === undefined) return false
        const intraday = (stored.state === State.Learning || stored.state === State.Relearning)
          && stored.scheduledDays < 1
        return !intraday && stored.due <= now
      })
      .sort((first, second) => progress[first.id].due - progress[second.id].due)
      .slice(0, reviewLimit)
    const fresh = cards.filter((card) => progress[card.id] === undefined).slice(0, newLimit)
    return [...dueLearning, ...this.interleave(reviews, fresh), ...learnAhead]
  }

  /** Returns the waiting time each grade would schedule, matching what will be saved. */
  preview(cardId: number): Record<ReviewGrade, string> {
    const now = new Date()
    const preview = this.engine.repeat(this.toFsrsCard(cardId, now), now)
    const label = (grade: Grade) => {
      const scheduled = preview[grade].card
      if (scheduled.scheduled_days < 1) return formatMinutes(scheduled.due, now)
      return formatDays(this.resolveDue(scheduled, cardId, now).days)
    }
    return {
      again: label(Rating.Again),
      hard: label(Rating.Hard),
      good: label(Rating.Good),
      easy: label(Rating.Easy),
    }
  }

  /** Applies a grade through FSRS, persists the new memory state, and records the review. */
  review(cardId: number, grade: ReviewGrade): CardProgress {
    const now = new Date()
    const { card, log } = this.engine.next(this.toFsrsCard(cardId, now), now, RATING_BY_GRADE[grade])
    const schedule = this.resolveDue(card, cardId, now)
    const updated: CardProgress = {
      cardId,
      due: schedule.dueTs,
      stability: card.stability,
      difficulty: card.difficulty,
      elapsedDays: card.elapsed_days,
      scheduledDays: schedule.days,
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
    return progress.due - Date.now() <= LEARN_AHEAD_MS
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
    const date = this.studyDayKey(Date.now())
    const dates = new Set<string>(this.parse<string[]>(ACTIVITY_KEY, []))
    dates.add(date)
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify([...dates].sort()))
  }

  private getStreak(): number {
    const dates = new Set<string>(this.parse<string[]>(ACTIVITY_KEY, []))
    let streak = 0
    const cursor = new Date(this.dayStart(Date.now()))
    if (!dates.has(this.studyDayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1)
    while (dates.has(this.studyDayKey(cursor.getTime()))) {
      streak += 1
      cursor.setDate(cursor.getDate() - 1)
    }
    return streak
  }
}

/** Tracks how far local data has been uploaded for one account. */
interface SyncMark {
  userId: string
  progressAt: number
  logAt: number
}

/** Synchronizes FSRS memory state and review history with the authenticated Supabase user. */
export class CloudProgressSync {
  private readonly scheduler: ReviewScheduler
  private readonly client: SupabaseClient | null
  private pending: Promise<void> = Promise.resolve()

  constructor(scheduler: ReviewScheduler, client: SupabaseClient | null = supabase) {
    this.scheduler = scheduler
    this.client = client
  }

  /** Serializes syncs so an older request cannot overwrite a newer local review. */
  sync(): Promise<void> {
    const operation = this.pending.catch(() => undefined).then(() => this.performSync())
    this.pending = operation
    return operation
  }

  /** Deletes both cloud and local study history for the current account. */
  clear(): Promise<void> {
    const operation = this.pending.catch(() => undefined).then(() => this.performClear())
    this.pending = operation
    return operation
  }

  private async performSync(): Promise<void> {
    const client = this.client
    if (!client) return
    const { data: userData } = await client.auth.getUser()
    const user = userData.user
    if (!user) return
    this.scheduler.associateUser(user.id)
    await this.applyRemoteReset(client, user.id)
    await this.syncProgress(client, user.id)
    await this.syncLogs(client, user.id)
  }

  private async performClear(): Promise<void> {
    const client = this.client
    if (!client) {
      this.scheduler.reset()
      return
    }
    const { data: userData } = await client.auth.getUser()
    const user = userData.user
    if (!user) {
      this.scheduler.reset()
      return
    }
    const { data: resetAt, error } = await client.rpc('clear_review_data')
    if (error) throw error
    if (typeof resetAt !== 'string') throw new Error('Cloud reset did not return a timestamp')
    this.scheduler.reset()
    localStorage.removeItem(SYNC_MARK_KEY)
    this.writeResetMark(user.id, resetAt)
  }

  private async applyRemoteReset(client: SupabaseClient, userId: string): Promise<void> {
    const { data, error } = await client
      .from('review_sync_state')
      .select('reset_at')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    if (!data) return
    const localReset = this.readResetMark(userId)
    if (localReset !== null && new Date(data.reset_at).getTime() <= localReset) return
    this.scheduler.reset()
    localStorage.removeItem(SYNC_MARK_KEY)
    this.writeResetMark(userId, data.reset_at)
  }

  /** Reset markers are per account so one user's clear cannot mask another's. */
  private readResetMark(userId: string): number | null {
    try {
      const stored = JSON.parse(localStorage.getItem(CLOUD_RESET_KEY) ?? 'null') as Record<string, string> | null
      const value = stored?.[userId]
      return value === undefined ? null : new Date(value).getTime()
    } catch {
      return null
    }
  }

  private writeResetMark(userId: string, resetAt: string): void {
    let stored: Record<string, string> = {}
    try {
      stored = JSON.parse(localStorage.getItem(CLOUD_RESET_KEY) ?? '{}') as Record<string, string>
    } catch {
      stored = {}
    }
    stored[userId] = resetAt
    localStorage.setItem(CLOUD_RESET_KEY, JSON.stringify(stored))
  }

  private readSyncMark(userId: string): SyncMark {
    try {
      const stored = JSON.parse(localStorage.getItem(SYNC_MARK_KEY) ?? 'null') as SyncMark | null
      if (stored?.userId === userId) return stored
    } catch {
      return { userId, progressAt: 0, logAt: 0 }
    }
    return { userId, progressAt: 0, logAt: 0 }
  }

  private writeSyncMark(mark: SyncMark): void {
    localStorage.setItem(SYNC_MARK_KEY, JSON.stringify(mark))
  }

  private async syncProgress(client: SupabaseClient, userId: string): Promise<void> {
    const { data, error } = await client
      .from('review_progress')
      .select('card_id,due,stability,difficulty,elapsed_days,scheduled_days,learning_steps,reps,lapses,state,last_review,updated_at')
      .eq('user_id', userId)
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

    const mark = this.readSyncMark(userId)
    const pending = Object.values(this.scheduler.getProgress()).filter((progress) => progress.updatedAt > mark.progressAt)
    if (pending.length === 0) return
    const rows = pending.map((progress) => ({
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
    const { error: upsertError } = await client.from('review_progress').upsert(rows, { onConflict: 'user_id,card_id' })
    if (upsertError) throw upsertError
    this.writeSyncMark({ ...mark, progressAt: Math.max(...pending.map((progress) => progress.updatedAt)) })
  }

  private async syncLogs(client: SupabaseClient, userId: string): Promise<void> {
    const { data, error } = await client
      .from('review_logs')
      .select('card_id,rating,state,due,stability,difficulty,elapsed_days,last_elapsed_days,scheduled_days,review')
      .eq('user_id', userId)
      .order('review', { ascending: false })
      .limit(MAX_STORED_LOGS)
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

    const mark = this.readSyncMark(userId)
    const pending = this.scheduler.getLogs().filter((log) => log.review > mark.logAt)
    if (pending.length === 0) return
    const rows = pending.map((log) => ({
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
    const { error: upsertError } = await client.from('review_logs').upsert(rows, { onConflict: 'user_id,card_id,review' })
    if (upsertError) throw upsertError
    this.writeSyncMark({ ...this.readSyncMark(userId), logAt: Math.max(...pending.map((log) => log.review)) })
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