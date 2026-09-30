import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Button from '../ui/Button';
import { Surface } from '../ui/Page';
import { Modal } from '../ui/Modal';
import { appData } from '../../lib/backend';
import { hasPermission } from '../../lib/accessControl';
import { canManageEventInScope } from '../../lib/eventAudience';
import { AppEvent } from '../../types';

export default function ActivityApprovalQueue({ purpose }: { purpose?: 'event' | 'ceremony' }) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!profile) return null;
  const reviewer = ['ossa', 'ossa_staff'].includes(profile.role) && hasPermission(profile.role, 'events.approve');
  const requests = appData.getVisibleEvents(profile.uid).filter(event => event.requiresOssaApproval
    && !event.cancellationStatus && event.status !== 'done'
    && (!purpose || (purpose === 'ceremony') === (event.kind === 'flag_ceremony')));
  const selected = requests.find(event => event.id === selectedId);
  const canReview = (event: AppEvent) => reviewer && event.created_by !== profile.uid
    && event.approvalStatus === 'pending' && canManageEventInScope(profile, event, appData.getSchoolStructure());
  const review = async (decision: 'approved' | 'rejected') => {
    if (!selected || busy) return;
    setBusy(true); setError('');
    try { await appData.reviewEvent(selected.id, decision, notes); setSelectedId(null); }
    catch (err) { setError(err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Unable to save decision.'); }
    finally { setBusy(false); }
  };
  if (!requests.length && !reviewer) return null;
  return <Surface className="space-y-4 p-4 sm:p-6" aria-label="OSSA activity approvals">
    <div><h2 className="text-lg font-bold">Event &amp; ceremony approvals</h2><p className="text-sm text-slate-500">Submitted → OSSA review → Approved → Active at the scheduled time</p></div>
    <p className="text-sm font-semibold">{requests.filter(event => event.approvalStatus === 'pending').length} pending review</p>
    {!requests.length && <p className="text-sm text-slate-500">No activity requests to review.</p>}
    <div className="grid gap-3 md:grid-cols-2">{requests.map(event => <article key={event.id} className="space-y-2 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <h3 className="font-bold">{event.title}</h3>
      <p className="text-sm">{event.kind === 'flag_ceremony' ? 'Ceremony' : 'Event'} · {new Date(event.startTime).toLocaleString()}</p>
      <p className={`text-sm font-bold ${event.approvalStatus === 'approved' ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>{event.approvalStatus === 'pending' ? 'Pending OSSA review · Inactive' : event.approvalStatus === 'rejected' ? 'Rejected · Inactive' : event.status === 'active' ? 'OSSA approved · Active' : 'OSSA approved · Scheduled'}</p>
      {event.reviewNotes && <p className="text-sm">OSSA feedback: {event.reviewNotes}</p>}
      <div className="flex flex-wrap gap-2"><Button fullWidth={false} variant="secondary" onClick={() => { setSelectedId(event.id); setNotes(''); setError(''); }}>{canReview(event) ? 'Review request' : 'View request'}</Button>
        {event.approvalStatus !== 'approved' && hasPermission(profile.role, 'events.manage') && canManageEventInScope(profile, event, appData.getSchoolStructure()) && <Button fullWidth={false} variant="secondary" onClick={() => navigate(event.organizationId ? `/organizations/${event.organizationId}/events/${event.id}/edit` : `/ssg/${event.kind === 'flag_ceremony' ? 'ceremonies' : 'events'}/${event.id}/edit`)}>Edit request</Button>}</div>
    </article>)}</div>
    <Modal open={Boolean(selected)} onClose={() => { if (!busy) setSelectedId(null); }} title={selected?.title || 'Activity request'} description="Review the activity before it becomes available for attendance." size="lg">
      {selected && <div className="space-y-4 text-sm">
        <p>{selected.description || 'No description provided.'}</p>
        <dl className="grid gap-3 sm:grid-cols-2"><div><dt className="font-bold">Schedule</dt><dd>{new Date(selected.startTime).toLocaleString()} – {new Date(selected.endTime).toLocaleString()}</dd></div>
          <div><dt className="font-bold">Recipients</dt><dd>{selected.recipientGroups?.join(', ') || selected.targetValue || selected.participantsType}</dd></div>
          <div><dt className="font-bold">Late sanction</dt><dd>{selected.sanctionRules?.late.value || 0} {selected.sanctionRules?.late.unit || 'hours'}</dd></div>
          <div><dt className="font-bold">Absent sanction</dt><dd>{selected.sanctionRules?.absent.value ?? selected.penaltyValue} {selected.sanctionRules?.absent.unit || selected.penaltyUnit}</dd></div>
          <div><dt className="font-bold">Attendance windows</dt><dd>{selected.attendanceWindows?.map(window => `${window.timeIn}–${window.timeOut}`).join(', ') || 'Scheduled duration'}</dd></div>
          <div><dt className="font-bold">Geofence</dt><dd>{selected.geofenceEnabled ? `${selected.location.radius_meters} meters (${selected.location.lat}, ${selected.location.lng})` : 'Disabled'}</dd></div>
        </dl>
        {selected.ceremony && <p>Exempt students: {selected.ceremony.exemptStudentIds.length}. Class schedules: {Object.keys(selected.ceremony.classWindows).length}. Volunteer merit: {selected.ceremony.allowVolunteerMerit ? `${selected.ceremony.volunteerMeritHours} hours` : 'Disabled'}.</p>}
        {selected.reviewNotes && <p>OSSA feedback: {selected.reviewNotes}</p>}
        {canReview(selected) && <><label className="block font-bold" htmlFor="activity-review-notes">Decision notes (required for rejection)</label><textarea id="activity-review-notes" className="app-control w-full" rows={3} maxLength={2000} value={notes} onChange={event => setNotes(event.target.value)} />
          {selected.startTime <= Date.now() && <p className="text-amber-700">The author must reschedule this activity before approval.</p>}
          {error && <p role="alert" className="text-red-600">{error}</p>}
          <div className="flex gap-3"><Button variant="danger" disabled={busy || !notes.trim()} onClick={() => review('rejected')}>Reject</Button><Button variant="gold" disabled={busy || selected.startTime <= Date.now()} onClick={() => review('approved')}>Approve</Button></div></>}
      </div>}
    </Modal>
  </Surface>;
}
