// The handler is tested with injected clients; no real Auth users are created.
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { enrollmentHandler } from '../supabase/functions/_shared/enrollment';

const nonce = 'a'.repeat(64);
afterEach(() => vi.unstubAllGlobals());
const profile = { email: 'spoofed@example.test', name: 'Student', username: 'student', student_id: '2026-12345A' };
let admin: any, client: any, verify: any, find: any, rpc: any;
beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto);
  find = vi.fn().mockResolvedValue({ data: null });
  rpc = vi.fn(async (name: string) => ({ data: name === 'rmc_validate_enrollment' ? {} : 0 }));
  admin = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: find }) }) }), rpc,
    auth: { admin: { createUser: vi.fn().mockResolvedValue({ data: { user: { id: 'new' } } }) } } };
  client = { auth: { signUp: vi.fn().mockResolvedValue({ data: { user: { id: 'new', identities: [{}] }, session: null } }),
    signInWithIdToken: vi.fn().mockResolvedValue({ data: { user: { id: 'new' }, session: { access_token: 'access', refresh_token: 'refresh' } } }) } };
  verify = vi.fn().mockResolvedValue('verified@gmail.com');
});
async function call(body: any) {
  const response = await enrollmentHandler(admin, client, verify)(new Request('https://backend.test', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '127.0.0.1' }, body: JSON.stringify(body),
  }));
  return { status: response.status, body: await response.json() };
}
const google = { credential: 'signed-google-jwt', nonce };
const enroll = { action: 'enroll', profile, password: 'StrongPassword123!', enrollmentKey: 'SECTION' };
it('prompts an unknown Google email to enroll without creating an Auth user or session', async () => {
  expect((await call({ action: 'google', ...google })).body).toEqual({ email: 'verified@gmail.com', needsEnrollment: true });
  expect(admin.auth.admin.createUser).not.toHaveBeenCalled();
  expect(client.auth.signInWithIdToken).not.toHaveBeenCalled();
  expect(client.auth.signUp).not.toHaveBeenCalled();
});
it.each(['active', 'pending'])('signs in an existing %s account without a second enrollment', async status => {
  find.mockResolvedValue({ data: { id: 'new', status } });
  expect((await call({ action: 'google', ...google })).body.session.access_token).toBe('access');
  expect(admin.auth.admin.createUser).not.toHaveBeenCalled();
  expect(rpc).not.toHaveBeenCalledWith('rmc_enrollment_reserve', expect.anything());
});
it('uses the server-verified email and creates only after complete validation', async () => {
  const result = await call({ ...enroll, ...google });
  expect(result.status).toBe(200);
  expect(admin.auth.admin.createUser).toHaveBeenCalledWith(expect.objectContaining({ email: 'verified@gmail.com', email_confirm: true,
    user_metadata: expect.objectContaining({ profile: expect.objectContaining({ email: 'verified@gmail.com' }), enrollment_ticket: expect.any(String) }) }));
  expect(rpc.mock.calls.map((call: any[]) => call[0])).toEqual(['rmc_login_limit', 'rmc_validate_enrollment', 'rmc_enrollment_reserve']);
});
it('rejects invalid or expired Google proof before any lookup, session, or creation', async () => {
  verify.mockRejectedValue(new Error('Invalid Google token'));
  expect((await call({ action: 'google', ...google })).status).toBe(400);
  expect(find).not.toHaveBeenCalled(); expect(rpc).not.toHaveBeenCalled();
  expect(admin.auth.admin.createUser).not.toHaveBeenCalled();
});
it('does not create an account when enrollment validation fails', async () => {
  rpc.mockImplementation(async (name: string) => ({ data: name === 'rmc_validate_enrollment' ? { section: 'Enrollment is frozen.' } : 0 }));
  expect((await call({ ...enroll, ...google })).body.error).toContain('frozen');
  expect(admin.auth.admin.createUser).not.toHaveBeenCalled(); expect(client.auth.signUp).not.toHaveBeenCalled();
});
it('enforces cooldown without creating an account', async () => {
  rpc.mockImplementation(async (name: string) => ({ data: name === 'rmc_enrollment_reserve' ? 60 : name === 'rmc_validate_enrollment' ? {} : 0 }));
  const result = await call({ ...enroll, ...google });
  expect(result.status).toBe(429); expect(result.body.retryAfter).toBe(60);
  expect(admin.auth.admin.createUser).not.toHaveBeenCalled();
});
it('reuses a concurrently created Google account after a duplicate creation response', async () => {
  find.mockResolvedValueOnce({ data: null }).mockResolvedValueOnce({ data: { id: 'new', status: 'pending' } });
  admin.auth.admin.createUser.mockResolvedValue({ error: { message: 'Email already exists' } });
  expect((await call({ ...enroll, ...google })).body.uid).toBe('new');
  expect(admin.auth.admin.createUser).toHaveBeenCalledTimes(1);
});
it('keeps normal email enrollment confirmation and uses the server-issued ticket', async () => {
  expect((await call(enroll)).body).toEqual({ uid: 'new', needsEmailConfirmation: true });
  expect(client.auth.signUp).toHaveBeenCalledWith(expect.objectContaining({ email: profile.email,
    options: expect.objectContaining({ data: expect.objectContaining({ enrollment_ticket: expect.any(String) }) }) }));
  expect(admin.auth.admin.createUser).not.toHaveBeenCalled();
});
it('blocks inactive accounts even with valid Google credentials', async () => {
  find.mockResolvedValue({ data: { id: 'new', status: 'inactive' } });
  expect((await call({ action: 'google', ...google })).body.error).toContain('inactive');
  expect(client.auth.signInWithIdToken).not.toHaveBeenCalled();
});
