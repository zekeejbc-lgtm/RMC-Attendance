import { useState } from 'react';
import { useAuth } from '../AuthContext';
import Button from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Surface } from '../ui/Page';
import { supabase, initiateAppRefresh } from '../../lib/supabase';
import ErrorNotice from '../ui/ErrorNotice';

export default function AdminAppUpdates() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [typed, setTyped] = useState('');
  const [needsMfa, setNeedsMfa] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  if (profile?.role !== 'admin') return null;
  const close = () => { if (busy) return; setOpen(false); setPassword(''); setCode(''); setTyped(''); setError(''); };
  const begin = async () => {
    setOpen(true); setReady(false); setError(''); setSuccess(false);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      setNeedsMfa(data.all.some(factor => factor.status === 'verified')); setReady(true);
    } catch { setError('Unable to check two-factor authentication. Reopen this dialog to retry.'); }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy || !ready || typed !== 'initiate') return;
    setBusy(true); setError('');
    try { await initiateAppRefresh(password, code, typed); setPassword(''); setCode(''); setTyped(''); setOpen(false); setSuccess(true); }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to initiate refresh. Try again.'); setPassword(''); setCode(''); }
    finally { setBusy(false); }
  };
  return <Surface className="space-y-4 p-6">
    <h2 className="text-xl font-bold">App Updates</h2>
    <p>New deployments update automatically. Use this action to refresh every connected browser, including logged-out visitors.</p>
    <p className="text-sm text-slate-600 dark:text-slate-300">Unsaved form entries may be lost. Sign-ins and saved offline attendance are preserved. Offline devices refresh after reconnecting. Publish your deployment before initiating a refresh.</p>
    <Button onClick={() => void begin()}>Refresh everyone now</Button>
    {success && <p role="status">Refresh initiated for all clients.</p>}
    <Modal open={open} onClose={close} closeOnBackdrop={!busy} title="Confirm refresh for everyone" description="Verify your identity before refreshing all connected browsers.">
      <form onSubmit={event => void submit(event)} className="space-y-4">
        <label className="block">Current admin password<input type="password" autoComplete="current-password" required disabled={busy} value={password} onChange={event => setPassword(event.target.value)} className="app-control mt-2 w-full rounded-xl border p-3" /></label>
        {needsMfa && <label className="block">Authenticator code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required disabled={busy} value={code} onChange={event => setCode(event.target.value)} className="app-control mt-2 w-full rounded-xl border p-3" /></label>}
        <label className="block">Type initiate to confirm<input autoComplete="off" required disabled={busy} value={typed} onChange={event => setTyped(event.target.value)} className="app-control mt-2 w-full rounded-xl border p-3" /></label>
        {error && <ErrorNotice error={error} operation="Refresh everyone" />}
        <div className="flex gap-3"><Button type="submit" disabled={busy || !ready || !password || typed !== 'initiate' || (needsMfa && !/^\d{6}$/.test(code))}>{busy ? 'Verifying…' : 'Initiate refresh'}</Button><Button variant="secondary" disabled={busy} onClick={close}>Cancel</Button></div>
      </form>
    </Modal>
  </Surface>;
}
