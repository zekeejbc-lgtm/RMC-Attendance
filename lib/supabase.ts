import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const configurationError = !url || !key
  ? 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local.'
  : null;

// No privileged key, local database, or demo fallback is shipped to the browser.
export const supabase = createClient(url || 'https://unconfigured.supabase.co', key || 'unconfigured', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export function requireConfiguration() {
  if (configurationError) throw new Error(configurationError);
}

// Reauthentication must not downgrade the active browser's verified MFA session.
export async function verifyPassword(email: string, password: string) {
  requireConfiguration();
  const verifier = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'rmc-password-verification' } });
  const { error } = await verifier.auth.signInWithPassword({ email, password });
  if (!error) await verifier.auth.signOut({ scope: 'local' });
  return !error;
}
