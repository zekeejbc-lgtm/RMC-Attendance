import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import ProfileAvatar from '../ui/ProfileAvatar';

export default function RecordedBy({ uid, name }: { uid?: string; name: string }) {
  const [person, setPerson] = useState<{ name: string; role: string; photo_url?: string } | null>(null);
  useEffect(() => {
    let active = true;
    setPerson(null);
    if (uid) void supabase.rpc('rmc_attendance_scanner', { scanner_uid: uid }).then(({ data, error }) => {
      if (active && !error) setPerson(data);
    }, () => { /* Keep the saved verifier name if the profile cannot load. */ });
    return () => { active = false; };
  }, [uid]);
  return <div className="flex min-w-0 items-center gap-3">
    <ProfileAvatar src={person?.photo_url} alt={`${person?.name || name} profile`} className="h-10 w-10 shrink-0 rounded-full border border-slate-200 object-cover dark:border-slate-700" />
    <div className="min-w-0"><p className="break-words font-semibold text-brand-900 dark:text-slate-100">{name}</p><p className="mt-0.5 text-xs capitalize text-slate-500 dark:text-slate-400">{person?.role?.replaceAll('_', ' ') || (uid ? 'Attendance verifier' : 'System record')}</p></div>
  </div>;
}
