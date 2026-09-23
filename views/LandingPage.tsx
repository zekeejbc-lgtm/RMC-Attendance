import { toast } from '../lib/toast';
import { supabase } from '../lib/supabase';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { useTheme } from '../components/ThemeContext';
import ThemeToggle from '../components/ui/ThemeToggle';
import { appAuth, appData, refreshData, lookupEnrollment, EnrollmentLookup } from '../lib/backend';
import { TEST_ACCOUNTS } from '../lib/seed';
import { SchoolNode } from '../types';
import Button from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Collapsible } from '../components/ui/Collapsible';
import { AcademicPathPicker } from '../components/academic/AcademicPathPicker';
import { serializeAcademicAssignment, findNodePath } from '../lib/academicDirectory';
import PasswordStrengthMeter from '../components/ui/PasswordStrengthMeter';
import { createDriveImage, deleteDriveImage, fileAsDataUrl, validateProfileImage } from '../lib/googleDrive';
import { enrollmentUsername, validEmergencyPhone, validStudentId } from '../lib/enrollment';
import { 
  ArrowRight, Shield, Target, Users, 
  MapPin, Mail, Phone, Facebook, Instagram,
  Globe, X, Eye, EyeOff, Loader2,
  ShieldAlert, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Copy, Check, ExternalLink,
  UserCircle, Camera, CreditCard, Calendar, KeyRound,
  FileText, QrCode, ShieldCheck, Clock, FileCheck2, BarChart3, UserCheck, Smartphone, CheckCircle2, Layers, Lock, Zap, Building2, GraduationCap
} from 'lucide-react';

interface LandingPageProps {
  defaultOpenLogin?: boolean;
  defaultOpenRegister?: boolean;
}

const LandingPage: React.FC<LandingPageProps> = ({ defaultOpenLogin = false, defaultOpenRegister = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMock, user, profile, revision, loading } = useAuth();
  
  // --- UI STATE ---
  const [scrolled, setScrolled] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';
  
  // Modals
  const [showLoginModal, setShowLoginModal] = useState(defaultOpenLogin);
  const [showRegisterModal, setShowRegisterModal] = useState(defaultOpenRegister);
  const [selectedFeature, setSelectedFeature] = useState<any>(null);

  // Login Logic State
  const [identifier, setIdentifier] = useState(''); 
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [lookupId, setLookupId] = useState('');
  const [lookupResult, setLookupResult] = useState<EnrollmentLookup | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [showLookupModal, setShowLookupModal] = useState(false);

  // Register Logic State
  const [regStep, setRegStep] = useState(1);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [checkingEnrollment, setCheckingEnrollment] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [savedPhotoUrl, setSavedPhotoUrl] = useState('');
  const [readingPhoto, setReadingPhoto] = useState(false);
  const [regError, setRegError] = useState('');
  const [structure, setStructure] = useState<SchoolNode[]>([]);
  const [academicPath, setAcademicPath] = useState<SchoolNode[]>([]);
  const [securityKey, setSecurityKey] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const [regData, setRegData] = useState({
    name: '', username: '', email: '', password: '', confirmPassword: '', student_id: '',
    guardianName: '', guardianPhone: '', profilePic: '', idFront: '', idBack: ''
  });

  // --- EFFECTS ---
  useEffect(() => {
    if (defaultOpenLogin) setShowLoginModal(true);
    if (defaultOpenRegister) setShowRegisterModal(true);
  }, [defaultOpenLogin, defaultOpenRegister]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    if (!loading && user && !defaultOpenRegister && !showRegisterModal) {
      if (profile?.role === 'ossa' || profile?.role === 'ossa_staff') {
        navigate('/ossa/dashboard');
      } else {
        navigate('/dashboard');
      }
    }
  }, [loading, user, profile, navigate, defaultOpenRegister, showRegisterModal]);

  useEffect(() => {
    setStructure(appData.getSchoolStructure());
    setShowTestPanel(import.meta.env.DEV && import.meta.env.VITE_SHOW_TEST_ACCOUNTS === 'true');
  }, [revision]);

  useEffect(() => {
    if (!showRegisterModal || structure.length > 0) return;
    void refreshData().catch(() => {
      // AuthContext reports connection errors; keep the modal usable while it retries.
    });
  }, [showRegisterModal, structure.length]);

  const hydratedApplication = useRef<string | null>(null);
  useEffect(() => {
    if (!defaultOpenRegister || !user || hydratedApplication.current === user.uid) return;
    const application = appData.getApplications().find(a => a.id === user.uid && ['rejected', 'bounced', 'deleted'].includes(a.status));
    if (!application) return;
    const saved = application.form_data;
    setSavedPhotoUrl(application.documents?.photo?.startsWith('https://drive.google.com/') ? application.documents.photo : saved.photo_url || '');
    setRegData(current => ({ ...current, name: saved.name, username: saved.username, email: saved.email, student_id: saved.student_id, guardianName: saved.guardian?.name || '', guardianPhone: saved.guardian?.contact || '' }));
    const terminalId = saved.school_data.academic_assignment?.terminalGroupId;
    if (terminalId) setAcademicPath(findNodePath(appData.getSchoolStructure(), terminalId) || []);
    hydratedApplication.current = user.uid;
  }, [user, revision, defaultOpenRegister]);

  // --- HANDLERS ---
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  // Login Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setLoginError('');
    try {
      if (identifier.trim().includes('@')) throw new Error('Use the username you submitted during registration to sign in.');
      await appAuth.signIn(identifier, password);
      const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;
      navigate(returnTo || '/dashboard', { replace: true, state: null });
    } catch (err: any) {
      setLoginError(err.message || 'Failed to sign in.');
      setIsLoggingIn(false);
    }
  };

  const quickLogin = (usr: string) => {
    setIdentifier(usr);
    setPassword('');
    setLoginError('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  // Register Handlers
  const enrollmentPerson = () => ({
    name: regData.name.trim(), username: enrollmentUsername(regData.username, regData.student_id),
    email: regData.email.trim().toLowerCase(), student_id: regData.student_id.trim(),
    guardian: { name: regData.guardianName.trim(), contact: regData.guardianPhone.trim() },
    photo_url: savedPhotoUrl,
    school_data: { academic_assignment: { terminalGroupId: academicPath.at(-1)?.id } },
  } as any);

  const selectEnrollmentPhoto = async (file?: File) => {
    if (!file) return;
    setReadingPhoto(true); setRegError('');
    setPhotoFile(null); setPhotoPreview(''); setSavedPhotoUrl('');
    try {
      validateProfileImage(file);
      const preview = await fileAsDataUrl(file);
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => img.naturalWidth && img.naturalHeight ? resolve() : reject(new Error('Choose a readable image.'));
        img.onerror = () => reject(new Error('This file is not a readable image. Choose another photo.'));
        img.src = preview;
      });
      setPhotoFile(file); setPhotoPreview(preview);
    } catch (error) { setRegError(error instanceof Error ? error.message : 'Unable to read the photo.'); }
    finally { setReadingPhoto(false); }
  };

  const resendConfirmation = async () => {
    if (!identifier.includes('@') || resendingConfirmation) return;
    setResendingConfirmation(true);
    try { await appAuth.resendConfirmation(identifier); setLoginError('Confirmation email sent. Check your inbox and spam folder.'); }
    catch (error) { console.error('[Auth] resend confirmation failed', error); setLoginError(error instanceof Error ? error.message : 'Unable to resend confirmation email.'); }
    finally { setResendingConfirmation(false); }
  };

  const handleEnrollmentLookup = async (event: React.FormEvent) => {
    event.preventDefault();
    setLookupError(''); setLookupResult(null);
    if (!validStudentId(lookupId)) { setLookupError('Use Student ID format YYYY-NNNNN, for example 2025-00046.'); return; }
    setLookingUp(true);
    try { setLookupResult(await lookupEnrollment(lookupId)); }
    catch (error) { setLookupError(error instanceof Error && error.message ? error.message : 'Unable to check enrollment status.'); }
    finally { setLookingUp(false); }
  };

  const terminal = academicPath[academicPath.length - 1];
  const isMayorRegistered = terminal && ['section', 'block'].includes(terminal.type)
    ? appData.isMayorRegisteredForSection(terminal.id, terminal.name)
    : false;

  useEffect(() => {
    setSecurityKey('');
  }, [terminal?.id]);

  const handleRegisterSubmit = async () => {
    if (isRegistering) return;
    setRegError('');
    const terminalNode = academicPath[academicPath.length - 1];
    if (!terminalNode || !['section', 'block'].includes(terminalNode.type)) return;
    if (!user && regData.password !== regData.confirmPassword) {
      setRegError('Passwords do not match.');
      return;
    }
    if (terminalNode && appData.isMayorRegisteredForSection(terminalNode.id, terminalNode.name)) {
      if (appData.isMayorRegisteredForSection(terminalNode.id, terminalNode.name) && !securityKey.trim()) {
        setRegError('Section Enrollment Security Key is required for enrollment into this section.');
        return;
      }

    }
    setIsRegistering(true);
    const uid = '';
    const serialized = serializeAcademicAssignment(academicPath);
    const profile: any = {
      uid,
      name: regData.name.trim(),
      username: regData.username.trim().toLowerCase() || `student_${regData.student_id.trim().replace(/[^a-zA-Z0-9_.-]/g, '_')}`.toLowerCase().slice(0, 100),
      email: regData.email.trim().toLowerCase(),
      student_id: regData.student_id.trim(),
      role: 'student',
      guardian: { name: regData.guardianName, contact: regData.guardianPhone },
      photo_url: '',
      school_data: { ...serialized.schoolData, school_id: serialized.assignment.campusId, academic_assignment: serialized.assignment }
    };

    let uploadedDriveId = '';
    try {
      if (!validStudentId(regData.student_id)) throw new Error('Use Student ID format YYYY-NNNNN, for example 2025-00046.');
      if (regData.guardianName.trim().length < 2 || !validEmergencyPhone(regData.guardianPhone)) throw new Error('Enter the emergency contact’s full name and a valid mobile number.');
      if (!photoFile && !savedPhotoUrl) throw new Error('Choose a profile picture before registering.');
      let photoUrl = savedPhotoUrl;
      if (!photoUrl && photoFile) {
        const uploaded = await createDriveImage(photoFile, profile.name, profile.student_id);
        uploadedDriveId = uploaded.id;
        photoUrl = uploaded.url;
        setSavedPhotoUrl(photoUrl);
      }
      profile.photo_url = photoUrl;
      // Validate the exact payload that the signup trigger will receive. This
      // turns a generic Auth "database error" into a useful field message and
      // prevents uploading an image that can never be attached to an account.
      await appData.validateEnrollment({ ...enrollmentPerson(), photo_url: photoUrl }, securityKey.trim(), 4);
      const result = await appData.submitApplication(profile, regData.password, securityKey.trim());
      setNeedsEmailConfirmation(result.needsEmailConfirmation);
      setIsRegistering(false);
      setRegSuccess(true);
    } catch (submissionError) {
      if (uploadedDriveId) {
        try { await deleteDriveImage(uploadedDriveId); } catch { /* keep the original error */ }
      }
      setIsRegistering(false);
      setRegError(submissionError instanceof Error ? submissionError.message : 'Unable to submit the application.');
      setIsRegistering(false);
    }
  };

  // --- DATA FOR IARS FEATURES & MODULES ---
  const systemFeatures = [
    {
      icon: QrCode,
      title: "Dynamic Student QR Badges",
      desc: "Short-lived QR passes are validated by the server and expire automatically.",
      tag: "Server-verified QR passes",
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/20"
    },
    {
      icon: MapPin,
      title: "Geofenced Check-In Perimeter",
      desc: "The scanner location is checked against the event boundary before each attendance record is saved.",
      tag: "Precision Location Guard",
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-900/20"
    },
    {
      icon: ShieldCheck,
      title: "Automated Sanction Engine",
      desc: "Automatic calculation of tardiness penalties, unexcused absence hours, and community service resolution tracking.",
      tag: "Rule-Based Logic",
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-900/20"
    },
    {
      icon: FileCheck2,
      title: "Digital Excuse Letter Portal",
      desc: "Seamless excuse filing with supporting document uploads, routed directly to the Prefect of Discipline for approval.",
      tag: "Paperless Approval",
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-900/20"
    },
    {
      icon: Building2,
      title: "Academic Hierarchy Engine",
      desc: "Configurable organizational structure covering Colleges, Senior High, Junior High, Programs, and Section Mayors.",
      tag: "Multi-Tier Structure",
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-50 dark:bg-indigo-900/20"
    },
    {
      icon: BarChart3,
      title: "Audit & Analytics Dashboard",
      desc: "Comprehensive attendance stats, printable master lists, exportable reports, and real-time ceremony headcount.",
      tag: "Institutional Compliance",
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-900/20"
    }
  ];

  const systemModules = [
    {
      role: "Student Portal",
      icon: UserCheck,
      desc: "Personalized portal to display digital QR pass, view ceremony schedules, track attendance rate, and submit excuse letters.",
      highlights: ["Live Dynamic QR Badge", "Ceremony Schedule & Map", "Sanction Hours Ledger", "Exemption Request Tracking"]
    },
    {
      role: "Section Mayor Scanner",
      icon: Smartphone,
      desc: "Mobile-optimized scanning interface for class mayors to record section attendance during assemblies with confirmation receipts.",
      highlights: ["Camera QR Reader", "Server-Confirmed Attendance", "Real-Time Headcount", "Manual ID Fallback Search"]
    },
    {
      role: "SSG & Discipline Panel",
      icon: Shield,
      desc: "Centralized administration for managing institutional events, reviewing excuse files, and assigning community service.",
      highlights: ["Campus Event Creation", "Excuse Approval Workflow", "Sanction Ledger Management", "Export Master Reports"]
    },
    {
      role: "Academic Structure Manager",
      icon: Layers,
      desc: "Dynamic management of departments, programs, year levels, sections, and officer assignment across the entire institution.",
      highlights: ["College & High School Units", "Officer Role Assignments", "Student Roster Tree", "Bulk Import / Export"]
    }
  ];

  const workflowSteps = [
    {
      step: "01",
      title: "Student Presents Digital QR Pass",
      desc: "Student opens the IARS portal on mobile to generate their short-lived, server-verified student QR pass."
    },
    {
      step: "02",
      title: "Geofenced Verification & Scan",
      desc: "Section Mayor or SSG Officer scans the pass using the mobile scanner while inside the verified location perimeter."
    },
    {
      step: "03",
      title: "Automated Records & Sanctions",
      desc: "System instantly logs attendance status (Present, Late, Absent), recalculates metrics, and updates disciplinary records."
    }
  ];

  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || '';
  const supportPhone = import.meta.env.VITE_SUPPORT_PHONE || '';
  const campusName = import.meta.env.VITE_CAMPUS_NAME || '';
  const campusMap = import.meta.env.VITE_CAMPUS_MAP_URL || '';
  const contactLinks = [
    ...(supportEmail ? [{ icon: Mail, label: 'System Support', value: supportEmail, action: () => window.open(`mailto:${supportEmail}`), color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' }] : []),
    ...(supportPhone ? [{ icon: Phone, label: 'Registrar / SSG Office', value: supportPhone, action: () => window.open(`tel:${supportPhone}`), color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' }] : []),
    ...(campusName && campusMap.startsWith('https://') ? [{ icon: MapPin, label: 'Main Campus', value: campusName, action: () => window.open(campusMap, '_blank', 'noopener,noreferrer'), color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' }] : []),
  ];

  return (
    <div className={`min-h-dvh overflow-x-hidden font-inter transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* NAVBAR */}
      <nav className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${scrolled ? 'bg-white/85 dark:bg-slate-900/85 backdrop-blur-md shadow-sm py-4 border-b border-slate-200/50 dark:border-slate-800/50' : 'bg-transparent py-6'}`}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 sm:flex-nowrap sm:px-6">
          <div className="flex min-w-0 items-center gap-2 cursor-pointer sm:gap-3" onClick={() => scrollTo('home')}>
             <img 
               src="https://i.imgur.com/K3T5yIT.jpeg" 
               alt="IARS Academic Seal" 
               className="w-10 h-10 rounded-full object-cover shadow-lg ring-2 ring-gold-400/50 hover:scale-105 transition-transform shrink-0" 
             />
             <div className="min-w-0">
                <h1 className="font-black uppercase tracking-tighter leading-none text-brand-900 dark:text-white text-base">IARS</h1>
                <p className="hidden text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 sm:block">Attendance & Records System</p>
             </div>
          </div>
          
          <div className="hidden md:flex items-center gap-8 bg-white/60 dark:bg-slate-800/60 px-8 py-3 rounded-full border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-sm shadow-sm">
             {[
               { id: 'home', label: 'Home' },
               { id: 'features', label: 'Features' },
               { id: 'modules', label: 'Modules' },
               { id: 'workflow', label: 'Workflow' },
               { id: 'security', label: 'Security' }
             ].map(item => (
               <button 
                 key={item.id} 
                 onClick={() => scrollTo(item.id)}
                 className="text-[11px] font-bold uppercase tracking-widest text-brand-900 dark:text-slate-200 hover:text-gold-600 dark:hover:text-gold-400 transition-colors"
               >
                 {item.label}
               </button>
             ))}
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
             <ThemeToggle />
             <button onClick={() => setShowLoginModal(true)} className="px-3 py-2.5 bg-brand-900 dark:bg-gold-500 text-white dark:text-brand-950 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-800 dark:hover:bg-gold-400 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 sm:px-6">
                Log In
             </button>
          </div>
        </div>
      </nav>

      {/* --- MODALS --- */}

      {/* LOGIN MODAL */}
      <Modal
        open={showLoginModal}
        onClose={() => { setShowLoginModal(false); if (defaultOpenLogin) navigate('/'); }}
        size="md"
        title="Portal Login"
        description="Enter your credentials to connect to your academic workspace"
      >
           <div className="min-w-0">
              <div className="flex flex-col justify-between">
                <div>
                   {loginError && (
                     <div className="mb-4 sm:mb-5 p-3.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-2xl border border-red-200 dark:border-red-800 flex items-center gap-3 text-xs font-bold uppercase animate-in shake">
                       <ShieldAlert size={18} className="shrink-0" /> 
                       <span>{loginError}</span>
                     </div>
                   )}
                   {loginError && /confirm|verification/i.test(loginError) && identifier.includes('@') && (
                     <button type="button" onClick={() => void resendConfirmation()} disabled={resendingConfirmation} className="mb-4 text-xs font-bold text-brand-700 underline dark:text-gold-400">
                       {resendingConfirmation ? 'Sending confirmation email…' : 'Resend confirmation email'}
                     </button>
                   )}

                   <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-1.5">
                        <label htmlFor="landing-login-identifier" className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Username</label>
                        <div className="relative">
                          <UserCircle size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                          <input
                            id="landing-login-identifier"
                            aria-label="Username"
                            type="text"
                           required
                           value={identifier}
                           onChange={(e) => setIdentifier(e.target.value)}
                           className="w-full py-3.5 pl-12 pr-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 focus:outline-none transition-all font-bold text-base text-brand-900 dark:text-white"
                           placeholder="Your submitted username"
                         />
                       </div>
                     </div>

                     <div className="space-y-1.5">
                       <label htmlFor="landing-login-password" className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Password</label>
                       <div className="relative">
                         <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                         <input
                           id="landing-login-password"
                           aria-label="Password"
                           type={showPassword ? "text" : "password"}
                           required
                           value={password}
                           onChange={(e) => setPassword(e.target.value)}
                           className="w-full py-3.5 pl-12 pr-12 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 focus:outline-none transition-all font-bold text-base text-brand-900 dark:text-white"
                           placeholder="••••••••"
                         />
                         <button 
                           aria-label={showPassword ? 'Hide password' : 'Show password'}
                           type="button" 
                           onClick={() => setShowPassword(!showPassword)} 
                           className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-900 dark:hover:text-gold-400 transition-colors p-1"
                         >
                           {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                         </button>
                       </div>
                     </div>

                     <Button type="submit" disabled={isLoggingIn} className="!rounded-2xl text-xs font-black uppercase tracking-widest py-4 mt-2 shadow-lg hover:shadow-xl transition-all">
                       {isLoggingIn ? <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={18}/> Logging in...</span> : 'Log In'}
                     </Button>
                     <button type="button" className="text-sm underline" onClick={async () => {
                       if (!identifier.includes('@')) { setLoginError('Enter your email address above, then choose Forgot password.'); return; }
                       const { error } = await toast.result(() => supabase.auth.resetPasswordForEmail(identifier.trim(), { redirectTo: window.location.origin }), 'Request password reset', 'Check your email for a reset link');
                       setLoginError(error ? error.message : 'Check your email for a password reset link.');
                     }}>Forgot password?</button>
                   </form>
                </div>

                <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-3.5">
                  <button 
                    onClick={() => { setShowLoginModal(false); setShowRegisterModal(true); }} 
                    className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-brand-900 dark:text-slate-200 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2"
                  >
                    <span>Register</span>
                    <ArrowRight size={14} />
                  </button>

                  {import.meta.env.DEV && import.meta.env.VITE_SHOW_TEST_ACCOUNTS === 'true' && (
                     <div className="space-y-2 pt-1">
                       <button 
                         aria-controls="landing-test-accounts"
                         aria-expanded={showTestPanel}
                         type="button"
                         onClick={() => setShowTestPanel(!showTestPanel)} 
                         className="w-full text-[10px] font-black text-gold-600 dark:text-gold-400 uppercase tracking-widest flex items-center justify-between p-2.5 rounded-xl bg-gold-50/60 dark:bg-gold-950/30 border border-gold-200/60 dark:border-gold-900/40 hover:bg-gold-100/60 transition-colors"
                       >
                         <span className="flex items-center gap-1.5"><Zap size={13}/> Tests</span>
                         <ChevronDown className="app-disclosure-chevron" size={14}/>
                       </button>

                       <Collapsible id="landing-test-accounts" open={showTestPanel} innerClassName="bg-slate-50 dark:bg-slate-800/90 rounded-2xl p-2.5 space-y-1.5 border border-slate-200 dark:border-slate-700">
                            <p className="text-[10px] text-slate-400 dark:text-slate-400 font-bold px-1 uppercase tracking-wider">Click to auto-fill test credentials:</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {TEST_ACCOUNTS.map((acc) => (
                                <button 
                                  key={acc.user} 
                                  type="button"
                                  onClick={() => quickLogin(acc.user)} 
                                  className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 hover:border-gold-400 border border-slate-200 dark:border-slate-700 rounded-xl transition-all text-left group"
                                >
                                  <div>
                                    <p className="text-xs font-bold text-brand-900 dark:text-slate-100 leading-tight">{acc.name}</p>
                                    <p className="text-[9px] font-black text-gold-600 dark:text-gold-400 uppercase tracking-wider">{acc.role}</p>
                                  </div>
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 group-hover:bg-gold-500 group-hover:text-brand-950 transition-colors">
                                    Fill
                                  </span>
                                </button>
                              ))}
                            </div>
                       </Collapsible>
                     </div>
                  )}
                </div>

              </div>
           </div>
      </Modal>

      {/* REGISTRATION MODAL */}
      <Modal
        open={showRegisterModal}
        onClose={() => { setShowRegisterModal(false); setRegSuccess(false); setRegStep(1); if (defaultOpenRegister) navigate('/'); }}
        size="xl"
        title={regSuccess ? "Enrollment Submitted" : "System Enrollment"}
        description={regSuccess ? "Application Submitted • Status Pending Review" : `Stage ${regStep} of 4 • Protocol`}
      >
        {regSuccess ? (
          <div className="space-y-5 text-center py-2 animate-in fade-in zoom-in-95">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-500 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Registration Submitted!</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">{needsEmailConfirmation ? `Check ${regData.email.trim()} (including spam) to confirm your address, then sign in to upload documents and track admission review.` : 'Your application has been saved. Open your application status to upload documents and track admission review.'}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-left space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Legal Name</span>
                <span className="font-bold text-slate-900 dark:text-white">{regData.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Student ID</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{regData.student_id}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Assigned Section</span>
                <span className="font-bold text-slate-900 dark:text-white">{academicPath[academicPath.length - 1]?.name || 'Assigned Section'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Status</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Pending Approval
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button variant="gold" className="!w-full !rounded-xl text-xs uppercase font-black tracking-widest" onClick={() => { setShowRegisterModal(false); setRegSuccess(false); setRegStep(1); navigate(needsEmailConfirmation ? '/login' : '/register/status'); }}>
                {needsEmailConfirmation ? 'Sign In After Confirmation' : 'View Application Status'}
              </Button>
              <Button variant="secondary" className="!w-full !rounded-xl text-xs uppercase font-black tracking-widest" onClick={() => { setShowRegisterModal(false); setRegSuccess(false); setRegStep(1); }}>
                Close
              </Button>
            </div>
          </div>
        ) : (
           <div className="space-y-5">
              {regStep === 1 && (
                 <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                     <p className="text-sm text-slate-500">Complete your account details, academic assignment, emergency contact, and profile picture.</p>

                    <div className="space-y-1">
                       <label htmlFor="landing-register-name" className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-300 ml-1">Legal Full Name</label>
                       <input id="landing-register-name" placeholder="Ex. Juan Dela Cruz" className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-base text-brand-900 dark:text-white focus:border-gold-400 focus:outline-none" value={regData.name} onChange={e => setRegData({...regData, name: e.target.value})} />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                       <div className="space-y-1">
                          <label htmlFor="landing-register-username" className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-300 ml-1">Username <span className="normal-case text-slate-400">(optional)</span></label>
                          <input id="landing-register-username" placeholder="3+ letters, numbers, dots or underscores" className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-base text-brand-900 dark:text-white focus:border-gold-400 focus:outline-none" value={regData.username} onChange={e => setRegData({...regData, username: e.target.value})} />
                       </div>
                       <div className="space-y-1">
                          <label htmlFor="landing-register-email" className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-300 ml-1">Email Address</label>
                          <input id="landing-register-email" placeholder="name@email.com" type="email" className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-base text-brand-900 dark:text-white focus:border-gold-400 focus:outline-none" value={regData.email} onChange={e => setRegData({...regData, email: e.target.value})} />
                       </div>
                    </div>

                    <div className="space-y-1">
                       <label htmlFor="landing-register-password" className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-300 ml-1">Password</label>
                       <div className="relative">
                         <input
                           id="landing-register-password"
                           placeholder="••••••••"
                           type={showRegPassword ? "text" : "password"}
                           className="w-full p-3.5 pr-12 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-base text-brand-900 dark:text-white focus:border-gold-400 focus:outline-none"
                           value={regData.password}
                           onChange={e => setRegData({...regData, password: e.target.value})}
                         />
                         <button 
                           aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                           type="button" 
                           onClick={() => setShowRegPassword(!showRegPassword)} 
                           className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-900 dark:hover:text-gold-400 transition-colors p-1"
                         >
                           {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                         </button>
                       </div>
                       <PasswordStrengthMeter password={regData.password} />
                    </div>

                    <div className="space-y-1">
                       <label htmlFor="landing-register-confirm-password" className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-300 ml-1">Confirm Password</label>
                       <div className="relative">
                         <input
                           id="landing-register-confirm-password"
                           placeholder="••••••••"
                           type={showRegConfirmPassword ? "text" : "password"}
                           className="w-full p-3.5 pr-12 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-base text-brand-900 dark:text-white focus:border-gold-400 focus:outline-none"
                           value={regData.confirmPassword}
                           onChange={e => setRegData({...regData, confirmPassword: e.target.value})}
                         />
                         <button 
                           aria-label={showRegConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                           type="button" 
                           onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)} 
                           className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-900 dark:hover:text-gold-400 transition-colors p-1"
                         >
                           {showRegConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                         </button>
                       </div>
                       {regData.confirmPassword && regData.password !== regData.confirmPassword && (
                         <p className="mt-1 text-[10px] font-bold text-red-500">Passwords do not match.</p>
                       )}
                       {regData.confirmPassword && regData.password === regData.confirmPassword && (
                         <p className="mt-1 text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                           <CheckCircle2 size={12} /> Passwords match.
                         </p>
                       )}
                    </div>
                 </div>
              )}

              {regStep === 2 && (
                 <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    <div className="space-y-1">
                       <label htmlFor="landing-register-student-id" className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-300 ml-1">Official Student ID #</label>
                       <input id="landing-register-student-id" required placeholder="2024-XXXXX" className="w-full min-w-0 p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-base text-brand-900 dark:text-white focus:border-gold-400 focus:outline-none" value={regData.student_id} onChange={e => setRegData({...regData, student_id: e.target.value})} />
                    </div>

                    <AcademicPathPicker roots={structure} value={academicPath.map((node) => node.id)} onChange={setAcademicPath} purpose="registration" />
                    {structure.length === 0 && <p role="status" className="text-sm text-amber-700 dark:text-amber-300">{loading ? 'Loading enrollment sections…' : 'Enrollment sections are not available yet. Ask your school administrator to set up the Academic Directory, then return to complete registration.'}</p>}

                    {terminal && appData.isMayorRegisteredForSection(terminal.id, terminal.name) && (
                      <div className="space-y-1.5 rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
                        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                          <KeyRound size={18} />
                          <label htmlFor="landing-register-security-key" className="text-xs font-black uppercase tracking-widest">
                            Section Enrollment Security Key <span className="text-red-500">*</span>
                          </label>
                        </div>
                        <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400">
                          Please enter the section enrollment security key for &ldquo;{terminal.name}&rdquo;. Request this key from your Class Mayor, SSG, or Section Officer.
                        </p>
                        <input
                          id="landing-register-security-key"
                          placeholder="Enter Section Security Key (e.g. SEC-XXXXX)"
                          className="w-full rounded-xl border border-amber-300 bg-white p-3.5 text-base font-bold text-brand-900 outline-none focus:border-amber-500 dark:border-amber-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                          value={securityKey}
                          onChange={(e) => setSecurityKey(e.target.value)}
                        />
                      </div>
                    )}

                    <p className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs font-medium text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
                      Your ID number and academic assignment will be verified against school records. ID image uploads are not needed.
                    </p>
                 </div>
              )}

              {regStep === 3 && (
                 <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800">
                       <Shield size={28} className="text-brand-900 dark:text-gold-400 shrink-0" />
                       <div>
                          <h4 className="text-xs font-black text-brand-900 dark:text-slate-100 uppercase">Emergency Contact — Required</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Provide a contact the school can reach in an emergency</p>
                       </div>
                    </div>
                    <div className="space-y-1">
                       <label htmlFor="landing-register-guardian-name" className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-300 ml-1">Guardian Name</label>
                       <input id="landing-register-guardian-name" required placeholder="Legal Full Name" className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-base text-brand-900 dark:text-white focus:border-gold-400 focus:outline-none" value={regData.guardianName} onChange={e => setRegData({...regData, guardianName: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                       <label htmlFor="landing-register-guardian-phone" className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-300 ml-1">Emergency Contact #</label>
                       <input id="landing-register-guardian-phone" required inputMode="tel" placeholder="+63 9XX XXX XXXX" className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-base text-brand-900 dark:text-white focus:border-gold-400 focus:outline-none" value={regData.guardianPhone} onChange={e => setRegData({...regData, guardianPhone: e.target.value})} />
                    </div>
                 </div>
              )}

              {regStep === 4 && (
                <section className="space-y-4">
                  <h3 className="font-bold">Profile picture — Required</h3>
                  <p className="text-sm text-slate-500">Choose a clear photo of yourself. JPG, PNG, or WebP, up to 5 MB. Your photo is saved through the school's Google Drive image service when you register.</p>
                  {(photoPreview || savedPhotoUrl) && <img src={photoPreview || savedPhotoUrl} alt="Profile picture preview" className="h-36 w-36 rounded-2xl object-cover" />}
                  <div className="space-y-2">
                    <label htmlFor="enrollment-photo" className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">Choose profile picture</label>
                    <input id="enrollment-photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={readingPhoto || isRegistering} className="sr-only" onChange={e => { void selectEnrollmentPhoto(e.target.files?.[0]); e.target.value = ''; }} />
                    <label
                      htmlFor="enrollment-photo"
                      className={`inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-3 text-sm font-black transition-colors ${readingPhoto || isRegistering ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800' : 'border-brand-200 bg-brand-50 text-brand-900 hover:border-gold-400 hover:bg-gold-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:border-gold-400'}`}
                    >
                      <Camera size={18} />
                      {readingPhoto ? 'Checking image…' : photoFile ? 'Choose a different photo' : 'Choose a profile photo'}
                    </label>
                    {photoFile && <p className="truncate text-xs font-semibold text-slate-500" title={photoFile.name}>{photoFile.name}</p>}
                  </div>
                  {readingPhoto && <p role="status">Checking image…</p>}
                </section>
              )}
              {regError && (
                <div role="alert" className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800 text-xs font-semibold">
                  {regError}
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:gap-4">
                 {regStep > 1 && (
                   <Button disabled={checkingEnrollment || isRegistering || readingPhoto} variant="secondary" aria-label="Previous registration phase" className="!w-full !rounded-xl sm:!w-16 sm:!p-0" onClick={() => { setRegError(''); setRegStep(regStep - 1); }}>
                     <ChevronLeft size={20} />
                   </Button>
                 )}
                  {regStep < 4 ? (
                    <Button disabled={checkingEnrollment} className="!rounded-xl text-xs uppercase font-black tracking-widest" onClick={async () => {
                      if (regStep === 1 && !regData.name.trim()) {
                        setRegError('Enter your full name.');
                        return;
                      }
                      if (regStep === 1 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regData.email.trim())) {
                        setRegError('Enter a valid email address.');
                        return;
                     }
                     if (regStep === 1 && regData.username.trim() && !/^[a-zA-Z0-9_.-]{3,100}$/.test(regData.username.trim())) {
                       setRegError('Username must be 3–100 letters, numbers, dots, underscores, or hyphens.');
                        return;
                      }
                      if (!user && regStep === 1 && regData.password.length < 12) {
                        setRegError('Password must be at least 12 characters.');
                        return;
                      }
                      if (!user && regStep === 1 && regData.password !== regData.confirmPassword) {
                        setRegError('Passwords do not match.');
                        return;
                     }
                     if (regStep === 2) {
                       if (!validStudentId(regData.student_id)) {
                         setRegError('Use Student ID format YYYY-NNNNN, for example 2025-00046.');
                         return;
                       }
                       const terminalNode = academicPath[academicPath.length - 1];
                       if (!terminalNode || !['section', 'block'].includes(terminalNode.type)) {
                         setRegError('Please select a valid section to proceed.');
                         return;
                       }
                       if (appData.isMayorRegisteredForSection(terminalNode.id, terminalNode.name) && !securityKey.trim()) {
                         setRegError('Section Enrollment Security Key is required for enrollment into this section.');
                         return;
                       }
                     }
                     if (regStep === 3 && (regData.guardianName.trim().length < 2 || !validEmergencyPhone(regData.guardianPhone))) {
                       setRegError('Enter the emergency contact’s full name and a valid mobile number (09XXXXXXXXX or +639XXXXXXXXX).');
                       return;
                     }
                     setCheckingEnrollment(true); setRegError('');
                     try {
                       await appData.validateEnrollment(enrollmentPerson(), securityKey.trim(), regStep);
                       setRegStep(regStep + 1);
                     } catch (error) {
                       setRegError(error instanceof Error ? error.message : (error as { message?: string })?.message || 'Unable to validate enrollment. Please try again.');
                     } finally { setCheckingEnrollment(false); }
                    }}>
                     {checkingEnrollment ? 'Checking…' : 'Next'}
                   </Button>
                 ) : (
                   <Button variant="gold" className="!rounded-xl text-xs uppercase font-black tracking-widest" onClick={handleRegisterSubmit} disabled={isRegistering || readingPhoto}>
                     {isRegistering ? 'Submitting...' : 'Register'}
                   </Button>
                 )}
              </div>

              <div className="text-center pt-1 border-t border-slate-100 dark:border-slate-800">
                <button onClick={() => { setShowRegisterModal(false); setShowLoginModal(true); }} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-brand-900 dark:hover:text-gold-400 transition-colors">
                  Already have an account? <span className="text-gold-500 underline">Log In</span>
                </button>
              </div>
           </div>
        )}
      </Modal>

      {/* HERO SECTION */}
      <section id="home" className="relative pt-32 pb-20 lg:pt-44 lg:pb-28 px-6 overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-gold-400/10 dark:bg-gold-500/5 rounded-full blur-3xl -z-10 animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-900/5 dark:bg-brand-500/10 rounded-full blur-3xl -z-10"></div>
        
        <div className="max-w-4xl mx-auto text-center space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
           <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-brand-900 dark:text-white tracking-tighter leading-[1.1]">
              Automated Attendance & <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-400 via-gold-500 to-amber-600">Student Records Portal</span>
           </h1>

           <p className="text-slate-600 dark:text-slate-300 text-sm lg:text-base font-medium max-w-2xl mx-auto leading-relaxed">
              Streamlining campus ceremony check-ins, geofenced event verification, dynamic QR student identification, and automated sanction ledger management in one unified platform.
           </p>

           <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <button onClick={() => setShowLoginModal(true)} className="w-full sm:w-auto px-8 py-4 bg-brand-900 dark:bg-gold-500 text-white dark:text-brand-950 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-brand-800 dark:hover:bg-gold-400 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center gap-3">
                 Log In <ArrowRight size={16} />
              </button>
              <button onClick={() => setShowRegisterModal(true)} className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-800 text-brand-900 dark:text-white border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest hover:border-gold-400 hover:text-gold-600 dark:hover:text-gold-400 transition-all flex items-center justify-center gap-3 shadow-sm">
                 Register
              </button>
           </div>

           <button type="button" onClick={() => { setShowLookupModal(true); setLookupError(''); setLookupResult(null); }} className="mt-8 inline-flex items-center justify-center gap-3 rounded-2xl border-2 border-gold-300 bg-white px-7 py-4 text-xs font-black uppercase tracking-widest text-brand-900 shadow-lg transition hover:-translate-y-1 hover:border-gold-500 dark:border-gold-700 dark:bg-slate-900 dark:text-white">
             <Clock size={18} className="text-gold-500" /> Check enrollment progress
           </button>
        </div>

        {/* HERO FEATURE HIGHLIGHT CARDS */}
        <div className="max-w-6xl mx-auto mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 transform hover:-translate-y-2 transition-transform duration-300">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                 <QrCode size={24} />
              </div>
              <h3 className="font-bold text-brand-900 dark:text-white text-lg mb-2">Dynamic QR Identification</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">Encrypted student QR codes refreshed instantly for ultra-fast ceremony and assembly check-ins.</p>
           </div>

           <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 transform hover:-translate-y-2 transition-transform duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gold-400/10 rounded-bl-full"></div>
              <div className="w-12 h-12 bg-gold-50 dark:bg-gold-900/20 rounded-2xl flex items-center justify-center text-gold-600 dark:text-gold-400 mb-4">
                 <MapPin size={24} />
              </div>
              <h3 className="font-bold text-brand-900 dark:text-white text-lg mb-2">Geofenced Check-In</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">Scanner GPS is validated against the event boundary before attendance is saved.</p>
           </div>

           <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 transform hover:-translate-y-2 transition-transform duration-300">
              <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4">
                 <ShieldCheck size={24} />
              </div>
              <h3 className="font-bold text-brand-900 dark:text-white text-lg mb-2">Automated Sanction Ledger</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">Real-time tardiness calculation, absence penalty hours logging, and excuse exemption management.</p>
           </div>
        </div>
      </section>

      <Modal open={showLookupModal} onClose={() => setShowLookupModal(false)} title="Check enrollment progress" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">Enter your Student ID to see your latest application status.</p>
          <form className="space-y-3" onSubmit={handleEnrollmentLookup}>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="enrollment-lookup-id">Student ID</label>
            <input id="enrollment-lookup-id" value={lookupId} onChange={event => setLookupId(event.target.value)} placeholder="YYYY-NNNNN" autoFocus className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800" />
            <Button type="submit" variant="gold" disabled={lookingUp} className="w-full">{lookingUp ? 'Checking…' : 'Check status'}</Button>
          </form>
          {lookupError && <p role="alert" className="text-xs font-semibold text-red-600">{lookupError}</p>}
          {lookupResult && <div role="status" className="space-y-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">
            {!lookupResult.found ? <p>No enrollment application was found for that Student ID.</p> : <>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs"><div><dt className="text-slate-500">Enrollee</dt><dd className="font-semibold">{lookupResult.namePreview || '—'}</dd></div><div><dt className="text-slate-500">Student ID</dt><dd className="font-semibold">{lookupId}</dd></div><div><dt className="text-slate-500">Email</dt><dd className="font-semibold">{lookupResult.emailPreview || '—'}</dd></div><div><dt className="text-slate-500">Section</dt><dd className="font-semibold">{lookupResult.sectionPreview || '—'}</dd></div></dl>
              <p className="border-t border-slate-200 pt-3 dark:border-slate-700">{lookupResult.status === 'approved' ? 'Your enrollment is approved. You can log in to continue.' : lookupResult.status === 'bounced' ? 'Your application was returned for clarification.' : lookupResult.status === 'deleted' ? 'Your application was deleted. You may apply again.' : lookupResult.status === 'rejected' ? 'Your application was rejected. You may apply again.' : 'Your application is pending review by the school officer.'}</p>
              {lookupResult.rejectionReason && ['rejected', 'bounced'].includes(lookupResult.status || '') && <div className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900/60 dark:bg-red-950/30"><p className="text-[10px] font-black uppercase tracking-wider text-red-700 dark:text-red-300">Reviewer reason</p><p className="mt-1 whitespace-pre-wrap text-sm text-red-900 dark:text-red-100">{lookupResult.rejectionReason}</p>{lookupResult.clarificationFields?.length ? <p className="mt-2 text-xs font-semibold text-red-800 dark:text-red-200">Please update: {lookupResult.clarificationFields.join(', ')}.</p> : null}</div>}
              {lookupResult.status === 'bounced' && <Button type="button" variant="gold" className="w-full" onClick={() => user ? navigate('/register/status') : navigate('/login', { state: { returnTo: '/register/status' } })}>Edit and resubmit application</Button>}
              {lookupResult.status === 'rejected' && <Button type="button" variant="secondary" className="w-full" onClick={() => user ? navigate('/register/status') : navigate('/login', { state: { returnTo: '/register/status' } })}>Sign in to reapply</Button>}
            </>}
          </div>}
        </div>
      </Modal>

      {/* FEATURES SECTION */}
      <section id="features" className="py-20 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
           <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl lg:text-4xl font-black text-brand-900 dark:text-white tracking-tight leading-tight">
                 Engineered for Institutional Precision & Accountability
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-3 font-medium">
                 Designed to modernize paper-based attendance logs with instant verification, automated sanctions, and transparent records.
              </p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {systemFeatures.map((feat, idx) => {
                 const IconComponent = feat.icon;
                 return (
                   <div key={idx} className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 hover:border-gold-400 dark:hover:border-gold-400 transition-all group flex flex-col justify-between">
                      <div>
                         <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${feat.bg} ${feat.color} mb-6 group-hover:scale-110 transition-transform`}>
                            <IconComponent size={24} />
                         </div>
                         <h3 className="font-black text-brand-900 dark:text-white text-lg mb-2 uppercase tracking-tight">{feat.title}</h3>
                         <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed font-medium">{feat.desc}</p>
                      </div>
                      <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                         <span className="text-[10px] font-black uppercase tracking-wider text-gold-600 dark:text-gold-400">{feat.tag}</span>
                         <CheckCircle2 size={16} className="text-emerald-500" />
                      </div>
                   </div>
                 );
              })}
           </div>
        </div>
      </section>

      {/* MODULES SECTION */}
      <section id="modules" className="py-20 bg-slate-50 dark:bg-slate-950">
         <div className="max-w-7xl mx-auto px-6 space-y-12">
            <div className="text-center max-w-2xl mx-auto">
               <h2 className="text-3xl lg:text-4xl font-black text-brand-900 dark:text-white tracking-tight">Tailored Interfaces for Every Campus Role</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {systemModules.map((mod, idx) => {
                  const Icon = mod.icon;
                  return (
                    <div key={idx} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200/80 dark:border-slate-800 relative overflow-hidden group hover:shadow-xl transition-all">
                       <div className="flex items-center gap-4 mb-6">
                          <div className="w-14 h-14 bg-brand-900 text-gold-400 rounded-2xl flex items-center justify-center shrink-0 shadow-md">
                             <Icon size={28} />
                          </div>
                          <div>
                             <h3 className="text-xl font-black text-brand-900 dark:text-white uppercase tracking-tight">{mod.role}</h3>
                             <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">System Module 0{idx+1}</span>
                          </div>
                       </div>
                       
                       <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-6 font-medium">{mod.desc}</p>

                       <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/80 space-y-2">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-gold-600 dark:text-gold-400">Key Functional Highlights</h4>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                             {mod.highlights.map((h, hIdx) => (
                               <div key={hIdx} className="flex items-center gap-2 text-xs font-bold text-brand-900 dark:text-slate-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-gold-500"></span>
                                  <span className="break-words">{h}</span>
                               </div>
                             ))}
                          </div>
                       </div>
                    </div>
                  );
               })}
            </div>
         </div>
      </section>

      {/* WORKFLOW SECTION */}
      <section id="workflow" className="py-20 bg-white dark:bg-slate-900">
         <div className="max-w-7xl mx-auto px-6 space-y-12">
            <div className="text-center max-w-2xl mx-auto">
               <h2 className="text-3xl font-black text-brand-900 dark:text-white">How Attendance Scanning Works</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {workflowSteps.map((step, idx) => (
                  <div key={idx} className="relative p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
                     <span className="text-4xl font-black text-gold-500/30 dark:text-gold-400/20 block">{step.step}</span>
                     <h3 className="text-lg font-black text-brand-900 dark:text-white uppercase tracking-tight">{step.title}</h3>
                     <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed font-medium">{step.desc}</p>
                  </div>
               ))}
            </div>
         </div>
      </section>

      {/* SECURITY & COMPLIANCE SECTION */}
      <section id="security" className="py-20 bg-brand-900 dark:bg-black text-white relative overflow-hidden">
         <div className="max-w-7xl mx-auto px-6 relative z-10 text-center space-y-8">
            <h2 className="text-3xl lg:text-4xl font-black text-white max-w-2xl mx-auto tracking-tight">
               Built for Data Integrity, Privacy & Instant Institutional Verification
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 text-left">
               <div className="bg-white/5 dark:bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 space-y-2">
                  <Lock className="text-gold-400 mb-2" size={24} />
                  <h4 className="font-bold text-white text-sm uppercase">Role-Based Auth</h4>
                  <p className="text-slate-300 text-xs">Strict access separation across Students, Mayors, SSG Officers, and Administrators.</p>
               </div>
               <div className="bg-white/5 dark:bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 space-y-2">
                  <ShieldCheck className="text-emerald-400 mb-2" size={24} />
                  <h4 className="font-bold text-white text-sm uppercase">Anti-Forgery Passes</h4>
                  <p className="text-slate-300 text-xs">Short-lived QR tokens limit screenshot reuse. Officers verify the displayed student identity before recording attendance.</p>
               </div>
               <div className="bg-white/5 dark:bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 space-y-2">
                  <Clock className="text-amber-400 mb-2" size={24} />
                  <h4 className="font-bold text-white text-sm uppercase">Timestamp Records</h4>
                  <p className="text-slate-300 text-xs">Server-recorded attendance timestamps and officer attribution support discipline audits.</p>
               </div>
               <div className="bg-white/5 dark:bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 space-y-2">
                  <Zap className="text-purple-400 mb-2" size={24} />
                  <h4 className="font-bold text-white text-sm uppercase">High Availability</h4>
                  <p className="text-slate-300 text-xs">Optimized for high-concurrency event check-ins during campus assemblies.</p>
               </div>
            </div>
         </div>
      </section>

      {/* CONTACT SECTION */}
      <section id="contact" className="py-20 bg-slate-50 dark:bg-slate-950">
         <div className="max-w-6xl mx-auto px-6 space-y-12">
            <div className="text-center">
               <h2 className="text-3xl font-black text-brand-900 dark:text-white">Connect with IARS Support</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {!contactLinks.length && <p className="text-sm text-slate-500">Contact your school officer for enrollment and account assistance.</p>}
               {contactLinks.map((link, idx) => (
                 <div key={idx} onClick={link.action} className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 flex items-center gap-4 hover:shadow-lg transition-all group cursor-pointer">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${link.bg} ${link.color} group-hover:scale-110 transition-transform`}>
                       <link.icon size={20} />
                    </div>
                    <div className="min-w-0">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{link.label}</p>
                       <p className="break-words text-xs font-bold text-brand-900 dark:text-white">{link.value}</p>
                    </div>
                    <button aria-label={`Open ${link.label}`} className="ml-auto shrink-0 p-2 text-slate-300 hover:text-brand-900 dark:hover:text-white transition-colors">
                       <ExternalLink size={16} />
                    </button>
                 </div>
               ))}
            </div>
         </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white px-4 py-12 text-center dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
         <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
            <img src="https://i.imgur.com/K3T5yIT.jpeg" alt="IARS Seal" className="w-6 h-6 rounded-full object-cover" />
            <p className="text-brand-900 dark:text-white font-black uppercase text-xs tracking-widest">IARS • Institution Attendance & Records System</p>
         </div>
         <p className="text-slate-400 text-[10px]">© 2026 Institution Attendance & Records System. All rights reserved.</p>
         <p className="text-slate-300 dark:text-slate-600 text-[9px] mt-2">System Version 2.4 • Secured Verification Protocol</p>
      </footer>
    </div>
  );
};

export default LandingPage;
