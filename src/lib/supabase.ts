import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { env } from './env';

let supabaseInstance: SupabaseClient<Database> | null = null;

/**
 * Returns the initialized Supabase client.
 * Uses only the browser-safe anonymous public key.
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabaseInstance) {
    if (!env.isConfigured && !env.isMockAuthEnabled) {
      console.warn(
        '[Supabase] Missing valid VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. ' +
        'Check .env or enable VITE_ENABLE_DEV_MOCK_AUTH=true for local mock mode.'
      );
    }

    supabaseInstance = createClient<Database>(
      env.supabaseUrl || 'https://placeholder.supabase.co',
      env.supabaseAnonKey || 'placeholder-key',
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }
    );
  }

  return supabaseInstance;
}

export const supabase = getSupabaseClient();
