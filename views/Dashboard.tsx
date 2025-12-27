
import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { Event } from '../types';
import { 
  Calendar, 
  UserCircle, 
  Trophy, 
  ShieldAlert, 
  TrendingUp, 
  ChevronRight,
  ArrowRight,
  RefreshCcw,
  Clock,
  Target
} from 'lucide-react';
import { format } from 'date-fns';
import { mockData } from '../lib/mockBackend';

const Dashboard: React.FC = () => {
  const { profile, stats, isMock } = useAuth();
  const [activeEvents, setActiveEvents] = useState<Event[]>([]);

  useEffect(() => {
    if (isMock) {
      const refresh = () => {
        const events = mockData.getEvents().filter(e => e.status === 'active');
        setActiveEvents(events);
      };
      refresh();
      const interval = setInterval(refresh, 5000);
      return () => clearInterval(interval);
    }
  }, [isMock]);

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Profile Summary - Sleeker scaling */}
      <section className="bg-brand-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden border-b-2 border-gold-400">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gold-400/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
             <div className="relative">
                <img 
                  src={profile?.photo_url} 
                  className="w-16 h-16 rounded-xl object-cover border-2 border-gold-400/30 p-0.5 shadow-lg" 
                  alt="Profile"
                />
                <div className="absolute -bottom-1 -right-1 bg-gold-400 text-brand-900 p-1 rounded-md shadow-md border border-brand-900">
                   <ShieldAlert size={10} />
                </div>
             </div>
             <div>
                <h2 className="text-xl font-black tracking-tight uppercase leading-none mb-1">Welcome, {profile?.name?.split(' ')[0]}</h2>
                <p className="text-gold-200/40 text-[8px] font-bold uppercase tracking-widest">{profile?.role} • {profile?.school_data?.section}</p>
             </div>
          </div>
          <div className="flex gap-2">
             <div className="bg-white/5 px-5 py-3 rounded-xl border border-white/5 text-center min-w-[90px]">
                <p className="text-[7px] text-gold-400 font-bold uppercase tracking-widest mb-1">Success</p>
                <p className="text-xl font-black">{stats?.attendance_rate || 0}%</p>
             </div>
             <div className="bg-white/5 px-5 py-3 rounded-xl border border-white/5 text-center min-w-[90px]">
                <p className="text-[7px] text-red-400 font-bold uppercase tracking-widest mb-1">Service</p>
                <p className="text-xl font-black text-red-400">{stats?.sanction_hours || 0}h</p>
             </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-black text-[10px] text-brand-900 uppercase tracking-widest flex items-center gap-2">
              <Target size={14} className="text-gold-500" /> Operational Objectives
            </h3>
            {activeEvents.length > 0 && <span className="text-[7px] font-black text-green-500 animate-pulse bg-green-50 px-2 py-0.5 rounded-full uppercase tracking-widest border border-green-100">Live</span>}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeEvents.map(event => (
              <div key={event.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group cursor-pointer">
                 <div className="flex justify-between items-start mb-4">
                    <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center text-brand-900 border border-brand-100">
                       <Trophy size={16} />
                    </div>
                 </div>
                 <h4 className="font-bold text-brand-900 text-sm uppercase tracking-tight mb-1">{event.title}</h4>
                 <p className="text-slate-400 text-[8px] font-bold uppercase tracking-widest mb-4 opacity-70">
                   Institutional Verified Entry Point
                 </p>
                 <button className="flex items-center text-brand-900 text-[8px] font-black uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                   Access Deployment <ArrowRight size={12} className="text-gold-500 ml-1.5" />
                 </button>
              </div>
            ))}
            {activeEvents.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white rounded-2xl border-2 border-dashed border-slate-100">
                 <p className="text-slate-300 font-bold uppercase tracking-widest text-[9px]">Scanning for global directives...</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-black text-[10px] text-brand-900 uppercase tracking-widest flex items-center gap-2 px-2">
            <TrendingUp size={14} className="text-gold-500" /> Audit Log
          </h3>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3.5 flex items-center gap-3 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer group">
                <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 font-black text-[8px] group-hover:bg-gold-50 group-hover:text-gold-600 transition-all uppercase">
                  {i === 1 ? 'LOG' : i === 2 ? 'SNC' : 'REG'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold text-brand-900 uppercase tracking-tight truncate">
                    {i === 1 ? 'Attendance Record Verified' : i === 2 ? 'Service Hour Modification' : 'Identity Verification Complete'}
                  </p>
                  <p className="text-[7px] text-slate-300 font-black uppercase tracking-widest mt-0.5">Jan 24 • 14:20</p>
                </div>
              </div>
            ))}
            <button className="w-full py-3.5 text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 hover:bg-gold-50 hover:text-brand-900 transition-colors">
              View Detailed Audit History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
