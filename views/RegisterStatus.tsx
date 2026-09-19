import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import Button from '../components/ui/Button';
import ThemeToggle from '../components/ui/ThemeToggle';
import { appData, appAuth, uploadDocument, documentUrl, refreshData } from '../lib/backend';
import { supabase } from '../lib/supabase';

export default function RegisterStatus() {
  const { user, profile, loading, revision } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const application = appData.getApplications().find(a => a.id === user?.uid);
  useEffect(() => { if (!loading && !user) navigate('/login'); }, [loading, user, navigate]);
  if (loading) return <p role="status" aria-label="Loading application status" className="p-8">Loading admission status…</p>;
  const upload = async (file: File | undefined, kind: string) => {
    if (!file) return;
    setUploading(true); setError('');
    try {
      const path = await uploadDocument(file, kind);
      const { error } = await supabase.rpc('rmc_admission_update', { documents: { [kind]: path } });
      if (error) throw error; await refreshData();
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to upload document.'); }
    finally { setUploading(false); }
  };
  return <div className="min-h-dvh bg-brand-900 p-5 pt-20">
    <div className="absolute top-4 right-4"><ThemeToggle /></div>
    <main className="app-surface mx-auto max-w-lg space-y-5 p-6">
      <h1 className="text-2xl font-bold">{profile ? 'Account approved' : application?.status === 'rejected' ? 'Application needs revision' : application ? 'Admission review pending' : 'No application found'}</h1>
      <p className="text-sm text-slate-500 [overflow-wrap:anywhere]">{profile ? 'Your account is active.' : application?.status === 'rejected' ? application.rejection_reason : 'Your school officer will review your admission details and supporting documents.'}</p>
      {application && <dl className="space-y-2 text-sm"><dt>Name</dt><dd>{application.form_data.name}</dd><dt>Student ID</dt><dd>{application.form_data.student_id}</dd><dt>Section</dt><dd>{application.form_data.school_data.section}</dd></dl>}
      {application && application.status !== 'approved' && <section className="space-y-4">
        <h2 className="font-bold">Admission documents</h2>
        <p className="text-sm text-slate-500">Private uploads. JPG, PNG, WebP, or PDF, up to 5 MB each.</p>
        {([['photo', 'Profile photo'], ['id_front', 'Student ID front'], ['id_back', 'Student ID back']] as const).map(([kind, label]) => <label key={kind} className="block text-sm">{label}<input className="mt-2 block w-full" type="file" accept={kind === 'photo' ? 'image/jpeg,image/png,image/webp' : 'image/jpeg,image/png,image/webp,application/pdf'} disabled={uploading} onChange={event => void upload(event.target.files?.[0], kind)} />{application.documents?.[kind] && <button type="button" className="mt-1 underline" onClick={async () => { const url = await documentUrl(application.documents![kind]); window.open(url, '_blank', 'noopener,noreferrer'); }}>View uploaded document</button>}</label>)}
      </section>}
      {error && <p role="alert" className="text-red-600">{error}</p>}
      {uploading && <p role="status">Uploading…</p>}
      {profile && <Button onClick={() => navigate('/dashboard')}>Open dashboard</Button>}
      {application?.status === 'rejected' && application.rejection_count < 3 && <Button onClick={() => navigate('/register')}>Revise and resubmit</Button>}
      <Button variant="secondary" onClick={async () => { await appAuth.signOut(); navigate('/login'); }}>Sign out</Button>
    </main>
  </div>;
}
