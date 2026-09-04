import { type SupabaseClient, type User } from "@supabase/supabase-js";
import type { StudySnapshot } from "./workspace-store";
import type { TextAnnotation } from "./annotation-store";
import { supabase } from "../../../shared/auth/auth-client";

/** Syncs study state and annotations using the shared authentication session. */
export class StudySyncClient {
  private readonly client: SupabaseClient | undefined = supabase ?? undefined;

  public get configured(): boolean {
    return Boolean(this.client);
  }

  public async user(): Promise<User | null> {
    if (!this.client) return null;
    return (await this.client.auth.getUser()).data.user;
  }

  public async signOut(): Promise<void> {
    const { error } = (await this.client?.auth.signOut()) ?? {};
    if (error) throw error;
  }

  public async pull(): Promise<StudySnapshot | undefined> {
    const user = await this.user();
    if (!this.client || !user) return undefined;
    const { data, error } = await this.client
      .from("docs_study_state")
      .select("state")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    return data?.state as StudySnapshot | undefined;
  }

  public async push(state: StudySnapshot): Promise<void> {
    const user = await this.user();
    if (!this.client || !user) return;
    const { error } = await this.client.from("docs_study_state").upsert({
      user_id: user.id,
      state,
      updated_at: state.updatedAt,
    });
    if (error) throw error;
  }

  public async pullAnnotations(): Promise<TextAnnotation[]> {
    const user = await this.user();
    if (!this.client || !user) return [];
    const { data, error } = await this.client
      .from("docs_annotations")
      .select("id, document_path, quote, prefix, suffix, start_offset, note, created_at, updated_at, deleted_at")
      .eq("user_id", user.id);
    if (error) throw error;
    return (data ?? []).map((annotation) => ({
      id: annotation.id,
      documentPath: annotation.document_path,
      quote: annotation.quote,
      prefix: annotation.prefix,
      suffix: annotation.suffix,
      startOffset: annotation.start_offset,
      note: annotation.note,
      createdAt: annotation.created_at,
      updatedAt: annotation.updated_at,
      deletedAt: annotation.deleted_at ?? undefined,
    }));
  }

  public async pushAnnotations(annotations: TextAnnotation[]): Promise<void> {
    const user = await this.user();
    if (!this.client || !user || annotations.length === 0) return;
    const { error } = await this.client.from("docs_annotations").upsert(
      annotations.map((annotation) => ({
        user_id: user.id,
        id: annotation.id,
        document_path: annotation.documentPath,
        quote: annotation.quote,
        prefix: annotation.prefix,
        suffix: annotation.suffix,
        start_offset: annotation.startOffset,
        note: annotation.note,
        created_at: annotation.createdAt,
        updated_at: annotation.updatedAt,
        deleted_at: annotation.deletedAt ?? null,
      })),
      { onConflict: "user_id,id" },
    );
    if (error) throw error;
  }
}