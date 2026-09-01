import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { StudySnapshot } from "./workspace-store";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/** Provides optional email authentication and cross-device study-state sync. */
export class StudySyncClient {
  private readonly client: SupabaseClient | undefined =
    supabaseUrl && supabaseAnonKey
      ? createClient(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
        })
      : undefined;

  public get configured(): boolean {
    return Boolean(this.client);
  }

  public async user(): Promise<User | null> {
    if (!this.client) return null;
    return (await this.client.auth.getUser()).data.user;
  }

  public async sendMagicLink(email: string): Promise<void> {
    if (!this.client) throw new Error("Supabase sync is not configured.");
    const { error } = await this.client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    });
    if (error) throw error;
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
}