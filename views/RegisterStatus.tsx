
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { auth, db } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { Application } from '../types';
import Button from '../components/ui/Button';
import { Clock, CheckCircle2, XCircle, AlertCircle, LogOut } from 'lucide-react';
import { mockData, mockAuth } from '../lib/mockBackend';

const RegisterStatus: React.FC = () => {
  const { user, isMock } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (isMock) {
      const refresh = () => {
        const apps = mockData.getApplications();
        const myApp = apps.find(a => a.id === user.uid);
        setApplication(myApp || null);
        setLoading(false);
      };
      refresh();
      const interval = setInterval(refresh, 2000);
      return () => clearInterval(interval);
    } else {
      try {
        const appRef = ref(db, `applications/${user.uid}`);
        const unsubscribe = onValue(appRef, (snapshot) => {
          setApplication(snapshot.val());
          setLoading(false);
        });
        return () => unsubscribe();
      } catch (e) { console.error(e); }
    }
  }, [user, isMock]);

  const handleLogout = async () => {
    if (isMock) {
      mockAuth.signOut();
      window.location.reload();
    } else {
      await auth.signOut();
      navigate('/login');
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-900"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center">
        {!application ? (
          <div className="space-y-6">
            <AlertCircle size={64} className="mx-auto text-gold-500" />
            <h2 className="text-2xl font-bold text-brand-900">No Application Found</h2>
            <p className="text-slate-500">You haven't submitted a registration application yet.</p>
            <Button onClick={() => navigate('/register')}>Apply Now</Button>
            <Button variant="secondary" onClick={handleLogout}>Sign Out</Button>
          </div>
        ) : application.status === 'pending' ? (
          <div className="space-y-6 animate-pulse">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full mx-auto flex items-center justify-center shadow-inner">
               <Clock size={40} />
            </div>
            <h2 className="text-2xl font-bold text-brand-900">Review Pending</h2>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm text-slate-500 leading-relaxed text-center">
              Your application is being verified. Log in as an <span className="font-bold text-brand-900 underline" onClick={() => handleLogout()}>Admin</span> to approve it.
            </div>
            <Button variant="secondary" onClick={handleLogout}>
              <LogOut size={20}/> Sign Out
            </Button>
          </div>
        ) : application.status === 'rejected' ? (
          <div className="space-y-6">
            <XCircle size={64} className="mx-auto text-red-500" />
            <h2 className="text-2xl font-bold text-brand-900">Application Rejected</h2>
            <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-sm text-red-600">
              <p className="font-bold mb-1">Reason:</p>
              <p>{application.rejection_reason || 'Information provided does not match records.'}</p>
            </div>
            <p className="text-xs text-slate-400">Trial Count: {application.rejection_count}/3 (Monthly)</p>
            {application.rejection_count >= 3 ? (
              <div className="p-4 bg-slate-100 rounded-xl text-slate-500 text-xs italic">
                Form locked. Max rejection limit reached.
              </div>
            ) : (
              <Button onClick={() => navigate('/register')}>Re-apply (Trial {application.rejection_count + 1})</Button>
            )}
            <Button variant="secondary" onClick={handleLogout}>Sign Out</Button>
          </div>
        ) : (
          <div className="space-y-6">
            <CheckCircle2 size={64} className="mx-auto text-green-500" />
            <h2 className="text-2xl font-bold text-brand-900">Account Approved!</h2>
            <p className="text-slate-500">Welcome to the Regal system. Your profile is now active.</p>
            <Button variant="gold" onClick={() => window.location.reload()}>Go to Dashboard</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisterStatus;
