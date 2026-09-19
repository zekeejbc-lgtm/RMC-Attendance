import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ rpc: vi.fn(), select: vi.fn(), invoke: vi.fn(), signUp: vi.fn() }));
vi.mock('./supabase', () => ({
  requireConfiguration: () => {},
  supabase: { rpc: api.rpc, from: () => ({ select: api.select }), functions: { invoke: api.invoke }, auth: { signUp: api.signUp } },
}));
import { appData, refreshData, resetData } from './backend';
import type { UserProfile } from '../types';

const applicant = { email: 'student@example.edu', name: 'Student', username: 'student_123', student_id: '123', school_data: {} } as UserProfile;
it('submits the admission profile and key through Supabase and reports email confirmation', async () => {
  resetData();
  api.signUp.mockResolvedValue({ data: { user: { id: 'new', identities: [{}] }, session: null }, error: null });
  await expect(appData.submitApplication(applicant, 'strong-password', 'SECTION-KEY')).resolves.toEqual({ uid: 'new', needsEmailConfirmation: true });
  expect(api.signUp).toHaveBeenCalledWith(expect.objectContaining({ email: applicant.email, password: 'strong-password', options: expect.objectContaining({ data: { profile: applicant, enrollment_key: 'SECTION-KEY' } }) }));
});
it('does not report a duplicate signup as a newly submitted application', async () => {
  resetData();
  api.signUp.mockResolvedValue({ data: { user: { id: 'hidden', identities: [] }, session: null }, error: null });
  await expect(appData.submitApplication(applicant, 'strong-password')).rejects.toThrow('already registered');
});
it('prevents a signed-in student from creating another account', async () => {
  await expect(appData.submitApplication(applicant, 'strong-password')).rejects.toThrow('already have an account');
  expect(api.signUp).not.toHaveBeenCalled();
});
it('preserves a successful resubmission when its subsequent refresh fails', async () => {
  api.rpc.mockResolvedValueOnce({ data: { ...snapshot(), applications: [{ id: 'student', status: 'rejected' }] }, error: null });
  await refreshData();
  api.rpc.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: null, error: { message: 'Offline' } });
  await expect(appData.submitApplication(applicant, '')).resolves.toEqual({ uid: 'student', needsEmailConfirmation: false });
  expect(api.signUp).not.toHaveBeenCalled();
});

function snapshot() {
  return {
    nodes: [], roles: {}, settings: {}, audit: [], applications: [], excuses: [],
    profiles: [{ uid: 'student', role: 'student', name: 'Student', account_status: 'active', school_data: {} }, { uid: 'pending', role: 'student', account_status: 'pending', school_data: {} }],
    events: [{ id: 'event', title: 'Assembly', startTime: 1, endTime: 2 }],
    attendance: [
      { student_id: 'student', event_id: 'event', slot: '2026-09-19:morning', data: { status: 'present', time_in: 1 } },
      { student_id: 'student', event_id: 'event', slot: '2026-09-19:afternoon', data: { status: 'absent' } },
    ],
    sanctions: [{ student_id: 'student', data: { id: 'penalty', change: 2 } }, { student_id: 'student', data: { id: 'service', change: -0.5 } }],
  };
}
beforeEach(() => { vi.resetAllMocks(); localStorage.clear(); resetData('student'); });
afterEach(() => { resetData(); });

it('starts empty and never seeds or persists school records in local storage', () => {
  expect(appData.getEvents()).toEqual([]);
  expect(appData.getAllStudents()).toEqual([]);
  expect(localStorage.length).toBe(0);
});
it('preserves each attendance window and maps the event and sanction balance', async () => {
  api.rpc.mockResolvedValue({ data: snapshot(), error: null });
  await refreshData();
  expect(appData.getAttendanceRecords('student')).toEqual([
    expect.objectContaining({ slot: '2026-09-19:morning', status: 'present', event: expect.objectContaining({ title: 'Assembly' }) }),
    expect.objectContaining({ slot: '2026-09-19:afternoon', status: 'absent' }),
  ]);
  expect(appData.getUserDetail('student')?.stats).toMatchObject({ sanction_hours: 1.5, attendance_rate: 50 });
  expect(appData.getAttendanceLogs('event').student.status).toBe('absent');
  expect(localStorage.length).toBe(0);
});
it('excludes pending admissions from active student registers', async () => {
  api.rpc.mockResolvedValue({ data: snapshot(), error: null });
  await refreshData();
  expect(appData.getAllStudents().map(p => p.uid)).toEqual(['student']);
});
it('discards a response belonging to the account that signed out', async () => {
  let resolve!: (value: unknown) => void;
  api.rpc.mockReturnValue(new Promise(r => { resolve = r; }));
  const request = refreshData();
  resetData(); resolve({ data: snapshot(), error: null }); await request;
  expect(appData.getAllStudents()).toEqual([]);
});
it('does not let an older polling request overwrite a newer snapshot', async () => {
  let resolve!: (value: unknown) => void;
  api.rpc.mockReturnValueOnce(new Promise(r => { resolve = r; })).mockResolvedValueOnce({ data: snapshot(), error: null });
  const first = refreshData(); await refreshData();
  resolve({ data: { ...snapshot(), events: [] }, error: null }); await first;
  expect(appData.getEvents()).toHaveLength(1);
});
it('propagates a denied write without changing local records', async () => {
  api.rpc.mockResolvedValue({ data: null, error: { message: 'Permission required: events.manage' } });
  await expect(appData.createEvent({ title: 'Forbidden' })).rejects.toThrow('Permission required');
  expect(appData.getEvents()).toEqual([]);
  expect(api.rpc).toHaveBeenCalledOnce();
});
it('reports a refresh failure after a committed write without prompting a duplicate write', async () => {
  api.rpc.mockResolvedValueOnce({ data: 'created-id', error: null }).mockResolvedValueOnce({ data: null, error: { message: 'Network unavailable' } });
  const listener = vi.fn(); window.addEventListener('rmc_sync_error', listener);
  try {
    await expect(appData.createEvent({ title: 'Assembly' })).resolves.toBe('created-id');
    expect(listener).toHaveBeenCalledOnce();
  } finally { window.removeEventListener('rmc_sync_error', listener); }
});
it('sends scanner verification to the server and omits client-supplied actor and clock', async () => {
  api.rpc.mockResolvedValueOnce({ data: { status: 'present' }, error: null }).mockResolvedValueOnce({ data: snapshot(), error: null });
  await appData.logAttendance('event', 'student', 'forged-actor', 'forged-name', 123, 'in', { qrToken: 'RMC1.token' });
  expect(api.rpc).toHaveBeenNthCalledWith(1, 'rmc_record_attendance', { event_id: 'event', student_id: 'student', direction: 'in', qr_token: 'RMC1.token', scan_position: null, manual_reason: null });
});
