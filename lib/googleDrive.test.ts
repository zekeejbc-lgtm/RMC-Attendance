import { afterEach, expect, it, vi } from 'vitest';
import { createDriveImage, getDriveImage, updateDriveImage, publicDriveImageUrl, deleteDriveImage } from './googleDrive';

import { toast, toastStore } from './toast';

afterEach(() => { vi.unstubAllGlobals(); toastStore.getSnapshot().forEach(item => toast.dismiss(item.id)); });
it.each([
  ['failed-save', 'Clean up unsaved photo', 'Unsaved upload removed. Your previous photo was kept.'],
  ['replacement', 'Remove replaced photo', 'Old photo removed. Your new photo is saved.'],
  ['delete', 'Delete photo', 'Photo moved to Drive trash.'],
] as const)('explains %s removal while pending and after completion', async (reason, title, message) => {
  let finish!: (response: unknown) => void;
  const fetcher = vi.fn((_url: string, _options: RequestInit) => new Promise(resolve => { finish = resolve; }));
  vi.stubGlobal('fetch', fetcher);
  const pending = deleteDriveImage('old-file', reason);
  expect(toastStore.getSnapshot()[0]).toMatchObject({ kind: 'progress', title, phase: 0 });
  expect(JSON.parse(fetcher.mock.calls[0][1].body as string)).toEqual({ action: 'delete', fileId: 'old-file' });
  finish({ ok: true, status: 200, text: async () => '{"success":true}' });
  await pending;
  expect(toastStore.getSnapshot()[0]).toMatchObject({ kind: 'success', title, message });
});

it.each(['failed-save', 'replacement', 'delete'] as const)('reports a contextual failure for %s removal', async reason => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network offline')));
  await expect(deleteDriveImage('old-file', reason)).rejects.toThrow('Network offline');
  const notice = toastStore.getSnapshot()[0];
  expect(notice.kind).toBe('error');
  expect(notice.message).toContain(reason === 'replacement' ? 'Your new photo is saved' : reason === 'failed-save' ? 'extra copy may remain' : 'Could not delete');
});

it.each([
  ['create', false], ['create', true], ['update', false], ['read', false],
])('returns a saveable Drive URL for %s (nested result: %s)', async (action, nested) => {
  const id = 'test_Drive-file123';
  const canonicalUrl = `https://drive.google.com/thumbnail?id=${id}&sz=w1600`;
  const displayUrl = `https://lh3.googleusercontent.com/d/${id}=w4000`;
  const result = { id, name: 'Student - 123.png', url: nested ? displayUrl : canonicalUrl };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true, status: 200,
    text: async () => JSON.stringify(nested ? { success: true, result } : { success: true, ...result }),
  }));
  const file = new File(['image'], 'photo.png', { type: 'image/png' });
  const uploaded = action === 'create' ? await createDriveImage(file, 'Student', '123')
    : action === 'update' ? await updateDriveImage('old-file', file, 'Student', '123')
    : await getDriveImage(id);
  expect(uploaded.url).toBe(canonicalUrl);
  expect(publicDriveImageUrl(uploaded.url)).toBe(displayUrl);
});

it('shows a readable image service error for localized Google HTML pages', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '<!DOCTYPE html><html><head><script>window.secret = "debug payload";</script></head><body>Hindi Nahanap ang Page</body></html>' }));
  await expect(getDriveImage('file-id')).rejects.toThrow('Google Drive image service is unavailable');
});

it('identifies image validation failures before making a request', async () => {
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  await expect(createDriveImage(new File(['text'], 'test.txt', { type: 'text/plain' }), 'Test', '123')).rejects.toThrow('Choose a JPG');
  expect(fetcher).not.toHaveBeenCalled();
  expect(toastStore.getSnapshot()[0]).toMatchObject({ kind: 'error', phase: 0 });
});
it('identifies invalid Drive results at the response validation phase', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '{"success":true}' }));
  await expect(getDriveImage('file-id')).rejects.toThrow('no public image URL');
  expect(toastStore.getSnapshot()[0]).toMatchObject({ kind: 'error', phase: 1, phases: ['Working on your photo', 'Finishing up'] });
});
