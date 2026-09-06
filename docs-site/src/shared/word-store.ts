export interface SavedWord {
  id: string;
  word: string;
  pronunciation: string;
  meaning: string;
  example: string;
  pronunciationNote: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

const wordsKeyPrefix = "docs-words-v1";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Stores vocabulary locally and merges independently updated cloud records. */
export class WordStore {
  private scope = "anonymous";

  /** @returns The local-storage key for the active account scope. */
  public get storageKey(): string {
    return `${wordsKeyPrefix}:${this.scope}`;
  }

  /**
   * Selects the account scope and migrates anonymous words after sign-in.
   * @param userId Authenticated user ID, or undefined for anonymous storage.
   * @returns Words stored in the selected scope.
   */
  public setScope(userId?: string): SavedWord[] {
    if (userId && !uuidPattern.test(userId)) throw new Error("The word account ID is invalid.");
    const anonymousWords = userId ? this.readScope("anonymous") : [];
    this.scope = userId ? `user:${userId}` : "anonymous";
    if (userId && anonymousWords.length > 0) {
      const words = this.merge(anonymousWords, this.readAll());
      this.write(words);
      localStorage.removeItem(`${wordsKeyPrefix}:anonymous`);
      return words;
    }
    return this.readAll();
  }

  /** @returns All valid records, including deletion markers needed for sync. */
  public readAll(): SavedWord[] {
    return this.readScope(this.scope);
  }

  /**
   * Adds or updates one word.
   * @param word Complete word record.
   * @returns Updated local records.
   */
  public save(word: SavedWord): SavedWord[] {
    const words = this.readAll();
    const index = words.findIndex((item) => item.id === word.id);
    if (index >= 0) words[index] = word;
    else words.push(word);
    this.write(words);
    return words;
  }

  /**
   * Soft-deletes a word so deletion can synchronize to other devices.
   * @param id Word record ID.
   * @returns Updated local records.
   */
  public remove(id: string): SavedWord[] {
    const word = this.readAll().find((item) => item.id === id);
    if (!word) return this.readAll();
    const now = new Date().toISOString();
    return this.save({ ...word, updatedAt: now, deletedAt: now });
  }

  /**
   * Merges cloud records by update time while retaining explicit deletions.
   * @param cloud Records downloaded from the cloud.
   * @returns Canonical merged records.
   */
  public mergeCloud(cloud: SavedWord[]): SavedWord[] {
    const words = this.merge(cloud, this.readAll());
    this.write(words);
    return words;
  }

  private readScope(scope: string): SavedWord[] {
    try {
      const value = JSON.parse(localStorage.getItem(`${wordsKeyPrefix}:${scope}`) ?? "[]") as unknown;
      return Array.isArray(value) ? value.filter(this.isWord) : [];
    } catch {
      return [];
    }
  }

  private merge(...sources: SavedWord[][]): SavedWord[] {
    const merged = new Map<string, SavedWord>();
    for (const words of sources) {
      for (const word of words) {
        const current = merged.get(word.id);
        if (!current || word.updatedAt > current.updatedAt) merged.set(word.id, word);
      }
    }
    return [...merged.values()];
  }

  private readonly isWord = (value: unknown): value is SavedWord => {
    if (!value || typeof value !== "object") return false;
    const word = value as Partial<SavedWord>;
    return Boolean(
      typeof word.id === "string" && uuidPattern.test(word.id) &&
      typeof word.word === "string" && word.word.trim() &&
      typeof word.pronunciation === "string" &&
      typeof word.meaning === "string" &&
      typeof word.example === "string" &&
      typeof word.pronunciationNote === "string" &&
      typeof word.createdAt === "string" && Number.isFinite(Date.parse(word.createdAt)) &&
      typeof word.updatedAt === "string" && Number.isFinite(Date.parse(word.updatedAt)) &&
      (word.deletedAt === undefined || Number.isFinite(Date.parse(word.deletedAt)))
    );
  };

  private write(words: SavedWord[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(words));
  }
}