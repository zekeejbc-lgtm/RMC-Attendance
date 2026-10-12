import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { supabase, configureEnrollmentConfirmation } from '../../lib/supabase';
import { defaultConfirmationSettings, type EnrollmentConfirmationSettings } from '../../lib/enrollmentConfirmation';
import { Surface } from '../ui/Page';
import { Modal } from '../ui/Modal';
import Button from '../ui/Button';
import ErrorNotice from '../ui/ErrorNotice';

export default function AdminEnrollmentConfirmation() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState(defaultConfirmationSettings);
  const [unlocked, setUnlocked] = useState(false);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [typed, setTyped] = useState('');
  const [needsMfa, setNeedsMfa] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  if (profile?.role !== 'admin') return null;
  const close = () => { if (!busy) { setOpen(false); setPassword(''); setCode(''); setTyped(''); } };
  const begin = async () => {
    setOpen(true); setReady(false); setError(''); setSaved(false);
    try { const result = await supabase.auth.mfa.listFactors(); if (result.error) throw result.error;
      setNeedsMfa(result.data.all.some(f => f.status === 'verified')); setReady(true);
    } catch { setError('Unable to check two-factor authentication. Reopen this dialog to retry.'); }
  };
  const confirm = async (event: React.FormEvent) => {
    event.preventDefault(); if (!ready || busy || typed !== 'initiate') return;
    setBusy(true); setError('');
    try {
      const result = await configureEnrollmentConfirmation(password, code, typed, unlocked ? { ...settings } : null);
      setSettings(result as EnrollmentConfirmationSettings); setUnlocked(true); setSaved(unlocked);
      setOpen(false);
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to update enrollment confirmation.'); }
    finally { setPassword(''); setCode(''); setTyped(''); setBusy(false); }
  };
  return <Surface className="space-y-4 p-6">
    <h2 className="text-xl font-bold">Enrollment email confirmation</h2>
    <p>Only System Owners / Super Admins can change these settings. Verify your current password, enabled 2FA, and type initiate before opening the editor and before saving.</p>
    {!unlocked ? <Button onClick={() => void begin()}>Verify identity to configure enrollment</Button> : <form className="space-y-4" onSubmit={event => { event.preventDefault(); void begin(); }}>
      <label className="block">Signup policy<select className="app-control mt-2 w-full rounded-xl border p-3" value={settings.mode} onChange={e => setSettings({ ...settings, mode: e.target.value as EnrollmentConfirmationSettings['mode'] })}>
        <option value="required">Require email confirmation</option><option value="bypass">Bypass email confirmation</option><option value="google_only">Google signup only (email already verified)</option></select></label>
      <p className="text-sm">This policy applies to new student signups. Google always uses a verified email. Bypass accepts email ownership without a confirmation link.</p>
      <label className="block">Confirmation email<select className="app-control mt-2 w-full rounded-xl border p-3" value={settings.email_kind} onChange={e => setSettings({ ...settings, email_kind: e.target.value as EnrollmentConfirmationSettings['email_kind'] })}><option value="supabase">Supabase standard email</option><option value="custom">Custom email through Resend</option></select></label>
      {settings.email_kind === 'custom' && <p className="text-sm">Requires server secrets ENROLLMENT_RESEND_API_KEY and ENROLLMENT_EMAIL_FROM with a verified sender. Secrets are configured by the system operator.</p>}
      {(['instructions', 'image_url', ...(settings.email_kind === 'custom' ? ['email_subject', 'email_body'] : [])] as Array<keyof EnrollmentConfirmationSettings>).map(key => <label key={key} className="block">{({ instructions: 'Instructions shown during enrollment', image_url: 'Example image URL (optional HTTPS)', email_subject: 'Custom email subject', email_body: 'Custom email message' } as Record<string,string>)[key]}
        {key === 'image_url' || key === 'email_subject' ? <input type={key === 'image_url' ? 'url' : 'text'} maxLength={key === 'image_url' ? 2048 : 200} value={settings[key]} onChange={e => setSettings({ ...settings, [key]: e.target.value })} className="app-control mt-2 w-full rounded-xl border p-3" /> : <textarea required maxLength={key === 'instructions' ? 4000 : 8000} value={settings[key]} rows={4} onChange={e => setSettings({ ...settings, [key]: e.target.value })} className="app-control mt-2 w-full rounded-xl border p-3" />}</label>)}
      {settings.image_url && <img src={settings.image_url} referrerPolicy="no-referrer" alt="Confirmation email example preview" className="max-h-64 max-w-full rounded-xl" />}
      <p className="text-sm">The custom email automatically includes a Supabase verification link. The standard email includes a built-in illustrative example when no image URL is provided.</p>
      <Button type="submit">Review and confirm changes</Button>
    </form>}
    {saved && <p role="status">Enrollment confirmation settings saved.</p>}
    <Modal open={open} onClose={close} closeOnBackdrop={!busy} title={unlocked ? 'Confirm enrollment settings change' : 'Verify Super Admin identity'}>
      <form className="space-y-4" onSubmit={event => void confirm(event)}>
        {unlocked && <p>Save policy: <strong>{settings.mode}</strong>; email: <strong>{settings.email_kind}</strong>. These changes affect new signups immediately.</p>}
        <label className="block">Current password<input required type="password" autoComplete="current-password" disabled={busy} value={password} onChange={e => setPassword(e.target.value)} className="app-control mt-2 w-full rounded-xl border p-3" /></label>
        {needsMfa && <label className="block">Authenticator code<input required pattern="[0-9]{6}" autoComplete="one-time-code" inputMode="numeric" disabled={busy} value={code} onChange={e => setCode(e.target.value)} className="app-control mt-2 w-full rounded-xl border p-3" /></label>}
        <label className="block">Type initiate to confirm<input required autoComplete="off" disabled={busy} value={typed} onChange={e => setTyped(e.target.value)} className="app-control mt-2 w-full rounded-xl border p-3" /></label>
        {error && <ErrorNotice error={error} operation="Enrollment confirmation settings" />}
        <Button type="submit" disabled={busy || !ready || !password || typed !== 'initiate' || (needsMfa && !/^\d{6}$/.test(code))}>{busy ? 'Verifying…' : unlocked ? 'Confirm and save' : 'Confirm and open editor'}</Button>
      </form>
    </Modal>
  </Surface>;
}
