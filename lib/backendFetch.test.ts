import { afterEach, expect, it, vi } from 'vitest';
import { backendFetch } from './backendFetch';
import { toast, toastStore } from './toast';

afterEach(() => { vi.unstubAllGlobals(); toastStore.getSnapshot().forEach(item => toast.dismiss(item.id)); });
it('tracks a request without consuming the SDK response body or exposing query data', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ value: 42 }), { headers: { 'content-type': 'application/json' } })));
  const result = await backendFetch('https://test.example/rest/v1/rmc_profiles?email=secret');
  expect(await result.json()).toEqual({ value: 42 });
  expect(toastStore.getSnapshot()).toHaveLength(0);
  expect(JSON.stringify(toastStore.getSnapshot())).not.toContain('secret');
});
it('reports application errors even when HTTP succeeds', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'permission denied' }), { headers: { 'content-type': 'application/json' } })));
  const response = await backendFetch('https://test.example/functions/v1/rmc-accounts');
  expect(response.ok).toBe(true);
  expect(toastStore.getSnapshot()[0]).toMatchObject({ kind: 'error', phase: 2, code: 'ACCESS-001' });
});
it('preserves HTTP errors for SDK handling', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Unauthorized', { status: 401 })));
  expect((await backendFetch('https://test.example/auth/v1/user')).status).toBe(401);
  expect(toastStore.getSnapshot()[0]).toMatchObject({ kind: 'error', code: 'AUTH-001' });
});
it('retains network failures at the server-wait phase', async () => {
  const error = new TypeError('Failed to fetch');
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
  await expect(backendFetch('https://test.example/rest/v1/rmc_nodes')).rejects.toBe(error);
  expect(toastStore.getSnapshot()[0]).toMatchObject({ kind: 'error', phase: 0, code: 'NET-001' });
});
