import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { classifyError, toast, toastStore } from './toast';

beforeEach(() => vi.useFakeTimers());
afterEach(() => { toastStore.getSnapshot().forEach(item => toast.dismiss(item.id)); vi.useRealTimers(); });
describe('action feedback', () => {
  it('replaces progress with success and automatically dismisses it', async () => {
    let finish!: (value: number) => void;
    const operation = toast.track(() => new Promise<number>(resolve => { finish = resolve; }), 'Save');
    const initial = toastStore.getSnapshot()[0];
    expect(initial.kind).toBe('progress');
    finish(42);
    expect(await operation).toBe(42);
    expect(toastStore.getSnapshot()).toEqual([{ id: initial.id, kind: 'success', message: 'Save completed', code: undefined }]);
    vi.advanceTimersByTime(3500);
    expect(toastStore.getSnapshot()).toHaveLength(0);
  });
  it('preserves rejection, hides raw details and suppresses duplicate unhandled feedback', async () => {
    const error = new Error('network failed at secret-internal-host');
    await expect(toast.track(() => Promise.reject(error), 'Save')).rejects.toBe(error);
    toast.error(error);
    expect(toastStore.getSnapshot()).toHaveLength(1);
    expect(toastStore.getSnapshot()[0]).toMatchObject({ kind: 'error', code: 'NET-001' });
    expect(toastStore.getSnapshot()[0].message).not.toContain('secret');
    vi.advanceTimersByTime(7000);
    expect(toastStore.getSnapshot()).toHaveLength(0);
  });
  it('does not report success for resolved API errors', async () => {
    const response = { error: { status: 403 } };
    expect(await toast.result(() => Promise.resolve(response), 'Save')).toBe(response);
    expect(toastStore.getSnapshot()[0]).toMatchObject({ kind: 'error', code: 'ACCESS-001' });
  });
  it('bounds concurrent notifications and expires stalled progress without cancelling the operation', async () => {
    for (let index = 0; index < 5; index++) toast.progress('Working');
    expect(toastStore.getSnapshot()).toHaveLength(3);
    vi.advanceTimersByTime(30000);
    expect(toastStore.getSnapshot()).toHaveLength(0);
  });
  it.each([[401, 'AUTH-001'], [403, 'ACCESS-001'], [409, 'DATA-001'], [404, 'DATA-002'], [413, 'FILE-001'], [422, 'INPUT-001'], [429, 'LIMIT-001'], [500, 'SYS-001']])('classifies status %s', (status, code) => {
    expect(classifyError({ status }).code).toBe(code);
  });
});
