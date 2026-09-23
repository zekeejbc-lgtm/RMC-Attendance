import { toast } from '../lib/toast';
import React, { useEffect, useRef, useState } from 'react';
import { appData } from '../lib/backend';
import QRCode from 'react-qr-code';
import { useAuth } from '../components/AuthContext';
import { ShieldCheck, Info, Download, Sparkles, CheckCircle2, RefreshCw } from 'lucide-react';
import Button from '../components/ui/Button';
import { Page, PageHeader, Surface } from '../components/ui/Page';

const StudentQR: React.FC = () => {
  const { profile } = useAuth();
  const qrWrapperRef = useRef<HTMLDivElement>(null);
  const printQrWrapperRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [qrToken, setQrToken] = useState('');
  const [expiresAt, setExpiresAt] = useState(0);
  const [qrError, setQrError] = useState('');
  const [printQrToken, setPrintQrToken] = useState('');
  const [printQrError, setPrintQrError] = useState('');
  const [refreshingPrintQr, setRefreshingPrintQr] = useState(false);
  useEffect(() => {
    let active = true;
    const renewLiveQr = async () => {
      try {
        const result = await appData.issueQr();
        if (active) { setQrToken(result.token); setExpiresAt(result.expiresAt); setQrError(''); }
      } catch (error) { if (active) { setQrToken(''); setQrError(error instanceof Error ? error.message : 'QR unavailable.'); } }
    };
    const loadPrintQr = async () => {
      try {
        const result = await appData.getPrintQr();
        if (active) { setPrintQrToken(result.token); setPrintQrError(''); }
      } catch (error) { if (active) { setPrintQrToken(''); setPrintQrError(error instanceof Error ? error.message : 'Printed QR unavailable.'); } }
    };
    void renewLiveQr();
    void loadPrintQr();
    const timer = setInterval(renewLiveQr, 45000);
    return () => { active = false; clearInterval(timer); };
  }, [profile?.uid]);

  if (!profile) return null;

  const handleRefreshPrintQr = async (checked: boolean) => {
    if (!checked || refreshingPrintQr) return;
    setRefreshingPrintQr(true);
    try {
      const result = await appData.refreshPrintQr();
      setPrintQrToken(result.token);
      setPrintQrError('');
      toast.success('Printed QR replaced. Download a new card.');
    } catch (error) {
      setPrintQrError(error instanceof Error ? error.message : 'Printed QR unavailable.');
      toast.error(error);
    } finally {
      setRefreshingPrintQr(false);
    }
  };

  const handleDownloadPNG = () => {
    const toastId = toast.progress('Preparing QR download...');
    const failed = (error: unknown) => { toast.error(error, toastId); setDownloading(false); };
    setDownloading(true);
    setDownloadSuccess(false);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');

      // Export at a print-friendly 3:4 ratio so the QR stays crisp when shared or printed.
      canvas.width = 900;
      canvas.height = 1280;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const cardX = 36;
      const cardY = 36;
      const cardW = 828;
      const cardH = 1208;
      const cardBottom = cardY + cardH;
      const navy = '#0E1B42';
      const ink = '#14213D';
      const muted = '#64748B';
      const gold = '#D4AF37';
      const border = '#DCE4EF';
      const green = '#059669';
      const school = profile.school_data;
      const department = school.department || school.program || school.track || school.strand || 'General studies';
      const assignment = [school.level, school.section].filter(Boolean).join(' | ') || 'N/A';

      const rounded = (x: number, y: number, w: number, h: number, radius: number, fill?: string, stroke?: string) => {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, radius);
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
      };
      const fitFont = (value: string, maxWidth: number, weight: number, maxSize: number, minSize = 14) => {
        let size = maxSize;
        while (size > minSize) {
          ctx.font = `${weight} ${size}px Arial, sans-serif`;
          if (ctx.measureText(value).width <= maxWidth) break;
          size -= 1;
        }
        return size;
      };
      const drawCentered = (value: string, x: number, y: number, maxWidth: number, weight: number, maxSize: number, color: string, minSize = 10) => {
        const size = fitFont(value, maxWidth, weight, maxSize, minSize);
        ctx.font = `${weight} ${size}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = color;
        ctx.fillText(value, x, y);
      };

      // Soft page background and a raised white card.
      ctx.fillStyle = '#EEF2F7';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.shadowColor = 'rgba(15, 23, 42, 0.20)';
      ctx.shadowBlur = 34;
      ctx.shadowOffsetY = 16;
      rounded(cardX, cardY, cardW, cardH, 34, '#FFFFFF');
      ctx.restore();
      rounded(cardX, cardY, cardW, cardH, 34, undefined, border);

      // Branded header with a subtle security pattern.
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, 250, [34, 34, 0, 0]);
      ctx.clip();
      ctx.fillStyle = navy;
      ctx.fillRect(cardX, cardY, cardW, 250);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 2;
      for (let i = -250; i < cardW + 250; i += 34) {
        ctx.beginPath();
        ctx.moveTo(cardX + i, cardY);
        ctx.lineTo(cardX + i + 250, cardY + 250);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(212,175,55,0.10)';
      ctx.beginPath();
      ctx.arc(cardX + cardW - 12, cardY + 26, 150, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = gold;
      ctx.fillRect(cardX, cardY + 250, cardW, 7);

      let roleLabel = 'STUDENT';
      let roleBgColor = '#2563EB';
      const userRole = profile.role;
      if (userRole === 'ssg') { roleLabel = 'SSG OFFICER'; roleBgColor = '#16A34A'; }
      else if (userRole === 'ossa' || userRole === 'ossa_staff') { roleLabel = 'OSAS OFFICER'; roleBgColor = '#EA580C'; }
      else if (userRole === 'mayor') { roleLabel = 'STUDENT (SECTION MAYOR)'; }
      else if (userRole === 'admin') { roleLabel = 'SYSTEM ADMINISTRATOR'; roleBgColor = '#475569'; }

      // Header copy is drawn before the remote seal so a missing logo never leaves a blank header.
      ctx.textAlign = 'left';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 25px Arial, sans-serif';
      ctx.fillText('INSTITUTION ATTENDANCE', cardX + 188, cardY + 108);
      ctx.fillText('& RECORDS', cardX + 188, cardY + 140);
      ctx.fillStyle = gold;
      ctx.font = '700 16px Arial, sans-serif';
      ctx.fillText('OFFICIAL DIGITAL PASSPORT', cardX + 188, cardY + 176);
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      ctx.font = '600 11px Arial, sans-serif';
      ctx.fillText('IARS  |  SECURE DIGITAL IDENTITY', cardX + 188, cardY + 199);

      const centerX = cardX + cardW / 2;
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.src = 'https://i.imgur.com/K3T5yIT.jpeg';

      // Identity section is intentionally compact, leaving the QR as the visual focus.
      drawCentered(profile.name.toUpperCase(), centerX, cardY + 324, cardW - 100, 900, 30, ink, 18);
      drawCentered(`ID  ${profile.student_id}`, centerX, cardY + 358, 500, 700, 15, muted, 12);
      ctx.font = '800 12px Arial, sans-serif';
      const roleWidth = Math.max(164, ctx.measureText(roleLabel).width + 48);
      rounded(centerX - roleWidth / 2, cardY + 380, roleWidth, 34, 17, roleBgColor);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText(roleLabel, centerX, cardY + 402);

      const infoY = cardY + 452;
      rounded(cardX + 56, infoY, 342, 96, 18, '#F7F9FC', border);
      rounded(cardX + 430, infoY, 342, 96, 18, '#F7F9FC', border);
      ctx.textAlign = 'left';
      ctx.fillStyle = muted;
      ctx.font = '800 10px Arial, sans-serif';
      ctx.fillText('PROGRAM / DEPARTMENT', cardX + 82, infoY + 30);
      ctx.fillText('YEAR & SECTION', cardX + 456, infoY + 30);
      drawCentered(department.toUpperCase(), cardX + 227, infoY + 66, 290, 800, 16, ink, 11);
      drawCentered(assignment.toUpperCase(), cardX + 601, infoY + 66, 290, 800, 16, ink, 11);

      const drawQrAndDownload = () => {
        const svgElement = printQrWrapperRef.current?.querySelector('svg');
        if (!svgElement) { failed(new Error('QR image unavailable')); return; }
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const qrImage = new Image();
        qrImage.src = 'data:image/svg+xml;base64,' + btoa(svgData);
        qrImage.onload = () => {
          try {
            const qrFrameX = centerX - 205;
            const qrFrameY = cardY + 570;
            rounded(qrFrameX, qrFrameY, 410, 410, 26, '#FFFFFF', border);
            rounded(qrFrameX + 15, qrFrameY + 15, 380, 380, 20, '#F8FAFC');
            ctx.drawImage(qrImage, qrFrameX + 40, qrFrameY + 40, 330, 330);
            drawCentered('SCAN FOR EVENT & CEREMONY CHECK-IN', centerX, cardY + 1004, 700, 800, 16, ink, 11);
            drawCentered('PRINTED QR  |  VALID UNTIL REPLACED', centerX, cardY + 1032, 700, 800, 12, green, 10);

            drawCentered('IF LOST, USE REPLACE BEFORE DOWNLOADING A NEW CARD', centerX, cardY + 1096, 700, 800, 12, muted, 10);
            rounded(cardX + 56, cardY + 1110, cardW - 112, 54, 16, '#FFF7ED', '#FED7AA');
            ctx.textAlign = 'center';
            ctx.fillStyle = '#9A3412';
            ctx.font = '800 11px Arial, sans-serif';
            ctx.fillText('DIGITAL ACCESS CARD  |  NOT VALID FOR FINANCIAL OR ACADEMIC TRANSACTIONS', centerX, cardY + 1132);
            ctx.fillStyle = '#C2410C';
            ctx.font = '500 9px Arial, sans-serif';
            ctx.fillText('If lost or compromised, replace the printed QR before using a new card.', centerX, cardY + 1148);

            ctx.fillStyle = muted;
            ctx.font = '500 10px Arial, sans-serif';
            ctx.fillText('IARS  |  Keep this card available during active attendance scanning', centerX, cardBottom - 22);
            ctx.fillStyle = '#94A3B8';
            ctx.font = '500 9px Arial, sans-serif';
            ctx.fillText(`Generated ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`, centerX, cardBottom - 8);

            const link = document.createElement('a');
            link.download = `RMC_Student_QR_${profile.student_id}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            toast.success('QR download started', toastId);
            setDownloading(false);
            setDownloadSuccess(true);
            setTimeout(() => setDownloadSuccess(false), 3000);
          } catch (error) { failed(error); }
        };
        qrImage.onerror = () => failed(new Error('QR image could not be rendered'));
      };

      let logoRendered = false;
      const drawLogoAndContinue = () => {
        if (logoRendered) return;
        logoRendered = true;
        if (logoImg.complete && logoImg.naturalWidth > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(cardX + 112, cardY + 126, 66, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(logoImg, cardX + 46, cardY + 60, 132, 132);
          ctx.restore();
        } else {
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(cardX + 112, cardY + 126, 66, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = navy;
          ctx.font = '900 24px Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('IARS', cardX + 112, cardY + 134);
        }
        ctx.strokeStyle = gold;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cardX + 112, cardY + 126, 67, 0, Math.PI * 2);
        ctx.stroke();
        drawQrAndDownload();
      };

      logoImg.onload = drawLogoAndContinue;
      logoImg.onerror = drawLogoAndContinue;
      if (logoImg.complete) drawLogoAndContinue();
    } catch (error) {
      failed(error);
      console.error('PNG export error', error);
      setDownloading(false);
    }
  };
  return (
    <Page className="max-w-lg animate-in zoom-in duration-200">
      <PageHeader
        className="justify-center text-center"
        eyebrow={<span className="inline-flex items-center gap-1.5"><Sparkles size={12} /> Digital Access Card</span>}
        title="Student QR Passport"
        description="Use the live QR for quick check-in, or download a permanent printed ID card."
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
          <p className="text-gold-300 text-[9px] font-semibold uppercase tracking-widest mt-0.5">IARS | Student ID Card</p>
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
            /> : <p role="status">{qrError || 'Generating live QR...'}</p>}
          </div>

          {/* The printed card uses a separate persistent QR token. Keep its SVG out of the live preview. */}
          <div ref={printQrWrapperRef} aria-hidden="true" className="pointer-events-none absolute left-[-10000px] top-0 h-60 w-60 opacity-0">
            {printQrToken ? <QRCode value={printQrToken} size={240} fgColor="#0E1B42" level="H" /> : null}
          </div>

          {/* Download Action Button */}
          <Button
            aria-label="Download card as PNG"
            onClick={handleDownloadPNG}
            disabled={downloading || !printQrToken}
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
                <span>Download permanent ID</span>
              </>
            )}
          </Button>

          {/* Manual rotation for a lost or compromised printed card. */}
          <div className="mt-4 w-full rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/30">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 text-left">
                <p className="text-[11px] font-bold text-amber-950 dark:text-amber-100">Printed ID QR</p>
                <p className="text-[9px] leading-relaxed text-amber-800 dark:text-amber-200">Stays valid until you replace it. Re-download the card after rotating.</p>
              </div>
              <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-amber-900 dark:text-amber-100">
                <input
                  type="checkbox"
                  role="switch"
                  className="peer sr-only"
                  checked={refreshingPrintQr}
                  disabled={refreshingPrintQr || !printQrToken}
                  onChange={(event) => { void handleRefreshPrintQr(event.target.checked); }}
                  aria-label="Replace printed QR"
                />
                <span aria-hidden="true" className="relative h-6 w-11 rounded-full bg-amber-200 transition-colors peer-checked:bg-amber-600 peer-checked:[&>span]:translate-x-5 peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-gold-500 peer-disabled:opacity-60 dark:bg-amber-900">
                  <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform" />
                </span>
                <RefreshCw size={13} className={refreshingPrintQr ? 'animate-spin' : ''} aria-hidden="true" />
                <span>{refreshingPrintQr ? 'Replacing...' : 'Replace'}</span>
              </label>
            </div>
            {printQrError ? <p className="mt-2 text-[10px] font-medium text-red-700 dark:text-red-300">{printQrError}</p> : null}
          </div>

          {/* Live QR status */}
          <div className="mt-4 flex w-full items-center gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/50">
             <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs">
                <ShieldCheck size={15} />
             </div>
             <div className="min-w-0 text-left">
                <p className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200">Live web QR</p>
                <p className="text-[9px] text-emerald-700 font-medium [overflow-wrap:anywhere] dark:text-emerald-300">Refreshes automatically every 45 seconds and is separate from your permanent printed ID QR.</p>
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
