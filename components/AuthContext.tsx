import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile, UserStats } from '../types';
import { appAuth, refreshData, resetData, subscribeData } from '../lib/backend';
import { supabase, configurationError } from '../lib/supabase';
import { AuthChallenge } from './AuthChallenge';
interface AuthContextType {
  user: { uid: string; email?: string } | null;
  profile: UserProfile | null; stats: UserStats | null;
  loading: boolean; isMock: boolean; error?: string | null; revision?: number;
}
const AuthContext = createContext<AuthContextType>({ user: null, profile: null, stats: null, loading: true, isMock: false });
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [challenge, setChallenge] = useState<'mfa' | 'recovery' | null>(null);
  const [operationError, setOperationError] = useState('');
  const [state, setState] = useState<AuthContextType>({ user: null, profile: null, stats: null, loading: true, isMock: false, error: configurationError, revision: 0 });
  useEffect(() => {
    let disposed = false, syncing = false, syncAgain = false;
    let identity: string | null | undefined;
    const failed = (error: unknown) => { if (!disposed) setState(s => ({ ...s, loading: false, error: error instanceof Error ? error.message : 'Unable to connect to Supabase.' })); };
    const sync = async () => {
      if (disposed) return;
      if (syncing) { syncAgain = true; return; }
      syncing = true;
      try {
        if (identity) {
          const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (error) throw error;
          if (data?.nextLevel === 'aal2' && data.currentLevel !== 'aal2') setChallenge('mfa');
        }
        await refreshData(); if (!disposed) setState(s => ({ ...s, loading: false, error: null }));
      }
      catch (error) { failed(error); }
      finally { syncing = false; if (syncAgain && !disposed) { syncAgain = false; void sync(); } }
    };
    const unsubscribeData = subscribeData(() => {
      if (disposed) return;
      const account = appAuth.getCurrentUser();
      setState(s => ({ ...s, profile: account?.profile.account_status === 'active' ? account.profile : null, stats: account?.stats || null, revision: (s.revision || 0) + 1 }));
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (disposed) return;
      const uid = session?.user.id || null;
      if (_event === 'PASSWORD_RECOVERY') setChallenge('recovery');
      if (!uid) setChallenge(null);
      if (identity !== uid) {
        identity = uid; resetData(uid);
        setState(s => ({ ...s, user: session ? { uid: session.user.id, email: session.user.email } : null, profile: null, stats: null, loading: true }));
      }
      // Auth callbacks hold a client lock; start database queries after the callback returns.
      setTimeout(() => void sync(), 0);
    });
    const poll = setInterval(() => { if (document.visibilityState === 'visible') void sync(); }, 15000);
    const onFocus = () => void sync(); window.addEventListener('focus', onFocus);
    const onRejection = (event: PromiseRejectionEvent) => { setOperationError(event.reason?.message || 'The operation failed. Please retry.'); event.preventDefault(); };
    window.addEventListener('unhandledrejection', onRejection);
    const onSyncError = (event: Event) => failed(new Error((event as CustomEvent).detail));
    window.addEventListener('rmc_sync_error', onSyncError);
    if (configurationError) failed(new Error(configurationError));
    return () => { disposed = true; clearInterval(poll); subscription.unsubscribe(); unsubscribeData(); window.removeEventListener('focus', onFocus); window.removeEventListener('unhandledrejection', onRejection); window.removeEventListener('rmc_sync_error', onSyncError); };
  }, []);
  return <AuthContext.Provider value={state}>
    {state.error && <div role="alert" className="border-b border-red-300 bg-red-50 p-3 text-sm text-red-900">{state.error} <button className="underline" onClick={() => window.location.reload()}>Retry connection</button></div>}
    {operationError && <div role="alert" className="border-b border-red-300 bg-red-50 p-3 text-sm text-red-900">{operationError} <button className="underline" onClick={() => setOperationError('')}>Dismiss</button></div>}
    {challenge ? <AuthChallenge recovery={challenge === 'recovery'} onComplete={() => { setChallenge(null); void refreshData(); }} /> : children}
  </AuthContext.Provider>;
};
export const useAuth = () => useContext(AuthContext);
