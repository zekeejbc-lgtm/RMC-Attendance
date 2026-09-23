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

export type SensitiveConfirmation = { password: string; code: string; typedAction: string; typedName: string; reason: string };

// A separate, short-lived session proves both factors without changing the
// active browser session. Neither credential is sent to the command/audit API.
export async function executeSensitiveAction(action: string, target: string, confirmation: SensitiveConfirmation) {
  requireConfiguration();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user?.email) throw new Error('Sign in again before continuing.');
  const verifier = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'rmc-sensitive-action' } });
  try {
    const login = await verifier.auth.signInWithPassword({ email: user.email, password: confirmation.password });
    if (login.error || login.data.user?.id !== user.id) throw new Error('Incorrect current password.');
    const factors = await verifier.auth.mfa.listFactors();
    if (factors.error) throw factors.error;
    const factor = factors.data.totp.find(item => item.status === 'verified');
    if (!factor) throw new Error('Set up Google Authenticator in your profile security settings before continuing.');
    const verified = await verifier.auth.mfa.challengeAndVerify({ factorId: factor.id, code: confirmation.code });
    if (verified.error) throw new Error('Invalid or expired Google Authenticator code. Try the latest code.');
    const { data, error } = await supabase.rpc('rmc_command', { action, args: [target, confirmation] });
    if (error) throw error;
    if (data === false) throw new Error('This record has linked records or children. Archive it instead.');
    return data;
  } finally { await verifier.auth.signOut({ scope: 'local' }); }
}

// Reauthentication must not downgrade the active browser's verified MFA session.
export async function verifyPassword(email: string, password: string) {
  requireConfiguration();
  const verifier = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'rmc-password-verification' } });
  const { error } = await verifier.auth.signInWithPassword({ email, password });
  if (!error) await verifier.auth.signOut({ scope: 'local' });
  return !error;
}
