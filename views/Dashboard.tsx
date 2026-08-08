import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AppEvent } from '../types';
import { 
  Calendar, Award, QrCode, FileText, User, ShieldAlert, CheckCircle2, 
  Clock, ArrowRight, Sparkles, TrendingUp, AlertTriangle, ChevronRight, Activity, MapPin
} from 'lucide-react';
import { mockData } from '../lib/mockBackend';

const Dashboard: React.FC = () => {
  const { profile, stats, isMock } = useAuth();
  const navigate = useNavigate();
  const [activeEvents, setActiveEvents] = useState<AppEvent[]>([]);

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
    <div className="p-4 sm:p-5 space-y-4 max-w-6xl mx-auto animate-in fade-in duration-200">
      
      {/* HERO WELCOME BANNER */}
      <section className="bg-gradient-to-br from-brand-900 via-brand-950 to-slate-950 text-white rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden border border-gold-400/30">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gold-400/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <img 
                src={profile?.photo_url || 'https://i.pravatar.cc/150'} 
                className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl object-cover border border-gold-400 shadow-md" 
                alt="Profile"
              />
              <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-0.5 rounded-md shadow">
                <CheckCircle2 size={10} />
              </span>
            </div>

            <div>
              <h1 className="text-lg sm:text-xl font-bold uppercase tracking-tight text-white leading-tight">
                Welcome back, {profile?.name ? profile.name.replace(/^Mayor\s+/i, '') : ''}!
              </h1>
              <p className="text-slate-300 text-[11px] font-medium mt-0.5">
                ID: <span className="font-mono font-bold text-gold-300">{profile?.student_id}</span> • Section: <span className="font-bold text-white">{profile?.school_data?.section}</span>
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <div className="bg-white/10 px-3 py-2 rounded-xl border border-white/10 text-center min-w-[85px] backdrop-blur-sm">
              <p className="text-[8px] font-extrabold text-gold-400 uppercase tracking-widest">Attendance</p>
              <p className="text-lg font-bold text-white mt-0.5">{stats?.attendance_rate || 98}%</p>
            </div>

            <div className="bg-white/10 px-3 py-2 rounded-xl border border-white/10 text-center min-w-[85px] backdrop-blur-sm">
              <p className="text-[8px] font-extrabold text-red-400 uppercase tracking-widest">Sanctions</p>
              <p className="text-lg font-bold text-red-400 mt-0.5">{stats?.sanction_hours || 0}h</p>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK SHORTCUT CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <button
          onClick={() => navigate('/student/qr')}
          className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs hover:border-gold-400/60 transition-all text-left group flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/40 text-brand-900 dark:text-brand-300 flex items-center justify-center font-bold mb-2 group-hover:scale-105 transition-transform">
            <QrCode size={16} />
          </div>
          <div>
            <h3 className="text-[11px] font-bold text-brand-900 dark:text-slate-100 uppercase tracking-tight">My QR Passport</h3>
            <p className="text-[9px] text-slate-400 dark:text-slate-400 font-medium">Download PNG ID</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/student/events')}
          className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs hover:border-gold-400/60 transition-all text-left group flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-lg bg-gold-50 dark:bg-amber-500/20 text-gold-600 dark:text-amber-400 flex items-center justify-center font-bold mb-2 group-hover:scale-105 transition-transform">
            <Calendar size={16} />
          </div>
          <div>
            <h3 className="text-[11px] font-bold text-brand-900 dark:text-slate-100 uppercase tracking-tight">Events</h3>
            <p className="text-[9px] text-slate-400 dark:text-slate-400 font-medium">Campus Assemblies</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/student/ceremonies')}
          className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs hover:border-gold-400/60 transition-all text-left group flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold mb-2 group-hover:scale-105 transition-transform">
            <Award size={16} />
          </div>
          <div>
            <h3 className="text-[11px] font-bold text-brand-900 dark:text-slate-100 uppercase tracking-tight">Ceremonies</h3>
            <p className="text-[9px] text-slate-400 dark:text-slate-400 font-medium">Flag Protocol</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/student/records')}
          className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs hover:border-gold-400/60 transition-all text-left group flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold mb-2 group-hover:scale-105 transition-transform">
            <FileText size={16} />
          </div>
          <div>
            <h3 className="text-[11px] font-bold text-brand-900 dark:text-slate-100 uppercase tracking-tight">Records</h3>
            <p className="text-[9px] text-slate-400 dark:text-slate-400 font-medium">Logs & Export</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/student/profile')}
          className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs hover:border-gold-400/60 transition-all text-left group flex flex-col justify-between col-span-2 sm:col-span-1"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold mb-2 group-hover:scale-105 transition-transform">
            <User size={16} />
          </div>
          <div>
            <h3 className="text-[11px] font-bold text-brand-900 dark:text-slate-100 uppercase tracking-tight">My Profile</h3>
            <p className="text-[9px] text-slate-400 dark:text-slate-400 font-medium">Account Settings</p>
          </div>
        </button>
      </div>

      {/* MAIN ANALYTICS & ACTIVE DIRECTIVES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT 2 COLS: ACTIVE Directives & Events */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <h2 className="text-xs font-black text-brand-900 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
              <Activity size={16} className="text-gold-500" /> Active Campus Assemblies ({activeEvents.length})
            </h2>
            <button 
              onClick={() => navigate('/student/events')}
              className="text-[10px] font-bold text-gold-600 dark:text-gold-400 hover:text-brand-900 dark:hover:text-white flex items-center gap-1 uppercase tracking-wider"
            >
              View All Events <ChevronRight size={12} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeEvents.length > 0 ? (
              activeEvents.map(event => (
                <div 
                  key={event.id}
                  onClick={() => navigate('/student/events')}
                  className="bg-brand-900 text-white p-6 rounded-3xl border-2 border-gold-400/50 shadow-xl hover:border-gold-400 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-500 text-white px-2.5 py-0.5 rounded-full animate-pulse">
                      Active Now
                    </span>
                    <span className="text-[10px] font-bold text-gold-300">
                      Penalty: {event.penaltyValue} {event.penaltyUnit}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-white uppercase tracking-tight group-hover:text-gold-300 transition-colors">
                    {event.title}
                  </h3>
                  <p className="text-slate-300 text-xs line-clamp-2 mt-1">
                    {event.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-bold text-gold-300">
                    <span className="flex items-center gap-1"><Clock size={12} /> Ends: {new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">Open Geofence Map <ArrowRight size={12} /></span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full bg-white p-8 rounded-3xl border-2 border-dashed border-slate-200 text-center space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">No active mandatory assemblies right now.</p>
                <p className="text-[10px] text-slate-400">Check the Events & Ceremonies tabs for upcoming schedules.</p>
              </div>
            )}
          </div>

          {/* UPCOMING CEREMONIES BRIEF */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-brand-900 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
                <Award size={16} className="text-gold-600 dark:text-gold-400" /> Recurring Ceremonies Protocol
              </h3>
              <button 
                onClick={() => navigate('/student/ceremonies')}
                className="text-[10px] font-bold text-gold-600 dark:text-gold-400 hover:text-brand-900 dark:hover:text-white uppercase"
              >
                View Rules
              </button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[9px] font-black uppercase text-gold-700 dark:text-gold-300 bg-gold-50 dark:bg-gold-500/10 border border-gold-200 dark:border-gold-500/30 px-2.5 py-0.5 rounded-full">
                  Every Monday • 07:00 AM
                </span>
                <h4 className="text-xs font-black text-brand-900 dark:text-slate-100 uppercase tracking-tight mt-1">
                  Weekly Institutional Flag Raising Ceremony
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Location: RMC Track Oval & Main Quadrangle</p>
              </div>

              <button
                onClick={() => navigate('/student/ceremonies')}
                className="px-4 py-2 bg-brand-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-800 transition-all self-start sm:self-auto"
              >
                Check Protocol
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT 1 COL: RECENT ACTIVITY & SANCTION STATUS */}
        <div className="space-y-6">
          
          {/* SANCTION SUMMARY WIDGET */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-black text-xs uppercase tracking-widest">
              <ShieldAlert size={18} /> Sanctions Status
            </div>

            <div className="p-4 bg-red-50 dark:bg-red-950/40 rounded-2xl border border-red-100 dark:border-red-900/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-800 dark:text-red-300">Community Service Balance</span>
                <span className="text-lg font-black text-red-700 dark:text-red-400">{stats?.sanction_hours || 0} Hours</span>
              </div>
              <p className="text-[10px] text-red-600 dark:text-red-300/80 font-medium">
                Unexcused absences incur sanction hours payable via SSG-approved community projects.
              </p>
            </div>

            <button
              onClick={() => navigate('/student/records')}
              className="w-full py-2.5 bg-slate-100 dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-brand-900 dark:text-slate-100 rounded-xl text-xs font-black uppercase tracking-widest transition-all text-center"
            >
              View Full Sanction Ledger
            </button>
          </div>

          {/* RECENT ATTENDANCE AUDIT */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-brand-900 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={16} className="text-gold-600 dark:text-gold-400" /> Recent Log Updates
            </h3>

            <div className="space-y-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-brand-900 dark:text-slate-100 uppercase">Flag Ceremony</p>
                  <p className="text-[10px] text-slate-400">July 27, 2026</p>
                </div>
                <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                  Present
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-brand-900 dark:text-slate-100 uppercase">Midyear Convocation</p>
                  <p className="text-[10px] text-slate-400">July 24, 2026</p>
                </div>
                <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full">
                  Late
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default Dashboard;
