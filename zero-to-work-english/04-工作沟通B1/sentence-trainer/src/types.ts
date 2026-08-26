/** A vocabulary item attached to a sentence card. */
export interface VocabularyItem {
  word: string
  partOfSpeech: string
  meaning: string
  americanIpa: string
  britishIpa: string
  kk: string
}

/** One bilingual example demonstrating a sentence template. */
export interface TemplateExample {
  english: string
  chinese: string
}

/** Grammar and chunking guidance for a sentence pair. */
export interface GrammarNote {
  questionPattern: string
  responsePattern: string
  tense: string
  chunks: string
  templateExamples: {
    question: TemplateExample
    response: TemplateExample
  }
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

export type ReviewGrade = 'again' | 'hard' | 'good' | 'easy'
export type AppView = 'study' | 'library' | 'progress' | 'auth'

/** FSRS memory state persisted for one card. */
export interface CardProgress {
  cardId: number
  due: number
  stability: number
  difficulty: number
  elapsedDays: number
  scheduledDays: number
  learningSteps: number
  reps: number
  lapses: number
  state: number
  lastReview?: number
  updatedAt: number
}

/** One graded review, kept so FSRS parameters can be optimized from real history. */
export interface ReviewLogEntry {
  cardId: number
  rating: number
  state: number
  due: number
  stability: number
  difficulty: number
  elapsedDays: number
  lastElapsedDays: number
  scheduledDays: number
  review: number
}

/** Aggregate review statistics displayed by the progress view. */
export interface ReviewStats {
  learned: number
  mastered: number
  due: number
  totalReviews: number
  streak: number
  retention: number
  averageStability: number
  leeches: number
}