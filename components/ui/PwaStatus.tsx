import React, { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export default function PwaStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({
    onRegisterError: () => console.warn('Offline setup was unavailable. It will be retried on the next visit.'),
  });
  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onInstall = (event: Event) => { event.preventDefault(); setInstall(event as InstallEvent); };
    const onInstalled = () => setInstall(null);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('beforeinstallprompt', onInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('beforeinstallprompt', onInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);
  const installApp = async () => {
    if (!install || installing) return;
    setInstalling(true);
    try { await install.prompt(); await install.userChoice; }
    catch { /* The browser can withdraw installation availability. */ }
    finally { setInstall(null); setInstalling(false); }
  };
  const update = async () => {
    setUpdating(true); setUpdateError('');
    try { await updateServiceWorker(true); }
    catch { setUpdateError('Unable to update. Reconnect and try again.'); }
    finally { setUpdating(false); }
  };
  if (online && !needRefresh && !install) return null;
  return <aside aria-label="App status" className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 print:hidden">
    {!online && <p role="status">You’re offline. Reconnect to sign in, load records, upload files, or record attendance.</p>}
    {needRefresh && <div className="flex flex-wrap items-center gap-3" role="status">
      <p>An app update is ready. Save your work before reloading.</p>
      <button type="button" disabled={!online || updating} onClick={() => void update()} className="min-h-11 font-semibold underline disabled:opacity-50">{updating ? 'Updating…' : 'Reload to update'}</button>
      <button type="button" onClick={() => setNeedRefresh(false)} className="min-h-11 underline">Later</button>
      {updateError && <p role="alert">{updateError}</p>}
    </div>}
    {online && install && <button type="button" disabled={installing} onClick={() => void installApp()} className="min-h-11 font-semibold underline">{installing ? 'Installing…' : 'Install IARS'}</button>}
  </aside>;
}
