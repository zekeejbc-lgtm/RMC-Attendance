import React, { useMemo, useState } from 'react';
import { AlertTriangle, Archive, ArrowLeft, CalendarRange, CircleOff, Clock3, Crosshair, MapPin, Plus, Save as SaveIcon, Trash2, Users2, XCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { GeofenceMap } from '../components/events/GeofenceMap';
import { RecipientCombobox } from '../components/events/RecipientCombobox';
import Button from '../components/ui/Button';
import CustomSelect from '../components/ui/CustomSelect';
import { Page, PageHeader, Surface } from '../components/ui/Page';
import { flattenDirectory } from '../lib/academicDirectory';
import { appData } from '../lib/backend';
import { AppEvent, EventAttendanceWindow, EventSanctionRule } from '../types';

const quickRecipientGroups = ['All Students', 'All SSG Officers', 'All Mayors', 'JHS', 'SHS', 'College'];

const newWindow = (index: number): EventAttendanceWindow => ({
  id: `window-${Date.now()}-${index}`,
  label: `Window ${index}`,
  timeIn: '',
  timeOut: '',
  lateAfterMinutes: 15,
});

const SSGCreateEvent: React.FC = () => {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const { profile } = useAuth();
  const editingEvent = useMemo(() => eventId ? appData.getEvents().find((event) => event.id === eventId) : undefined, [eventId]);
  const isEditing = Boolean(editingEvent);
  const editingActiveEvent = editingEvent?.status === 'active';
  const datePart = (value: number) => new Date(value + 8 * 3600000).toISOString().slice(0, 10);
  const timePart = (value: number) => new Date(value + 8 * 3600000).toISOString().slice(11, 16);
  const [kind, setKind] = useState<AppEvent['kind']>(editingEvent?.kind || 'attendance');
  const [meritHours, setMeritHours] = useState(editingEvent?.meritHours || 1);
  const [occurrences, setOccurrences] = useState(1);
  const [saveError, setSaveError] = useState('');
  const [title, setTitle] = useState(editingEvent?.title || '');
  const [description, setDescription] = useState(editingEvent?.description || '');
  const [startDate, setStartDate] = useState(editingEvent?.startDate || (editingEvent ? datePart(editingEvent.startTime) : ''));
  const [endDate, setEndDate] = useState(editingEvent?.endDate || (editingEvent ? datePart(editingEvent.endTime) : ''));
  const [selectedGroups, setSelectedGroups] = useState<string[]>(editingEvent?.recipientGroups || [editingEvent?.targetValue || 'All Students']);
  const [geofenceEnabled, setGeofenceEnabled] = useState(editingEvent?.geofenceEnabled ?? false);
  const [location, setLocation] = useState({ lat: editingEvent?.location.lat ?? 7.0736, lng: editingEvent?.location.lng ?? 125.6126, radius: editingEvent?.location.radius_meters ?? 100, isLocating: false });
  const [attendanceWindows, setAttendanceWindows] = useState<EventAttendanceWindow[]>(editingEvent?.attendanceWindows?.length ? editingEvent.attendanceWindows : editingEvent ? [{ id: 'window-1', label: 'Window 1', timeIn: timePart(editingEvent.startTime), timeOut: timePart(editingEvent.endTime), lateAfterMinutes: 15 }] : [newWindow(1)]);
  const [lateSanction, setLateSanction] = useState<EventSanctionRule>(editingEvent?.sanctionRules?.late || { value: 30, unit: 'minutes' });
  const [absentSanction, setAbsentSanction] = useState<EventSanctionRule>(editingEvent?.sanctionRules?.absent || (editingEvent ? { value: editingEvent.penaltyValue, unit: editingEvent.penaltyUnit } : { value: 1, unit: 'hours' }));

  const recipientOptions = useMemo(() => Array.from(new Set([
    ...quickRecipientGroups,
    ...flattenDirectory(appData.getSchoolStructure()).map((node) => node.name),
  ])).filter(Boolean), []);

  const recipientGroups = selectedGroups;

  const updateWindow = (id: string, update: Partial<EventAttendanceWindow>) => {
    setAttendanceWindows((windows) => windows.map((window) => window.id === id ? { ...window, ...update } : window));
  };

  const captureLocation = () => {
    setLocation((current) => ({ ...current, isLocating: true }));
    navigator.geolocation.getCurrentPosition(
      (position) => setLocation((current) => ({ ...current, lat: position.coords.latitude, lng: position.coords.longitude, isLocating: false })),
      () => {
        window.alert('Location permission was denied. You can still enter coordinates manually.');
        setLocation((current) => ({ ...current, isLocating: false }));
      },
      { enableHighAccuracy: true },
    );
  };

  const datesValid = Boolean(startDate && endDate && endDate >= startDate);
  const sortedWindows = [...attendanceWindows].sort((a, b) => a.timeIn.localeCompare(b.timeIn));
  const windowsOverlap = sortedWindows.some((window, index) => index > 0 && window.timeIn < sortedWindows[index - 1].timeOut);
  const windowsValid = attendanceWindows.length > 0 && attendanceWindows.every((window) => (
    Boolean(window.timeIn && window.timeOut)
    && window.timeOut > window.timeIn
    && window.lateAfterMinutes >= 0
  ));
  const formValid = Boolean(title.trim() && description.trim() && datesValid && windowsValid && !windowsOverlap && recipientGroups.length > 0);

  const [saving, setSaving] = useState(false);
  const scheduleEvent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formValid || saving) return;
    setSaving(true); setSaveError('');

    const firstWindow = sortedWindows[0];
    const lastWindow = sortedWindows[sortedWindows.length - 1];
    const allStudents = recipientGroups.length === 1 && recipientGroups[0] === 'All Students';
    const targetValue = recipientGroups.join(', ');

    const payload = {
      kind, meritHours: kind === 'merit' ? meritHours : undefined,
      recurrence: !isEditing && occurrences > 1 ? { frequency: 'weekly' as const, occurrences } : undefined,
      scopeNodeId: profile?.role === 'admin' ? undefined : profile?.official_data?.assignment_node_id,
      title: title.trim(),
      description: description.trim(),
      status: editingEvent?.status || 'upcoming',
      created_by: profile?.uid || 'System',
      startDate,
      endDate,
      startTime: new Date(`${startDate}T${firstWindow.timeIn}:00+08:00`).getTime(),
      endTime: new Date(`${endDate}T${lastWindow.timeOut}:00+08:00`).getTime(),
      attendanceWindows: sortedWindows.map((window, index) => ({ ...window, label: `Window ${index + 1}` })),
      sanctionRules: { late: lateSanction, absent: absentSanction },
      penaltyValue: absentSanction.value,
      penaltyUnit: absentSanction.unit,
      recipientGroups,
      participantsType: (allStudents ? 'all' : 'specific') as any,
      targetValue,
      audienceTarget: (allStudents
        ? { mode: 'all' }
        : { mode: 'group_list', groups: recipientGroups, snapshotLabel: targetValue }) as any,
      target: { all: allStudents },
      geofenceEnabled,
      location: geofenceEnabled
        ? { lat: location.lat, lng: location.lng, radius_meters: location.radius }
        : { lat: 0, lng: 0, radius_meters: 0 },
      timestamp: Date.now(),
    };
    try {
      if (profile && appData.isUserScopeFrozen(profile) && profile.role !== 'admin') throw new Error('Events are frozen for your scope.');
      if (editingEvent) await appData.updateEvent(editingEvent.id, payload);
      else await appData.createEvent(payload);
    } catch (error) { setSaveError(error instanceof Error ? error.message : 'Unable to save event.'); return; }
    finally { setSaving(false); }

    navigate('/ssg/events');
  };

  return (
    <Page>
      <PageHeader
        eyebrow="SSG event management"
        title={isEditing ? 'Edit Event' : 'Create Event'}
        description={isEditing ? 'Update this event using the same configuration controls used during creation.' : 'Configure recipients, attendance windows, geofencing, and sanction rules before scheduling.'}
        actions={<Button variant="secondary" onClick={() => navigate('/ssg/events')}><ArrowLeft size={17} /> Back to Events</Button>}
      />

      <form aria-label={isEditing ? 'Edit attendance event' : 'Schedule attendance event'} className="space-y-6" onSubmit={scheduleEvent}>
        {saveError && <p role="alert" className="text-sm text-red-600">{saveError}</p>}
        <Surface className="space-y-4 p-4 sm:p-6">
          <h2 className="text-lg font-bold text-brand-900 dark:text-white">Activity and service schedule</h2>
          <p className="text-sm text-slate-500">Schedule sanction clearing as a service activity. Scan in and out to deduct rendered hours. Merit activities deduct the configured hours once after scan-out.</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <CustomSelect label="Activity type" value={kind} onChange={value => setKind(value as AppEvent['kind'])} options={[{value:'attendance',label:'Attendance event'},{value:'service',label:'Sanction clearing / service'},{value:'merit',label:'Merit activity'},{value:'flag_ceremony',label:'Flag ceremony'}]} />
            {kind === 'merit' && <label className="app-field-label">Merit hours<input type="number" min="0.01" step="0.01" required className="input-field mt-2" value={meritHours} onChange={event => setMeritHours(Number(event.target.value))}/></label>}
            {!isEditing && <label className="app-field-label">Weekly occurrences<input type="number" min="1" max="52" required className="input-field mt-2" value={occurrences} onChange={event => setOccurrences(Number(event.target.value))}/><span className="mt-1 block text-xs font-normal normal-case">1 for a single activity; up to 52 weeks.</span></label>}
          </div>
        </Surface>
        <Surface className="space-y-5 p-4 sm:p-6">
          <div><h2 className="flex items-center gap-2 text-lg font-bold text-brand-900 dark:text-white"><CalendarRange size={20} className="text-gold-500" /> Event information</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Provide the complete event schedule and instructions.</p></div>
          <div className="space-y-2"><label htmlFor="event-title" className="app-field-label">Event Title</label><input id="event-title" required disabled={editingActiveEvent} className="input-field min-h-12 text-sm disabled:cursor-not-allowed disabled:opacity-60" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. College General Assembly" /></div>
          <div className="space-y-2"><label htmlFor="event-details" className="app-field-label">Event Details and Information</label><textarea id="event-details" required disabled={editingActiveEvent} rows={6} className="input-field min-h-36 resize-y text-sm leading-6 disabled:cursor-not-allowed disabled:opacity-60" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Objectives, attendance instructions, venue details, and reminders" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><label htmlFor="event-start-date" className="app-field-label">Start Date</label><input id="event-start-date" required disabled={editingActiveEvent} type="date" className="input-field min-h-12 text-sm disabled:cursor-not-allowed disabled:opacity-60" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></div>
            <div className="space-y-2"><label htmlFor="event-end-date" className="app-field-label">End Date</label><input id="event-end-date" required min={startDate || undefined} type="date" className="input-field min-h-12 text-sm" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></div>
          </div>
          {startDate && endDate && !datesValid && <p role="alert" className="text-sm font-semibold text-red-600 dark:text-red-300">End date must be on or after the start date.</p>}
        </Surface>

        <Surface className="space-y-5 p-4 sm:p-6">
          <div><h2 className="flex items-center gap-2 text-lg font-bold text-brand-900 dark:text-white"><Users2 size={20} className="text-gold-500" /> Event recipients</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Search the academic directory or type custom recipient groups. Use commas to add several values quickly.</p></div>
          <RecipientCombobox onChange={setSelectedGroups} options={recipientOptions} selected={selectedGroups} />
        </Surface>

        <Surface className="space-y-5 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="flex items-center gap-2 text-lg font-bold text-brand-900 dark:text-white"><MapPin size={20} className="text-gold-500" /> Geofencing</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Require scans to occur inside a defined event perimeter.</p></div><button type="button" role="switch" aria-checked={geofenceEnabled} aria-label="Enable geofencing" onClick={() => setGeofenceEnabled((enabled) => !enabled)} className={`relative h-8 w-14 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 ${geofenceEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}><span aria-hidden="true" className={`absolute left-0 top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${geofenceEnabled ? 'translate-x-7' : 'translate-x-1'}`} /></button></div>
          {geofenceEnabled ? (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(16rem,0.65fr)]">
              <GeofenceMap value={location} onChange={(point) => setLocation((current) => ({ ...current, ...point }))} />
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
                  The blue circle is the valid attendance area. Click anywhere on the map or drag the center marker to reposition it.
                </div>
                <div className="space-y-2"><label htmlFor="event-geofence-radius" className="app-field-label">Geofence Radius (meters)</label><input id="event-geofence-radius" type="number" min="10" max="5000" className="input-field min-h-12 text-sm" value={location.radius || ''} onBlur={() => setLocation((current) => ({ ...current, radius: Math.min(5000, Math.max(10, current.radius || 10)) }))} onChange={(event) => setLocation({ ...location, radius: Number(event.target.value) })} /><input aria-label="Adjust geofence radius" type="range" min="10" max="1000" step="1" className="w-full accent-blue-600" value={Math.min(Math.max(location.radius || 10, 10), 1000)} onChange={(event) => setLocation({ ...location, radius: Number(event.target.value) })} /></div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"><div className="space-y-2"><label htmlFor="event-latitude" className="app-field-label">Latitude</label><input id="event-latitude" type="number" step="any" className="input-field min-h-11 text-sm" value={location.lat} onChange={(event) => setLocation({ ...location, lat: Number(event.target.value) })} /></div><div className="space-y-2"><label htmlFor="event-longitude" className="app-field-label">Longitude</label><input id="event-longitude" type="number" step="any" className="input-field min-h-11 text-sm" value={location.lng} onChange={(event) => setLocation({ ...location, lng: Number(event.target.value) })} /></div></div>
                <Button className="w-full" type="button" variant="secondary" onClick={captureLocation}><Crosshair size={17} className={location.isLocating ? 'animate-spin' : ''} /> Use Current Location</Button>
              </div>
            </div>
          ) : null}
        </Surface>

        <Surface className="space-y-5 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-bold text-brand-900 dark:text-white"><Clock3 size={20} className="text-gold-500" /> Attendance windows</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Add each time-in/time-out session and its late threshold.</p></div><Button type="button" variant="secondary" onClick={() => setAttendanceWindows((windows) => [...windows, newWindow(windows.length + 1)])}><Plus size={17} /> Add Attendance Window</Button></div>
          {windowsOverlap && <p role="alert" className="text-sm font-semibold text-red-600 dark:text-red-300">Attendance windows must not overlap.</p>}
          {attendanceWindows.some((window) => window.timeIn && window.timeOut && window.timeOut <= window.timeIn) && <p role="alert" className="text-sm font-semibold text-red-600 dark:text-red-300">Each time out must be later than its time in.</p>}
          <div className="space-y-4">
            {attendanceWindows.map((window, index) => <fieldset key={window.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"><legend className="px-2 text-sm font-bold text-brand-900 dark:text-white">Window {index + 1}</legend><div className="grid gap-4 sm:grid-cols-3"><div className="space-y-2"><label htmlFor={`time-in-${window.id}`} className="app-field-label">Time In {index + 1}</label><input id={`time-in-${window.id}`} required type="time" className="input-field min-h-12 text-sm" value={window.timeIn} onChange={(event) => updateWindow(window.id, { timeIn: event.target.value })} /></div><div className="space-y-2"><label htmlFor={`time-out-${window.id}`} className="app-field-label">Time Out {index + 1}</label><input id={`time-out-${window.id}`} required type="time" className="input-field min-h-12 text-sm" value={window.timeOut} onChange={(event) => updateWindow(window.id, { timeOut: event.target.value })} /></div><div className="space-y-2"><label htmlFor={`late-after-${window.id}`} className="app-field-label">Late After Minutes {index + 1}</label><input id={`late-after-${window.id}`} type="number" min="0" className="input-field min-h-12 text-sm" value={window.lateAfterMinutes} onChange={(event) => updateWindow(window.id, { lateAfterMinutes: Number(event.target.value) })} /></div></div>{attendanceWindows.length > 1 && <button type="button" aria-label={`Remove attendance window ${index + 1}`} onClick={() => setAttendanceWindows((windows) => windows.filter((item) => item.id !== window.id))} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-bold text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950"><Trash2 size={15} /> Remove window</button>}</fieldset>)}
          </div>
        </Surface>

        <Surface className="space-y-5 p-4 sm:p-6">
          <div><h2 className="flex items-center gap-2 text-lg font-bold text-brand-900 dark:text-white"><AlertTriangle size={20} className="text-red-500" /> Sanction rules</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Set independent sanctions for late and absent attendance.</p></div>
          <div className="grid gap-5 lg:grid-cols-2">
            <fieldset className="grid gap-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/20 sm:grid-cols-[1fr_10rem]"><legend className="px-2 text-sm font-bold text-amber-800 dark:text-amber-200">Late sanction</legend><div className="space-y-2"><label htmlFor="late-sanction-value" className="app-field-label">Late Sanction Value</label><input id="late-sanction-value" type="number" min="0" className="input-field min-h-12 text-sm" value={lateSanction.value} onChange={(event) => setLateSanction({ ...lateSanction, value: Number(event.target.value) })} /></div><CustomSelect label="Late sanction unit" options={[{ value: 'minutes', label: 'Minutes' }, { value: 'hours', label: 'Hours' }]} value={lateSanction.unit} onChange={(value) => setLateSanction({ ...lateSanction, unit: value as EventSanctionRule['unit'] })} /></fieldset>
            <fieldset className="grid gap-3 rounded-2xl border border-red-200 bg-red-50/50 p-4 dark:border-red-900 dark:bg-red-950/20 sm:grid-cols-[1fr_10rem]"><legend className="px-2 text-sm font-bold text-red-800 dark:text-red-200">Absent sanction</legend><div className="space-y-2"><label htmlFor="absent-sanction-value" className="app-field-label">Absent Sanction Value</label><input id="absent-sanction-value" type="number" min="0" className="input-field min-h-12 text-sm" value={absentSanction.value} onChange={(event) => setAbsentSanction({ ...absentSanction, value: Number(event.target.value) })} /></div><CustomSelect label="Absent sanction unit" options={[{ value: 'hours', label: 'Hours' }, { value: 'minutes', label: 'Minutes' }]} value={absentSanction.unit} onChange={(value) => setAbsentSanction({ ...absentSanction, unit: value as EventSanctionRule['unit'] })} /></fieldset>
          </div>
        </Surface>

        <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
          <div><p className="text-sm font-bold text-brand-900 dark:text-white">{isEditing ? 'Event actions' : 'Ready to schedule?'}</p><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{isEditing ? 'Save your changes or update this event’s status.' : 'Review the configuration before scheduling this event.'}</p></div>
          <div aria-label="Event form actions" className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end" role="group">
            {!isEditing && <Button className="sm:w-auto" type="button" variant="secondary" onClick={() => navigate('/ssg/events')}>Cancel</Button>}
            {editingEvent?.status === 'active' && <><Button className="sm:w-auto" size="sm" type="button" variant="secondary" onClick={async () => { await appData.updateEvent(editingEvent.id, { endTime: editingEvent.endTime + 3600000 }); navigate('/ssg/events'); }}><Clock3 size={15}/>Extend by 1 Hour</Button><Button className="sm:w-auto" size="sm" type="button" variant="secondary" onClick={async () => { await appData.archiveEvent(editingEvent.id); navigate('/ssg/events'); }}><Archive size={15}/>Finish and Archive</Button></>}
            {editingEvent?.status === 'upcoming' && <><Button className="sm:w-auto" size="sm" type="submit" variant="secondary"><Clock3 size={15}/>Reschedule</Button><Button className="sm:w-auto" size="sm" type="button" variant="warning" onClick={async () => { await appData.updateEvent(editingEvent.id, { status: 'done', cancellationStatus: 'dropped' }); navigate('/ssg/events'); }}><CircleOff size={15}/>Drop</Button><Button className="sm:w-auto" size="sm" type="button" variant="secondary" onClick={async () => { await appData.cancelEvent(editingEvent.id); navigate('/ssg/events'); }}><XCircle size={15}/>Cancel</Button><Button className="sm:w-auto" size="sm" type="button" variant="secondary" onClick={async () => { await appData.archiveEvent(editingEvent.id); navigate('/ssg/events'); }}><Archive size={15}/>Archive</Button><Button className="text-red-700 sm:w-auto" size="sm" type="button" variant="danger" onClick={async () => { await appData.deleteEvent(editingEvent.id); navigate('/ssg/events'); }}><Trash2 size={15}/>Delete</Button></>}
            <Button className="col-span-2 sm:ml-2 sm:w-auto sm:min-w-32" type="submit" variant="gold" disabled={!formValid || saving}><SaveIcon size={16}/>{isEditing ? 'Save' : 'Schedule Event'}</Button>
          </div>
        </div>
      </form>
    </Page>
  );
};

export default SSGCreateEvent;
