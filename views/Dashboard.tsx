import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { AppEvent } from '../types';
import { 
  Calendar, Award, QrCode, FileText, User, ShieldAlert, CheckCircle2, 
  Clock, ArrowRight, Sparkles, TrendingUp, AlertTriangle, ChevronRight, Activity, MapPin,
  Building2, Users2, ScanLine, BarChart3, CalendarDays, ShieldCheck
} from 'lucide-react';
import { mockData } from '../lib/mockBackend';
import { MetricCard, Page, PageHeader, Surface } from '../components/ui/Page';

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

  if (profile?.role === 'admin') return <Navigate to="/admin/attendance" replace />;
  if (profile?.role === 'ssg') return <SSGHome name={profile.name} navigate={navigate} />;
  if (profile?.role === 'ossa') return <Navigate to="/ossa/dashboard" replace />;

  return (
    <Page className="max-w-6xl animate-in fade-in duration-200">
      <PageHeader
        eyebrow={<span className="inline-flex items-center gap-1.5"><Sparkles size={14} /> Student Portal</span>}
        title="Student Dashboard"
        description="Review your attendance standing, campus directives, ceremony schedule, and recent record updates."
      />
      
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
              <h2 className="text-lg sm:text-xl font-bold uppercase tracking-tight text-white leading-tight">
                Welcome back, {profile?.name ? profile.name.replace(/^Mayor\s+/i, '') : ''}!
              </h2>
              <p className="text-slate-300 text-[11px] font-medium mt-0.5">
                ID: <span className="font-mono font-bold text-gold-300">{profile?.student_id}</span> • Section: <span className="font-bold text-white">{profile?.school_data?.section}</span>
              </p>
            </div>
          </div>

        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 lg:grid-cols-4" aria-label="Student metrics">
        <MetricCard icon={<TrendingUp size={20} />} label="Attendance" value={`${stats?.attendance_rate || 98}%`} detail="Current attendance rate" />
        <MetricCard icon={<ShieldAlert size={20} />} label="Sanctions" value={`${stats?.sanction_hours || 0}h`} detail="Community service balance" />
        <MetricCard icon={<CheckCircle2 size={20} />} label="Events Attended" value={stats?.events_attended || 0} detail="Verified check-ins" />
        <MetricCard icon={<AlertTriangle size={20} />} label="Events Missed" value={stats?.events_missed || 0} detail="Recorded absences" />
      </div>

      {/* QUICK SHORTCUT CARDS */}
      <div className="grid grid-cols-1 gap-2.5 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <button
          aria-label="My QR passport"
          onClick={() => navigate('/student/qr')}
          className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs hover:border-gold-400/60 transition-all text-left group flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/40 text-brand-900 dark:text-brand-300 flex items-center justify-center font-bold mb-2 group-hover:scale-105 transition-transform">
            <QrCode size={16} />
          </div>
          <div>
              <h3 className="text-[11px] font-bold text-brand-900 dark:text-slate-100 uppercase tracking-tight">QR</h3>
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
          </div>
        </button>

        <button
          onClick={() => navigate('/student/profile')}
          className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs hover:border-gold-400/60 transition-all text-left group flex flex-col justify-between xs:col-span-2 sm:col-span-1"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold mb-2 group-hover:scale-105 transition-transform">
            <User size={16} />
          </div>
          <div>
              <h3 className="text-[11px] font-bold text-brand-900 dark:text-slate-100 uppercase tracking-tight">Profile</h3>
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
              View <ChevronRight size={12} />
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
              <Surface className="col-span-full space-y-2 border-2 border-dashed p-8 text-center dark:border-slate-700">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">No active mandatory assemblies right now.</p>
                <p className="text-[10px] text-slate-400">Check the Events & Ceremonies tabs for upcoming schedules.</p>
              </Surface>
            )}
          </div>

          {/* UPCOMING CEREMONIES BRIEF */}
          <Surface className="space-y-4 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-brand-900 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
                <Award size={16} className="text-gold-600 dark:text-gold-400" /> Recurring Ceremonies Protocol
              </h3>
              <button 
                onClick={() => navigate('/student/ceremonies')}
                className="text-[10px] font-bold text-gold-600 dark:text-gold-400 hover:text-brand-900 dark:hover:text-white uppercase"
              >
                Rules
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
                Protocol
              </button>
            </div>
          </Surface>
        </div>

        {/* RIGHT 1 COL: RECENT ACTIVITY & SANCTION STATUS */}
        <div className="space-y-6">
          
          {/* SANCTION SUMMARY WIDGET */}
          <Surface className="space-y-4 p-4 sm:p-6">
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
              Sanctions
            </button>
          </Surface>

          {/* RECENT ATTENDANCE AUDIT */}
          <Surface className="space-y-4 p-4 sm:p-6">
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
          </Surface>

        </div>

      </div>

    </Page>
  );
};

const SSGHome = ({ name, navigate }: { name: string; navigate: ReturnType<typeof useNavigate> }) => {
  const applications = mockData.getApplications();
  const events = mockData.getEvents();
  const campuses = mockData.getSchoolStructure();
  const activeEvents = events.filter((event) => event.status === 'active');

  const actions = [
    { label: 'SSG Control Panel', description: 'Manage the institution directory and applications.', path: '/ssg/panel', icon: ShieldCheck, tone: 'bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200' },
    { label: 'Attendance', description: 'Review attendance trends and institutional records.', path: '/admin/attendance', icon: BarChart3, tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
    { label: 'Members', description: 'Search member profiles and manage student records.', path: '/admin/members', icon: Users2, tone: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300' },
    { label: 'Mayor Scanner', description: 'Open attendance scanning and verification tools.', path: '/mayor/scan', icon: ScanLine, tone: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
  ];

  return (
    <Page className="max-w-6xl animate-in fade-in duration-200">
      <PageHeader
        eyebrow={<span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} /> SSG workspace</span>}
        title={`Welcome, ${name || 'SSG Officer'}`}
        description="Monitor institution activity and open your most-used administration tools."
      />

      <section className="relative overflow-hidden rounded-2xl border border-brand-800 bg-brand-900 p-5 text-white shadow-lg sm:p-7">
        <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-gold-400/15 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">Institution overview</p>
            <h2 className="mt-1 text-2xl font-bold text-white">Your administration command center</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Review pending work, oversee active attendance events, and manage the school community from one place.</p>
          </div>
          <button onClick={() => navigate('/ssg/panel')} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-gold-gradient px-5 py-3 text-sm font-bold text-brand-900 shadow-md transition hover:brightness-105">
            Open SSG Panel <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="SSG overview metrics">
        <MetricCard icon={<Building2 size={20} />} label="Campuses" value={campuses.length} detail="Directory roots" />
        <MetricCard icon={<Users2 size={20} />} label="Applications" value={applications.length} detail="Pending review" />
        <MetricCard icon={<CalendarDays size={20} />} label="Active Events" value={activeEvents.length} detail={`${events.length} total records`} />
        <MetricCard icon={<Activity size={20} />} label="Operations" value={actions.length} detail="Available workspaces" />
      </div>

      <section aria-labelledby="ssg-quick-actions-title">
        <div className="mb-3 flex items-center justify-between">
          <div><h2 id="ssg-quick-actions-title" className="text-lg font-bold text-brand-900 dark:text-white">Quick actions</h2><p className="text-sm text-slate-500 dark:text-slate-400">Jump directly to an administrative workspace.</p></div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {actions.map(({ label, description, path, icon: Icon, tone }) => (
            <button key={path} onClick={() => navigate(path)} className="group flex min-h-32 items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-gold-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon size={21} /></span>
              <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-3 font-bold text-brand-900 dark:text-white">{label}<ChevronRight size={17} className="shrink-0 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-gold-500" /></span><span className="mt-1 block text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</span></span>
            </button>
          ))}
        </div>
      </section>
    </Page>
  );
};

export default Dashboard;
