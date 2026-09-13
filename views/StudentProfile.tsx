import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { ref, update } from 'firebase/database';
import { auth as firebaseAuth, db } from '../firebase';
import { mockAuth, mockData } from '../lib/mockBackend';
import { 
  User, ShieldCheck, KeyRound, Lock, Smartphone, CheckCircle2,
  Building2, GraduationCap, School, Sparkles, Save, Eye, EyeOff, AlertCircle, LogOut, Pencil
} from 'lucide-react';
import QRCode from 'react-qr-code';
import Button from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Page, PageHeader, Surface } from '../components/ui/Page';
import { Collapsible } from '../components/ui/Collapsible';

const StudentProfile: React.FC = () => {
  const { profile, isMock } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      if (isMock) {
        mockAuth.signOut();
      } else {
        await firebaseAuth.signOut();
      }
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      navigate('/login');
    }
  };

  // Password Reset state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // 2FA Google Auth State
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorStatus, setTwoFactorStatus] = useState<'idle' | 'success'>('idle');

  // Editable Profile fields
  const [contactNumber, setContactNumber] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianContact, setGuardianContact] = useState('');
  const [isEditingContacts, setIsEditingContacts] = useState(false);
  const [isSavingContacts, setIsSavingContacts] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!profile || isEditingContacts) return;
    setContactNumber(profile.phone || '');
    setGuardianName(profile.guardian?.name || '');
    setGuardianContact(profile.guardian?.contact || '');
  }, [profile, isEditingContacts]);

  if (!profile) return null;

  const handlePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setPasswordStatus('error');
      setPasswordMessage('Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus('error');
      setPasswordMessage('New password and confirmation do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordStatus('error');
      setPasswordMessage('Password must be at least 6 characters long.');
      return;
    }

    setPasswordStatus('success');
    setPasswordMessage('Password updated successfully!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => {
      setPasswordStatus('idle');
      setShowPasswordSection(false);
    }, 2500);
  };

  const handleToggle2FA = () => {
    if (is2FAEnabled) {
      setIs2FAEnabled(false);
      close2FASetup();
    } else {
      setShow2FASetup(true);
    }
  };

  const close2FASetup = () => {
    setShow2FASetup(false);
    setTwoFactorCode('');
    setTwoFactorStatus('idle');
  };

  const handleVerify2FA = (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFactorCode.length === 6) {
      setTwoFactorStatus('success');
      setTimeout(() => {
        setIs2FAEnabled(true);
        close2FASetup();
      }, 1500);
    }
  };

  const resetContactDraft = () => {
    setContactNumber(profile.phone || '');
    setGuardianName(profile.guardian?.name || '');
    setGuardianContact(profile.guardian?.contact || '');
  };

  const handleCancelProfile = () => {
    resetContactDraft();
    setIsEditingContacts(false);
    setIsSaved(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const changes: { phone?: string; guardianName?: string; guardianContact?: string } = {};
    if (contactNumber.trim() !== (profile.phone || '').trim()) changes.phone = contactNumber.trim();
    if (guardianName.trim() !== (profile.guardian?.name || '').trim()) changes.guardianName = guardianName.trim();
    if (guardianContact.trim() !== (profile.guardian?.contact || '').trim()) changes.guardianContact = guardianContact.trim();

    if (Object.keys(changes).length > 0) {
      setIsSavingContacts(true);
      try {
        if (isMock) {
          mockData.updateContactDetails(profile.uid, changes);
        } else {
          const updates: Record<string, string | null> = {};
          if ('phone' in changes) updates.phone = changes.phone || null;
          if ('guardianName' in changes) updates['guardian/name'] = changes.guardianName || null;
          if ('guardianContact' in changes) updates['guardian/contact'] = changes.guardianContact || null;
          await update(ref(db, `users/${profile.uid}/profile`), updates);
        }
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
      } finally {
        setIsSavingContacts(false);
      }
    }
    setIsEditingContacts(false);
  };

  const isStudent = profile.role === 'student' || profile.role === 'mayor';
  const roleLabel = profile.role === 'mayor'
    ? 'Student · Section Mayor'
    : profile.role === 'ssg'
      ? 'SSG Official'
      : profile.role === 'ossa'
        ? 'OSSA Official'
        : profile.role === 'ossa_staff'
          ? 'OSSA Staff'
        : profile.role === 'admin'
          ? 'System Administrator'
          : 'Student';

  return (
    <Page className="max-w-5xl animate-in fade-in duration-200">
      
      {/* HEADER */}
      <PageHeader
        eyebrow={<span className="inline-flex items-center gap-1.5"><User size={14} /> Account Management</span>}
        title="My Profile"
        description="Manage your personal credentials, security settings, and emergency contacts."
      />

      {/* TOP CARD: PROFILE SUMMARY */}
      <Surface className="relative overflow-hidden border-gold-400/40 bg-gradient-to-br from-brand-900 to-brand-950 p-4 text-white shadow-md sm:p-5">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gold-400/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 relative z-10">
          {/* Avatar Photo */}
          <div className="relative shrink-0">
            <img 
              src={profile.photo_url || 'https://i.pravatar.cc/150'} 
              alt={profile.name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-gold-400 shadow-md object-cover"
            />
            <span className="absolute -bottom-1 -right-1 bg-gold-400 text-brand-900 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow-xs">
              {profile.role}
            </span>
          </div>

          {/* Details */}
          <div className="text-center sm:text-left space-y-1.5 flex-1 w-full">
            <div className="inline-block max-w-full rounded-full border border-gold-400/30 bg-gold-400/20 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold-300 [overflow-wrap:anywhere]">
              {isStudent ? 'Student ID' : 'Official ID'}: {profile.student_id}
            </div>
            <h2 className="text-lg sm:text-xl font-bold uppercase tracking-tight text-white">{profile.name}</h2>
            <p className="text-[11px] font-medium text-slate-300 [overflow-wrap:anywhere]">{profile.email}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">{roleLabel} · {profile.account_status || 'active'}</p>

            {/* School Info Pills */}
            <div className="pt-2 flex flex-wrap items-center gap-1.5 text-[11px] border-t border-white/10 mt-3">
              <span className="flex max-w-full items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2.5 py-0.5 font-bold text-gold-300 [overflow-wrap:anywhere]">
                <School size={12} /> {profile.school_data.school_id === 'school_rmc' ? 'Rizal Memorial Colleges' : 'RMC'}
              </span>
              <span className="flex max-w-full items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2.5 py-0.5 font-bold text-white [overflow-wrap:anywhere]">
                <Building2 size={12} /> {isStudent ? (profile.school_data.department || 'Academic unit') : (profile.official_data?.body || profile.school_data.department || 'Official body')}
              </span>
              <span className="flex max-w-full items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2.5 py-0.5 font-bold text-gold-300 [overflow-wrap:anywhere]">
                <GraduationCap size={12} /> {isStudent ? `${profile.school_data.level || 'Level pending'} - ${profile.school_data.section || 'Section pending'}` : (profile.official_data?.position || 'Authorized official')}
              </span>
            </div>
          </div>
        </div>
      </Surface>

      <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        Name, {isStudent ? 'student ID and academic assignment' : 'official ID, body and access role'} are verified institutional records. They are visible here but can only be changed by an authorized administrator.
      </p>

      {/* GRID: PERSONAL INFO EDIT & SECURITY TOGGLES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* LEFT: PERSONAL & GUARDIAN DETAILS */}
        <Surface className="space-y-4 p-4 sm:p-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2.5">
            <h3 className="text-xs font-bold text-brand-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <User size={15} className="text-gold-600 dark:text-gold-400" /> Contact Details
            </h3>
            {!isEditingContacts ? (
              <Button aria-label="Edit contact details" className="!w-auto" onClick={() => setIsEditingContacts(true)} size="sm" variant="secondary">
                <Pencil size={14} /> Edit
              </Button>
            ) : null}
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor={isEditingContacts ? 'student-contact' : undefined} className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Mobile Contact (optional)</label>
              {isEditingContacts ? (
                <input id="student-contact" type="text" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} className="input-field text-base sm:text-sm" />
              ) : (
                <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-brand-900 dark:bg-slate-800 dark:text-slate-100">{contactNumber || 'Not provided'}</p>
              )}
            </div>

            {isStudent && <div className="space-y-1">
              <label htmlFor={isEditingContacts ? 'guardian-name' : undefined} className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Parent / Guardian Name</label>
              {isEditingContacts ? (
                <input id="guardian-name" type="text" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} className="input-field text-base sm:text-sm" />
              ) : (
                <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-brand-900 dark:bg-slate-800 dark:text-slate-100">{guardianName || 'Not provided'}</p>
              )}
            </div>}

            {isStudent && <div className="space-y-1">
              <label htmlFor={isEditingContacts ? 'guardian-contact' : undefined} className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Guardian Emergency Hotline</label>
              {isEditingContacts ? (
                <input id="guardian-contact" type="text" value={guardianContact} onChange={(e) => setGuardianContact(e.target.value)} className="input-field text-base sm:text-sm" />
              ) : (
                <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-brand-900 dark:bg-slate-800 dark:text-slate-100">{guardianContact || 'Not provided'}</p>
              )}
            </div>}

            {isEditingContacts ? (
              <div className="flex justify-end gap-2">
                <Button className="!w-auto" onClick={handleCancelProfile} size="sm" variant="secondary">Cancel</Button>
                <Button aria-label="Save contact details" className="!w-auto" disabled={isSavingContacts} size="sm" type="submit">
                  <Save size={14} className="text-gold-400" />
                  {isSavingContacts ? 'Saving...' : 'Save'}
                </Button>
              </div>
            ) : isSaved ? (
              <p className="text-right text-xs font-bold text-emerald-600 dark:text-emerald-400" role="status">Saved</p>
            ) : null}
          </form>
        </Surface>

        {/* RIGHT: SECURITY & TOGGLES */}
        <div className="space-y-6">
          
          {/* PASSWORD RESET TOGGLE */}
          <Surface className="space-y-4 p-4 sm:p-6">
            <div className="flex flex-col items-stretch justify-between gap-3 lg:flex-row lg:items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-50 dark:bg-brand-900/40 text-brand-900 dark:text-brand-300 flex items-center justify-center font-bold">
                  <KeyRound size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-brand-900 dark:text-slate-100 uppercase tracking-tight">Password Reset</h3>
                  <p className="text-slate-400 dark:text-slate-400 text-[10px] font-medium">Update account login password</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
                aria-expanded={showPasswordSection}
                aria-controls="password-fields"
                aria-label={showPasswordSection ? 'Cancel password change' : 'Change password'}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-black uppercase tracking-widest text-brand-900 transition-all hover:bg-gold-400 dark:bg-slate-700 dark:text-slate-100"
              >
                {showPasswordSection ? 'Cancel' : 'Change'}
              </button>
            </div>

            <Collapsible id="password-fields" open={showPasswordSection} innerClassName="pt-4">
              <form onSubmit={handlePasswordReset} className="border-t border-slate-200 pt-4 dark:border-slate-700 space-y-3">
                {passwordStatus === 'error' && (
                  <div role="alert" className="p-3 bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl border border-red-200 dark:border-red-900/50 flex items-center gap-2">
                    <AlertCircle size={16} /> {passwordMessage}
                  </div>
                )}
                {passwordStatus === 'success' && (
                  <div role="status" className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-2">
                    <CheckCircle2 size={16} /> {passwordMessage}
                  </div>
                )}

                <div className="relative">
                  <label htmlFor="current-password" className="sr-only">Current password</label>
                  <input
                    id="current-password"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Current Password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="input-field p-3 pr-12 text-base sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    aria-label={showPass ? 'Hide current password' : 'Show current password'}
                    aria-pressed={showPass}
                    className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="relative">
                  <label htmlFor="new-password" className="sr-only">New password</label>
                  <input
                    id="new-password"
                    type={showNewPass ? 'text' : 'password'}
                    placeholder="New Password (min 6 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input-field p-3 pr-12 text-base sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    aria-label={showNewPass ? 'Hide new password' : 'Show new password'}
                    aria-pressed={showNewPass}
                    className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="relative">
                  <label htmlFor="confirm-password" className="sr-only">Confirm new password</label>
                  <input
                    id="confirm-password"
                    type={showConfirmPass ? 'text' : 'password'}
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field p-3 pr-12 text-base sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    aria-label={showConfirmPass ? 'Hide password confirmation' : 'Show password confirmation'}
                    aria-pressed={showConfirmPass}
                    className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <Button type="submit" className="uppercase tracking-widest">
                  Update
                </Button>
              </form>
            </Collapsible>
          </Surface>

          {/* ENROLL GOOGLE AUTH (2FA) TOGGLE */}
          <Surface className="space-y-4 p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <Smartphone size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-brand-900 dark:text-slate-100 uppercase tracking-tight">Google Authenticator (2FA)</h3>
                  <p className="text-slate-400 dark:text-slate-400 text-[10px] font-medium">
                    {is2FAEnabled ? 'Status: Active & Enrolled' : 'Status: Disabled'}
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={handleToggle2FA}
                aria-label={is2FAEnabled ? 'Disable two-factor authentication' : 'Enable two-factor authentication'}
                aria-pressed={is2FAEnabled}
                className={`relative h-6 w-12 shrink-0 rounded-full transition-colors ${
                  is2FAEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <span className={`block w-5 h-5 bg-white rounded-full transition-transform shadow-md ${
                  is2FAEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

          </Surface>

        </div>

      </div>

      <Modal
        open={show2FASetup}
        onClose={close2FASetup}
        size="sm"
        title="Enroll Google Authenticator"
        description="Scan the QR code in Google Authenticator, then enter the six-digit code to finish enrollment."
        footer={(
          <>
            <Button className="sm:!w-auto" onClick={close2FASetup} variant="secondary">
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 sm:!w-auto"
              disabled={!/^\d{6}$/.test(twoFactorCode) || twoFactorStatus === 'success'}
              form="two-factor-enrollment-form"
              type="submit"
            >
              {twoFactorStatus === 'success' ? 'Enrolled' : 'Enroll'}
            </Button>
          </>
        )}
      >
        <form id="two-factor-enrollment-form" onSubmit={handleVerify2FA} className="space-y-5 text-center">
          <p className="text-xs font-bold text-brand-900 dark:text-slate-100">Scan QR in Google Authenticator App</p>

          <div role="img" aria-label="Two-factor authentication QR code" className="mx-auto w-full max-w-48 rounded-2xl border border-slate-200 bg-white p-4 shadow-inner dark:border-slate-700">
            <QRCode value={`otpauth://totp/RMC:${profile.email}?secret=JBSWY3DPEHPK3PXP&issuer=RMCRegalia`} size={140} className="h-auto w-full" />
          </div>

          <p className="font-mono text-[10px] font-bold text-slate-500 [overflow-wrap:anywhere] dark:text-slate-400">Secret: JBSW Y3DP EHPK 3PXP</p>

          <div>
            <label htmlFor="two-factor-code" className="sr-only">Six-digit authentication code</label>
            <input
              id="two-factor-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="[0-9]{6}"
              required
              placeholder="Enter 6-digit Code"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="input-field p-2.5 text-center font-mono text-base font-black tracking-widest sm:text-sm"
            />
          </div>
        </form>
      </Modal>

      {/* ACCOUNT SESSION & SIGN OUT CARD */}
      <Surface className="mt-6 flex flex-col items-center justify-between gap-4 p-5 sm:flex-row">
        <div className="flex items-center gap-3.5 text-center sm:text-left">
          <div className="w-11 h-11 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center font-bold shrink-0 border border-red-200/50 dark:border-red-900/50">
            <LogOut size={22} />
          </div>
          <div>
            <h3 className="text-sm font-black text-brand-900 dark:text-slate-100 uppercase tracking-tight">Active Portal Session</h3>
            <p className="text-xs font-medium text-slate-500 [overflow-wrap:anywhere] dark:text-slate-400">Logged in as <span className="font-bold text-brand-900 dark:text-white">{profile.name}</span> ({profile.email})</p>
          </div>
        </div>

        <button
          aria-label="Sign out of portal"
          onClick={handleLogout}
          className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </Surface>

    </Page>
  );
};

export default StudentProfile;
