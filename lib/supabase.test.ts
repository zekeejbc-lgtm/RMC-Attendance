import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  user: vi.fn(), activeRpc: vi.fn(), login: vi.fn(), factors: vi.fn(), verify: vi.fn(), rpc: vi.fn(), signOut: vi.fn(),
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: (_url: string, _key: string, options: any) => options.auth.storageKey
  ? { auth: { signInWithPassword: api.login, mfa: { listFactors: api.factors, challengeAndVerify: api.verify }, signOut: api.signOut }, rpc: api.rpc }
  : { auth: { getUser: api.user }, rpc: api.activeRpc } }));

beforeEach(() => {
  vi.resetAllMocks(); vi.resetModules();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co'); vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
  api.user.mockResolvedValue({ data: { user: { id: 'actor', email: 'actor@example.edu' } } });
  api.login.mockResolvedValue({ data: { user: { id: 'actor' } } });
  api.factors.mockResolvedValue({ data: { totp: [{ id: 'factor', status: 'verified' }] } });
  api.verify.mockResolvedValue({}); api.rpc.mockResolvedValue({ data: true }); api.signOut.mockResolvedValue({});
});
afterEach(() => vi.unstubAllEnvs());
const confirmation = { password: 'secret-password', code: '123456', typedAction: 'DELETE', typedName: 'Unit', reason: 'Duplicate unit' };

it('executes using the freshly verified MFA session and sends no password or code to the command RPC', async () => {
  const { executeSensitiveAction } = await import('./supabase');
  await expect(executeSensitiveAction('deleteSchoolNode', 'unit', confirmation)).resolves.toBe(true);
  expect(api.verify).toHaveBeenCalledWith({ factorId: 'factor', code: confirmation.code });
  expect(api.rpc).toHaveBeenCalledWith('rmc_command', { action: 'deleteSchoolNode', args: ['unit', { typedAction: 'DELETE', typedName: 'Unit', reason: 'Duplicate unit' }] });
  expect(api.activeRpc).not.toHaveBeenCalled();
  expect(api.signOut).toHaveBeenCalledWith({ scope: 'local' });
  expect(JSON.stringify(api.rpc.mock.calls)).not.toContain(confirmation.password);
  expect(JSON.stringify(api.rpc.mock.calls)).not.toContain(confirmation.code);
});
it.each(['wrong-account', 'no-factor', 'invalid-code'])('blocks the command after %s verification and cleans up the temporary session', async failure => {
  if (failure === 'wrong-account') api.login.mockResolvedValue({ data: { user: { id: 'other' } } });
  if (failure === 'no-factor') api.factors.mockResolvedValue({ data: { totp: [] } });
  if (failure === 'invalid-code') api.verify.mockResolvedValue({ error: { message: 'Invalid code' } });
  const { executeSensitiveAction } = await import('./supabase');
  await expect(executeSensitiveAction('deleteSchoolNode', 'unit', confirmation)).rejects.toThrow();
  expect(api.rpc).not.toHaveBeenCalled(); expect(api.signOut).toHaveBeenCalledWith({ scope: 'local' });
});
it('preserves a rejected deletion without reporting success', async () => {
  api.rpc.mockResolvedValue({ data: false });
  const { executeSensitiveAction } = await import('./supabase');
  await expect(executeSensitiveAction('deleteSchoolNode', 'unit', confirmation)).rejects.toThrow('Archive it instead');
  expect(api.signOut).toHaveBeenCalledWith({ scope: 'local' });
});
