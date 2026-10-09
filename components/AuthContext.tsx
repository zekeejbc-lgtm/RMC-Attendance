import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile, UserStats } from '../types';
import { appAuth, appData, refreshData, resetData, subscribeData } from '../lib/backend';
import { supabase, configurationError } from '../lib/supabase';
import { AuthChallenge } from './AuthChallenge';
import { toast } from '../lib/toast';
import { clearOfflineRosters, refreshCachedRosterProfiles, restoreActiveOfflineScanner, restoreOfflineScanner, syncOfflineAttendance } from '../lib/offlineAttendance';
import { refreshAutomaticRosters } from '../lib/autoRosterSync';
import { hasPermission } from '../lib/accessControl';
import { createIdleSession, sessionIdentity } from '../lib/idleSession';
interface AuthContextType {
  user: { uid: string; email?: string } | null;
  profile: UserProfile | null; stats: UserStats | null;
  loading: boolean; isMock: boolean; error?: string | null; revision?: number; offlineScanner?: boolean; approvalNoticeSeen?: boolean;
  markApprovalNoticeSeen?: () => void;
}
const AuthContext = createContext<AuthContextType>({ user: null, profile: null, stats: null, loading: true, isMock: false });
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [challenge, setChallenge] = useState<'mfa' | 'recovery' | null>(null);
  const [state, setState] = useState<AuthContextType>({ user: null, profile: null, stats: null, loading: true, isMock: false, error: configurationError, revision: 0 });
  useEffect(() => {
    let disposed = false, syncing = false, syncAgain = false;
    let identity: string | null | undefined;
    let identityVersion = 0;
    let welcomePending: string | null = null;
    let rosterAuthorizedVersion = -1;
    let expiredOwner: string | null = null;
    const idleSession = createIdleSession(owner => {
      if (disposed || expiredOwner === owner) return;
      expiredOwner = owner;
      identity = null; identityVersion++; rosterAuthorizedVersion = -1; welcomePending = null;
      setChallenge(null);
      resetData();
      setState(s => ({ ...s, user: null, profile: null, stats: null, loading: false, error: null, offlineScanner: false }));
      toast.success('You were signed out after 15 minutes of inactivity. Sign in again to continue.');
      void clearOfflineRosters(owner).catch(error => toast.error(error));
      // Defer Auth calls until the current Auth callback releases its lock.
      // Local scope signs out this browser without interrupting other devices.
      setTimeout(() => {
        if (identity) return; // A fresh login supersedes this deferred logout.
        void supabase.auth.signOut({ scope: 'local' }).then(({ error }) => {
          if (error) console.warn('Session ended locally; server sign-out could not be confirmed.');
        }).catch(() => console.warn('Session ended locally; server sign-out could not be confirmed.'));
      }, 0);
    });
    const refreshRosters = () => {
      const owner = identity, version = identityVersion;
      const profile = appAuth.getCurrentUser()?.profile;
      if (!owner || rosterAuthorizedVersion !== version || profile?.account_status !== 'active') return;
      const organizations = appData.getOrganizations().filter(org => org.can_manage);
      if (!hasPermission(profile.role, 'attendance.scan') && !organizations.length) return;
      const events = appData.getVisibleEvents(owner).filter(event => hasPermission(profile.role, 'attendance.scan') || organizations.some(org => org.id === event.organizationId));
      const isCurrent = () => !disposed && identity === owner && identityVersion === version && rosterAuthorizedVersion === version;
      const update = hasPermission(profile.role, 'attendance.scan') ? refreshCachedRosterProfiles(owner, appData.getVisibleStudents(owner), isCurrent) : Promise.resolve();
      void update.then(() => refreshAutomaticRosters(owner, events, isCurrent)).catch(error => {
        console.warn('Automatic roster storage is unavailable.', error instanceof Error ? error.message : 'Storage unavailable.');
      });
    };
    const restorePreparedScanner = async () => {
      const version = identityVersion;
      try {
        const roster = await restoreActiveOfflineScanner();
        if (disposed || expiredOwner || navigator.onLine || version !== identityVersion) return;
        if (!roster) { if (!identity) { identity = null; failed(new Error('Reconnect to load your school information and records.')); } return; }
        if (identity && identity !== roster.actorUid) return;
        if (!idleSession.setSession(roster.actorUid)) return;
        identity = roster.actorUid; identityVersion++; resetData(identity);
        setState(s => ({ ...s, user: { uid: roster.actorUid }, profile: roster.actor as UserProfile, stats: null, loading: false, error: null, offlineScanner: true }));
      } catch (error) { failed(error); }
    };
    const failed = (error: unknown) => { if (!disposed) setState(s => ({ ...s, loading: false, error: error instanceof Error ? error.message : 'Unable to connect to Supabase.' })); };
    const sync = async () => {
      if (disposed || identity === undefined) return;
      if (!navigator.onLine) {
        const owner = identity;
        try {
          const roster = owner ? await restoreOfflineScanner(owner) : undefined;
          if (disposed || identity !== owner) return;
          if (roster) setState(s => ({ ...s, profile: roster.actor as UserProfile, loading: false, error: null, offlineScanner: true }));
          else failed(new Error('Reconnect to load your school information and records.'));
        } catch (error) { failed(error); }
        return;
      }
      if (syncing) { syncAgain = true; return; }
      syncing = true;
      const version = identityVersion;
      let needsMfa = false;
      try {
        if (identity) {
          const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (disposed || version !== identityVersion) return;
          if (error) throw error;
          needsMfa = data?.nextLevel === 'aal2' && data.currentLevel !== 'aal2';
          if (needsMfa) rosterAuthorizedVersion = -1;
          if (needsMfa) setChallenge('mfa');
        }
        const applied = await refreshData();
        if (disposed || version !== identityVersion) return;
        // A superseded request has not finished loading this session's workspace.
        if (!applied) { syncAgain = true; return; }
        const account = appAuth.getCurrentUser();
        rosterAuthorizedVersion = !needsMfa && account?.profile.account_status === 'active' ? version : -1;
        refreshRosters();
        if (welcomePending === identity && account?.profile.account_status === 'active' && !needsMfa) {
          welcomePending = null;
          toast.success(`Welcome back, ${account.profile.name}! Open the notification bell for your latest updates.`);
        }
        setState(s => ({ ...s, loading: false, error: null, offlineScanner: false }));
        if (identity) void syncOfflineAttendance(identity).catch(error => {
          if (!disposed) console.warn('Attendance remains on this device until synchronization succeeds.', error instanceof Error ? error.message : 'Sync unavailable.');
        });
      }
      catch (error) { if (version === identityVersion) failed(error); }
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
      if (uid) {
        if (!idleSession.setSession(uid, sessionIdentity(session?.access_token))) return;
        expiredOwner = null;
      } else idleSession.setSession(null);
      // A cached, authorized scanner grant remains usable when an expired Auth
      // token cannot refresh offline. It grants no online writes or other routes.
      if (_event === 'INITIAL_SESSION' && !uid && !navigator.onLine && !expiredOwner) {
        setTimeout(() => void restorePreparedScanner(), 0);
        return;
      }
      setState(s => ({ ...s, approvalNoticeSeen: Boolean(session?.user.user_metadata?.approval_notice_seen_at) }));
      if (_event === 'PASSWORD_RECOVERY') setChallenge('recovery');
      if (!uid) setChallenge(null);
      if (identity !== uid) {
        const previousOwner = identity;
        if (previousOwner) void clearOfflineRosters(previousOwner).catch(error => toast.error(error));
        rosterAuthorizedVersion = -1;
        identityVersion++;
        if (syncing) syncAgain = true;
        identity = uid; resetData(uid);
        welcomePending = uid;
        setState(s => ({ ...s, user: session ? { uid: session.user.id, email: session.user.email } : null, profile: null, stats: null, loading: true, error: null, offlineScanner: false }));
      }
      // Auth callbacks hold a client lock; start database queries after the callback returns.
      setTimeout(() => void sync(), 0);
    });
    if (!navigator.onLine) void restorePreparedScanner();
    const poll = setInterval(() => { if (navigator.onLine && document.visibilityState === 'visible') void sync(); }, 15000);
    const rosterPoll = setInterval(() => { if (navigator.onLine) refreshRosters(); }, 60000);
    const onFocus = () => { if (idleSession.check() && navigator.onLine) void sync(); }; window.addEventListener('focus', onFocus);
    window.addEventListener('online', onFocus);
    const onRejection = (event: PromiseRejectionEvent) => { toast.error(event.reason); event.preventDefault(); };
    window.addEventListener('unhandledrejection', onRejection);
    const onSyncError = (event: Event) => failed(new Error((event as CustomEvent).detail));
    window.addEventListener('rmc_sync_error', onSyncError);
    if (configurationError) failed(new Error(configurationError));
    return () => { disposed = true; idleSession.dispose(); clearInterval(poll); clearInterval(rosterPoll); subscription.unsubscribe(); unsubscribeData(); window.removeEventListener('focus', onFocus); window.removeEventListener('online', onFocus); window.removeEventListener('unhandledrejection', onRejection); window.removeEventListener('rmc_sync_error', onSyncError); };
  }, []);
  return <AuthContext.Provider value={{ ...state, markApprovalNoticeSeen: () => setState(s => ({ ...s, approvalNoticeSeen: true })) }}>
    {state.error && <div role="alert" className="border-b border-red-300 bg-red-50 p-3 text-sm text-red-900">{state.error} <button className="underline" onClick={() => window.location.reload()}>Retry connection</button></div>}
    {challenge ? <AuthChallenge recovery={challenge === 'recovery'} onComplete={() => { setChallenge(null); void refreshData(); }} /> : children}
  </AuthContext.Provider>;
};
export const useAuth = () => useContext(AuthContext);
