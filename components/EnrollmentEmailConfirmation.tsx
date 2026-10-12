import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { appAuth } from '../lib/backend';
import type { EnrollmentConfirmationSettings } from '../lib/enrollmentConfirmation';
import Button from './ui/Button';
import ErrorNotice from './ui/ErrorNotice';

export default function EnrollmentEmailConfirmation({ email, settings, onConfirmed }: { email: string; settings: EnrollmentConfirmationSettings; onConfirmed: () => void }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const check = async () => {
    setBusy(true); setError('');
    // A pending MFA challenge must never downgrade the active browser session.
    const verifier = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    let transferred = false;
    try {
      const current = await supabase.auth.getUser();
      if (current.data.user?.email?.toLowerCase() === email.toLowerCase() && current.data.user.email_confirmed_at) { onConfirmed(); return; }
      const result = await verifier.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (!result.data.user?.email_confirmed_at || !result.data.session) throw new Error('Confirm your email address using the link in your inbox first.');
      const session = await supabase.auth.setSession(result.data.session);
      if (session.error) throw session.error;
      transferred = true;
      onConfirmed();
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to check email confirmation.'); }
    finally { setPassword(''); setBusy(false); if (!transferred) await verifier.auth.signOut({ scope: 'local' }); }
  };
  return <section aria-label="Email verification" className="space-y-4 rounded-xl border border-amber-300 p-5 text-left">
    <h3 className="text-xl font-bold">Confirm your email to complete enrollment</h3>
    <p>Check <strong>{email}</strong> for your confirmation link.</p>
    <p className="whitespace-pre-line">{settings.instructions}</p>
    {settings.image_url ? <img src={settings.image_url} alt="Example of the enrollment confirmation email" referrerPolicy="no-referrer" className="max-h-80 max-w-full rounded-xl object-contain" /> : settings.email_kind === 'supabase' && <div className="rounded-xl border bg-white p-5 text-slate-900" aria-label="Illustrative standard confirmation email">
      <p className="text-xs text-slate-500">Illustrative example — your email may look different</p><h4 className="my-3 text-lg font-bold">Confirm your signup</h4><p>Follow this link to confirm your user:</p><span className="mt-3 inline-block text-blue-700 underline">Confirm your mail</span>
    </div>}
    <label className="block">Enrollment password<input type="password" autoComplete="current-password" value={password} disabled={busy} onChange={event => setPassword(event.target.value)} className="app-control mt-2 w-full rounded-xl border p-3" /></label>
    <div className="flex flex-wrap gap-3"><Button disabled={busy} onClick={() => void check()}>{busy ? 'Checking…' : 'Check email confirmation'}</Button>
      <Button variant="secondary" disabled={busy} onClick={async () => { setBusy(true); setError(''); setSent(false); try { await appAuth.resendConfirmation(email); setSent(true); } catch (error) { setError(error instanceof Error ? error.message : 'Unable to resend confirmation email.'); } finally { setBusy(false); } }}>Resend confirmation email</Button></div>
    {sent && <p role="status">Confirmation email requested. Check your inbox and spam folder.</p>}
    {error && <ErrorNotice error={error} operation="Confirm enrollment email" />}
  </section>;
}
