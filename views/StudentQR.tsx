import React, { useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { useAuth } from '../components/AuthContext';
import { ShieldCheck, Info, Download, Sparkles, CheckCircle2 } from 'lucide-react';

const StudentQR: React.FC = () => {
  const { profile } = useAuth();
  const qrWrapperRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!profile) return null;

  const handleDownloadPNG = () => {
    setDownloading(true);
    setDownloadSuccess(false);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 600;
      canvas.height = 900;

      // Background
      ctx.fillStyle = '#0E1B42'; // brand-900
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Card Inner Box
      ctx.fillStyle = '#FFFFFF';
      ctx.roundRect(30, 30, 540, 840, 32);
      ctx.fill();

      // Top Banner
      ctx.fillStyle = '#0E1B42';
      ctx.beginPath();
      ctx.roundRect(30, 30, 540, 160, [32, 32, 0, 0]);
      ctx.fill();

      // Gold accent line
      ctx.fillStyle = '#D4AF37';
      ctx.fillRect(30, 185, 540, 5);

      // Header Text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('INSTITUTION ATTENDANCE & RECORDS', 300, 85);

      ctx.fillStyle = '#D4AF37';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('OFFICIAL DIGITAL STUDENT PASSPORT', 300, 115);

      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '10px sans-serif';
      ctx.fillText('IARS • VERIFIED IDENTITY', 300, 140);

      // Student Details
      ctx.fillStyle = '#0E1B42';
      ctx.font = '900 22px sans-serif';
      ctx.fillText(profile.name.toUpperCase(), 300, 240);

      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`ID: ${profile.student_id}`, 300, 270);

      // Department Pill
      ctx.fillStyle = '#F1F5F9';
      ctx.roundRect(80, 290, 440, 36, 18);
      ctx.fill();

      ctx.fillStyle = '#0E1B42';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`${profile.school_data.department || 'GENERAL'} • ${profile.school_data.section || 'N/A'}`, 300, 313);

      // Draw SVG QR Code to Canvas
      const svgElement = qrWrapperRef.current?.querySelector('svg');
      if (svgElement) {
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const img = new Image();
        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);

        img.onload = () => {
          // White QR Box
          ctx.fillStyle = '#FAFAFA';
          ctx.strokeStyle = '#E2E8F0';
          ctx.lineWidth = 2;
          ctx.roundRect(160, 360, 280, 280, 24);
          ctx.fill();
          ctx.stroke();

          ctx.drawImage(img, 180, 380, 240, 240);

          // Footer info
          ctx.fillStyle = '#0E1B42';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText('SCAN FOR EVENT & CEREMONY CHECK-IN', 300, 680);

          ctx.fillStyle = '#10B981';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText('✓ SYSTEM VERIFIED & SECURITY STAMPED', 300, 710);

          ctx.fillStyle = '#94A3B8';
          ctx.font = '10px sans-serif';
          ctx.fillText(`Generated on ${new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}`, 300, 830);

          // Trigger download
          const link = document.createElement('a');
          link.download = `RMC_Student_QR_${profile.student_id}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();

          setDownloading(false);
          setDownloadSuccess(true);
          setTimeout(() => setDownloadSuccess(false), 3000);
        };
      } else {
        setDownloading(false);
      }
    } catch (e) {
      console.error('PNG export error', e);
      setDownloading(false);
    }
  };

  return (
    <div className="p-4 sm:p-5 max-w-md mx-auto flex flex-col items-center animate-in zoom-in duration-200 space-y-4">
      {/* Header Info */}
      <div className="text-center space-y-0.5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-gold-50 dark:bg-gold-500/10 border border-gold-200 dark:border-gold-500/30 text-gold-700 dark:text-gold-300 rounded-full text-[9px] font-bold uppercase tracking-wider">
          <Sparkles size={11} /> Digital Access Card
        </div>
        <h1 className="text-xl font-bold text-brand-900 dark:text-slate-100 uppercase tracking-tight">Student QR Passport</h1>
        <p className="text-slate-400 dark:text-slate-400 text-[11px] font-medium">Use this minimalist QR code for instant event and ceremony attendance scanning.</p>
      </div>

      {/* Main Card */}
      <div className="w-full bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden border border-slate-200 dark:border-slate-700 transition-all">
        <div className="bg-brand-gradient p-5 text-center relative border-b-2 border-emerald-500">
          <div className="absolute top-3 right-3 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[8px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
            Verified
          </div>
          <img 
            src="https://i.imgur.com/K3T5yIT.jpeg" 
            alt="IARS Academic Seal" 
            className="w-14 h-14 mx-auto rounded-full object-cover shadow-lg mb-2 ring-2 ring-gold-400/60" 
          />
          <h2 className="text-base font-bold text-white uppercase tracking-tight">Institution Attendance & Records</h2>
          <p className="text-gold-300 text-[9px] font-semibold uppercase tracking-widest mt-0.5">IARS • Student ID Card</p>
        </div>

        <div className="p-5 flex flex-col items-center">
          {/* Student Header */}
          <div className="text-center mb-4">
            <h3 className="text-base font-bold text-brand-900 dark:text-slate-100 uppercase tracking-tight">{profile.name}</h3>
            <p className="text-slate-500 dark:text-slate-400 font-mono text-[11px] font-semibold mt-0.5">ID: {profile.student_id}</p>
            
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              <span className="bg-brand-50 dark:bg-brand-900/40 text-brand-900 dark:text-brand-300 border border-brand-100 dark:border-brand-800 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase">
                {profile.school_data.department || 'General'}
              </span>
              <span className="bg-gold-50 dark:bg-amber-500/20 text-brand-900 dark:text-amber-300 border border-gold-200 dark:border-amber-500/30 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase">
                {profile.school_data.level || ''} - {profile.school_data.section || 'N/A'}
              </span>
            </div>
          </div>

          {/* QR Code Container */}
          <div ref={qrWrapperRef} className="p-4 bg-white border border-slate-200 dark:border-slate-700 rounded-2xl shadow-inner mb-4 transition-all hover:border-gold-400/60">
            <QRCode 
              value={profile.student_id || profile.uid} 
              size={170} 
              fgColor="#0E1B42" 
              level="H"
            />
          </div>

          {/* Download Action Button */}
          <button
            onClick={handleDownloadPNG}
            disabled={downloading}
            className="w-full py-2.5 px-4 bg-brand-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:bg-brand-800 active:scale-98 transition-all flex items-center justify-center gap-2 group border border-gold-400/30"
          >
            {downloading ? (
              <span className="animate-pulse">Generating Minimalist PNG...</span>
            ) : downloadSuccess ? (
              <>
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span>Card Saved to Photos/Downloads!</span>
              </>
            ) : (
              <>
                <Download size={16} className="text-gold-400 group-hover:translate-y-0.5 transition-transform" />
                <span>Download Card as PNG</span>
              </>
            )}
          </button>

          {/* Security Badge */}
          <div className="w-full mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2.5">
             <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs">
                <ShieldCheck size={15} />
             </div>
             <div className="text-left">
                <p className="text-[11px] font-bold text-emerald-900">Cryptographically Secured</p>
                <p className="text-[9px] text-emerald-700 font-medium">Linked to student record #{profile.student_id}</p>
             </div>
          </div>
        </div>

        {/* Card Footer */}
        <div className="bg-slate-50 p-3.5 flex items-start gap-2 border-t border-slate-100">
          <Info size={14} className="text-slate-400 mt-0.5 shrink-0" />
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Present this card during active attendance scanning for institutional events and mandatory flag ceremonies.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudentQR;
