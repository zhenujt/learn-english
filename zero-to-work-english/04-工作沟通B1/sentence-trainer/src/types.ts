/** A vocabulary item attached to a sentence card. */
export interface VocabularyItem {
  word: string
  partOfSpeech: string
  meaning: string
  americanIpa: string
  britishIpa: string
  kk: string
}

/** Grammar and chunking guidance for a sentence pair. */
export interface GrammarNote {
  questionPattern: string
  responsePattern: string
  tense: string
  chunks: string
  vocabulary: VocabularyItem[]
}

/** One bilingual question-and-response study card. */
export interface StudyCard {
  id: number
  category: string
  question: string
  questionZh: string
  response: string
  responseZh: string
  naturalAudio: string
  clearAudio: string
  jennyNaturalAudio: string
  jennyClearAudio: string
  grammar: GrammarNote
}

export type ReviewGrade = 'again' | 'hard' | 'good'
export type AppView = 'study' | 'library' | 'progress' | 'auth'

/** Persisted spaced-repetition state for one card. */
export interface CardProgress {
  cardId: number
  dueAt: number
  intervalDays: number
  repetitions: number
  lapses: number
  updatedAt?: number
}

/** Aggregate review statistics displayed by the progress view. */
export interface ReviewStats {
  learned: number
  mastered: number
  due: number
  totalReviews: number
  streak: number
}