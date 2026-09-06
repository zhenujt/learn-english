import type { SupabaseClient, User } from "@supabase/supabase-js";
import { supabase } from "../../../shared/auth/auth-client";
import type { SavedWord } from "./word-store";

/** Synchronizes vocabulary records through the shared authenticated session. */
export class WordSyncClient {
  private readonly client: SupabaseClient | undefined = supabase ?? undefined;

  /** @returns Whether Supabase browser credentials are configured. */
  public get configured(): boolean {
    return Boolean(this.client);
  }

  /** @returns The authenticated user, or null in local mode. */
  public async user(): Promise<User | null> {
    if (!this.client) return null;
    return (await this.client.auth.getUser()).data.user;
  }

  /** @returns All cloud word records for the authenticated user. */
  public async pull(): Promise<SavedWord[]> {
    const user = await this.user();
    if (!this.client || !user) return [];
    const { data, error } = await this.client
      .from("docs_words")
      .select("id, word, pronunciation, meaning, example, pronunciation_note, created_at, updated_at, deleted_at")
      .eq("user_id", user.id);
    if (error) throw error;
    return (data ?? []).map((item) => ({
      id: item.id,
      word: item.word,
      pronunciation: item.pronunciation,
      meaning: item.meaning,
      example: item.example,
      pronunciationNote: item.pronunciation_note,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      deletedAt: item.deleted_at ?? undefined,
    }));
  }

  /**
   * Uploads local records using newest-write-wins conflict handling.
   * @param words Local records, including deletion markers.
   */
  public async push(words: SavedWord[]): Promise<void> {
    const user = await this.user();
    if (!this.client || !user || words.length === 0) return;
    const { error } = await this.client.from("docs_words").upsert(
      words.map((word) => ({
        user_id: user.id,
        id: word.id,
        word: word.word,
        pronunciation: word.pronunciation,
        meaning: word.meaning,
        example: word.example,
        pronunciation_note: word.pronunciationNote,
        created_at: word.createdAt,
        updated_at: word.updatedAt,
        deleted_at: word.deletedAt ?? null,
      })),
      { onConflict: "user_id,id" },
    );
    if (error) throw error;
  }
}