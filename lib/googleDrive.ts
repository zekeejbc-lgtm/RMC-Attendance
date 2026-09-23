const DEFAULT_GOOGLE_DRIVE_GAS_URL = 'https://script.google.com/macros/s/AKfycby2BH5kpT9BN1BX2ODlGmjz6oIbKnbChfZuCAv2QDDcLvVbGB0RJXz1uaJ1eTHJ_t8/exec';
export const GOOGLE_DRIVE_GAS_URL = import.meta.env.VITE_GOOGLE_DRIVE_GAS_URL || DEFAULT_GOOGLE_DRIVE_GAS_URL;
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const PROFILE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type DriveImageResult = {
  id: string;
  name: string;
  url: string;
};

type DriveResponse = Partial<DriveImageResult> & {
  success?: boolean;
  error?: string;
  message?: string;
  result?: Partial<DriveImageResult>;
};

export function validateProfileImage(file: File) {
  if (!PROFILE_IMAGE_TYPES.includes(file.type as (typeof PROFILE_IMAGE_TYPES)[number])) {
    throw new Error('Choose a JPG, PNG, or WebP image.');
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('Profile images must be 5 MB or smaller.');
  }
}

export function fileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Unable to preview this image.'));
    reader.onerror = () => reject(new Error('Unable to read this image.'));
    reader.readAsDataURL(file);
  });
}

function responseError(payload: DriveResponse, status: number) {
  return payload.error || payload.message || `Google Drive upload failed (HTTP ${status}).`;
}

function readableResponseError(text: string, status: number) {
  // Apps Script can return Google's full HTML error page when an old or
  // unpublished deployment is hit. Never show that page inside the form.
  const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (/page not found|unable to open the file/i.test(plain)) {
    return 'Google Drive image service is unavailable. Redeploy the Apps Script web app and update VITE_GOOGLE_DRIVE_GAS_URL.';
  }
  return plain || responseError({}, status);
}

async function request<T = DriveResponse>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch(GOOGLE_DRIVE_GAS_URL, {
    method: 'POST',
    // text/plain avoids a browser preflight against Apps Script while still carrying JSON.
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
    redirect: 'follow',
  });
  const text = await response.text();
  let payload: DriveResponse;
  try { payload = JSON.parse(text) as DriveResponse; }
  catch { throw new Error(readableResponseError(text, response.status)); }
  if (!response.ok || payload.success === false || payload.error) throw new Error(responseError(payload, response.status));
  return payload as T;
}

function unwrap(payload: DriveResponse): DriveImageResult {
  const value = payload.result || payload;
  if (!value.id || !value.url) throw new Error('Google Drive returned no public image URL.');
  return { id: value.id, name: value.name || 'profile-image', url: publicDriveImageUrl(value.url) };
}

export async function createDriveImage(file: File, personName: string, studentId: string) {
  validateProfileImage(file);
  const dataUrl = await fileAsDataUrl(file);
  return unwrap(await request({ action: 'create', name: personName, studentId, mimeType: file.type, dataUrl }));
}

export async function updateDriveImage(fileId: string, file: File, personName: string, studentId: string) {
  validateProfileImage(file);
  const dataUrl = await fileAsDataUrl(file);
  return unwrap(await request({ action: 'update', fileId, name: personName, studentId, mimeType: file.type, dataUrl }));
}

export async function deleteDriveImage(fileId: string) {
  if (fileId) await request({ action: 'delete', fileId });
}

export async function getDriveImage(fileId: string) {
  return unwrap(await request({ action: 'read', fileId }));
}

export async function listDriveImages() {
  const payload = await request<{ files?: DriveImageResult[] }>({ action: 'list' });
  return payload.files || [];
}

export function driveFileIdFromUrl(url: string | undefined) {
  if (!url) return '';
  let value = String(url).trim();
  // Some older records contain a Markdown link instead of the URL itself:
  // [https://drive.google.com/...](https://drive.google.com/...)
  const markdown = value.match(/^\[[^\]]+\]\((https?:\/\/[^)]+)\)$/);
  if (markdown) value = markdown[1];
  // Accept every URL shape returned by Apps Script/Drive, plus a bare file ID.
  try {
    const parsed = new URL(value);
    const queryId = parsed.searchParams.get('id') || parsed.searchParams.get('fileId');
    if (queryId) return queryId;
    const pathMatch = parsed.pathname.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (pathMatch) return pathMatch[1];
  } catch {
    // The value may be a bare Drive ID; handled below.
  }
  const embedded = value.match(/(?:[?&]id=|\/d\/)([a-zA-Z0-9_-]+)/);
  if (embedded) return embedded[1];
  return /^[a-zA-Z0-9_-]{20,}$/.test(value) ? value : '';
}

// This is the same public endpoint pattern used by PerkUp's drive-image
// function. It returns the bytes directly instead of relying on Drive's HTML
// thumbnail redirect, which is more reliable in an <img> element.
export function publicDriveImageUrl(url: string | undefined) {
  const id = driveFileIdFromUrl(url);
  return id ? `https://lh3.googleusercontent.com/d/${encodeURIComponent(id)}=w4000` : (url || '');
}

export function driveImageCandidates(url: string | undefined) {
  if (!url) return [];
  const id = driveFileIdFromUrl(url);
  if (!id) return [url];
  const encodedId = encodeURIComponent(id);
  return Array.from(new Set([
    `https://lh3.googleusercontent.com/d/${encodedId}=w4000`,
    `https://drive.google.com/uc?export=view&id=${encodedId}`,
    `https://drive.google.com/thumbnail?id=${encodedId}&sz=w1600`,
    `https://drive.usercontent.google.com/download?id=${encodedId}&export=view&authuser=0`,
    url,
  ]));
}
