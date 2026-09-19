import React, { useEffect, useRef, useState } from 'react';
import { appData } from '../lib/backend';
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
  const [qrToken, setQrToken] = useState('');
  const [expiresAt, setExpiresAt] = useState(0);
  const [qrError, setQrError] = useState('');
  useEffect(() => {
    let active = true;
    const renew = async () => {
      try {
        const result = await appData.issueQr();
        if (active) { setQrToken(result.token); setExpiresAt(result.expiresAt); setQrError(''); }
      } catch (error) { if (active) { setQrToken(''); setQrError(error instanceof Error ? error.message : 'QR unavailable.'); } }
    };
    void renew();
    const timer = setInterval(renew, 45000);
    return () => { active = false; clearInterval(timer); };
  }, [profile?.uid]);

  if (!profile) return null;

  const handleDownloadPNG = () => {
    setDownloading(true);
    setDownloadSuccess(false);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Canvas dimensions for crisp high resolution export
      canvas.width = 700;
      canvas.height = 1050;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // 1. Outer Background (White background)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Lifted Card Container with Shadow
      const cardX = 40;
      const cardY = 40;
      const cardW = 620;
      const cardH = 970;

      ctx.save();
      ctx.shadowColor = 'rgba(15, 23, 42, 0.22)';
      ctx.shadowBlur = 32;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 16;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 28);
      ctx.fill();
      ctx.restore();

      // Card outline border for clean definition on white canvas
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 28);
      ctx.stroke();

      // Determine Role Details & Colors
      // Color scheme requirements:
      // student (or mayor): Blue (#2563EB / #1D4ED8)
      // SSG officer (ssg): Green (#16A34A / #15803D)
      // OSAS officer/staff (ossa / ossa_staff): Orange (#EA580C / #C2410C)
      // default / admin: Gold/Slate (#0E1B42 / #D4AF37)
      let roleLabel = 'STUDENT';
      let roleBgColor = '#2563EB'; // Blue
      let roleTextColor = '#FFFFFF';

      const userRole = profile.role;
      if (userRole === 'ssg') {
        roleLabel = 'SSG OFFICER';
        roleBgColor = '#16A34A'; // Green
      } else if (userRole === 'ossa' || userRole === 'ossa_staff') {
        roleLabel = 'OSAS OFFICER';
        roleBgColor = '#EA580C'; // Orange
      } else if (userRole === 'mayor') {
        roleLabel = 'STUDENT (SECTION MAYOR)';
        roleBgColor = '#2563EB'; // Blue
      } else if (userRole === 'admin') {
        roleLabel = 'SYSTEM ADMINISTRATOR';
        roleBgColor = '#475569'; // Slate/Gray
      } else {
        roleLabel = 'STUDENT';
        roleBgColor = '#2563EB'; // Blue
      }

      // Top Header Banner
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, 165, [28, 28, 0, 0]);
      ctx.clip();
      ctx.fillStyle = '#0E1B42';
      ctx.fillRect(cardX, cardY, cardW, 165);
      ctx.restore();

      // Gold accent line below header
      ctx.fillStyle = '#D4AF37';
      ctx.fillRect(cardX, cardY + 165, cardW, 5);

      // App Logo Image loading
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.src = 'https://i.imgur.com/K3T5yIT.jpeg';

      const finishExport = () => {
        // Draw Logo cleanly on Header
        if (logoImg.complete && logoImg.naturalWidth > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(100, 122, 36, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(logoImg, 64, 86, 72, 72);
          ctx.restore();

          // High definition logo gold ring border
          ctx.strokeStyle = '#D4AF37';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(100, 122, 36, 0, Math.PI * 2);
          ctx.stroke();

          // Header Text (with logo aligned on left)
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '900 18px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('INSTITUTION ATTENDANCE & RECORDS', 152, 112);

          ctx.fillStyle = '#D4AF37';
          ctx.font = 'bold 13px sans-serif';
          ctx.fillText('OFFICIAL DIGITAL PASSPORT', 152, 135);

          ctx.fillStyle = 'rgba(255,255,255,0.75)';
          ctx.font = '10px sans-serif';
          ctx.fillText('IARS • VERIFIED SECURE IDENTITY', 152, 153);
        } else {
          // Centered Header Text fallback
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '900 19px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('INSTITUTION ATTENDANCE & RECORDS', 350, 105);

          ctx.fillStyle = '#D4AF37';
          ctx.font = 'bold 13px sans-serif';
          ctx.fillText('OFFICIAL DIGITAL PASSPORT', 350, 132);

          ctx.fillStyle = 'rgba(255,255,255,0.75)';
          ctx.font = '10px sans-serif';
          ctx.fillText('IARS • VERIFIED SECURE IDENTITY', 350, 153);
        }

        // Student Details
        ctx.textAlign = 'center';
        ctx.fillStyle = '#0E1B42';
        ctx.font = '900 24px sans-serif';
        ctx.fillText(profile.name.toUpperCase(), 350, 245);

        ctx.fillStyle = '#64748B';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(`ID: ${profile.student_id}`, 350, 270);

        // Role Badge Pill (Student = Blue, SSG = Green, OSAS = Orange)
        ctx.font = 'bold 12px sans-serif';
        const roleWidth = Math.max(140, ctx.measureText(roleLabel).width + 36);
        ctx.fillStyle = roleBgColor;
        ctx.beginPath();
        ctx.roundRect(350 - roleWidth / 2, 285, roleWidth, 28, 14);
        ctx.fill();

        ctx.fillStyle = roleTextColor;
        ctx.fillText(roleLabel, 350, 303);

        // Department & Section Pill
        ctx.fillStyle = '#F1F5F9';
        ctx.beginPath();
        ctx.roundRect(80, 325, 540, 34, 17);
        ctx.fill();

        ctx.fillStyle = '#0E1B42';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(`${profile.school_data.department || 'GENERAL'} • ${profile.school_data.level || ''} ${profile.school_data.section || 'N/A'}`.trim(), 350, 346);

        // Draw SVG QR Code to Canvas
        const svgElement = qrWrapperRef.current?.querySelector('svg');
        if (svgElement) {
          const svgData = new XMLSerializer().serializeToString(svgElement);
          const img = new Image();
          img.src = 'data:image/svg+xml;base64,' + btoa(svgData);

          img.onload = () => {
            // Crisp White QR Card Area
            ctx.fillStyle = '#FAFAFA';
            ctx.strokeStyle = '#E2E8F0';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(205, 380, 290, 290, 22);
            ctx.fill();
            ctx.stroke();

            ctx.drawImage(img, 220, 395, 260, 260);

            // Scan Info Text
            ctx.fillStyle = '#0E1B42';
            ctx.font = 'bold 13px sans-serif';
            ctx.fillText('SCAN FOR EVENT & CEREMONY CHECK-IN', 350, 698);

            ctx.fillStyle = '#10B981';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText('✓ SYSTEM VERIFIED & SECURITY STAMPED', 350, 720);

            // Official Disclaimer Notice Box
            ctx.fillStyle = '#FEF2F2';
            ctx.strokeStyle = '#FCA5A5';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(70, 745, 560, 68, 14);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#991B1B';
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText('DISCLAIMER: NOT VALID FOR OFFICIAL TRANSACTIONS', 350, 767);
            ctx.font = '10px sans-serif';
            ctx.fillStyle = '#7F1D1D';
            ctx.fillText('This digital ID card cannot be used for any official financial or academic transaction.', 350, 784);
            ctx.fillText('If lost or compromised, please contact system administration immediately.', 350, 799);

            // Loss Contact Notice Footer
            ctx.fillStyle = '#64748B';
            ctx.font = '11px sans-serif';
            ctx.fillText('Notice: If lost or found, please contact the system administration or OSAS.', 350, 955);

            ctx.fillStyle = '#94A3B8';
            ctx.font = '10px sans-serif';
            ctx.fillText(`Generated on ${new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}`, 350, 975);

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
      };

      logoImg.onload = finishExport;
      logoImg.onerror = finishExport;
      // In case image is already cached or fails immediately
      if (logoImg.complete) {
        finishExport();
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
            {qrToken && expiresAt > Date.now() ? <QRCode
              value={qrToken}
              size={170}
              fgColor="#0E1B42"
              level="H"
              className="h-auto w-full"
            /> : <p role="status">{qrError || 'Generating secure QR…'}</p>}
          </div>

          {/* Download Action Button */}
          <Button
            aria-label="Download card as PNG"
            onClick={handleDownloadPNG}
            disabled={downloading || !qrToken || expiresAt <= Date.now()}
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
                <p className="text-[9px] text-emerald-700 font-medium [overflow-wrap:anywhere] dark:text-emerald-300">Refreshes automatically. This QR expires at {expiresAt ? new Date(expiresAt).toLocaleTimeString() : '—'}. Downloaded copies expire at the same time.</p>
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
