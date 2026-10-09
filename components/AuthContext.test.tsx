import React from 'react';
import { act, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ rpc: vi.fn(), select: vi.fn(), onAuthStateChange: vi.fn(), assurance: vi.fn(), restoreOffline: vi.fn(), restoreActive: vi.fn(), clearRosters: vi.fn(), syncOffline: vi.fn(), autoRosters: vi.fn(), signOut: vi.fn(), refreshProfiles: vi.fn() }));
vi.mock('../lib/autoRosterSync', () => ({ refreshAutomaticRosters: api.autoRosters }));
vi.mock('../lib/offlineAttendance', () => ({ restoreActiveOfflineScanner: api.restoreActive, restoreOfflineScanner: api.restoreOffline, clearOfflineRosters: api.clearRosters, syncOfflineAttendance: api.syncOffline, refreshCachedRosterProfiles: api.refreshProfiles }));
vi.mock('../lib/supabase', () => ({
  configurationError: null, requireConfiguration: () => {},
  supabase: {
    from: () => ({ select: api.select }), rpc: api.rpc,
    auth: { onAuthStateChange: api.onAuthStateChange, signOut: api.signOut, mfa: { getAuthenticatorAssuranceLevel: api.assurance } },
  },
}));
vi.mock('./AuthChallenge', () => ({ AuthChallenge: () => <div>Authenticator verification required</div> }));
import { AuthProvider, useAuth } from './AuthContext';
import { appAuth, appData, resetData } from '../lib/backend';
import { toast } from '../lib/toast';
import { IDLE_STORAGE_PREFIX, IDLE_TIMEOUT_MS } from '../lib/idleSession';

function deferred() {
  let resolve!: (value: any) => void;
  const promise = new Promise<any>(r => { resolve = r; });
  return { promise, resolve };
}
const nodes = [{ id: 'campus', parent_id: null, data: { name: 'School campus', type: 'campus' } }];
const snapshot = {
  nodes, roles: {}, settings: {}, audit: [], applications: [], excuses: [], sanctions: [], attendance: [],
  profiles: [{ uid: 'student', name: 'Student', account_status: 'active', role: 'student', school_data: {} }],
  events: [{ id: 'assembly', title: 'Assembly' }],
};
let authChange: (event: string, session: any) => void;
function emit(uid: string | null) {
  act(() => authChange(uid ? 'SIGNED_IN' : 'INITIAL_SESSION', uid ? { user: { id: uid } } : null));
}
function Probe() {
  const { loading, profile, error } = useAuth();
  return <div>
    <span>{loading ? 'Loading workspace' : 'Workspace ready'}</span>
    <span>{profile?.name}</span><span>{error}</span>
    <span>{appData.getSchoolStructure().map(n => n.name).join(',')}</span>
    <span>{appData.getEvents().map(e => e.title).join(',')}</span>
  </div>;
}
beforeEach(() => {
  vi.resetAllMocks(); resetData(); localStorage.clear();
  api.signOut.mockResolvedValue({ error: null });
  api.onAuthStateChange.mockImplementation(callback => {
    authChange = callback;
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });
  api.assurance.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null });
  api.clearRosters.mockResolvedValue(undefined); api.syncOffline.mockResolvedValue(undefined);
  api.autoRosters.mockResolvedValue(undefined);
  api.refreshProfiles.mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); resetData(); vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear(); });

it('closes the workspace and clears scanner access on idle logout even if the server is unreachable', async () => {
  vi.useFakeTimers();
  api.rpc.mockResolvedValue({ data: snapshot, error: null });
  api.select.mockResolvedValue({ data: nodes, error: null });
  api.signOut.mockResolvedValue({ error: new Error('Offline') });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  render(<AuthProvider><Probe /></AuthProvider>); emit('student');
  await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  expect(screen.getByText('Student')).toBeInTheDocument();
  // Simulate a suspended browser without running hundreds of background polls.
  vi.setSystemTime(Date.now() + IDLE_TIMEOUT_MS);
  act(() => window.dispatchEvent(new Event('focus')));
  await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  expect(screen.queryByText('Student')).not.toBeInTheDocument();
  expect(api.signOut).toHaveBeenCalledExactlyOnceWith({ scope: 'local' });
  expect(api.clearRosters).toHaveBeenCalledWith('student');
  act(() => authChange('TOKEN_REFRESHED', { user: { id: 'student' } }));
  expect(screen.queryByText('Student')).not.toBeInTheDocument();
  expect(api.signOut).toHaveBeenCalledOnce();
});

it('rejects expired offline scanner access on a cold start', async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  localStorage.setItem(IDLE_STORAGE_PREFIX + 'mayor', JSON.stringify({ sessionId: 'old', lastActivity: Date.now() - IDLE_TIMEOUT_MS }));
  api.restoreActive.mockResolvedValue({ actorUid: 'mayor', actor: { uid: 'mayor', name: 'Prepared Mayor', role: 'mayor', account_status: 'active', school_data: {} } });
  render(<AuthProvider><Probe /></AuthProvider>); emit(null);
  await waitFor(() => expect(api.clearRosters).toHaveBeenCalledWith('mayor'));
  expect(screen.queryByText('Prepared Mayor')).not.toBeInTheDocument();
  expect(api.rpc).not.toHaveBeenCalled();
});

it('keeps a passkey SIGNED_IN session behind the existing authenticator challenge when required', async () => {
  api.assurance.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal2' }, error: null });
  api.rpc.mockResolvedValue({ data: snapshot, error: null });
  render(<AuthProvider><Probe /></AuthProvider>);
  act(() => authChange('SIGNED_IN', { user: { id: 'student' }, amr: [{ method: 'passkey' }] }));
  await screen.findByText('Authenticator verification required');
  expect(screen.queryByText('Workspace ready')).not.toBeInTheDocument();
  expect(api.autoRosters).not.toHaveBeenCalled();
});

it('does not expose an active profile for an unapproved account after passkey SIGNED_IN', async () => {
  api.rpc.mockResolvedValue({ data: { ...snapshot, profiles: [{ ...snapshot.profiles[0], account_status: 'pending' }] }, error: null });
  render(<AuthProvider><Probe /></AuthProvider>);
  act(() => authChange('SIGNED_IN', { user: { id: 'student' }, amr: [{ method: 'passkey' }] }));
  await screen.findByText('Workspace ready');
  expect(screen.queryByText('Student')).not.toBeInTheDocument();
  expect(api.autoRosters).not.toHaveBeenCalled();
});

it('restores only a prepared scanner’s profile after an offline cold start', async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  api.restoreOffline.mockResolvedValue({ actor: { uid: 'mayor', name: 'Prepared Mayor', role: 'mayor', account_status: 'active', school_data: {} } });
  const OfflineProbe = () => { const auth = useAuth(); return <span>{auth.offlineScanner ? 'Prepared scanner only' : 'Online workspace'}</span>; };
  render(<AuthProvider><Probe /><OfflineProbe /></AuthProvider>); emit('mayor');
  await screen.findByText('Prepared Mayor');
  expect(screen.getByText('Prepared scanner only')).toBeInTheDocument();
  expect(api.rpc).not.toHaveBeenCalled();
});
it('restores a prepared scanner when expired Auth tokens cannot refresh offline', async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  api.restoreActive.mockResolvedValue({ actorUid: 'mayor', actor: { uid: 'mayor', name: 'Prepared Mayor', role: 'mayor', account_status: 'active', school_data: {} } });
  render(<AuthProvider><Probe /></AuthProvider>); emit(null);
  await screen.findByText('Prepared Mayor');
  expect(api.rpc).not.toHaveBeenCalled();
});

it('clears the previous account’s roster on logout while the queue handles pending retention', async () => {
  api.rpc.mockResolvedValue({ data: snapshot, error: null }); api.select.mockResolvedValue({ data: nodes, error: null });
  render(<AuthProvider><Probe /></AuthProvider>); emit('student');
  await screen.findByText('Student'); emit(null);
  await waitFor(() => expect(api.clearRosters).toHaveBeenCalledWith('student'));
});
it('prepares authorized rosters after login without opening a scanner and invalidates work on logout', async () => {
  const mayor = { ...snapshot.profiles[0], uid: 'mayor', name: 'Mayor', role: 'mayor' };
  const eventsForMayor = snapshot.events.map(event => ({ ...event, created_by: 'mayor' }));
  api.rpc.mockResolvedValue({ data: { ...snapshot, events: eventsForMayor, profiles: [mayor] }, error: null });
  api.select.mockResolvedValue({ data: nodes, error: null });
  render(<AuthProvider><Probe /></AuthProvider>); emit('mayor');
  await waitFor(() => expect(api.autoRosters).toHaveBeenCalled());
  const [owner, events, isCurrent] = api.autoRosters.mock.calls[0];
  expect(owner).toBe('mayor'); expect(events).toEqual(eventsForMayor); expect(isCurrent()).toBe(true);
  emit(null); expect(isCurrent()).toBe(false);
  await waitFor(() => expect(api.clearRosters).toHaveBeenCalledWith('mayor'));
});
it('does not cache rosters for students or scanner sessions awaiting MFA', async () => {
  api.rpc.mockResolvedValue({ data: snapshot, error: null });
  const rendered = render(<AuthProvider><Probe /></AuthProvider>); emit('student');
  await screen.findByText('Student'); expect(api.autoRosters).not.toHaveBeenCalled();
  rendered.unmount();
  api.assurance.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal2' }, error: null });
  api.rpc.mockResolvedValue({ data: { ...snapshot, profiles: [{ ...snapshot.profiles[0], uid: 'mayor', role: 'mayor' }] }, error: null });
  render(<AuthProvider><Probe /></AuthProvider>); emit('mayor');
  await waitFor(() => expect(api.assurance).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(api.rpc).toHaveBeenCalledTimes(2));
  expect(api.autoRosters).not.toHaveBeenCalled();
});
it('waits for local roster deletion before resolving logout', async () => {
  resetData('mayor'); api.signOut.mockResolvedValue({ error: null });
  const deletion = deferred(); api.clearRosters.mockReturnValue(deletion.promise);
  let completed = false;
  const logout = appAuth.signOut().then(() => { completed = true; });
  await waitFor(() => expect(api.clearRosters).toHaveBeenCalledWith('mayor'));
  expect(completed).toBe(false);
  deletion.resolve(undefined); await logout; expect(completed).toBe(true);
});

it('avoids backend polling while offline and restores the workspace on reconnect', async () => {
  const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  api.rpc.mockResolvedValue({ data: snapshot, error: null });
  render(<AuthProvider><Probe /></AuthProvider>); emit('student');
  await screen.findAllByText('Reconnect to load your school information and records.');
  expect(api.rpc).not.toHaveBeenCalled();
  act(() => window.dispatchEvent(new Event('focus')));
  expect(api.rpc).not.toHaveBeenCalled();
  online.mockReturnValue(true);
  act(() => window.dispatchEvent(new Event('online')));
  await screen.findByText('Student');
  expect(api.rpc).toHaveBeenCalledOnce();
  expect(screen.queryAllByText('Reconnect to load your school information and records.')).toHaveLength(0);
});

it('shows school data on first open as soon as the public request finishes', async () => {
  const request = deferred(); api.select.mockReturnValue(request.promise);
  render(<AuthProvider><Probe /></AuthProvider>); emit(null);
  await waitFor(() => expect(api.select).toHaveBeenCalledOnce());
  expect(screen.getByText('Loading workspace')).toBeInTheDocument();
  await act(async () => request.resolve({ data: nodes, error: null }));
  expect(screen.getByText('School campus')).toBeInTheDocument();
  expect(screen.getByText('Workspace ready')).toBeInTheDocument();
});

it('loads the school, profile and events when restoring a saved login', async () => {
  api.rpc.mockResolvedValue({ data: snapshot, error: null });
  render(<AuthProvider><Probe /></AuthProvider>); emit('student');
  await screen.findByText('Workspace ready');
  expect(screen.getByText('School campus')).toBeInTheDocument();
  expect(screen.getByText('Student')).toBeInTheDocument();
  expect(screen.getByText('Assembly')).toBeInTheDocument();
});
it('preserves per-student statistics and approved memberships after indexed snapshot refresh', async () => {
  api.rpc.mockResolvedValue({ data: { ...snapshot,
    organization_members: [{ student_id: 'student', organization_id: 'approved', status: 'approved' }, { student_id: 'student', organization_id: 'pending', status: 'pending' }],
    attendance: [{ student_id: 'student', event_id: 'assembly', data: { status: 'present' } }, { student_id: 'student', event_id: 'assembly', data: { status: 'absent' } }, { student_id: 'student', event_id: 'other', data: { status: 'excused' } }, { student_id: 'someone-else', event_id: 'other', data: { status: 'absent' } }],
    merit_credits: [{ student_id: 'student', hours: 1 }, { student_id: 'student', hours: 2 }, { student_id: 'someone-else', hours: 99 }],
    sanctions: [{ student_id: 'student', data: { change: 2 } }, { student_id: 'student', data: { change: -0.5 } }],
  }, error: null });
  render(<AuthProvider><Probe /></AuthProvider>); emit('student'); await screen.findByText('Student');
  expect(appAuth.getCurrentUser()?.stats).toEqual({ merit_hours: 3, events_attended: 2, events_missed: 1, attendance_rate: 67, sanction_hours: 1.5 });
  expect(appAuth.getCurrentUser()?.profile.organizationIds).toEqual(['approved']);
});
it('redacts raw QR passes from fallback RPC error logging', async () => {
  const token = `RMC1:${'a'.repeat(64)}`;
  api.rpc.mockResolvedValue({ data: null, error: { message: 'Invalid QR', code: '22023' } });
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  await expect(appData.resolveQr(token)).rejects.toMatchObject({ message: 'Invalid QR' });
  expect(JSON.stringify(log.mock.calls)).not.toContain(token);
  expect(log.mock.calls[0][1]).toMatchObject({ args: { token: '[redacted]' } });
});

it('shows a welcome popup on every login without repeating it on refresh or token renewal', async () => {
  const popup = vi.spyOn(toast, 'success');
  api.rpc.mockResolvedValue({ data: snapshot, error: null });
  api.select.mockResolvedValue({ data: nodes, error: null });
  render(<AuthProvider><Probe /></AuthProvider>); emit('student');
  await waitFor(() => expect(popup).toHaveBeenCalledOnce());
  expect(popup).toHaveBeenCalledWith(expect.stringContaining('Welcome back, Student!'));
  act(() => authChange('TOKEN_REFRESHED', { user: { id: 'student' } }));
  act(() => window.dispatchEvent(new Event('focus')));
  await waitFor(() => expect(api.rpc.mock.calls.length).toBeGreaterThan(1));
  expect(popup).toHaveBeenCalledOnce();
  emit(null);
  await waitFor(() => expect(screen.queryByText('Student')).not.toBeInTheDocument());
  emit('student');
  await waitFor(() => expect(popup).toHaveBeenCalledTimes(2));
});

it.each([false, true])('keeps login loading when the old public request completes (error: %s)', async fails => {
  const publicRequest = deferred(), privateRequest = deferred();
  api.select.mockReturnValue(publicRequest.promise);
  api.rpc.mockReturnValue(privateRequest.promise);
  render(<AuthProvider><Probe /></AuthProvider>); emit(null);
  await waitFor(() => expect(api.select).toHaveBeenCalledOnce());
  emit('student');
  await act(async () => publicRequest.resolve({ data: nodes, error: fails ? new Error('Old request failed') : null }));
  await waitFor(() => expect(api.rpc).toHaveBeenCalled());
  expect(screen.getByText('Loading workspace')).toBeInTheDocument();
  expect(screen.queryByText('Old request failed')).not.toBeInTheDocument();
  await act(async () => privateRequest.resolve({ data: snapshot, error: null }));
  expect(screen.getByText('Workspace ready')).toBeInTheDocument();
  expect(screen.getByText('School campus')).toBeInTheDocument();
  expect(screen.getByText('Assembly')).toBeInTheDocument();
});
