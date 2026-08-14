import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Archive, ArrowLeft, CalendarClock, Camera, Check, CheckCircle2, ChevronRight, CircleDot,
  Clock3, LocateFixed, MapPin, Play, ScanLine, ShieldCheck, Square,
  UserX, Users, Wifi,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../components/AuthContext';
import { AppEvent, UserProfile } from '../types';
import { getDistanceFromLatLonInMeters } from '../lib/geolocation';
import { mockData } from '../lib/mockBackend';
import Button from '../components/ui/Button';
import CustomSelect from '../components/ui/CustomSelect';
import { Modal } from '../components/ui/Modal';
import { Page, PageHeader, Surface } from '../components/ui/Page';

type EventGroup = 'current' | 'scheduled' | 'archived';
type ScannerState = 'ready' | 'starting' | 'scanning' | 'paused' | 'stopping';
type CameraOption = { value: string; label: string };
type AttendanceReceipt = { time_in: number; status: 'present' | 'late'; already_recorded?: boolean };

const eventTime = (value: unknown, fallback: number) => {
  const parsed = typeof value === 'number' ? value : Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatEventTime = (value: unknown) => format(eventTime(value, Date.now()), 'MMM d, h:mm a');

const groupEvent = (event: AppEvent, now = Date.now()): EventGroup => {
  if (event.status === 'done' || event.endTime < now) return 'archived';
  if (event.status === 'active' || (event.startTime <= now && event.endTime >= now)) return 'current';
  return 'scheduled';
};

const MayorScanner: React.FC = () => {
  const { profile, isMock } = useAuth();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [tab, setTab] = useState<EventGroup>('current');
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
  const [locationError, setLocationError] = useState('');
  const [locating, setLocating] = useState(false);
  const [cameraOptions, setCameraOptions] = useState<CameraOption[]>([
    { value: 'environment', label: 'Rear-facing camera' },
    { value: 'user', label: 'Front-facing camera' },
  ]);
  const [cameraId, setCameraId] = useState('environment');
  const [scannerState, setScannerState] = useState<ScannerState>('ready');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanResult, setScanResult] = useState<UserProfile | null>(null);
  const [attendanceReceipt, setAttendanceReceipt] = useState<AttendanceReceipt | null>(null);
  const [proposedRecordTime, setProposedRecordTime] = useState<number | null>(null);
  const [scanError, setScanError] = useState('');
  const [manualStudentId, setManualStudentId] = useState('');
  const [manualError, setManualError] = useState('');
  const [scannedCount, setScannedCount] = useState(0);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerStateRef = useRef<ScannerState>('ready');
  const handlingScan = useRef(false);
  const verificationReturnState = useRef<'ready' | 'scanning' | 'paused'>('ready');
  const scannerId = 'mayor-camera-reader';
  scannerStateRef.current = scannerState;

  useEffect(() => {
    if (isMock) {
      const now = Date.now();
      setEvents(mockData.getEvents().map((event) => ({
        ...event,
        startTime: eventTime(event.startTime, now - 60000),
        endTime: eventTime(event.endTime, now + 3600000),
        location: event.location || { lat: 7.0736, lng: 125.6126, radius_meters: 150 },
      })).sort((a, b) => a.startTime - b.startTime));
    }
  }, [isMock]);

  useEffect(() => () => {
    const scanner = scannerRef.current;
    if (scanner?.isScanning) scanner.stop().catch(() => undefined);
  }, []);

  const groupedEvents = useMemo(() => ({
    current: events.filter((event) => groupEvent(event) === 'current'),
    scheduled: events.filter((event) => groupEvent(event) === 'scheduled'),
    archived: events.filter((event) => groupEvent(event) === 'archived'),
  }), [events]);

  const distance = selectedEvent && location
    ? Math.round(getDistanceFromLatLonInMeters(location.latitude, location.longitude, selectedEvent.location.lat, selectedEvent.location.lng))
    : null;
  const insideGeofence = distance !== null && distance <= (selectedEvent?.location.radius_meters || 0);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Location is not supported by this device.');
      return;
    }
    setLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setLocation(coords); setLocating(false); },
      (error) => {
        setLocationError(error.code === 1 ? 'Location permission was denied. Enable it in your browser settings.' : 'We could not determine your current location. Please try again.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 },
    );
  };

  const openEvent = (event: AppEvent) => {
    setSelectedEvent(event);
    setLocation(null);
    setLocationError('');
    requestLocation();
  };

  const discoverCameras = async () => {
    try {
      const cameras = await Html5Qrcode.getCameras();
      if (cameras.length) {
        setCameraOptions(cameras.map((camera, index) => ({ value: camera.id, label: camera.label || `Camera ${index + 1}` })));
        setCameraId(cameras[0].id);
      }
    } catch {
      // Browser permission is requested when the selected camera starts.
    }
  };

  const enterScanner = async () => {
    if (!insideGeofence || !selectedEvent) return;
    setScannerOpen(true);
    setScannerState('ready');
    setScanError('');
    await discoverCameras();
  };

  const identifyStudent = (student: UserProfile) => {
    if (handlingScan.current) return;
    handlingScan.current = true;
    const currentScannerState = scannerStateRef.current;
    verificationReturnState.current = currentScannerState === 'scanning' ? 'scanning' : currentScannerState === 'paused' ? 'paused' : 'ready';
    if (currentScannerState === 'scanning') {
      scannerRef.current?.pause(true);
      setScannerState('paused');
    }
    setScanError('');
    setManualError('');
    setAttendanceReceipt(null);
    setProposedRecordTime(Date.now());
    setScanResult(student);
  };

  const handleDecoded = (decodedText: string) => {
    if (handlingScan.current) return;
    const student = isMock ? mockData.getUserProfile(decodedText) : null;
    if (student && selectedEvent && profile) {
      identifyStudent(student);
    } else {
      setScanError('This QR code does not belong to an active student account.');
    }
  };

  const checkManualStudent = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (handlingScan.current) return;
    const normalizedId = manualStudentId.trim().toLowerCase();
    if (!normalizedId) {
      setManualError('Enter a student ID to continue.');
      return;
    }
    const student = isMock
      ? mockData.getAllStudents().find((candidate) => candidate.student_id.trim().toLowerCase() === normalizedId)
      : null;
    if (!student) {
      setManualError('No active student was found with that exact student ID.');
      return;
    }
    setManualStudentId('');
    identifyStudent(student);
  };

  const recordAttendance = () => {
    if (!scanResult || !selectedEvent || !profile || attendanceReceipt) return;
    const record = mockData.logAttendance(selectedEvent.id, scanResult.uid, profile.uid, profile.name, proposedRecordTime || Date.now()) as AttendanceReceipt;
    setAttendanceReceipt(record);
    if (!record.already_recorded) setScannedCount((count) => count + 1);
  };

  const startScanner = async () => {
    setScannerState('starting');
    setScanError('');
    try {
      const scanner = scannerRef.current || new Html5Qrcode(scannerId);
      scannerRef.current = scanner;
      const source = cameraId === 'environment' || cameraId === 'user' ? { facingMode: cameraId } : cameraId;
      await scanner.start(source, { fps: 12, qrbox: { width: 260, height: 260 }, aspectRatio: 1.777 }, handleDecoded, () => undefined);
      setScannerState('scanning');
      discoverCameras();
    } catch {
      setScannerState('ready');
      setScanError('Camera access failed. Check browser permission or select another camera.');
    }
  };

  const stopScanner = async () => {
    setScannerState('stopping');
    try { if (scannerRef.current?.isScanning) await scannerRef.current.stop(); } catch { /* already stopped */ }
    scannerRef.current = null;
    handlingScan.current = false;
    setScannerState('ready');
  };

  const closeScanner = async () => {
    await stopScanner();
    setScannerOpen(false);
    setSelectedEvent(null);
    setScanResult(null);
    setAttendanceReceipt(null);
    setProposedRecordTime(null);
    setScanError('');
    setManualStudentId('');
    setManualError('');
  };

  const continueScanning = () => {
    setScanResult(null);
    setAttendanceReceipt(null);
    setProposedRecordTime(null);
    handlingScan.current = false;
    if (verificationReturnState.current === 'scanning' && scannerRef.current?.isScanning) {
      scannerRef.current.resume();
      setScannerState('scanning');
    } else {
      setScannerState(verificationReturnState.current);
    }
  };

  const useDemoLocation = () => {
    if (!selectedEvent) return;
    setLocation({
      latitude: selectedEvent.location.lat,
      longitude: selectedEvent.location.lng,
      accuracy: 5,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      toJSON: () => ({}),
    });
    setLocationError('');
  };

  const eventTabs: { key: EventGroup; label: string; icon: React.ElementType }[] = [
    { key: 'current', label: 'Ongoing', icon: CircleDot },
    { key: 'scheduled', label: 'Scheduled', icon: CalendarClock },
    { key: 'archived', label: 'Archived', icon: Archive },
  ];

  if (scannerOpen) {
    return (
      <Page>
        <PageHeader
          eyebrow="Mayor workspace · Attendance"
          title="Attendance recording"
          description={selectedEvent ? `${selectedEvent.title} · Verify each student before saving their attendance.` : 'Record student attendance.'}
          actions={<Button variant="secondary" className="sm:w-auto" onClick={closeScanner}><ArrowLeft size={17} /> Back to events</Button>}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <Surface className="flex items-center gap-3 p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40"><ShieldCheck size={19} /></span><span><span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Location</span><span className="mt-0.5 block text-sm font-black text-brand-900 dark:text-white">Geofence verified</span></span></Surface>
          <Surface className="flex items-center gap-3 p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-gold-50 text-gold-600 dark:bg-gold-950/40"><Users size={19} /></span><span><span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">This session</span><span className="mt-0.5 block text-sm font-black text-brand-900 dark:text-white">{scannedCount} recorded</span></span></Surface>
          <Surface className="flex items-center gap-3 p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40"><Clock3 size={19} /></span><span><span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Event closes</span><span className="mt-0.5 block text-sm font-black text-brand-900 dark:text-white">{selectedEvent ? format(selectedEvent.endTime, 'h:mm a') : '—'}</span></span></Surface>
        </div>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,.65fr)]">
          <Surface className="overflow-hidden p-0">
            <div className="flex flex-col gap-4 border-b border-slate-200 p-5 dark:border-slate-700 sm:flex-row sm:items-end sm:justify-between sm:p-6">
              <CustomSelect ariaLabel="Camera selection" className="w-full sm:max-w-sm" label="Camera" options={cameraOptions} value={cameraId} onChange={setCameraId} disabled={scannerState !== 'ready'} />
              <div className="sm:flex">
                {scannerState === 'ready' ? (
                  <Button aria-label="Start scanner" variant="gold" className="sm:w-auto" onClick={startScanner}><Play size={16} /> Start</Button>
                ) : (
                  <Button aria-label="Stop scanner" variant="secondary" className="border-red-300 text-red-700 hover:bg-red-50 sm:w-auto dark:text-red-300" onClick={stopScanner} loading={scannerState === 'stopping'} disabled={scannerState === 'starting'}><Square size={15} /> Stop</Button>
                )}
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <div aria-label="Camera scanner" className="relative aspect-square w-full overflow-hidden rounded-2xl border-4 border-brand-900 bg-black shadow-xl sm:aspect-video dark:border-gold-400/60" role="region">
                {/* html5-qrcode owns this empty mount node. React overlays must remain siblings. */}
                <div className="absolute inset-0 min-h-64 w-full" id={scannerId} />
                <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center"><div className="h-52 w-52 rounded-2xl border-2 border-gold-400 shadow-[0_0_0_999px_rgba(0,0,0,.22)]" /></div>
                {scannerState === 'ready' && <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center text-center text-white"><div><Camera className="mx-auto text-gold-400" size={42} /><p className="mt-3 text-sm font-black">Camera is off</p><p className="mt-1 text-xs text-white/60">Choose a camera, then press Start.</p></div></div>}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-300"><span className={`h-2.5 w-2.5 rounded-full ${scannerState === 'scanning' ? 'animate-pulse bg-emerald-500' : scannerState === 'paused' ? 'bg-amber-500' : 'bg-slate-300'}`} />{scannerState === 'scanning' ? 'Scanning for student QR codes' : scannerState === 'paused' ? 'Scanning paused' : 'Scanner ready'}</p><p className="text-xs font-semibold text-slate-400">One student at a time</p></div>
              {scanError && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{scanError}</div>}
            </div>
          </Surface>

          <div className="space-y-5">
            <Surface className="p-5 sm:p-6">
              <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-900 text-gold-400"><CheckCircle2 size={19} /></span><div><h2 className="text-sm font-black text-brand-900 dark:text-white">Manual recording</h2><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Check an exact student ID.</p></div></div>
              <form className="mt-5" onSubmit={checkManualStudent}>
                <label htmlFor="manual-student-id"><span className="mb-2 block text-xs font-bold text-slate-600 dark:text-slate-300">Student ID</span><input id="manual-student-id" name="manual_student_identifier" type="text" value={manualStudentId} onChange={(event) => { setManualStudentId(event.target.value); setManualError(''); }} placeholder="e.g. 2024-00123" autoComplete="off" autoCorrect="off" autoCapitalize="characters" spellCheck={false} aria-describedby={manualError ? 'manual-student-error' : 'manual-student-help'} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-brand-900 outline-none transition focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white" /></label>
                <p id="manual-student-help" className="mt-2 text-[11px] leading-5 text-slate-500 dark:text-slate-400">Enter the complete ID. No names or suggestions are accepted.</p>
                {manualError && <p id="manual-student-error" role="alert" className="mt-2 text-xs font-bold text-red-600 dark:text-red-300">{manualError}</p>}
                <Button type="submit" variant="gold" className="mt-4" disabled={!manualStudentId.trim() || Boolean(scanResult)}><CheckCircle2 size={17} /> Check student</Button>
              </form>
            </Surface>

            {isMock && <Surface className="border-dashed border-gold-300 bg-gold-50/50 p-5 dark:border-gold-800 dark:bg-gold-950/20"><p className="text-xs font-black text-brand-900 dark:text-white">Demo student IDs</p><p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">Test the same verification flow without a printed QR.</p><div className="mt-4 grid gap-2"><Button size="sm" variant="secondary" disabled={Boolean(scanResult)} onClick={() => handleDecoded('mock_uid_student')}>Pedro · 2024-00123</Button><Button size="sm" variant="secondary" disabled={Boolean(scanResult)} onClick={() => handleDecoded('mock_uid_bea')}>Beatriz · 2024-00104</Button></div></Surface>}
          </div>
        </div>

        <Modal open={Boolean(scanResult)} onClose={continueScanning} title={attendanceReceipt?.already_recorded ? 'Already recorded' : attendanceReceipt ? 'Attendance recorded' : 'Verify student identity'} description={attendanceReceipt?.already_recorded ? 'This student already has an attendance record for this event.' : attendanceReceipt ? 'The attendance record was saved successfully.' : 'Confirm that this profile matches the student presenting the QR code.'} size="sm" footer={attendanceReceipt ? <Button variant="gold" onClick={continueScanning}><ScanLine size={17} /> Scan next student</Button> : <><Button variant="secondary" className="border-red-200 text-red-700 hover:bg-red-50" onClick={continueScanning}><UserX size={17} /> Waive</Button><Button variant="gold" onClick={recordAttendance}><CheckCircle2 size={17} /> Record</Button></>}>
          {scanResult && <div className="text-center"><div className="relative mx-auto w-fit"><img src={scanResult.photo_url || undefined} alt={`${scanResult.name} profile`} className="h-28 w-28 rounded-3xl border-4 border-gold-100 object-cover shadow-lg dark:border-gold-900" />{attendanceReceipt && <span className="absolute -bottom-2 -right-2 grid h-9 w-9 place-items-center rounded-full border-4 border-white bg-emerald-500 text-white shadow dark:border-slate-800"><Check size={17} strokeWidth={3} /></span>}</div><h3 className="mt-5 text-xl font-black text-brand-900 dark:text-white">{scanResult.name}</h3><p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-300">{scanResult.student_id}</p><p className="mt-1 text-xs text-slate-400">{scanResult.school_data.level} · {scanResult.school_data.section}</p>{!attendanceReceipt && <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-left dark:border-blue-800 dark:bg-blue-950/40"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black text-blue-800 dark:text-blue-200">Identity check required</p><p className="mt-1 text-xs leading-5 text-blue-700 dark:text-blue-300">Choose <strong>Record</strong> only when the photo and student ID match. Choose <strong>Waive</strong> to dismiss without saving.</p></div>{proposedRecordTime && <div className="shrink-0 rounded-xl bg-white/70 px-3 py-2 text-right dark:bg-slate-900/40"><p className="text-[9px] font-black uppercase tracking-widest text-blue-500">Record time</p><p className="mt-1 whitespace-nowrap text-sm font-black text-blue-900 dark:text-blue-100"><Clock3 size={13} className="mr-1 inline" />{format(proposedRecordTime, 'h:mm:ss a')}</p><p className="mt-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-300">{format(proposedRecordTime, 'MMM d, yyyy')}</p></div>}</div></div>}{attendanceReceipt && <div className={`mt-5 rounded-2xl border p-4 ${attendanceReceipt.status === 'late' ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40' : 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40'}`}><p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{attendanceReceipt.already_recorded ? 'Original record' : 'Status recorded'}</p><p className={`mt-1 text-2xl font-black capitalize ${attendanceReceipt.status === 'late' ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{attendanceReceipt.status}</p><p className="mt-2 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300"><Clock3 size={14} />{format(attendanceReceipt.time_in, 'MMM d, yyyy · h:mm:ss a')}</p></div>}</div>}
        </Modal>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader eyebrow="Mayor workspace" title={`Welcome, ${profile?.name?.split(' ')[0] || 'Mayor'}`} description="Manage attendance scanning for your class while keeping your student tools close at hand." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Ongoing now', value: groupedEvents.current.length, icon: Wifi, tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' },
          { label: 'Scheduled', value: groupedEvents.scheduled.length, icon: CalendarClock, tone: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40' },
          { label: 'Completed', value: groupedEvents.archived.length, icon: CheckCircle2, tone: 'text-violet-600 bg-violet-50 dark:bg-violet-950/40' },
          { label: 'Scanned this session', value: scannedCount, icon: Users, tone: 'text-gold-600 bg-gold-50 dark:bg-gold-950/40' },
        ].map(({ label, value, icon: Icon, tone }) => (
          <Surface key={label} className="flex items-center gap-4 p-5">
            <span className={`grid h-12 w-12 place-items-center rounded-2xl ${tone}`}><Icon size={22} /></span>
            <span><span className="block text-2xl font-black text-brand-900 dark:text-white">{value}</span><span className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</span></span>
          </Surface>
        ))}
      </div>

      <Surface className="overflow-hidden p-0">
        <div className="border-b border-slate-200 px-5 pt-5 dark:border-slate-700 sm:px-7 sm:pt-6">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-900 text-gold-400"><ScanLine size={20} /></span><div><h2 className="font-black text-brand-900 dark:text-white">Attendance events</h2><p className="text-xs text-slate-500 dark:text-slate-400">Open an ongoing event to begin field scanning.</p></div></div>
          <div className="mt-5 flex gap-1 overflow-x-auto" role="tablist" aria-label="Event status">
            {eventTabs.map(({ key, label, icon: Icon }) => <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-4 text-xs font-black transition-colors ${tab === key ? 'border-gold-500 text-brand-900 dark:text-gold-300' : 'border-transparent text-slate-400 hover:text-brand-800 dark:hover:text-white'}`}><Icon size={15} />{label}<span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] dark:bg-slate-700">{groupedEvents[key].length}</span></button>)}
          </div>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-7 xl:grid-cols-3">
          {groupedEvents[tab].map((event) => (
            <button key={event.id} type="button" onClick={() => openEvent(event)} className="group flex min-h-40 flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-gold-400 hover:bg-white hover:shadow-lg dark:border-slate-700 dark:bg-slate-900/70 dark:hover:bg-slate-800">
              <span><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${tab === 'current' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : tab === 'scheduled' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}><span className={`h-1.5 w-1.5 rounded-full ${tab === 'current' ? 'animate-pulse bg-emerald-500' : 'bg-current'}`} />{tab}</span><span className="mt-3 block text-base font-black text-brand-900 dark:text-white">{event.title}</span></span>
              <span className="mt-5 flex items-end justify-between gap-3"><span className="text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400"><Clock3 size={13} className="mr-1 inline" />{formatEventTime(event.startTime)}<br /><MapPin size={13} className="mr-1 inline" />{event.location.radius_meters} m geofence</span><ChevronRight className="text-gold-500 transition-transform group-hover:translate-x-1" size={20} /></span>
            </button>
          ))}
          {!groupedEvents[tab].length && <div className="col-span-full rounded-2xl border border-dashed border-slate-300 py-14 text-center dark:border-slate-700"><CalendarClock className="mx-auto text-slate-300 dark:text-slate-600" size={34} /><p className="mt-3 text-sm font-bold text-slate-500">No {tab} events</p></div>}
        </div>
      </Surface>

      <Modal open={Boolean(selectedEvent)} onClose={() => setSelectedEvent(null)} title={selectedEvent?.title || 'Event'} description="Confirm that you are within the authorized attendance area." size="xl" footer={<><Button variant="secondary" onClick={() => setSelectedEvent(null)}>Close</Button><Button variant="gold" onClick={enterScanner} disabled={!insideGeofence || groupEvent(selectedEvent!) !== 'current'}><ScanLine size={17} /> Start scanning</Button></>}>
        {selectedEvent && <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <div className="relative min-h-72 overflow-hidden rounded-2xl border border-slate-200 bg-[#e7edf0] dark:border-slate-700 dark:bg-slate-900" aria-label="Event geofence map">
            <div className="absolute inset-0 opacity-60" style={{ backgroundImage: 'linear-gradient(32deg, transparent 47%, #fff 48%, #fff 52%, transparent 53%), linear-gradient(128deg, transparent 46%, #fff 47%, #fff 51%, transparent 52%), linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)', backgroundSize: '160px 90px, 180px 120px, 32px 32px, 32px 32px' }} />
            <div className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-500 bg-emerald-400/15 shadow-[0_0_0_8px_rgba(16,185,129,.08)]"><span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"><MapPin size={34} className="fill-brand-900 text-brand-900 dark:fill-gold-400 dark:text-gold-400" /></span></div>
            {location && <div className={`absolute ${insideGeofence ? 'left-[58%] top-[58%]' : 'left-[84%] top-[78%]'} -translate-x-1/2 -translate-y-1/2`}><span className="absolute -inset-3 animate-ping rounded-full bg-blue-500/30" /><span className="relative block h-5 w-5 rounded-full border-4 border-white bg-blue-600 shadow-lg" /><span className="absolute left-1/2 top-7 w-max -translate-x-1/2 rounded-md bg-brand-900 px-2 py-1 text-[9px] font-black text-white">YOU ARE HERE</span></div>}
            <div className="absolute bottom-3 left-3 rounded-lg bg-white/90 px-3 py-2 text-[10px] font-bold text-slate-600 shadow dark:bg-slate-800/90 dark:text-slate-200">Geofence radius: {selectedEvent.location.radius_meters} m</div>
          </div>
          <div className="space-y-4">
            <div><p className="text-[10px] font-black uppercase tracking-widest text-gold-600">Event details</p><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{selectedEvent.description || 'Attendance scanning is available to assigned mayors during this event.'}</p></div>
            <div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><p className="text-[10px] font-bold text-slate-400">START</p><p className="mt-1 text-xs font-black">{formatEventTime(selectedEvent.startTime)}</p></div><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><p className="text-[10px] font-bold text-slate-400">ENDS</p><p className="mt-1 text-xs font-black">{formatEventTime(selectedEvent.endTime)}</p></div></div>
            <div className={`rounded-2xl border p-4 ${insideGeofence ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40' : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40'}`}><div className="flex gap-3">{insideGeofence ? <ShieldCheck className="shrink-0 text-emerald-600" /> : <LocateFixed className="shrink-0 text-amber-600" />}<div><p className="text-sm font-black">{insideGeofence ? 'Inside attendance area' : locating ? 'Finding your location…' : 'Outside or location unavailable'}</p><p className="mt-1 text-xs leading-5 opacity-75">{distance !== null ? `You are approximately ${distance.toLocaleString()} m from the event center.` : locationError || 'Allow precise location to verify your position.'}</p></div></div></div>
            <div className="flex flex-col gap-2 sm:flex-row"><Button variant="secondary" className="flex-1" onClick={requestLocation} loading={locating}><LocateFixed size={17} /> Refresh my location</Button>{isMock && <Button variant="secondary" className="flex-1 border-dashed" onClick={useDemoLocation}><MapPin size={17} /> Use demo location</Button>}</div>
          </div>
        </div>}
      </Modal>

    </Page>
  );
};

export default MayorScanner;
