export type ToastKind = 'progress' | 'success' | 'error';
export interface ToastItem { id: number; kind: ToastKind; message: string; code?: string }
const listeners = new Set<() => void>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();
let items: ToastItem[] = [];
let sequence = 0;
const reported = new WeakSet<object>();
export const toastStore = {
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  getSnapshot: () => items,
};
function emit() { listeners.forEach(listener => listener()); }
function dismiss(id: number) {
  clearTimeout(timers.get(id)); timers.delete(id);
  items = items.filter(item => item.id !== id); emit();
}
function show(kind: ToastKind, message: string, code?: string, id = ++sequence) {
  clearTimeout(timers.get(id));
  items = [...items.filter(item => item.id !== id), { id, kind, message, code }];
  while (items.length > 3) { const old = items.shift()!; clearTimeout(timers.get(old.id)); timers.delete(old.id); }
  timers.set(id, setTimeout(() => dismiss(id), kind === 'progress' ? 30000 : kind === 'error' ? 7000 : 3500));
  emit(); return id;
}

/** Stable UI codes, independent of server internals. Never display raw server messages. */
export function classifyError(error: unknown) {
  const value = error as { code?: string; status?: number; name?: string; message?: string } | null;
  const code = String(value?.code || '');
  const message = String(value?.message || error || '').toLowerCase();
  if (value?.name === 'NotAllowedError' || /camera|geolocation/.test(message)) return { code: 'DEVICE-001', message: 'Device access failed. Check camera or location permissions.' };
  if (value?.name === 'AbortError') return { code: 'ACT-001', message: 'Action cancelled.' };
  if (value?.name === 'TimeoutError' || /timeout|timed out/.test(message)) return { code: 'NET-002', message: 'Request timed out. Check the result before retrying.' };
  if (/fetch|network|offline|connection/.test(message)) return { code: 'NET-001', message: 'Connection interrupted. Check your connection and retry.' };
  if (value?.status === 429 || /rate.limit|too many requests/.test(message)) return { code: 'LIMIT-001', message: 'Too many requests. Please wait and retry.' };
  if (value?.status === 401 || /credentials|password|sign in|jwt|session|otp|auth/.test(message)) return { code: 'AUTH-001', message: 'Authentication failed. Check your details or sign in again.' };
  if (value?.status === 403 || code === '42501' || /permission|not allowed|forbidden|denied|unauthorized/.test(message)) return { code: 'ACCESS-001', message: 'You do not have permission for this action.' };
  if (value?.status === 409 || code === '23505' || /duplicate|already exists|conflict/.test(message)) return { code: 'DATA-001', message: 'This conflicts with an existing record. Refresh and check it.' };
  if (value?.status === 404 || /not found|no longer exists/.test(message)) return { code: 'DATA-002', message: 'This record is no longer available. Refresh and try again.' };
  if (value?.status === 413 || /file|upload|5 mb/.test(message)) return { code: 'FILE-001', message: 'Upload failed. Check the file type and size, then retry.' };
  if ([400, 422].includes(value?.status || 0) || /invalid|required|choose|must |missing/.test(message)) return { code: 'INPUT-001', message: 'Check the entered values and try again.' };
  return { code: 'SYS-001', message: 'The action could not be completed. Please try again.' };
}
function errorToast(error: unknown, id?: number) {
  const value = error as { name?: string; message?: string; code?: string; details?: string; hint?: string; status?: number } | null;
  console.error('[Toast] operation failed', {
    errorName: value?.name,
    errorMessage: value?.message,
    errorCode: value?.code,
    errorDetails: value?.details,
    errorHint: value?.hint,
    errorStatus: value?.status,
    errorRaw: typeof error === 'object' ? JSON.stringify(error) : String(error),
  });
  const detail = classifyError(error);
  if (typeof error === 'object' && error !== null) {
    if (reported.has(error) && id === undefined) return;
    reported.add(error);
  }
  return show('error', detail.message, detail.code, id);
}
export const toast = {
  dismiss,
  progress: (message: string) => show('progress', message),
  success: (message: string, id?: number) => show('success', message, undefined, id),
  error: errorToast,
  sync<T>(operation: () => T, label: string, success = `${label} completed`): T {
    const id = show('progress', `${label}…`);
    try { const result = operation(); show('success', success, undefined, id); return result; }
    catch (error) { errorToast(error, id); throw error; }
  },
  async track<T>(operation: () => PromiseLike<T>, label: string, success = `${label} completed`) {
    const id = show('progress', `${label}…`);
    try { const result = await operation(); show('success', success, undefined, id); return result; }
    catch (error) { errorToast(error, id); throw error; }
  },
  // APIs that resolve with { error } must not show a false success.
  async result<T extends { error?: unknown }>(operation: () => PromiseLike<T>, label: string, success?: string): Promise<T> {
    const id = show('progress', `${label}…`);
    try {
      const result = await operation();
      if (result.error) errorToast(result.error, id);
      else show('success', success || `${label} completed`, undefined, id);
      return result;
    } catch (error) { errorToast(error, id); throw error; }
  },
};
