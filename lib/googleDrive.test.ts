import { afterEach, expect, it, vi } from 'vitest';
import { getDriveImage } from './googleDrive';

afterEach(() => vi.unstubAllGlobals());
it('shows a readable image service error for localized Google HTML pages', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '<!DOCTYPE html><html><head><script>window.secret = "debug payload";</script></head><body>Hindi Nahanap ang Page</body></html>' }));
  await expect(getDriveImage('file-id')).rejects.toThrow('Google Drive image service is unavailable');
});
