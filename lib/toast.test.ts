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
    expect(toastStore.getSnapshot()[0]).toMatchObject({ id: initial.id, kind: 'success', message: 'Save completed', percent: 100 });
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
    expect(toastStore.getSnapshot()).toHaveLength(1);
    toast.dismiss(toastStore.getSnapshot()[0].id);
    expect(toastStore.getSnapshot()).toHaveLength(0);
  });
  it('does not report success for resolved API errors', async () => {
    const response = { error: { status: 403 } };
    expect(await toast.result(() => Promise.resolve(response), 'Save')).toBe(response);
    expect(toastStore.getSnapshot()[0]).toMatchObject({ kind: 'error', code: 'ACCESS-001' });
  });
  it('keeps all concurrent operations visible until they finish', async () => {
    for (let index = 0; index < 5; index++) toast.progress('Working');
    expect(toastStore.getSnapshot()).toHaveLength(5);
    vi.advanceTimersByTime(120000);
    expect(toastStore.getSnapshot()).toHaveLength(5);
  });
  it.each([[401, 'AUTH-001'], [403, 'ACCESS-001'], [409, 'DATA-001'], [404, 'DATA-002'], [413, 'FILE-001'], [422, 'INPUT-001'], [429, 'LIMIT-001'], [500, 'SYS-001']])('classifies status %s', (status, code) => {
    expect(classifyError({ status }).code).toBe(code);
  });
});

it('retains the failed phase and cannot overwrite partial success with full success', async () => {
  const result = await toast.track(async progress => {
    progress.step(1);
    progress.fail(new Error('network'), 'Saved, but refresh failed.');
    return 42;
  }, 'Save', undefined, ['Write record', 'Refresh data']);
  expect(result).toBe(42);
  expect(toastStore.getSnapshot()[0]).toMatchObject({ kind: 'error', phase: 1, percent: 50, message: 'Saved, but refresh failed.' });
});
it('isolates the phases of simultaneous operations', () => {
  const first = toast.start('First', ['Upload', 'Save']);
  const second = toast.start('Second', ['Check', 'Send', 'Read']);
  first.step(1);
  second.fail(new Error('network'));
  first.complete();
  expect(toastStore.getSnapshot()).toEqual(expect.arrayContaining([
    expect.objectContaining({ title: 'First', kind: 'success', percent: 100 }),
    expect.objectContaining({ title: 'Second', kind: 'error', phase: 0, percent: 0 }),
  ]));
});
it('consolidates recurring polling failures without hiding their phase', () => {
  toast.start('Refresh data').fail(new Error('network'));
  toast.start('Refresh data').fail(new Error('network'));
  expect(toastStore.getSnapshot()).toHaveLength(1);
  expect(toastStore.getSnapshot()[0]).toMatchObject({ kind: 'error', phase: 0, occurrences: 2 });
});

it('keeps quick background checks quiet and shows slower ones only while pending', () => {
  const quick = toast.start('Checking your account', ['Working on it'], true);
  quick.complete();
  vi.advanceTimersByTime(500);
  expect(toastStore.getSnapshot()).toHaveLength(0);
  const slow = toast.start('Loading your information', ['Working on it'], true);
  vi.advanceTimersByTime(500);
  expect(toastStore.getSnapshot()[0]).toMatchObject({ kind: 'progress', request: true });
  slow.complete();
  expect(toastStore.getSnapshot()).toHaveLength(0);
});
it('shows one brief error when a request and its action report the same problem', () => {
  const action = toast.start('Save contact details');
  toast.start('Saving your changes', undefined, true).fail(new Error('network'));
  action.fail(new Error('network'));
  expect(toastStore.getSnapshot()).toHaveLength(1);
  expect(toastStore.getSnapshot()[0]).toMatchObject({ message: 'Connection lost.', code: 'NET-001' });
});
