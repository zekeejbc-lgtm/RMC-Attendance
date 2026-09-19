import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { appAuth } from '../lib/backend';
import Button from './ui/Button';

export function AuthChallenge({ recovery = false, onComplete }: { recovery?: boolean; onComplete: () => void }) {
  const [value, setValue] = useState('');
  const [factorId, setFactorId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!recovery) void supabase.auth.mfa.listFactors().then(({ data }) => setFactorId(data?.totp[0]?.id || '')); }, [recovery]);
  return <div className="min-h-dvh grid place-items-center p-6"><form className="app-surface w-full max-w-md space-y-4 p-6" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = recovery ? await supabase.auth.updateUser({ password: value }) : await supabase.auth.mfa.challengeAndVerify({ factorId, code: value });
      if (result.error) throw result.error;
      onComplete();
    } catch (error) { setError(error instanceof Error ? error.message : 'Verification failed.'); }
    finally { setBusy(false); }
  }}>
    <h1 className="text-xl font-bold">{recovery ? 'Set a new password' : 'Two-factor verification'}</h1>
    <label className="block">{recovery ? 'New password (at least 12 characters)' : 'Authenticator code'}<input className="input-field mt-2" required type={recovery ? 'password' : 'text'} inputMode={recovery ? undefined : 'numeric'} minLength={recovery ? 12 : 6} maxLength={recovery ? 128 : 6} autoComplete={recovery ? 'new-password' : 'one-time-code'} value={value} onChange={e => setValue(e.target.value)} /></label>
    {error && <p role="alert" className="text-red-600">{error}</p>}
    <Button type="submit" disabled={busy || (!recovery && !factorId)}>{busy ? 'Verifying…' : 'Continue'}</Button>
    <Button variant="secondary" onClick={() => void appAuth.signOut()}>Sign out</Button>
  </form></div>;
}
