import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { beforeEach, expect, it } from 'vitest';

const owner = '11111111-1111-4111-8111-111111111111';
const outsider = '22222222-2222-4222-8222-222222222222';
const capability = 'a'.repeat(72);
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
let api: any, files: Map<string, any>, properties: Map<string, string>;
function file(id: string, metadata: Record<string, string> = {}) {
  let description = JSON.stringify(metadata);
  return { getId: () => id, getName: () => 'Profile.png', getMimeType: () => 'image/png',
    getDescription: () => description, setDescription: (value: string) => { description = value; },
    getParents: () => { let done = false; return { hasNext: () => !done, next: () => { done = true; return { getId: () => '1ow0X_gdQB7AwJI5pAFJeP1YTftbc845Q' }; } }; },
    setSharing: () => {}, setTrashed: (value: boolean) => { files.delete(id); }, setName: () => {} };
}
const post = (body: unknown) => JSON.parse(api.doPost({ postData: { contents: JSON.stringify(body) } }));
beforeEach(() => {
  files = new Map(); properties = new Map([['SUPABASE_URL', 'https://test.supabase.co'], ['SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test']]);
  let created = 0;
  api = vm.createContext({
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (text: string) => ({ setMimeType: () => text }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (name: string) => properties.get(name), setProperty: (name: string, value: string) => properties.set(name, value) }) },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    Utilities: { DigestAlgorithm: { SHA_256: 'sha256' }, computeDigest: (_algorithm: string, value: string) => Array.from(createHash('sha256').update(value).digest()),
      base64Decode: (value: string) => Array.from(Buffer.from(value, 'base64')), newBlob: () => ({ setName: () => ({}) }) },
    DriveApp: { Access: { ANYONE_WITH_LINK: 'public' }, Permission: { VIEW: 'view' }, getFileById: (id: string) => { const result = files.get(id); if (!result) throw new Error('Not found'); return result; },
      getFolderById: () => ({ createFile: () => { const item = file(`created-${++created}`); files.set(item.getId(), item); return item; },
        getFiles: () => { const iterator = files.values(); let next = iterator.next(); return { hasNext: () => !next.done, next: () => { const item = next.value; next = iterator.next(); return item; } }; } }) },
    UrlFetchApp: { fetch: (url: string, options: any) => {
      const token = options.headers.Authorization.slice(7);
      const identity = token === 'owner' || token === 'mfa-required' ? owner : outsider;
      return { getResponseCode: () => token === 'forged' ? 401 : 200,
        getContentText: () => JSON.stringify(url.includes('/auth/') ? { id: identity } : token === 'mfa-required' ? [] : [{ id: identity }]) };
    } },
  });
  vm.runInContext(fs.readFileSync('google-apps-script/Code.gs', 'utf8'), api);
});

it('blocks public inventories and unauthenticated modification of existing images', () => {
  files.set('private', file('private', { owner, capability: hash(capability) }));
  expect(JSON.parse(api.doGet({ parameter: { action: 'list' } })).success).toBe(false);
  for (const action of ['read', 'update', 'delete', 'list']) expect(post({ action, fileId: 'private' }).success).toBe(false);
  expect(files.has('private')).toBe(true);
});
it('rejects forged sessions, incomplete MFA, another owner, and incorrect capabilities', () => {
  files.set('private', file('private', { owner, capability: hash(capability) }));
  for (const accessToken of ['forged', 'mfa-required', 'outsider']) expect(post({ action: 'delete', fileId: 'private', accessToken }).success).toBe(false);
  expect(post({ action: 'delete', fileId: 'private', managementToken: 'b'.repeat(72) }).success).toBe(false);
  expect(files.has('private')).toBe(true);
});
it('allows only the owner or the upload capability to remove a managed file', () => {
  for (const authorization of [{ accessToken: 'owner' }, { managementToken: capability }]) {
    files.set('private', file('private', { owner, capability: hash(capability) }));
    expect(post({ action: 'delete', fileId: 'private', ...authorization }).success).toBe(true);
    expect(files.has('private')).toBe(false);
  }
});
it('retains anonymous registration uploads with content validation and an unexposed capability', () => {
  const dataUrl = 'data:image/png;base64,' + Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]).toString('base64');
  const upload = post({ action: 'create', dataUrl, mimeType: 'image/png', managementToken: capability });
  expect(upload.success).toBe(true);
  expect(upload).not.toHaveProperty('managementToken');
  expect(JSON.parse(files.get(upload.id).getDescription())).toEqual({ owner: null, capability: hash(capability) });
  expect(post({ action: 'delete', fileId: upload.id }).success).toBe(false);
  expect(post({ action: 'delete', fileId: upload.id, managementToken: capability }).success).toBe(true);
  expect(post({ action: 'create', dataUrl: 'data:image/png;base64,PHNjcmlwdD4=', mimeType: 'image/png', managementToken: capability }).success).toBe(false);
});
it('never lets an authenticated user claim legacy images with user-supplied identity fields', () => {
  files.set('legacy', file('legacy'));
  expect(post({ action: 'delete', fileId: 'legacy', accessToken: 'owner', name: 'Owner', studentId: owner }).success).toBe(false);
});
it('limits anonymous storage consumption and scopes authenticated inventories', () => {
  properties.set('ANONYMOUS_DAILY_UPLOAD_LIMIT', '1');
  const payload = { action: 'create', dataUrl: 'data:image/png;base64,iVBORw0KGgoA', mimeType: 'image/png', managementToken: capability };
  expect(post(payload).success).toBe(true);
  expect(post(payload).success).toBe(false);
  files.set('mine', file('mine', { owner })); files.set('theirs', file('theirs', { owner: outsider }));
  expect(post({ action: 'list', accessToken: 'owner' }).files.map((item: any) => item.id)).toEqual(['mine']);
});
