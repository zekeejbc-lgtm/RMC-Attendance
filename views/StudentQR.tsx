import React, { useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { useAuth } from '../components/AuthContext';
import { ShieldCheck, Info, Download, Sparkles, CheckCircle2 } from 'lucide-react';
import Button from '../components/ui/Button';
import { Page, PageHeader, Surface } from '../components/ui/Page';

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
    <Page className="max-w-lg animate-in zoom-in duration-200">
      <PageHeader
        className="justify-center text-center"
        eyebrow={<span className="inline-flex items-center gap-1.5"><Sparkles size={12} /> Digital Access Card</span>}
        title="Student QR Passport"
        description="Use this minimalist QR code for instant event and ceremony attendance scanning."
      />

      {/* Main Card */}
      <Surface className="w-full overflow-hidden shadow-lg transition-all">
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
          <div
            ref={qrWrapperRef}
            role="img"
            aria-label={`Student QR code for ${profile.name}`}
            className="mb-4 w-full max-w-[min(17rem,calc(100vw-4rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-inner transition-all hover:border-gold-400/60 dark:border-slate-700"
          >
            <QRCode 
              value={profile.uid}
              size={170} 
              fgColor="#0E1B42" 
              level="H"
              className="h-auto w-full"
            />
          </div>

          {/* Download Action Button */}
          <Button
            aria-label="Download card as PNG"
            onClick={handleDownloadPNG}
            disabled={downloading}
            className="w-full border border-gold-400/30 uppercase tracking-wider sm:w-auto"
          >
            {downloading ? (
              <span className="animate-pulse">Working...</span>
            ) : downloadSuccess ? (
              <>
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span>Saved</span>
              </>
            ) : (
              <>
                <Download size={16} className="text-gold-400 group-hover:translate-y-0.5 transition-transform" />
                <span>Download</span>
              </>
            )}
          </Button>

          {/* Security Badge */}
          <div className="mt-4 flex w-full items-center gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/50">
             <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs">
                <ShieldCheck size={15} />
             </div>
             <div className="min-w-0 text-left">
                <p className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200">System-verified account</p>
                <p className="text-[9px] text-emerald-700 font-medium [overflow-wrap:anywhere] dark:text-emerald-300">Linked to student record #{profile.student_id}; the QR uses an internal key and requires active student status.</p>
             </div>
          </div>
        </div>

        {/* Card Footer */}
        <div className="flex items-start gap-2 border-t border-slate-100 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-900/60">
          <Info size={14} className="text-slate-400 mt-0.5 shrink-0" />
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Present this card during active attendance scanning for institutional events and mandatory flag ceremonies.
          </p>
        </div>
      </Surface>
    </Page>
  );
};

export default StudentQR;
