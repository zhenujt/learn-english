import { createClient, type AuthChangeEvent, type Session, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** True when the deployment has Supabase public browser credentials configured. */
export const authConfigured = Boolean(supabaseUrl && supabaseAnonKey)

/** The configured Supabase client, or null for local-only development mode. */
export const supabase: SupabaseClient | null = authConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null

/** Subscribe to login, logout, and password-reset session changes. */
export function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void): () => void {
  if (!supabase) return () => undefined
  const { data } = supabase.auth.onAuthStateChange(callback)
  return () => data.subscription.unsubscribe()
}