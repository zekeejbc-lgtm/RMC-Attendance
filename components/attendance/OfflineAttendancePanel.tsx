import React, { useEffect, useState } from 'react';
import Button from '../ui/Button';
import { Surface } from '../ui/Page';
import { formatManilaDateTime } from '../../lib/dateTime';
import { offlineQueue, offlineRosters, prepareOfflineAttendance, subscribeOfflineAttendance, syncOfflineAttendance, retryOfflineAttendance, removeSyncedAttendance, type OfflineRoster, type QueuedAttendance } from '../../lib/offlineAttendance';

export function useOfflineAttendance(owner?: string) {
  const [rosters, setRosters] = useState<OfflineRoster[]>([]);
  const [queue, setQueue] = useState<QueuedAttendance[]>([]);
  const [error, setError] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    let disposed = false, request = 0;
    setRosters([]); setQueue([]); setError('');
    const refresh = async (kind?: 'roster' | 'scan' | 'photo') => {
      if (kind === 'photo') return;
      const version = ++request;
      if (!owner) return;
      try {
        const [nextRosters, nextQueue] = await Promise.all([kind === 'scan' ? Promise.resolve(null) : offlineRosters(owner), offlineQueue(owner)]);
        if (!disposed && version === request) { if (nextRosters) setRosters(nextRosters); setQueue(nextQueue); setError(''); }
      } catch (failure) { if (!disposed) setError(failure instanceof Error ? failure.message : 'Offline storage is unavailable.'); }
    };
    const connection = () => { setOnline(navigator.onLine); void refresh(); };
    const unsubscribe = subscribeOfflineAttendance(kind => void refresh(kind));
    window.addEventListener('online', connection); window.addEventListener('offline', connection);
    void refresh();
    return () => { disposed = true; unsubscribe(); window.removeEventListener('online', connection); window.removeEventListener('offline', connection); };
  }, [owner]);
  return { rosters, queue, error, online };
}

export default function OfflineAttendancePanel({ owner, eventId, data }: { owner?: string; eventId?: string; data: ReturnType<typeof useOfflineAttendance> }) {
  const [working, setWorking] = useState(false), [error, setError] = useState('');
  const roster = data.rosters.find(item => item.event.id === eventId && Date.now() + item.clockOffset <= item.captureUntil);
  const pending = data.queue.filter(item => item.state === 'pending').length;
  const rejected = data.queue.filter(item => item.state === 'rejected').length;
  const confirmed = data.queue.filter(item => item.state === 'synced').length;
  const act = async (operation: () => Promise<unknown>) => {
    setWorking(true); setError('');
    try { await operation(); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to complete this action.'); }
    finally { setWorking(false); }
  };
  const exportReview = () => {
    const rows = data.queue.map(row => ({ requestId: row.submission.id, event: row.eventTitle, studentId: row.studentId, studentName: row.studentName, direction: row.submission.direction, capturedAt: new Date(row.submission.capturedAt).toISOString(), state: row.state, error: row.error || '', receipt: row.receipt || null }));
    const url = URL.createObjectURL(new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'attendance-sync-review.json'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <Surface className="space-y-3 p-4" aria-label="Offline attendance">
    <h2 className="font-bold">Offline attendance &amp; roster</h2>
    {data.online && <p className="text-xs text-slate-500">Authorized event rosters refresh automatically while the app is open. Check that this event is saved before going offline.</p>}
    <p role="status" className="text-sm">{data.online ? 'Online' : 'Offline'} · {pending} pending sync · {rejected} need review · {confirmed} confirmed</p>
    {eventId && <>
      <p className="text-sm">{roster ? `${roster.students.length} students saved on this device. Prepared ${formatManilaDateTime(roster.preparedAt)}. Capture until ${formatManilaDateTime(roster.captureUntil)}; sync by ${formatManilaDateTime(roster.syncUntil)}.` : 'Download this event’s roster while online before taking offline attendance.'}</p>
      <Button variant="secondary" disabled={!owner || !data.online || working} onClick={() => owner && void act(() => prepareOfflineAttendance(owner, eventId))}>{roster ? 'Refresh offline roster' : 'Download offline roster'}</Button>
      <p className="text-xs text-slate-500">Offline lookup uses saved names, student IDs and sections. Present a school ID when a photo is unavailable. Use a prepared printed QR or an exact student ID; a new rotating QR needs internet.</p>
    </>}
    {(data.queue.length > 0) && <div className="flex flex-wrap gap-2">
      <Button variant="secondary" disabled={!owner || !data.online || working || !pending} onClick={() => owner && void act(() => syncOfflineAttendance(owner))}>Sync pending attendance</Button>
      <Button variant="secondary" disabled={working} onClick={exportReview}>Export sync review</Button>
      {confirmed > 0 && <Button variant="secondary" disabled={!owner || working} onClick={() => owner && void act(() => removeSyncedAttendance(owner))}>Clear confirmed from device</Button>}
    </div>}
    {(error || data.error) && <p role="alert" className="text-sm text-red-700">{error || data.error}</p>}
    {data.queue.some(item => item.state !== 'synced') && <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
      {data.queue.filter(item => item.state !== 'synced').slice(-50).map(row => <li key={row.submission.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
        <p className="font-semibold">{row.studentName} · {row.studentId} · {row.submission.direction === 'in' ? 'Scan in' : 'Scan out'}</p>
        <p>{row.eventTitle} · {formatManilaDateTime(row.submission.capturedAt)}</p>
        <p>{row.state === 'rejected' ? 'Needs review' : 'Saved on this device — pending server confirmation'}{row.error ? `: ${row.error}` : ''}</p>
        {row.state === 'rejected' && <Button size="sm" variant="secondary" disabled={!data.online || working} onClick={() => owner && void act(() => retryOfflineAttendance(owner, row.submission.id))}>Retry after resolving issue</Button>}
      </li>)}
    </ul>}
    {pending + rejected > 50 && <p className="text-xs text-slate-500">Showing the latest 50 unconfirmed captures. All records remain saved and available in the sync review export.</p>}
    <p className="text-xs text-slate-500">Sync resumes while this app is open. Keep this device’s storage until all records are confirmed. Logging out removes downloaded rosters and keeps pending records for the same account’s next sign-in.</p>
  </Surface>;
}
