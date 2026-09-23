import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import Button from '../components/ui/Button';
import ThemeToggle from '../components/ui/ThemeToggle';
import { appData, appAuth, uploadDocument, documentUrl, refreshData } from '../lib/backend';
import { supabase } from '../lib/supabase';
import { AppLoading } from '../components/ui/Skeleton';
import { toast } from '../lib/toast';
import ProfileAvatar from '../components/ui/ProfileAvatar';

const fieldLabels: Record<string, string> = {
  name: 'Full name', student_id: 'Student ID', guardian_name: 'Guardian name',
  guardian_phone: 'Guardian contact number', photo: 'Profile photo',
  id_front: 'Student ID front', id_back: 'Student ID back',
};

const dashboardOpenedKey = (uid: string) => `rmc:dashboard-opened:${uid}`;

export default function RegisterStatus() {
  const { user, profile, loading, revision } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const application = appData.getApplications().find(a => a.id === user?.uid);
  const [corrections, setCorrections] = useState({ name: '', student_id: '', guardian_name: '', guardian_phone: '' });
  const clarificationFields = application?.clarification_fields || [];
  const canResubmit = Boolean(application && ['rejected', 'bounced', 'deleted'].includes(application.status));
  const savedProfilePhoto = application?.documents?.photo || application?.form_data?.photo_url || '';
  const photoNeedsCorrection = application?.status === 'bounced' && clarificationFields.includes('photo');
  const schoolData = application?.form_data?.school_data;

  useEffect(() => { if (!loading && !user) navigate('/login'); }, [loading, user, navigate]);
  useEffect(() => {
    if (!loading && profile && user && window.localStorage.getItem(dashboardOpenedKey(user.uid)) === 'true') {
      navigate('/dashboard', { replace: true });
    }
  }, [loading, profile, user, navigate]);
  useEffect(() => {
    if (!application) return;
    setCorrections({
      name: application.form_data.name || '',
      student_id: application.form_data.student_id || '',
      guardian_name: application.form_data.guardian?.name || '',
      guardian_phone: application.form_data.guardian?.contact || '',
    });
  }, [application?.id, application?.reviewed_at, revision]);

  if (loading) return <AppLoading label="Loading application status" />;

  const upload = async (file: File | undefined, kind: string) => {
    if (!file) return;
    setUploading(true); setError('');
    try {
      const path = await uploadDocument(file, kind);
      const { error } = await toast.result(() => supabase.rpc('rmc_admission_update', { documents: { [kind]: path } }), 'Save admission document');
      if (error) throw error;
      await refreshData();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to upload document.'); }
    finally { setUploading(false); }
  };

  const resubmit = async () => {
    if (!application) return;
    setError('');
    try {
      const updated = {
        ...application.form_data,
        name: corrections.name.trim(),
        student_id: corrections.student_id.trim(),
        guardian: {
          ...application.form_data.guardian,
          name: corrections.guardian_name.trim(),
          contact: corrections.guardian_phone.trim(),
        },
      };
      await appData.submitApplication(updated, '');
      await refreshData();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to resubmit the application.'); }
  };

  const heading = profile ? 'Account approved'
    : application?.status === 'bounced' ? 'Clarification requested'
      : application?.status === 'rejected' ? 'Application rejected'
        : application?.status === 'deleted' ? 'Application deleted'
          : application ? 'Admission review pending' : 'No application found';
  const description = profile ? 'Your account is active.'
    : canResubmit ? application?.rejection_reason || 'Update your application and submit it again.'
      : 'Your school officer will review your admission details and supporting documents.';

  return <div className="min-h-dvh bg-brand-900 p-5 pt-20">
    <div className="absolute top-4 right-4"><ThemeToggle /></div>
    <main className="app-surface mx-auto max-w-lg space-y-5 p-6">
      <h1 className="text-2xl font-bold">{heading}</h1>
      <p className="text-sm text-slate-500 [overflow-wrap:anywhere]">{description}</p>
      {application && <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Status</dt><dd className="font-bold capitalize">{application.status === 'bounced' ? 'Returned for clarification' : application.status}</dd></div><div><dt className="text-slate-500">Name</dt><dd>{application.form_data.name}</dd></div><div><dt className="text-slate-500">Student ID</dt><dd>{application.form_data.student_id}</dd></div><div><dt className="text-slate-500">School unit</dt><dd>{schoolData?.department || schoolData?.type || '—'}</dd></div><div><dt className="text-slate-500">Program / track</dt><dd>{schoolData?.program || schoolData?.track || schoolData?.strand || '—'}</dd></div><div><dt className="text-slate-500">Level</dt><dd>{schoolData?.level || '—'}</dd></div><div><dt className="text-slate-500">Section</dt><dd>{schoolData?.section || '—'}</dd></div></dl>}

      {application && ['bounced', 'rejected'].includes(application.status) && <section className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
        <div><h2 className="font-bold">Update your application</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Review your details, make corrections, and submit the application again.</p></div>
        {(application.status === 'rejected' ? Object.keys(corrections) : clarificationFields.filter(field => field in corrections)).map(field => <label className="block text-sm font-semibold" key={field}>{fieldLabels[field]}
          <input className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900" value={corrections[field as keyof typeof corrections]} onChange={event => setCorrections(current => ({ ...current, [field]: event.target.value }))} />
        </label>)}
      </section>}

      {application && application.status !== 'approved' && <section className="space-y-4">
        <h2 className="font-bold">{application.status === 'bounced' ? 'Requested documents' : 'Admission documents'}</h2>
        <p className="text-sm text-slate-500">Profile photo is required. Additional documents appear only when requested by a reviewer.</p>
        {([['photo', 'Profile photo'], ['id_front', 'Student ID front'], ['id_back', 'Student ID back']] as const)
          .filter(([kind]) => kind === 'photo' || (application.status === 'bounced' && clarificationFields.includes(kind)))
          .map(([kind, label]) => <div key={kind} className="block text-sm">{kind === 'photo' && savedProfilePhoto && !photoNeedsCorrection ? <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><p className="text-xs font-semibold text-slate-500">Submitted profile photo</p><ProfileAvatar src={savedProfilePhoto} alt="Submitted profile" className="mt-2 h-28 w-28 rounded-xl object-cover" /><a href={savedProfilePhoto} target="_blank" rel="noreferrer" className="mt-2 block text-xs underline">Open submitted photo</a></div> : <label>{photoNeedsCorrection ? 'Replace profile photo' : label}<input className="mt-2 block w-full" type="file" accept={kind === 'photo' ? 'image/jpeg,image/png,image/webp' : 'image/jpeg,image/png,image/webp,application/pdf'} disabled={uploading} onChange={event => void upload(event.target.files?.[0], kind)} /></label>}{kind !== 'photo' && application.documents?.[kind] && <button type="button" className="mt-1 underline" onClick={async () => { const url = await documentUrl(application.documents![kind]); window.open(url, '_blank', 'noopener,noreferrer'); }}>View uploaded document</button>}</div>)}
      </section>}
      {error && <p role="alert" className="text-red-600">{error}</p>}
      {uploading && <p role="status">Uploading…</p>}
      {profile && <Button onClick={() => { window.localStorage.setItem(dashboardOpenedKey(user!.uid), 'true'); navigate('/dashboard', { replace: true }); }}>Open dashboard</Button>}
      {canResubmit && <Button onClick={resubmit}>{application?.status === 'bounced' ? 'Submit clarifications' : 'Reapply with updated details'}</Button>}
      <Button variant="secondary" onClick={async () => { await appAuth.signOut(); navigate('/login'); }}>Sign out</Button>
    </main>
  </div>;
}
