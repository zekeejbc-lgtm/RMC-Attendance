
import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../components/AuthContext';
import { AppEvent, UserProfile } from '../types';
import Button from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Page, PageHeader, Surface } from '../components/ui/Page';
import { 
  Scan, 
  CheckCircle2, 
  X, 
  Clock,
  Zap,
  ShieldCheck,
  History,
  Lock,
  Camera
} from 'lucide-react';
import { mockData } from '../lib/mockBackend';

const MayorScanner: React.FC = () => {
  const { profile, isMock } = useAuth();
  const [mode, setMode] = useState<'attendance' | 'sanctions'>('attendance');
  const [activeEvents, setActiveEvents] = useState<AppEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraMounted, setIsCameraMounted] = useState(false);
  const [scanResult, setScanResult] = useState<UserProfile | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [reductionHours, setReductionHours] = useState(1);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "qr-reader";

  const isPresident = profile?.role === 'ssg' || profile?.role === 'admin';

  useEffect(() => {
    if (isMock) {
      setActiveEvents(mockData.getEvents().filter(e => e.status === 'active'));
    }
  }, [isMock]);

  const startScanner = async () => {
    if (mode === 'attendance' && !selectedEvent) return;
    setIsStarting(true);
    setIsCameraMounted(true);
    setScanStatus('idle');
    setScanResult(null);

    setTimeout(() => {
      const html5QrCode = new Html5Qrcode(scannerId);
      scannerRef.current = html5QrCode;
      html5QrCode.start(
        { facingMode: "environment" },
        { fps: 15, qrbox: { width: 250, height: 250 } },
        async (decodedText) => { handleScanSuccess(decodedText); },
        undefined
      ).then(() => {
        setIsScanning(true);
        setIsStarting(false);
      }).catch(() => {
        setErrorMessage("Optical Sensor Activation Failed");
        setScanStatus('error');
        setIsStarting(false);
        setIsScanning(false);
        setIsCameraMounted(false);
      });
    }, 100);
  };

  const handleScanSuccess = async (studentUid: string) => {
    if (scannerRef.current) scannerRef.current.pause();
    const studentProfile = isMock ? mockData.getUserProfile(studentUid) : null;
    if (studentProfile) {
      setScanResult(studentProfile);
      setScanStatus('idle');
    } else {
      setScanStatus('error');
      setErrorMessage("Unauthorized or Invalid Asset QR");
    }
  };

  const confirmAction = async () => {
    if (!scanResult || !profile) return;
    if (mode === 'attendance' && selectedEvent) {
      mockData.logAttendance(selectedEvent.id, scanResult.uid, profile.uid, profile.name);
    } else if (mode === 'sanctions' && isPresident) {
      mockData.adjustSanctionHours(scanResult.uid, -reductionHours, `QR Deduction by ${profile.name}`);
    }
    setScanStatus('success');
    setTimeout(() => {
      setScanResult(null);
      setScanStatus('idle');
      if (scannerRef.current) scannerRef.current.resume();
    }, 1500);
  };

  const closeScanner = () => {
    setIsStopping(true);
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        setIsScanning(false);
        setIsCameraMounted(false);
        setScanResult(null);
        setScanStatus('idle');
        setIsStopping(false);
        scannerRef.current = null;
      }).catch(() => {
        setErrorMessage('Unable to stop the optical sensor. Please try again.');
        setScanStatus('error');
        setIsStopping(false);
      });
    } else {
      setIsScanning(false);
      setIsCameraMounted(false);
      setIsStopping(false);
    }
  };

  const dismissScanResult = () => {
    setScanResult(null);
    setScanStatus('idle');
    scannerRef.current?.resume();
  };

  const dismissError = () => {
    setScanStatus('idle');
    setErrorMessage('');
    if (isScanning) scannerRef.current?.resume();
  };

  return (
    <Page>
      <PageHeader
        eyebrow="Field Operations"
        title="Optical Attendance Scanner"
        description="Verify student QR passports for attendance or authorized sanction adjustments."
      />

      <Surface className="overflow-hidden bg-brand-900 p-5 text-white shadow-xl sm:p-6">
        <div className="flex items-center gap-3">
          <Zap className="text-gold-400" size={24} />
          <h2 className="text-base font-black uppercase tracking-tight">Scanner mode</h2>
        </div>
        <div className="mt-5 flex bg-white/5 p-1 rounded-xl gap-1 border border-white/5">
          <button 
            onClick={() => setMode('attendance')}
            aria-pressed={mode === 'attendance'}
            className={`flex-1 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'attendance' ? 'bg-gold-gradient text-brand-900 shadow-lg' : 'text-white/40'}`}
          >
            Attendance
          </button>
          <button 
            onClick={() => isPresident ? setMode('sanctions') : alert("Restricted to SSG President Authorization")}
            aria-pressed={mode === 'sanctions'}
            aria-disabled={!isPresident}
            aria-label={isPresident ? undefined : 'Sanction Clear — restricted to SSG President authorization'}
            className={`flex-1 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'sanctions' ? 'bg-brand-800 text-gold-400 shadow-md border border-gold-400/20' : isPresident ? 'text-white/60' : 'border border-white/20 text-white/80 hover:bg-white/10'}`}
          >
            {isPresident ? 'Sanction Clear' : (
              <span className="inline-flex items-center justify-center gap-1.5">
                <Lock size={12} /> Sanction Clear <span className="hidden sm:inline">— Restricted</span>
              </span>
            )}
          </button>
        </div>
      </Surface>

      {!isScanning ? (
        <Surface className="space-y-8 p-5 sm:p-8 lg:p-10">
          {mode === 'attendance' ? (
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-brand-900 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
                 <History size={16} /> Operational Directives
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeEvents.map(ev => (
                  <button 
                    key={ev.id} 
                    onClick={() => setSelectedEvent(ev)}
                    aria-pressed={selectedEvent?.id === ev.id}
                    className={`p-4 rounded-xl border-2 text-left transition-all flex justify-between items-center group ${selectedEvent?.id === ev.id ? 'border-gold-400 bg-gold-50 dark:bg-gold-950/40 shadow-inner' : 'border-slate-50 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900'}`}
                  >
                    <div>
                      <p className="font-black text-brand-900 dark:text-slate-100 uppercase tracking-tighter text-sm">{ev.title}</p>
                      <p className="text-[8px] font-black text-slate-300 dark:text-slate-500 uppercase tracking-widest mt-0.5">Deployment Live</p>
                    </div>
                    {selectedEvent?.id === ev.id && <CheckCircle2 size={18} className="text-gold-500" />}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-slate-50 dark:bg-slate-900 p-8 rounded-2xl border border-slate-100 dark:border-slate-700/80 text-center space-y-4">
                 <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Adjustment Power</p>
                 <div className="flex items-center justify-center gap-8">
                    <button aria-label="Decrease sanction reduction" onClick={() => setReductionHours(Math.max(1, reductionHours - 1))} className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 shadow-md text-brand-900 dark:text-slate-100 flex items-center justify-center border border-slate-200 dark:border-slate-700 active:scale-90 transition-all">-</button>
                    <span className="text-5xl font-black text-brand-900 dark:text-slate-100 tracking-tighter">{reductionHours}h</span>
                    <button aria-label="Increase sanction reduction" onClick={() => setReductionHours(reductionHours + 1)} className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 shadow-md text-brand-900 dark:text-slate-100 flex items-center justify-center border border-slate-200 dark:border-slate-700 active:scale-90 transition-all">+</button>
                 </div>
                 <p className="text-[8px] font-bold text-red-400 uppercase tracking-widest italic opacity-60">President Level Authorization Required</p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="w-full space-y-1.5 sm:max-w-xs" htmlFor="scanner-camera">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Camera selection</span>
              <select
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-brand-900 outline-none focus:border-gold-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                defaultValue="environment"
                id="scanner-camera"
              >
                <option value="environment">Rear-facing camera</option>
              </select>
            </label>
            <Button variant="gold" size="lg" className="sm:w-auto" onClick={startScanner} loading={isStarting} disabled={mode === 'attendance' && !selectedEvent}>
              Initiate Optical Scan <Scan size={20} className="ml-2" />
            </Button>
          </div>
        </Surface>
      ) : null}

      {isCameraMounted ? (
        <Surface
          aria-hidden={!isScanning}
          className={isScanning
            ? 'bg-brand-950 p-4 text-white sm:p-6'
            : 'pointer-events-none absolute -left-[10000px] top-0 w-full max-w-2xl opacity-0'}
        >
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
            {isScanning ? <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                <h2 className="text-sm font-black uppercase tracking-widest">Precision scanning</h2>
              </div>
              <Button variant="secondary" className="sm:w-auto dark:bg-slate-800 dark:text-white" onClick={closeScanner} loading={isStopping}>
                <X size={18} /> Stop scanner
              </Button>
            </div> : null}
            <div
              aria-label={isScanning ? 'Camera scanner' : undefined}
              className="relative aspect-square w-full max-w-2xl overflow-hidden rounded-2xl border-4 border-gold-400 bg-black shadow-[0_0_50px_rgba(212,175,55,0.25)] sm:aspect-video"
              id={scannerId}
              role={isScanning ? 'region' : undefined}
            />
            {isScanning ? <p className="text-center text-xs font-bold uppercase tracking-widest text-white/60">
              Align the QR passport inside the camera frame. Scan results open separately without covering these controls.
            </p> : null}
          </div>
        </Surface>
      ) : null}

      <Modal
        open={Boolean(scanResult)}
        onClose={dismissScanResult}
        title={`Confirm ${mode} scan`}
        description="Review the identified student before recording this action."
        size="sm"
        footer={scanStatus === 'success' ? undefined : (
          <>
            <Button variant="secondary" onClick={dismissScanResult}>Discard</Button>
            <Button variant="gold" onClick={confirmAction}>Authorize {mode}</Button>
          </>
        )}
      >
        {scanResult ? (
          <div className="space-y-5 text-center">
            <img alt={`${scanResult.name} profile`} src={scanResult.photo_url || undefined} className="mx-auto h-24 w-24 rounded-2xl border-4 border-slate-100 object-cover shadow-lg dark:border-slate-700" />
            <div className="min-w-0">
              <h3 className="[overflow-wrap:anywhere] text-xl font-black uppercase tracking-tight text-brand-900 dark:text-white">{scanResult.name}</h3>
              <p className="mt-2 [overflow-wrap:anywhere] text-sm font-bold text-slate-500 dark:text-slate-300">{scanResult.student_id}</p>
            </div>
            {scanStatus === 'success' ? (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 font-bold text-green-700 dark:border-green-800 dark:bg-green-950/60 dark:text-green-300">
                <CheckCircle2 size={18} className="mr-2 inline" /> Verified and logged
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={scanStatus === 'error'}
        onClose={dismissError}
        title="Scan unsuccessful"
        description="The QR passport could not be verified."
        size="sm"
        footer={<Button onClick={dismissError}>Return to scanner</Button>}
      >
        <p className="[overflow-wrap:anywhere] text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
      </Modal>
    </Page>
  );
};

export default MayorScanner;
