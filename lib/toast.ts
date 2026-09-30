export type ToastKind = 'progress' | 'success' | 'error';
export interface ToastItem { id: number; kind: ToastKind; message: string; code?: string; title?: string; phases?: string[]; phase?: number; percent?: number; occurrences?: number; request?: boolean }
export interface OperationProgress {
  step: (phase: number) => void;
  fail: (error: unknown, message?: string) => void;
  complete: (message?: string) => void;
}
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
  const previous = items.find(item => item.id === id);
  const next = { ...previous, id, kind, message, code };
  // Background polling can repeat the same failure. Keep one reviewable entry.
  if (kind === 'error') {
    const duplicates = items.filter(item => item.id !== id && item.kind === 'error' && item.code === code && item.message === message);
    if (duplicates.length) {
      next.occurrences = 1 + duplicates.reduce((count, item) => count + (item.occurrences || 1), 0);
      items = items.filter(item => !duplicates.includes(item));
    }
  }
  if (kind === 'success' && previous?.phases) next.percent = 100;
  items = previous ? items.map(item => item.id === id ? next : item) : [...items, next];
  // Active requests and failures stay available until finished or dismissed.
  if (kind === 'success') timers.set(id, setTimeout(() => dismiss(id), 3500));
  emit(); return id;
}

/** Stable UI codes, independent of server internals. Never display raw server messages. */
export function classifyError(error: unknown) {
  const value = error as { code?: string; status?: number; name?: string; message?: string } | null;
  const code = String(value?.code || '');
  const message = String(value?.message || error || '').toLowerCase();
  if (value?.name === 'NotAllowedError' || /camera|geolocation/.test(message)) return { code: 'DEVICE-001', message: 'Camera or location access is blocked.' };
  if (value?.name === 'AbortError') return { code: 'ACT-001', message: 'Action cancelled.' };
  if (value?.name === 'TimeoutError' || /timeout|timed out/.test(message)) return { code: 'NET-002', message: 'This is taking too long.' };
  if (/fetch|network|offline|connection/.test(message)) return { code: 'NET-001', message: 'Connection lost.' };
  if (value?.status === 429 || /rate.limit|too many requests/.test(message)) return { code: 'LIMIT-001', message: 'Please wait before trying again.' };
  if (value?.status === 401 || /credentials|password|sign in|jwt|session|otp|auth/.test(message)) return { code: 'AUTH-001', message: 'Could not verify your sign-in details.' };
  if (value?.status === 403 || code === '42501' || /permission|not allowed|forbidden|denied|unauthorized/.test(message)) return { code: 'ACCESS-001', message: 'You do not have permission to do this.' };
  if (value?.status === 409 || code === '23505' || /duplicate|already exists|conflict/.test(message)) return { code: 'DATA-001', message: 'A matching record already exists.' };
  if (value?.status === 404 || /not found|no longer exists/.test(message)) return { code: 'DATA-002', message: 'This record is no longer available.' };
  if (value?.status === 413 || /file|upload|5 mb/.test(message)) return { code: 'FILE-001', message: 'Could not upload this file.' };
  if ([400, 422].includes(value?.status || 0) || /invalid|required|choose|must |missing/.test(message)) return { code: 'INPUT-001', message: 'Some details are missing or incorrect.' };
  return { code: 'SYS-001', message: 'Something went wrong.' };
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
  start(label: string, phases = ['Getting ready', 'Working on it', 'Finishing up'], request = false): OperationProgress {
    const id = request ? ++sequence : show('progress', phases[0]);
    let finished = false;
    let currentPhase = 0;
    const step = (phase: number) => {
      if (finished) return;
      currentPhase = phase;
      items = items.map(item => item.id === id ? { ...item, title: label, request, phases, phase, percent: Math.round(phase / phases.length * 100), message: phases[phase] } : item);
      emit();
    };
    const publish = () => { show('progress', phases[currentPhase], undefined, id); step(currentPhase); };
    // Fast background checks stay quiet; longer requests still show progress.
    const delay = request ? setTimeout(publish, 500) : undefined;
    step(0);
    return {
      step,
      complete(message = `${label} completed`) { if (finished) return; finished = true; clearTimeout(delay); if (request) dismiss(id); else show('success', message, undefined, id); },
      fail(error, message) {
        if (finished) return;
        clearTimeout(delay);
        if (request && !items.some(item => item.id === id)) publish();
        finished = true;
        errorToast(error, id);
        if (message) { items = items.map(item => item.id === id ? { ...item, message } : item); emit(); }
      },
    };
  },
  progress: (message: string) => show('progress', message),
  success: (message: string, id?: number) => show('success', message, undefined, id),
  error: errorToast,
  sync<T>(operation: () => T, label: string, success = `${label} completed`): T {
    const id = show('progress', `${label}…`);
    try { const result = operation(); show('success', success, undefined, id); return result; }
    catch (error) { errorToast(error, id); throw error; }
  },
  async track<T>(operation: (progress: OperationProgress) => PromiseLike<T>, label: string, success = `${label} completed`, phases = ['Working on it']) {
    const progress = toast.start(label, phases);
    try { const result = await operation(progress); progress.complete(success); return result; }
    catch (error) { progress.fail(error); throw error; }
  },
  // APIs that resolve with { error } must not show a false success.
  async result<T extends { error?: unknown }>(operation: () => PromiseLike<T>, label: string, success?: string): Promise<T> {
    const progress = toast.start(label, ['Working on it', 'Finishing up']);
    try {
      const result = await operation();
      progress.step(1);
      if (result.error) progress.fail(result.error);
      else progress.complete(success || `${label} completed`);
      return result;
    } catch (error) { progress.fail(error); throw error; }
  },
};
