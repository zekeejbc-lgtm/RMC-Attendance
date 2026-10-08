import React from 'react';
import { act, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ rpc: vi.fn(), select: vi.fn(), onAuthStateChange: vi.fn(), assurance: vi.fn() }));
vi.mock('../lib/supabase', () => ({
  configurationError: null, requireConfiguration: () => {},
  supabase: {
    from: () => ({ select: api.select }), rpc: api.rpc,
    auth: { onAuthStateChange: api.onAuthStateChange, mfa: { getAuthenticatorAssuranceLevel: api.assurance } },
  },
}));
vi.mock('./AuthChallenge', () => ({ AuthChallenge: () => null }));
import { AuthProvider, useAuth } from './AuthContext';
import { appData, resetData } from '../lib/backend';
import { toast } from '../lib/toast';

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
  vi.resetAllMocks(); resetData();
  api.onAuthStateChange.mockImplementation(callback => {
    authChange = callback;
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });
  api.assurance.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null });
});
afterEach(() => { cleanup(); resetData(); vi.restoreAllMocks(); });

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
