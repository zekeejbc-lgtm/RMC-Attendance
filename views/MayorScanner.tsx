
import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../components/AuthContext';
import { Event, UserProfile } from '../types';
import Button from '../components/ui/Button';
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
  const [activeEvents, setActiveEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<UserProfile | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [reductionHours, setReductionHours] = useState(1);
  
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
    setIsScanning(true);
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
      ).catch(err => {
        setErrorMessage("Optical Sensor Activation Failed");
        setIsScanning(false);
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
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        setIsScanning(false);
        setScanResult(null);
      });
    } else {
      setIsScanning(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-7xl mx-auto">
      <header className="bg-brand-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gold-400/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3 relative z-10">
          <Zap className="text-gold-400" size={24} /> Field Operations
        </h2>
        <div className="mt-6 flex bg-white/5 p-1 rounded-xl gap-1 relative z-10 border border-white/5">
          <button 
            onClick={() => setMode('attendance')}
            className={`flex-1 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'attendance' ? 'bg-gold-gradient text-brand-900 shadow-lg' : 'text-white/40'}`}
          >
            Attendance
          </button>
          <button 
            onClick={() => isPresident ? setMode('sanctions') : alert("Restricted to SSG President Authorization")}
            className={`flex-1 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'sanctions' ? 'bg-brand-800 text-gold-400 shadow-md border border-gold-400/20' : 'text-white/40'} ${!isPresident ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            {isPresident ? 'Sanction Clear' : <Lock size={12} className="inline mb-0.5" />}
          </button>
        </div>
      </header>

      {!isScanning ? (
        <div className="bg-white p-6 lg:p-10 rounded-2xl border border-slate-100 shadow-xl space-y-8 animate-in fade-in">
          {mode === 'attendance' ? (
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-brand-900 uppercase tracking-widest flex items-center gap-2">
                 <History size={16} /> Operational Directives
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeEvents.map(ev => (
                  <button 
                    key={ev.id} 
                    onClick={() => setSelectedEvent(ev)}
                    className={`p-4 rounded-xl border-2 text-left transition-all flex justify-between items-center group ${selectedEvent?.id === ev.id ? 'border-gold-400 bg-gold-50 shadow-inner' : 'border-slate-50'}`}
                  >
                    <div>
                      <p className="font-black text-brand-900 uppercase tracking-tighter text-sm">{ev.title}</p>
                      <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-0.5">Deployment Live</p>
                    </div>
                    {selectedEvent?.id === ev.id && <CheckCircle2 size={18} className="text-gold-500" />}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 text-center space-y-4">
                 <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Adjustment Power</p>
                 <div className="flex items-center justify-center gap-8">
                    <button onClick={() => setReductionHours(Math.max(1, reductionHours - 1))} className="w-12 h-12 rounded-xl bg-white shadow-md text-brand-900 flex items-center justify-center border border-slate-200 active:scale-90 transition-all">-</button>
                    <span className="text-5xl font-black text-brand-900 tracking-tighter">{reductionHours}h</span>
                    <button onClick={() => setReductionHours(reductionHours + 1)} className="w-12 h-12 rounded-xl bg-white shadow-md text-brand-900 flex items-center justify-center border border-slate-200 active:scale-90 transition-all">+</button>
                 </div>
                 <p className="text-[8px] font-bold text-red-400 uppercase tracking-widest italic opacity-60">President Level Authorization Required</p>
              </div>
            </div>
          )}

          <Button variant="gold" className="!rounded-2xl py-5 shadow-xl text-[11px] font-black uppercase tracking-widest" onClick={startScanner} disabled={mode === 'attendance' && !selectedEvent}>
            Initiate Optical Scan <Scan size={20} className="ml-2" />
          </Button>
        </div>
      ) : (
        <div className="fixed inset-0 z-[100] bg-brand-950/90 backdrop-blur-3xl flex flex-col items-center justify-center animate-in fade-in duration-500 overflow-hidden">
           {/* Top Header Layer to eliminate blur gaps */}
           <div className="w-full max-w-sm flex justify-between items-center px-6 mb-8 relative z-[101]">
              <div className="flex items-center gap-2">
                 <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                 <h3 className="text-white text-[10px] font-black uppercase tracking-[0.4em]">Precision Scanning</h3>
              </div>
              <button onClick={closeScanner} className="p-3 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-all border border-white/5">
                <X size={24} />
              </button>
           </div>
           
           {/* Scanning Area */}
           <div className="relative group">
              <div id={scannerId} className="w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] rounded-3xl overflow-hidden border-4 border-gold-400 shadow-[0_0_80px_rgba(212,175,55,0.4)] relative z-10"></div>
              <div className="absolute -inset-4 border border-gold-400/20 rounded-[2.5rem] animate-pulse"></div>
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gold-400/80 shadow-[0_0_15px_#D4AF37] z-20 animate-[scan_3s_linear_infinite]"></div>
           </div>

           <p className="mt-12 text-white/50 text-[9px] font-black uppercase tracking-[0.4em] text-center max-w-[260px] leading-relaxed">
             Align asset for institutional verification. Link active.
           </p>

           <style>{`
             @keyframes scan {
               0% { top: 0; opacity: 0; }
               10% { opacity: 1; }
               90% { opacity: 1; }
               100% { top: 100%; opacity: 0; }
             }
           `}</style>

           {scanResult && (
             <div className="fixed inset-0 z-[110] bg-brand-950/85 backdrop-blur-3xl flex items-center justify-center p-6 animate-in zoom-in duration-300">
                <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.6)] border-2 border-gold-400">
                   <div className="bg-brand-900 p-6 text-center border-b-2 border-gold-400/20">
                      <p className="text-gold-400 text-[10px] font-black uppercase tracking-[0.3em]">Target Identified</p>
                   </div>
                   <div className="p-8 space-y-6 text-center">
                      <img src={scanResult.photo_url} className="w-24 h-24 rounded-2xl object-cover mx-auto border-4 border-slate-100 shadow-2xl" />
                      <div>
                         <h4 className="text-xl font-black text-brand-900 uppercase tracking-tighter mb-1 leading-none">{scanResult.name}</h4>
                         <p className="text-slate-400 text-[8px] font-black uppercase tracking-[0.3em] mt-2">ID: {scanResult.student_id}</p>
                      </div>

                      {scanStatus === 'success' ? (
                        <div className="p-4 bg-green-50 text-green-600 rounded-xl border border-green-200 font-black text-[10px] uppercase animate-in zoom-in">
                           <CheckCircle2 size={18} className="inline mr-2" /> Verified & Logged
                        </div>
                      ) : (
                        <div className="flex gap-3">
                           <button onClick={() => {setScanResult(null); scannerRef.current?.resume();}} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-100 transition-colors">Discard</button>
                           <button onClick={confirmAction} className="flex-1 py-4 bg-gold-gradient text-brand-900 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">Authorize</button>
                        </div>
                      )}
                   </div>
                </div>
             </div>
           )}
        </div>
      )}
    </div>
  );
};

export default MayorScanner;
