
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import Button from '../components/ui/Button';
import { mockData } from '../lib/mockBackend';
import { SchoolNode } from '../types';
import ThemeToggle from '../components/ui/ThemeToggle';
import { AcademicPathPicker } from '../components/academic/AcademicPathPicker';
import { serializeAcademicAssignment } from '../lib/academicDirectory';
import PasswordStrengthMeter from '../components/ui/PasswordStrengthMeter';
import { 
  User, School, Shield, ChevronRight, ChevronLeft, 
  Camera, CheckCircle2, AlertCircle, ImageIcon, Upload, CreditCard,
  UserCircle, Eye, EyeOff, KeyRound
} from 'lucide-react';

const Register: React.FC = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const [structure, setStructure] = useState<SchoolNode[]>([]);
  const [academicPath, setAcademicPath] = useState<SchoolNode[]>([]);
  const [securityKey, setSecurityKey] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    student_id: '',
    guardianName: '',
    guardianPhone: '',
    profilePic: '',
    idFront: '',
    idBack: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    setStructure(mockData.getSchoolStructure());
  }, []);

  const terminalNode = academicPath[academicPath.length - 1];
  const isMayorRegistered = terminalNode && ['section', 'block'].includes(terminalNode.type)
    ? mockData.isMayorRegisteredForSection(terminalNode.id, terminalNode.name)
    : false;

  const handleFileUpload = (field: string) => {
    // Mocking file capture for this environment
    setFormData(prev => ({ ...prev, [field]: `https://picsum.photos/400/400?sig=${field}_${Math.random()}` }));
  };

  const handleSubmit = async () => {
    const terminal = academicPath[academicPath.length - 1];
    if (!formData.name.trim() || !formData.email.trim() || !formData.password || !formData.confirmPassword || !formData.student_id.trim() || !terminal || !['section', 'block'].includes(terminal.type)) {
      setError('Complete all required identity and academic fields.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (terminal && mockData.isMayorRegisteredForSection(terminal.id, terminal.name)) {
      if (mockData.isMayorRegisteredForSection(terminal.id, terminal.name) && !securityKey.trim()) {
        setError('Section Enrollment Security Key is required for enrollment into this section.');
        return;
      }
      if (mockData.isMayorRegisteredForSection(terminal.id, terminal.name) && !mockData.validateSectionSecurityKey(terminal.id, securityKey.trim(), terminal.name)) {
        setError('Invalid Section Security Key. Please verify the security key with your Class Mayor or SSG officer.');
        return;
      }
    }
    setLoading(true);
    const uid = `user_${Date.now()}`;
    const serialized = serializeAcademicAssignment(academicPath);
    const profile: any = {
      uid,
      name: formData.name.trim(),
      username: formData.username.trim() || formData.email.trim().toLowerCase(),
      email: formData.email.trim().toLowerCase(),
      student_id: formData.student_id.trim(),
      role: 'student',
      account_status: 'pending',
      photo_url: formData.profilePic || `https://i.pravatar.cc/150?u=${uid}`,
      guardian: formData.guardianName.trim() || formData.guardianPhone.trim()
        ? { name: formData.guardianName.trim(), contact: formData.guardianPhone.trim() }
        : undefined,
      school_data: { ...serialized.schoolData, school_id: serialized.assignment.campusId, academic_assignment: serialized.assignment }
    };

    try {
      mockData.submitApplication(profile, formData.password, securityKey.trim());
      localStorage.setItem('rmc_mock_session', uid);
      window.dispatchEvent(new Event('rmc_auth_update'));
      setLoading(false);
      setIsSuccess(true);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to submit the application.');
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-start bg-brand-950 px-4 py-6 pt-20 sm:px-6 lg:justify-center lg:py-10">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl animate-in fade-in duration-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        <div className="bg-brand-gradient p-6 text-white flex justify-between items-center border-b-2 border-emerald-500">
          <div className="flex items-center gap-3">
            <img 
              src="https://i.imgur.com/K3T5yIT.jpeg" 
              alt="IARS Academic Seal" 
              className="w-11 h-11 rounded-full object-cover ring-2 ring-gold-400/50 shadow-md shrink-0" 
            />
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">{isSuccess ? 'Enrollment Submitted' : 'System Enrollment'}</h2>
              <p className="text-emerald-300 text-[9px] font-bold tracking-widest uppercase mt-0.5">{isSuccess ? 'Application Submitted • Status Pending' : `Stage ${step} of 3 • Protocol`}</p>
            </div>
          </div>
        </div>

        <div className="p-6 lg:p-8 space-y-6">
          {isSuccess ? (
            <div className="space-y-5 text-center py-2 animate-in fade-in zoom-in-95">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-500 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Registration Submitted!</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">Your enrollment application is pending review by your department or section officer.</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-left space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Legal Name</span>
                  <span className="font-bold text-slate-900 dark:text-white">{formData.name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Student ID</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formData.student_id}</span>
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
                <Button variant="gold" className="!w-full !rounded-xl text-xs uppercase font-black tracking-widest" onClick={() => navigate('/register/status')}>
                  View Application Status
                </Button>
                <Button variant="secondary" className="!w-full !rounded-xl text-xs uppercase font-black tracking-widest" onClick={() => navigate('/')}>
                  Go to Home
                </Button>
              </div>
            </div>
          ) : (
            <>
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className="flex flex-col items-center mb-4">
                <button 
                  aria-label="Upload profile photo"
                  type="button"
                  onClick={() => handleFileUpload('profilePic')}
                  className="group relative flex h-24 w-24 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 transition-all hover:border-gold-400 hover:bg-gold-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-gold-400 dark:hover:bg-slate-700"
                >
                  {formData.profilePic ? (
                    <img src={formData.profilePic} alt="Uploaded profile" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <UserCircle size={28} />
                      <span className="text-[7px] font-black uppercase mt-1">Profile Photo</span>
                    </>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={20} className="text-white" />
                  </div>
                </button>
                <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-400">Digital Identity Picture</p>
              </div>

              <div className="space-y-1">
                <label htmlFor="register-name" className="ml-1 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">Legal Full Name</label>
                <input id="register-name" placeholder="Ex. Juan Dela Cruz" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-base font-bold text-brand-900 outline-none placeholder:text-slate-400 focus:border-gold-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="register-username" className="ml-1 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">Username <span className="normal-case text-slate-400">(optional)</span></label>
                  <input id="register-username" placeholder="Defaults to email" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-base font-bold text-brand-900 outline-none placeholder:text-slate-400 focus:border-gold-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label htmlFor="register-email" className="ml-1 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">Email Address</label>
                  <input id="register-email" placeholder="name@email.com" type="email" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-base font-bold text-brand-900 outline-none placeholder:text-slate-400 focus:border-gold-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="register-password" className="ml-1 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">Security Key</label>
                <div className="relative">
                  <input id="register-password" aria-label="Security Key" placeholder="••••••••" type={showPassword ? 'text' : 'password'} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 pr-12 text-base font-bold text-brand-900 outline-none placeholder:text-slate-400 focus:border-gold-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                  <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-900 dark:hover:text-gold-400 transition-colors p-1">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <PasswordStrengthMeter password={formData.password} />
              </div>

              <div className="space-y-1">
                <label htmlFor="register-confirm-password" className="ml-1 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">Confirm Password</label>
                <div className="relative">
                  <input id="register-confirm-password" placeholder="••••••••" type={showConfirmPassword ? 'text' : 'password'} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 pr-12 text-base font-bold text-brand-900 outline-none placeholder:text-slate-400 focus:border-gold-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} />
                  <button type="button" aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'} onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-900 dark:hover:text-gold-400 transition-colors p-1">
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="mt-1 text-[10px] font-bold text-red-500">Passwords do not match.</p>
                )}
                {formData.confirmPassword && formData.password === formData.confirmPassword && (
                  <p className="mt-1 text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Passwords match.
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className="space-y-1">
                <label htmlFor="register-student-id" className="ml-1 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">Official Student ID #</label>
                <input id="register-student-id" placeholder="2024-XXXXX" className="w-full min-w-0 break-words rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-base font-bold text-brand-900 outline-none placeholder:text-slate-400 focus:border-gold-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500" value={formData.student_id} onChange={e => setFormData({...formData, student_id: e.target.value})} />
              </div>

              <AcademicPathPicker roots={structure} value={academicPath.map((node) => node.id)} onChange={setAcademicPath} purpose="registration" />

              {terminalNode && mockData.isMayorRegisteredForSection(terminalNode.id, terminalNode.name) && (
                <div className="space-y-1.5 rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                    <KeyRound size={18} />
                    <label htmlFor="register-security-key" className="text-xs font-black uppercase tracking-widest">
                      Section Enrollment Security Key <span className="text-red-500">*</span>
                    </label>
                  </div>
                  <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400">
                    Please enter the section enrollment security key for &ldquo;{terminalNode.name}&rdquo;. Request this key from your Class Mayor, SSG, or Section Officer.
                  </p>
                  <input
                    id="register-security-key"
                    placeholder="Enter Section Security Key (e.g. SEC-XXXXX)"
                    className="w-full rounded-xl border border-amber-300 bg-white p-3.5 text-base font-bold text-brand-900 outline-none focus:border-amber-500 dark:border-amber-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                    value={securityKey}
                    onChange={(e) => setSecurityKey(e.target.value)}
                  />
                </div>
              )}

              <p className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs font-medium text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">Your ID number and academic assignment will be verified against school records. ID image uploads are not needed.</p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
               <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800">
                  <Shield size={32} className="text-brand-900 dark:text-gold-400" />
                  <div>
                    <h4 className="text-[10px] font-black text-brand-900 uppercase dark:text-slate-100">Optional Emergency Contact</h4>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest dark:text-slate-400">Not required for attendance enrollment</p>
                  </div>
               </div>
               <div className="space-y-4">
                  <div className="space-y-1">
                    <label htmlFor="register-guardian-name" className="ml-1 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">Guardian Name</label>
                    <input id="register-guardian-name" placeholder="Legal Full Name" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-base font-bold text-brand-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500" value={formData.guardianName} onChange={e => setFormData({...formData, guardianName: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="register-guardian-phone" className="ml-1 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">Emergency Contact #</label>
                    <input id="register-guardian-phone" placeholder="+63 9XX XXX XXXX" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-base font-bold text-brand-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500" value={formData.guardianPhone} onChange={e => setFormData({...formData, guardianPhone: e.target.value})} />
                  </div>
               </div>
            </div>
          )}

          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">{error}</p>}

          <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:gap-4">
            {step > 1 && (
              <Button variant="secondary" aria-label="Previous registration phase" className="!w-full !rounded-xl sm:!w-16 sm:!p-0" onClick={() => setStep(step - 1)}>
                <ChevronLeft size={20} />
              </Button>
            )}
            {step < 3 ? (
              <Button className="!rounded-xl text-[10px] uppercase font-black tracking-widest" onClick={() => { 
                if (step === 1 && formData.confirmPassword && formData.password !== formData.confirmPassword) {
                  setError('Passwords do not match.');
                  return;
                }
                if (step === 2) {
                  if (!formData.student_id.trim()) {
                    setError('Official Student ID # is required.');
                    return;
                  }
                  const terminal = academicPath[academicPath.length - 1];
                  if (!terminal || !['section', 'block'].includes(terminal.type)) {
                    setError('Please select a valid section to proceed.');
                    return;
                  }
                  if (mockData.isMayorRegisteredForSection(terminal.id, terminal.name) && !securityKey.trim()) {
                    setError('Section Enrollment Security Key is required for enrollment into this section.');
                    return;
                  }
                  if (mockData.isMayorRegisteredForSection(terminal.id, terminal.name) && !mockData.validateSectionSecurityKey(terminal.id, securityKey.trim(), terminal.name)) {
                    setError('Invalid Section Security Key. Please verify the security key with your Class Mayor or SSG officer.');
                    return;
                  }
                }
                setError(''); 
                setStep(step + 1); 
              }} disabled={step === 1 && (!formData.name.trim() || !formData.email.trim() || formData.password.length < 6 || (Boolean(formData.confirmPassword) && formData.password !== formData.confirmPassword))}>
                Next
              </Button>
            ) : (
              <Button variant="gold" className="!rounded-xl text-[10px] uppercase font-black tracking-widest" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Submitting...' : 'Register'}
              </Button>
            )}
          </div>

          <div className="text-center pt-2">
            <button onClick={() => navigate('/login')} className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] hover:text-brand-900 transition-colors dark:text-slate-400 dark:hover:text-gold-400">
              <span className="text-gold-500 underline decoration-2">Log In</span>
            </button>
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Register;
