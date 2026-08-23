import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, db } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { useTheme } from '../components/ThemeContext';
import ThemeToggle from '../components/ui/ThemeToggle';
import { ensureMockReferenceData, mockAuth, mockData } from '../lib/mockBackend';
import { TEST_ACCOUNTS } from '../lib/seed';
import { SchoolNode } from '../types';
import Button from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Collapsible } from '../components/ui/Collapsible';
import { AcademicPathPicker } from '../components/academic/AcademicPathPicker';
import { serializeAcademicAssignment } from '../lib/academicDirectory';
import PasswordStrengthMeter from '../components/ui/PasswordStrengthMeter';
import { 
  ArrowRight, Shield, Target, Users, 
  MapPin, Mail, Phone, Facebook, Instagram,
  Globe, X, Eye, EyeOff, Loader2,
  ShieldAlert, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Copy, Check, ExternalLink,
  UserCircle, Camera, CreditCard, Calendar,
  FileText, QrCode, ShieldCheck, Clock, FileCheck2, BarChart3, UserCheck, Smartphone, CheckCircle2, Layers, Lock, Zap, Building2, GraduationCap
} from 'lucide-react';

interface LandingPageProps {
  defaultOpenLogin?: boolean;
  defaultOpenRegister?: boolean;
}

const LandingPage: React.FC<LandingPageProps> = ({ defaultOpenLogin = false, defaultOpenRegister = false }) => {
  const navigate = useNavigate();
  const { isMock, user, profile } = useAuth();
  
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
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Register Logic State
  const [regStep, setRegStep] = useState(1);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [regError, setRegError] = useState('');
  const [structure, setStructure] = useState<SchoolNode[]>([]);
  const [academicPath, setAcademicPath] = useState<SchoolNode[]>([]);
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
    if (user) {
      if (profile?.role === 'ossa' || profile?.role === 'ossa_staff') {
        navigate('/ossa/dashboard');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, profile, navigate]);

  useEffect(() => {
    if (isMock) {
      ensureMockReferenceData();
      setShowTestPanel(true);
      setStructure(mockData.getSchoolStructure());
    }
  }, [isMock]);

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
      if (isMock) {
        await mockAuth.signIn(identifier, password);
        navigate('/dashboard');
      } else {
        let email = identifier;
        if (!identifier.includes('@')) {
          const snapshot = await get(ref(db, `usernames/${identifier.toLowerCase()}`));
          if (snapshot.exists()) email = snapshot.val();
          else throw new Error("Username not found.");
        }
        await signInWithEmailAndPassword(auth, email, password);
        navigate('/dashboard');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Failed to sign in.');
      setIsLoggingIn(false);
    }
  };

  const quickLogin = (usr: string) => {
    setIdentifier(usr);
    setPassword('password123');
    setLoginError('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  // Register Handlers
  const handleRegUpload = (field: string) => {
    setRegData((prev: any) => ({ ...prev, [field]: `https://picsum.photos/400/400?sig=${field}_${Math.random()}` }));
  };

  const handleRegisterSubmit = async () => {
    const terminal = academicPath[academicPath.length - 1];
    if (!terminal || !['section', 'block'].includes(terminal.type)) return;
    if (regData.password !== regData.confirmPassword) {
      setRegError('Passwords do not match.');
      return;
    }
    setIsRegistering(true);
    const uid = `user_${Date.now()}`;
    const serialized = serializeAcademicAssignment(academicPath);
    const profile: any = {
      uid,
      name: regData.name,
      username: regData.username,
      email: regData.email,
      student_id: regData.student_id,
      role: 'student',
      photo_url: regData.profilePic || `https://i.pravatar.cc/150?u=${uid}`,
      school_data: { ...serialized.schoolData, school_id: serialized.assignment.campusId, academic_assignment: serialized.assignment }
    };

    mockData.submitApplication(profile);
    localStorage.setItem('rmc_mock_session', uid);
    window.dispatchEvent(new Event('rmc_auth_update'));
    setShowRegisterModal(false);
    navigate('/register/status');
  };

  // --- DATA FOR IARS FEATURES & MODULES ---
  const systemFeatures = [
    {
      icon: QrCode,
      title: "Dynamic Student QR Badges",
      desc: "Instant encrypted QR pass generation for every student with dynamic timestamps preventing screenshot abuse.",
      tag: "Scanning Speed: < 0.5s",
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/20"
    },
    {
      icon: MapPin,
      title: "Geofenced Check-In Perimeter",
      desc: "GPS-validated perimeter zones ensure students are physically present at official campus ceremonies before scanning.",
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
      desc: "Mobile-optimized scanning interface for class mayors to record section attendance during assemblies with audio feedback.",
      highlights: ["Camera QR Reader", "Offline Storage Sync", "Real-Time Headcount", "Manual ID Fallback Search"]
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
      desc: "Student opens the IARS portal on mobile to generate their secure, encrypted student QR pass."
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

  const contactLinks = [
    { icon: Mail, label: "System Support", value: "iars.support@institution.edu", action: () => window.open('mailto:iars.support@institution.edu'), color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
    { icon: Phone, label: "Registrar / SSG Office", value: "+63 (084) 216-8800", action: () => window.open('tel:+630842168800'), color: "text-green-500", bg: "bg-green-50 dark:bg-green-900/20" },
    { icon: MapPin, label: "Main Campus", value: "Tagum City, Davao del Norte", action: () => window.open('https://maps.google.com/?q=Tagum+City'), color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20" }
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

                   <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-1.5">
                        <label htmlFor="landing-login-identifier" className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Asset Identifier / Email</label>
                        <div className="relative">
                          <UserCircle size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                          <input
                            id="landing-login-identifier"
                            aria-label="Asset Identifier"
                            type="text"
                           required
                           value={identifier}
                           onChange={(e) => setIdentifier(e.target.value)}
                           className="w-full py-3.5 pl-12 pr-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 focus:outline-none transition-all font-bold text-base text-brand-900 dark:text-white"
                           placeholder="Username or Email address"
                         />
                       </div>
                     </div>

                     <div className="space-y-1.5">
                       <label htmlFor="landing-login-password" className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Security Key</label>
                       <div className="relative">
                         <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                         <input
                           id="landing-login-password"
                           aria-label="Security Key"
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

                  {isMock && (
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
        onClose={() => { setShowRegisterModal(false); if (defaultOpenRegister) navigate('/'); }}
        size="md"
        title="System Enrollment"
        description={`Stage ${regStep} of 3 • Protocol`}
      >
           <div className="space-y-5">
              {regStep === 1 && (
                 <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    <div className="flex flex-col items-center mb-4">
                       <button aria-label="Upload profile photo" type="button" onClick={() => handleRegUpload('profilePic')} className="w-20 h-20 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 hover:border-gold-400 hover:bg-gold-50/10 transition-all overflow-hidden relative group">
                          {regData.profilePic ? <img src={regData.profilePic} alt="Uploaded profile" className="w-full h-full object-cover" /> : <><UserCircle size={28} /><span className="text-[8px] font-black uppercase mt-1">Photo</span></>}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera size={18} className="text-white" /></div>
                       </button>
                       <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">Digital Identity Picture (Optional)</p>
                    </div>

                    <div className="space-y-1">
                       <label htmlFor="landing-register-name" className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-300 ml-1">Legal Full Name</label>
                       <input id="landing-register-name" placeholder="Ex. Juan Dela Cruz" className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-base text-brand-900 dark:text-white focus:border-gold-400 focus:outline-none" value={regData.name} onChange={e => setRegData({...regData, name: e.target.value})} />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                       <div className="space-y-1">
                          <label htmlFor="landing-register-username" className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-300 ml-1">Username <span className="normal-case text-slate-400">(optional)</span></label>
                          <input id="landing-register-username" placeholder="Defaults to email" className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-base text-brand-900 dark:text-white focus:border-gold-400 focus:outline-none" value={regData.username} onChange={e => setRegData({...regData, username: e.target.value})} />
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
                       <input id="landing-register-student-id" placeholder="2024-XXXXX" className="w-full min-w-0 p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-base text-brand-900 dark:text-white focus:border-gold-400 focus:outline-none" value={regData.student_id} onChange={e => setRegData({...regData, student_id: e.target.value})} />
                    </div>

                    <AcademicPathPicker roots={structure} value={academicPath.map((node) => node.id)} onChange={setAcademicPath} purpose="registration" />

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
                          <h4 className="text-xs font-black text-brand-900 dark:text-slate-100 uppercase">Optional Emergency Contact</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Not required for attendance enrollment</p>
                       </div>
                    </div>
                    <div className="space-y-1">
                       <label htmlFor="landing-register-guardian-name" className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-300 ml-1">Guardian Name</label>
                       <input id="landing-register-guardian-name" placeholder="Legal Full Name" className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-base text-brand-900 dark:text-white focus:border-gold-400 focus:outline-none" value={regData.guardianName} onChange={e => setRegData({...regData, guardianName: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                       <label htmlFor="landing-register-guardian-phone" className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-300 ml-1">Emergency Contact #</label>
                       <input id="landing-register-guardian-phone" placeholder="+63 9XX XXX XXXX" className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-base text-brand-900 dark:text-white focus:border-gold-400 focus:outline-none" value={regData.guardianPhone} onChange={e => setRegData({...regData, guardianPhone: e.target.value})} />
                    </div>
                 </div>
              )}

              {regError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800 text-xs font-semibold">
                  {regError}
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:gap-4">
                 {regStep > 1 && (
                   <Button variant="secondary" aria-label="Previous registration phase" className="!w-full !rounded-xl sm:!w-16 sm:!p-0" onClick={() => setRegStep(regStep - 1)}>
                     <ChevronLeft size={20} />
                   </Button>
                 )}
                 {regStep < 3 ? (
                   <Button className="!rounded-xl text-xs uppercase font-black tracking-widest" onClick={() => { 
                     if (regStep === 1 && regData.password !== regData.confirmPassword) {
                       setRegError('Passwords do not match.');
                       return;
                     }
                     setRegError(''); 
                     setRegStep(regStep + 1); 
                   }} disabled={regStep === 1 && (!regData.name.trim() || !regData.email.trim() || regData.password.length < 6 || !regData.confirmPassword || regData.password !== regData.confirmPassword)}>
                     Next
                   </Button>
                 ) : (
                   <Button variant="gold" className="!rounded-xl text-xs uppercase font-black tracking-widest" onClick={handleRegisterSubmit} disabled={isRegistering}>
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
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">GPS-backed location perimeter validation ensuring physical presence before check-in confirmation.</p>
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
                  <p className="text-slate-300 text-xs">Dynamic encrypted QR tokens prevent pass sharing and static screenshot fraud.</p>
               </div>
               <div className="bg-white/5 dark:bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 space-y-2">
                  <Clock className="text-amber-400 mb-2" size={24} />
                  <h4 className="font-bold text-white text-sm uppercase">Timestamp Records</h4>
                  <p className="text-slate-300 text-xs">Immutable attendance timestamps with location telemetry for discipline audits.</p>
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
