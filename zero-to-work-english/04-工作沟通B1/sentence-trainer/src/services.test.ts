import { beforeEach, describe, expect, it, vi } from 'vitest'
import { State } from 'ts-fsrs'
import type { SupabaseClient } from '@supabase/supabase-js'
import { CloudProgressSync, ReviewScheduler } from './services'
import type { CardProgress, StudyCard } from './types'

const PROGRESS_KEY = 'sentence-trainer-progress-v2'

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length(): number {
    return this.values.size
  }

  clear(): void {
    this.values.clear()
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

function studyCard(id: number): StudyCard {
  return { id } as StudyCard
}

function progress(cardId: number, state: State, due: number): CardProgress {
  return {
    cardId,
    due,
    stability: 1,
    difficulty: 5,
    elapsedDays: 0,
    scheduledDays: 0,
    learningSteps: 1,
    reps: 1,
    lapses: 0,
    state,
    lastReview: due - 60_000,
    updatedAt: due - 60_000,
  }
}

describe('ReviewScheduler queue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-20T12:00:00'))
    vi.stubGlobal('localStorage', new MemoryStorage())
  })

  it('keeps due learning steps when the daily review limit is exhausted', () => {
    const now = Date.now()
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({
      1: progress(1, State.Learning, now - 1),
      2: progress(2, State.Review, now - 1),
    }))

    const queue = new ReviewScheduler({ reviewsPerDay: 0 }).createQueue([studyCard(1), studyCard(2)])

    expect(queue.map((card) => card.id)).toEqual([1])
  })

  it('places learn-ahead cards after cards that are already due', () => {
    const now = Date.now()
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({
      1: progress(1, State.Learning, now + 10 * 60_000),
      2: progress(2, State.Review, now - 1),
    }))

    const queue = new ReviewScheduler().createQueue([studyCard(1), studyCard(2)])

    expect(queue.map((card) => card.id)).toEqual([2, 1])
  })

  it('applies the review limit to interday learning cards', () => {
    const now = Date.now()
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({
      1: { ...progress(1, State.Learning, now - 1), scheduledDays: 1 },
    }))

    const queue = new ReviewScheduler({ reviewsPerDay: 0 }).createQueue([studyCard(1)])

    expect(queue).toEqual([])
  })
})

describe('ReviewScheduler FSRS transitions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-20T12:00:00'))
    vi.stubGlobal('localStorage', new MemoryStorage())
  })

  it('uses the default ten-minute learning step for a new Good answer', () => {
    const scheduler = new ReviewScheduler()

    expect(scheduler.preview(1).good).toBe('10 分钟')
    const updated = scheduler.review(1, 'good')

    expect(updated.state).toBe(State.Learning)
    expect(updated.scheduledDays).toBe(0)
    expect(updated.due).toBe(Date.now() + 10 * 60_000)
  })

  it('graduates a new Easy answer on the 4 a.m. study-day boundary', () => {
    const scheduler = new ReviewScheduler()
    const previewDays = Number.parseInt(scheduler.preview(1).easy, 10)

    const updated = scheduler.review(1, 'easy')
    const expectedDue = new Date('2026-08-20T04:00:00')
    expectedDue.setDate(expectedDue.getDate() + previewDays)

    expect(updated.state).toBe(State.Review)
    expect(updated.scheduledDays).toBe(previewDays)
    expect(updated.due).toBe(expectedDue.getTime())
  })

  it('sends a forgotten review card through relearning and records a lapse', () => {
    const now = Date.now()
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({
      1: {
        ...progress(1, State.Review, now - 1),
        stability: 10,
        elapsedDays: 10,
        scheduledDays: 10,
        learningSteps: 0,
        lastReview: now - 10 * 86_400_000,
      },
    }))
    const scheduler = new ReviewScheduler()

    expect(scheduler.preview(1).again).toBe('10 分钟')
    const updated = scheduler.review(1, 'again')

    expect(updated.state).toBe(State.Relearning)
    expect(updated.lapses).toBe(1)
    expect(updated.due).toBe(now + 10 * 60_000)
  })

  it('treats 3:30 a.m. as part of the previous study day', () => {
    vi.setSystemTime(new Date('2026-08-20T03:30:00'))
    const scheduler = new ReviewScheduler()
    const scheduledDays = Number.parseInt(scheduler.preview(1).easy, 10)

    const updated = scheduler.review(1, 'easy')
    const expectedDue = new Date('2026-08-19T04:00:00')
    expectedDue.setDate(expectedDue.getDate() + scheduledDays)

    expect(updated.due).toBe(expectedDue.getTime())
  })

  it('recovers a card with an invalid persisted state as a new card', () => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({
      1: progress(1, 99 as State, Date.now()),
    }))
    const scheduler = new ReviewScheduler()

    expect(scheduler.preview(1).good).toBe('10 分钟')
    expect(scheduler.review(1, 'good').state).toBe(State.Learning)
  })

  it('spreads an interday interval off a crowded day (load balancing)', () => {
    const base = new ReviewScheduler().review(1, 'easy').scheduledDays
    expect(base).toBeGreaterThanOrEqual(3)

    vi.stubGlobal('localStorage', new MemoryStorage())
    const dayStart = new Date('2026-08-20T04:00:00')
    const peakDay = new Date(dayStart)
    peakDay.setDate(peakDay.getDate() + base)
    const seed: Record<number, CardProgress> = {}
    for (let id = 100; id < 110; id += 1) {
      seed[id] = { ...progress(id, State.Review, peakDay.getTime()), scheduledDays: base }
    }
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(seed))

    const balanced = new ReviewScheduler().review(1, 'easy')

    expect(balanced.scheduledDays).not.toBe(base)
    const chosenDay = new Date(dayStart)
    chosenDay.setDate(chosenDay.getDate() + balanced.scheduledDays)
    expect(balanced.due).toBe(chosenDay.getTime())
  })
})

describe('CloudProgressSync reset', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage())
  })

  function clientWithRpc(result: { data: string | null; error: Error | null }) {
    const rpc = vi.fn().mockResolvedValue(result)
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      rpc,
    } as unknown as SupabaseClient
    return { client, rpc }
  }

  it('clears local progress only after the atomic cloud reset succeeds', async () => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({
      1: progress(1, State.Review, Date.now()),
    }))
    const { client, rpc } = clientWithRpc({ data: '2026-08-20T12:00:00.000Z', error: null })
    const scheduler = new ReviewScheduler()

    await new CloudProgressSync(scheduler, client).clear()

    expect(rpc).toHaveBeenCalledOnce()
    expect(rpc).toHaveBeenCalledWith('clear_review_data')
    expect(scheduler.getProgress()).toEqual({})
  })

  it('keeps local progress when the cloud reset fails', async () => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({
      1: progress(1, State.Review, Date.now()),
    }))
    const { client } = clientWithRpc({ data: null, error: new Error('network failure') })
    const scheduler = new ReviewScheduler()

    await expect(new CloudProgressSync(scheduler, client).clear()).rejects.toThrow('network failure')

    expect(scheduler.getProgress()[1]).toBeDefined()
  })
})

interface FakeBuilder {
  select: () => FakeBuilder
  eq: () => FakeBuilder
  order: () => FakeBuilder
  limit: () => FakeBuilder
  maybeSingle: () => Promise<{ data: null; error: null }>
  upsert: (rows: unknown[]) => Promise<{ error: null }>
  then: (resolve: (value: { data: unknown[]; error: null }) => void) => void
}

describe('CloudProgressSync uploads', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage())
  })

  function recordingClient(uploads: Record<string, unknown[][]>): SupabaseClient {
    const build = (table: string): FakeBuilder => {
      const builder: FakeBuilder = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        limit: () => builder,
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        upsert: (rows) => {
          uploads[table] = [...(uploads[table] ?? []), rows]
          return Promise.resolve({ error: null })
        },
        then: (resolve) => resolve({ data: [], error: null }),
      }
      return builder
    }
    return {
      auth: { getUser: () => Promise.resolve({ data: { user: { id: 'user-1' } } }) },
      from: (table: string) => build(table),
    } as unknown as SupabaseClient
  }

  it('uploads each review once instead of resending the whole history', async () => {
    const uploads: Record<string, unknown[][]> = {}
    const scheduler = new ReviewScheduler()
    const sync = new CloudProgressSync(scheduler, recordingClient(uploads))
    scheduler.review(1, 'good')

    await sync.sync()
    await sync.sync()

    expect(uploads.review_progress).toHaveLength(1)
    expect(uploads.review_logs).toHaveLength(1)
    expect(uploads.review_progress[0]).toHaveLength(1)
    expect(uploads.review_logs[0]).toHaveLength(1)
  })
})