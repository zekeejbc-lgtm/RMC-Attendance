import React, { useEffect, useState } from 'react';
import { ShieldAlert, AlertTriangle, Snowflake, Lock } from 'lucide-react';
import { appData } from '../../lib/backend';
import { useAuth } from '../AuthContext';

export const FreezeBanner: React.FC = () => {
  const { profile } = useAuth();
  const [systemFreeze, setSystemFreeze] = useState(appData.getSystemFreezeStatus());
  const [isScopeFrozen, setIsScopeFrozen] = useState(false);

  const refreshFreeze = () => {
    const freezeState = appData.getSystemFreezeStatus();
    setSystemFreeze(freezeState);
    if (profile) {
      setIsScopeFrozen(appData.isUserScopeFrozen(profile));
    }
  };

  useEffect(() => {
    refreshFreeze();
    window.addEventListener('rmc_data_update', refreshFreeze);
    const interval = setInterval(refreshFreeze, 4000);
    return () => {
      window.removeEventListener('rmc_data_update', refreshFreeze);
      clearInterval(interval);
    };
  }, [profile?.uid, profile?.student_id, profile?.role]);

  if (!systemFreeze.isFrozen && !isScopeFrozen) return null;

  return (
    <div className="w-full bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white px-4 py-3 shadow-lg border-b border-red-700/50 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl shrink-0">
          {systemFreeze.isFrozen ? <Snowflake className="w-6 h-6 text-white animate-spin-slow" /> : <Lock className="w-6 h-6 text-amber-200" />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-black text-xs uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-md">
              {systemFreeze.isFrozen ? 'SYSTEM ACCESS FROZEN' : 'DEPARTMENT / SCOPE FROZEN'}
            </span>
            <span className="text-[11px] opacity-80">
              {systemFreeze.frozenBy ? `By: ${systemFreeze.frozenBy}` : ''}
            </span>
          </div>
          <p className="text-xs sm:text-sm font-semibold mt-0.5">
            {systemFreeze.isFrozen
              ? systemFreeze.reason || 'School account payment is pending or unpaid. System operations are currently locked.'
              : 'Your assigned department or class node has been frozen by administration.'}
          </p>
        </div>
      </div>

      {profile?.role === 'admin' && (
        <a
          href="#/admin/controls?tab=freeze"
          className="shrink-0 px-3.5 py-1.5 bg-white text-red-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition shadow-sm flex items-center gap-1.5 uppercase tracking-wide"
        >
          <ShieldAlert size={14} /> Manage Freeze Status
        </a>
      )}
    </div>
  );
};
