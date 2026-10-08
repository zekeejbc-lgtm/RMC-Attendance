import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { appData } from '../../lib/backend';
import { hasPermission } from '../../lib/accessControl';
import { Modal } from './Modal';
import { formatManilaDateTime } from '../../lib/dateTime';

type Notice = { id: string; title: string; detail: string; time: number; path: string };
function readSeen(key: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
  } catch { return []; }
}

export function Notifications() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const storageKey = `rmc-notifications-seen:${profile?.uid || ''}`;
  const [seenState, setSeenState] = useState(() => ({ key: storageKey, ids: readSeen(storageKey) }));
  const seen = seenState.key === storageKey ? seenState.ids : readSeen(storageKey);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => { setOpen(false); }, [profile?.uid]);
  // AuthContext rerenders this component when its authorized snapshot changes.
  const notices: Notice[] = [];
  if (profile?.uid) {
    const canApprove = hasPermission(profile.role, 'events.approve');
    const canManage = hasPermission(profile.role, 'events.manage');
    const staff = canManage || canApprove;
    const events = staff ? appData.getVisibleEvents(profile.uid) : appData.getRecipientEvents(profile.uid);
    for (const event of events) {
      const pending = canApprove && event.status === 'pending';
      const relevant = event.status === 'active' || (event.status === 'upcoming' && event.endTime > now);
      if (!pending && !relevant && !event.cancellationStatus) continue;
      if (!pending && event.endTime < now - 7 * 86400000) continue;
      const status = event.cancellationStatus || event.status;
      notices.push({ id: `event:${event.id}:${status}:${event.startTime}:${event.endTime}`,
        title: event.cancellationStatus ? `Cancelled: ${event.title}` : pending ? `Approval needed: ${event.title}` : `${event.status === 'active' ? 'Active now' : 'Upcoming'}: ${event.title}`,
        detail: formatManilaDateTime(event.startTime), time: event.startTime,
        path: pending || (canApprove && !canManage) ? '/ossa/dashboard' : canManage ? '/ssg/events' : event.kind === 'flag_ceremony' ? '/student/ceremonies' : '/student/events' });
    }
    for (const record of appData.getAttendanceRecords(profile.uid)) {
      const time = record.time_out || record.time_in || record.recorded_at;
      if (!time || time < now - 30 * 86400000) continue;
      notices.push({ id: `attendance:${record.id}:${record.status}:${time}`, title: `Attendance: ${record.event?.title || 'Record updated'}`, detail: `Status: ${record.status}`, time, path: '/student/records' });
    }
    if (['ossa', 'ossa_staff'].includes(profile.role)) {
      for (const reminder of appData.getPaymentInfo().reminders) {
        notices.push({ id: `payment:${reminder.id}`, title: reminder.subject, detail: reminder.message, time: reminder.sentAt, path: '/ossa/dashboard' });
      }
    }
  }
  notices.sort((a, b) => b.time - a.time);
  const unread = notices.filter(notice => !seen.includes(notice.id)).length;
  const markRead = (ids: string[]) => {
    const next = [...new Set([...seen, ...ids])].slice(-500);
    setSeenState({ key: storageKey, ids: next });
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Browser storage can be unavailable. */ }
  };
  const trigger = (desktop: boolean) => <button type="button" aria-label="Notifications" aria-haspopup="dialog" aria-expanded={open}
    onClick={() => setOpen(true)} className={`${desktop ? 'hidden md:inline-flex' : 'inline-flex md:hidden'} relative min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-gold-100 hover:bg-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400`}>
    <Bell size={20} />
    {unread > 0 && <span className="absolute right-0 top-0 rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white" aria-label={`${unread} unread notifications`}>{unread > 99 ? '99+' : unread}</span>}
  </button>;
  return <>
    {trigger(false)}
    {createPortal(<div className="fixed right-4 top-3 z-40 hidden rounded-full bg-brand-900 shadow-md md:block">{trigger(true)}</div>, document.body)}
    <Modal open={open} onClose={() => setOpen(false)} title="Notifications" size="sm"
      footer={notices.length > 0 ? <button type="button" disabled={unread === 0} onClick={() => markRead(notices.map(notice => notice.id))} className="app-button app-button--secondary min-h-11 px-4 text-sm font-bold disabled:opacity-50">Mark all as read</button> : undefined}>
      {notices.length === 0 ? <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-300">You're all caught up. No notifications yet.</p> :
        <ul className="space-y-2">{notices.map(notice => <li key={notice.id}><button type="button" onClick={() => { markRead([notice.id]); setOpen(false); navigate(notice.path); }}
          className={`w-full min-w-0 rounded-xl border p-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700 ${seen.includes(notice.id) ? 'border-slate-200 dark:border-slate-700' : 'border-gold-400 bg-gold-50 dark:bg-brand-900'}`}>
          <span className="block break-words text-sm font-bold">{notice.title}</span>
          <span className="mt-1 block whitespace-pre-line break-words text-xs text-slate-600 dark:text-slate-300">{notice.detail}</span>
          <span className="mt-2 block text-[11px] text-slate-500 dark:text-slate-400">{formatManilaDateTime(notice.time)}{!seen.includes(notice.id) && ' · Unread'}</span>
        </button></li>)}</ul>}
    </Modal>
  </>;
}
