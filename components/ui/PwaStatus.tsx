import React, { useEffect, useId, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import Button from './Button';
import CountdownBar from './CountdownBar';

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export default function PwaStatus() {
  const installTitleId = useId();
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
  return <>
  {(!online || needRefresh) && <aside aria-label="App status" className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 print:hidden">
    {!online && <p role="status">You’re offline. Prepared attendance rosters can be used offline. New sign-ins, other records and uploads need internet; attendance stays pending until synced.</p>}
    {needRefresh && <div className="flex flex-wrap items-center gap-3" role="status">
      <p>An app update is ready. Save your work before reloading.</p>
      <button type="button" disabled={!online || updating} onClick={() => void update()} className="min-h-11 font-semibold underline disabled:opacity-50">{updating ? 'Updating…' : 'Reload to update'}</button>
      <button type="button" onClick={() => setNeedRefresh(false)} className="min-h-11 underline">Later</button>
      {updateError && <p role="alert">{updateError}</p>}
    </div>}
  </aside>}
  {online && install && <aside aria-labelledby={installTitleId} className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] z-40 w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 print:hidden">
    <div className="flex items-start gap-3">
      <Download aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-brand-900 dark:text-gold-400" />
      <div className="min-w-0 flex-1" role="status">
        <h2 id={installTitleId} className="text-base font-semibold">Install IARS</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Add IARS to your home screen for quick access to attendance and your records.</p>
      </div>
      <button type="button" aria-label="Dismiss install notification" disabled={installing} onClick={() => setInstall(null)} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-700">
        <X aria-hidden="true" className="h-5 w-5" />
      </button>
    </div>
    <div className="mt-4 space-y-3">
      <div className="flex gap-2">
        <Button disabled={installing} onClick={() => void installApp()}>{installing ? 'Installing…' : 'Install IARS'}</Button>
        <Button variant="secondary" disabled={installing} onClick={() => setInstall(null)}>Maybe later</Button>
      </div>
      <CountdownBar seconds={12} label="This notification closes" paused={installing} onComplete={() => setInstall(null)} />
    </div>
  </aside>}
  </>;
}
