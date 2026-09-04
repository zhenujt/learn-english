import {
  createClient,
  type AuthChangeEvent,
  type Session,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";

/** True when the deployment has Supabase public browser credentials configured. */
export const authConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Both apps ship from one origin and one Supabase project, so keeping the
// default storage key lets /anki and /docs-simple-grammar share a session.
export const supabase: SupabaseClient | null = authConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export type AuthMode = "login" | "signup" | "forgot" | "reset";

/** Email and password authentication shared by every app in this repository. */
export class AuthService {
  public get configured(): boolean {
    return authConfigured;
  }

  public async currentUser(): Promise<User | null> {
    if (!supabase) return null;
    return (await supabase.auth.getUser()).data.user;
  }

  public async signIn(email: string, password: string): Promise<void> {
    const { error } = await this.client().auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }

  public async signUp(email: string, password: string): Promise<void> {
    const { error } = await this.client().auth.signUp({ email, password });
    if (error) throw new Error(error.message);
  }

  public async sendPasswordReset(email: string): Promise<void> {
    const { error } = await this.client().auth.resetPasswordForEmail(email, {
      redirectTo: window.location.href,
    });
    if (error) throw new Error(error.message);
  }

  public async updatePassword(password: string): Promise<void> {
    const { error } = await this.client().auth.updateUser({ password });
    if (error) throw new Error(error.message);
  }

  public async signOut(): Promise<void> {
    const { error } = (await supabase?.auth.signOut()) ?? {};
    if (error) throw new Error(error.message);
  }

  /** Notifies the app when a session starts, refreshes, or ends in any tab. */
  public onChange(
    callback: (event: AuthChangeEvent, session: Session | null) => void,
  ): () => void {
    if (!supabase) return () => undefined;
    const { data } = supabase.auth.onAuthStateChange(callback);
    return () => data.subscription.unsubscribe();
  }

  private client(): SupabaseClient {
    if (!supabase) throw new Error("云端登录尚未配置，当前使用本地模式。");
    return supabase;
  }
}

export const auth = new AuthService();

/** Subscribe to login, logout, and password-reset session changes. */
export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
): () => void {
  return auth.onChange(callback);
}
