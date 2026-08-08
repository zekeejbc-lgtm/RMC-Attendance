import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  FileCheck2, 
  Search, 
  Filter, 
  X, 
  MinusCircle, 
  PlusCircle, 
  RotateCcw, 
  Check, 
  AlertCircle, 
  Calendar, 
  ExternalLink, 
  FileText, 
  GraduationCap, 
  School, 
  Phone, 
  Mail, 
  User, 
  ShieldCheck, 
  ChevronRight, 
  Sparkles, 
  Download,
  AlertTriangle,
  Send
} from 'lucide-react';
import { mockData } from '../lib/mockBackend';
import { UserProfile, UserStats, ExcuseApplication } from '../types';
import Button from '../components/ui/Button';

interface StudentWithStats extends UserProfile {
  stats: UserStats;
  sanction_logs?: any[];
}

const OSSADashboard: React.FC = () => {
  const [students, setStudents] = useState<StudentWithStats[]>([]);
  const [excuseApps, setExcuseApps] = useState<ExcuseApplication[]>([]);
  const [activeTab, setActiveTab] = useState<'roster' | 'excuses' | 'ledger'>('roster');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [sanctionFilter, setSanctionFilter] = useState<'all' | 'has_sanctions' | 'cleared'>('all');

  // Selected Student Modal State
  const [selectedStudent, setSelectedStudent] = useState<StudentWithStats | null>(null);
  const [studentDetails, setStudentDetails] = useState<any>(null);

  // Sanction Adjustment Form inside Modal
  const [adjustMode, setAdjustMode] = useState<'deduct' | 'add' | 'clear' | null>(null);
  const [adjustHours, setAdjustHours] = useState<number>(1);
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [adjustSuccess, setAdjustSuccess] = useState<string | null>(null);

  // Excuse Application Modal Review State
  const [selectedExcuse, setSelectedExcuse] = useState<ExcuseApplication | null>(null);
  const [excuseWaiveHours, setExcuseWaiveHours] = useState<number>(2);
  const [excuseNote, setExcuseNote] = useState<string>('');
  const [excuseActionSuccess, setExcuseActionSuccess] = useState<string | null>(null);

  // Load Data
  const loadData = () => {
    const studentList = mockData.getAllStudents();
    setStudents(studentList as StudentWithStats[]);
    const excuses = mockData.getExcuseApplications();
    setExcuseApps(excuses);

    if (selectedStudent) {
      const updatedDetail = mockData.getUserDetail(selectedStudent.uid);
      setStudentDetails(updatedDetail);
      // update stats in selectedStudent as well
      if (updatedDetail) {
        setSelectedStudent(prev => prev ? { ...prev, stats: updatedDetail.stats } : null);
      }
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('rmc_auth_update', loadData);
    return () => window.removeEventListener('rmc_auth_update', loadData);
  }, []);

  // Compute Analytics
  const totalStudents = students.length;
  const studentsWithSanctions = students.filter(s => (s.stats?.sanction_hours || 0) > 0);
  const clearedStudents = students.filter(s => (s.stats?.sanction_hours || 0) === 0);
  const totalSanctionHours = students.reduce((acc, curr) => acc + (curr.stats?.sanction_hours || 0), 0);
  const pendingExcuseCount = excuseApps.filter(a => a.status === 'pending').length;

  // Unique departments for filter
  const departments = Array.from(
    new Set(students.map(s => s.school_data?.department).filter(Boolean) as string[])
  );

  // Filtered Roster safely handling optional fields
  const filteredStudents = students.filter(s => {
    const name = s.name || '';
    const studentId = s.student_id || '';
    const section = s.school_data?.section || '';
    const email = s.email || '';
    const department = s.school_data?.department || '';

    const matchesSearch = 
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept = deptFilter === 'all' || department === deptFilter;

    let matchesSanction = true;
    if (sanctionFilter === 'has_sanctions') matchesSanction = (s.stats?.sanction_hours || 0) > 0;
    if (sanctionFilter === 'cleared') matchesSanction = (s.stats?.sanction_hours || 0) === 0;

    return matchesSearch && matchesDept && matchesSanction;
  });

  // Handle Opening Student Modal
  const openStudentModal = (student: StudentWithStats) => {
    setSelectedStudent(student);
    const detail = mockData.getUserDetail(student.uid);
    setStudentDetails(detail);
    setAdjustMode(null);
    setAdjustReason('');
    setAdjustHours(1);
    setAdjustSuccess(null);
  };

  // Handle Sanction Adjustment Action
  const handleSanctionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !adjustMode) return;

    if (adjustMode === 'clear') {
      const note = adjustReason || 'Fully cleared and resolved by OSSA Director.';
      mockData.resolveStudentSanctions(selectedStudent.uid, note);
      setAdjustSuccess('Sanctions successfully cleared!');
    } else if (adjustMode === 'deduct') {
      if (adjustHours <= 0) return;
      const reason = adjustReason || 'Sanction hours deducted for completed service.';
      mockData.adjustSanctionHours(selectedStudent.uid, -adjustHours, reason);
      setAdjustSuccess(`Deducted ${adjustHours} sanction hours.`);
    } else if (adjustMode === 'add') {
      if (adjustHours <= 0) return;
      const reason = adjustReason || 'Additional sanction hours issued by OSSA.';
      mockData.adjustSanctionHours(selectedStudent.uid, adjustHours, reason);
      setAdjustSuccess(`Added ${adjustHours} sanction hours.`);
    }

    loadData();
    setAdjustMode(null);
    setAdjustReason('');
    setTimeout(() => setAdjustSuccess(null), 3500);
  };

  // Handle Reviewing Excuse Application
  const handleReviewExcuse = (status: 'approved' | 'rejected') => {
    if (!selectedExcuse) return;
    const note = excuseNote || (status === 'approved' ? 'Approved by OSSA Director.' : 'Rejected due to insufficient documentation.');
    const waived = status === 'approved' ? Number(excuseWaiveHours) : 0;

    mockData.reviewExcuseApplication(selectedExcuse.id, status, note, waived);
    setExcuseActionSuccess(`Application ${status.toUpperCase()} successfully.`);
    loadData();
    setSelectedExcuse(null);
    setExcuseNote('');
    setTimeout(() => setExcuseActionSuccess(null), 3500);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* OSSA PORTAL HEADER */}
      <div className="bg-gradient-to-r from-brand-950 via-brand-900 to-brand-950 p-6 rounded-3xl border border-gold-400/30 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-gold-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gold-400/20 text-gold-300 border border-gold-400/40 flex items-center justify-center shrink-0 shadow-inner">
              <Building2 size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-gold-400/20 text-gold-300 border border-gold-400/40 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck size={12} /> Office of Student Services and Affairs
                </span>
                {pendingExcuseCount > 0 && (
                  <span className="bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full animate-pulse">
                    {pendingExcuseCount} Pending Excuses
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">OSSA Student Affairs & Sanctions Hub</h1>
              <p className="text-slate-300 text-xs sm:text-sm font-medium mt-0.5">
                Comprehensive oversight of student discipline, sanction ledger, resolution controls, and excuse applications.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button 
              onClick={loadData}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>Refresh Records</span>
            </button>
            <button 
              onClick={() => alert("Sanction summary exported to CSV format for school record archives.")}
              className="px-4 py-2.5 bg-gold-400 hover:bg-gold-300 text-brand-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <Download size={14} />
              <span>Export Roster CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* ANALYTICS METRICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        
        {/* Total Students */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Total Enrolled</span>
            <Users size={18} className="text-brand-900 dark:text-gold-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-brand-900 dark:text-white">{totalStudents}</span>
            <span className="text-[10px] font-bold text-slate-400">Students</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">Registered in portal</p>
        </div>

        {/* Active Sanctions */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-red-200/80 dark:border-red-900/50 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-red-600 dark:text-red-400">
            <span className="text-[10px] font-black uppercase tracking-wider">With Sanctions</span>
            <ShieldAlert size={18} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400">{studentsWithSanctions.length}</span>
            <span className="text-[10px] font-bold text-red-500/80 dark:text-red-400/80">
              ({totalStudents > 0 ? Math.round((studentsWithSanctions.length / totalStudents) * 100) : 0}%)
            </span>
          </div>
          <p className="text-[10px] text-red-600/80 dark:text-red-400/80 font-medium truncate">Action required</p>
        </div>

        {/* Sanction-Free / Cleared */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Cleared Status</span>
            <CheckCircle2 size={18} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">{clearedStudents.length}</span>
            <span className="text-[10px] font-bold text-emerald-500">0 Hours</span>
          </div>
          <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-medium truncate">No active penalty</p>
        </div>

        {/* Total Outstanding Hours */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Total Penalty Hours</span>
            <Clock size={18} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">{totalSanctionHours}</span>
            <span className="text-[10px] font-bold text-amber-500">Hours</span>
          </div>
          <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 font-medium truncate">Accumulated system-wide</p>
        </div>

        {/* Pending Excuse Applications */}
        <div className="col-span-2 lg:col-span-1 bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-blue-200/80 dark:border-blue-900/50 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Excuse Applications</span>
            <FileCheck2 size={18} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">{pendingExcuseCount}</span>
            <span className="text-[10px] font-bold text-blue-500">Pending</span>
          </div>
          <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80 font-medium truncate">Medical / Absence letters</p>
        </div>

      </div>

      {/* ACTION ALERTS / SUCCESS NOTIFICATIONS */}
      {adjustSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
            <span>{adjustSuccess}</span>
          </div>
          <button onClick={() => setAdjustSuccess(null)} className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg">
            <X size={14} />
          </button>
        </div>
      )}

      {excuseActionSuccess && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-blue-600 dark:text-blue-400" />
            <span>{excuseActionSuccess}</span>
          </div>
          <button onClick={() => setExcuseActionSuccess(null)} className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg">
            <X size={14} />
          </button>
        </div>
      )}

      {/* MAIN TAB SWITCHER */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('roster')}
          className={`px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'roster'
              ? 'bg-brand-900 text-white dark:bg-gold-400 dark:text-slate-950 shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <Users size={16} />
          <span>Student Sanction Roster ({filteredStudents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('excuses')}
          className={`px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer relative ${
            activeTab === 'excuses'
              ? 'bg-brand-900 text-white dark:bg-gold-400 dark:text-slate-950 shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <FileCheck2 size={16} />
          <span>Excuse Applications</span>
          {pendingExcuseCount > 0 && (
            <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {pendingExcuseCount}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: STUDENT ROSTER & SANCTION MANAGEMENT */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          
          {/* SEARCH & FILTERS TOOLBAR */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search student name, ID, section..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              
              {/* Dept Selector */}
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300">
                <Filter size={14} className="text-slate-400" />
                <span>Dept:</span>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="bg-transparent text-brand-900 dark:text-white focus:outline-none cursor-pointer font-extrabold"
                >
                  <option value="all">All Departments</option>
                  {departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Sanction Status Selector */}
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
                <button
                  onClick={() => setSanctionFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                    sanctionFilter === 'all' ? 'bg-brand-900 text-white dark:bg-gold-400 dark:text-slate-950' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  All ({students.length})
                </button>
                <button
                  onClick={() => setSanctionFilter('has_sanctions')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                    sanctionFilter === 'has_sanctions' ? 'bg-red-600 text-white shadow' : 'text-red-500 hover:text-red-700'
                  }`}
                >
                  With Sanctions ({studentsWithSanctions.length})
                </button>
                <button
                  onClick={() => setSanctionFilter('cleared')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                    sanctionFilter === 'cleared' ? 'bg-emerald-600 text-white shadow' : 'text-emerald-500 hover:text-emerald-700'
                  }`}
                >
                  Cleared ({clearedStudents.length})
                </button>
              </div>

            </div>

          </div>

          {/* STUDENT ROSTER GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.length === 0 ? (
              <div className="col-span-full bg-white dark:bg-slate-800 p-8 rounded-3xl text-center space-y-3 border border-slate-200 dark:border-slate-700">
                <ShieldCheck size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
                <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase">No Matching Student Records Found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">Try resetting search parameters or filters to view student accounts.</p>
              </div>
            ) : (
              filteredStudents.map((s) => {
                const hours = s.stats?.sanction_hours || 0;
                const hasSanction = hours > 0;

                return (
                  <div
                    key={s.uid}
                    onClick={() => openStudentModal(s)}
                    className="group bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700/80 hover:border-gold-400/60 transition-all cursor-pointer shadow-sm hover:shadow-lg space-y-4 relative overflow-hidden"
                  >
                    {/* Top indicator bar */}
                    <div className={`absolute top-0 left-0 right-0 h-1.5 ${hasSanction ? 'bg-red-500' : 'bg-emerald-500'}`}></div>

                    <div className="flex items-start justify-between gap-3 pt-1">
                      <div className="flex items-center gap-3">
                        <img
                          src={s.photo_url || `https://i.pravatar.cc/150?u=${s.uid}`}
                          alt={s.name}
                          className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-100 dark:ring-slate-700 group-hover:scale-105 transition-transform"
                        />
                        <div>
                          <h3 className="text-sm font-black text-brand-900 dark:text-slate-100 group-hover:text-gold-600 dark:group-hover:text-gold-400 transition-colors">
                            {s.name}
                          </h3>
                          <p className="text-[11px] font-mono font-bold text-slate-400 dark:text-slate-500">
                            ID: {s.student_id}
                          </p>
                        </div>
                      </div>

                      {/* Sanction Badge */}
                      <div className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 ${
                        hasSanction 
                          ? 'bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800' 
                          : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                      }`}>
                        {hasSanction ? (
                          <>
                            <ShieldAlert size={14} />
                            <span>{hours}h Sanctions</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={14} />
                            <span>Cleared</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Department & Section */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl space-y-1.5 text-[11px]">
                      <div className="flex justify-between items-center font-bold text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1"><School size={12}/> {s.school_data?.department || 'Department'}</span>
                        <span className="text-brand-900 dark:text-white">{s.school_data?.section || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span>Attendance Rate</span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{s.stats?.attendance_rate || 100}%</span>
                      </div>
                    </div>

                    {/* Footer Action */}
                    <div className="flex items-center justify-between text-xs font-black text-gold-600 dark:text-gold-400 pt-1 group-hover:translate-x-0.5 transition-transform">
                      <span>Manage Record & Adjust Hours</span>
                      <ChevronRight size={16} />
                    </div>

                  </div>
                );
              })
            )}
          </div>

        </div>
      )}

      {/* TAB 2: EXCUSE APPLICATIONS QUEUE */}
      {activeTab === 'excuses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-brand-900 dark:text-slate-100 uppercase tracking-tight">Student Absence & Medical Excuse Queue</h2>
            <span className="text-xs text-slate-500 font-bold">{excuseApps.length} Total Submissions</span>
          </div>

          {excuseApps.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl text-center space-y-3 border border-slate-200 dark:border-slate-700">
              <FileCheck2 size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
              <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase">No Excuse Applications Filed</h3>
              <p className="text-xs text-slate-400">Submitted medical certificates and absence excuse letters will appear here for OSSA review.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {excuseApps.map((app) => (
                <div 
                  key={app.id}
                  className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Top status header */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        app.category === 'medical' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' :
                        app.category === 'institutional' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                        'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {app.category} Excuse
                      </span>

                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                        app.status === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300' :
                        app.status === 'approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                        'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                      }`}>
                        {app.status}
                      </span>
                    </div>

                    {/* Student Info */}
                    <div>
                      <h3 className="text-sm font-black text-brand-900 dark:text-slate-100">{app.student_name}</h3>
                      <p className="text-xs font-mono text-slate-400">ID: {app.student_id} • {app.department} ({app.section})</p>
                    </div>

                    {/* Event & Reason */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-2xl space-y-1 text-xs">
                      <p className="font-bold text-brand-900 dark:text-gold-400">Event: {app.event_title}</p>
                      <p className="text-slate-600 dark:text-slate-300 italic">"{app.reason}"</p>
                    </div>

                    {/* Proof Document Preview */}
                    {app.proof_url && (
                      <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-40 group">
                        <img src={app.proof_url} alt="Proof" className="w-full h-36 object-cover group-hover:scale-105 transition-transform" />
                        <a 
                          href={app.proof_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="absolute inset-0 bg-brand-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-2"
                        >
                          <ExternalLink size={16} /> Open Full Attachment
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Actions or Reviewed Status */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60">
                    {app.status === 'pending' ? (
                      <button
                        onClick={() => {
                          setSelectedExcuse(app);
                          setExcuseWaiveHours(2);
                          setExcuseNote('');
                        }}
                        className="w-full py-2.5 bg-brand-900 hover:bg-brand-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <FileCheck2 size={16} />
                        <span>Review & Decide Excuse</span>
                      </button>
                    ) : (
                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 space-y-1">
                        <p><span className="font-bold">Reviewed by:</span> {app.reviewed_by || 'OSSA'}</p>
                        {app.review_notes && <p><span className="font-bold">Note:</span> {app.review_notes}</p>}
                        {app.waived_hours ? <p className="text-emerald-600 dark:text-emerald-400 font-bold">Waived {app.waived_hours} sanction hours</p> : null}
                      </div>
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STUDENT FULL RECORD MODAL */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-brand-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-brand-950 via-brand-900 to-brand-950 p-5 text-white flex items-center justify-between border-b border-gold-400/30 shrink-0">
              <div className="flex items-center gap-3">
                <img 
                  src={selectedStudent.photo_url || `https://i.pravatar.cc/150?u=${selectedStudent.uid}`} 
                  alt={selectedStudent.name} 
                  className="w-12 h-12 rounded-2xl object-cover ring-2 ring-gold-400"
                />
                <div>
                  <h2 className="text-lg font-black uppercase tracking-tight">{selectedStudent.name}</h2>
                  <p className="text-xs font-mono text-gold-400 font-bold">ID: {selectedStudent.student_id} • {selectedStudent.school_data?.department}</p>
                </div>
              </div>

              <button 
                onClick={() => setSelectedStudent(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body Scrollable */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              
              {/* CURRENT SANCTION STATUS & QUICK ACTION BAR */}
              <div className="p-5 bg-slate-50 dark:bg-slate-800/80 rounded-3xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Current Sanction Balance</span>
                  <div className="flex items-baseline gap-2 justify-center sm:justify-start mt-0.5">
                    <span className={`text-3xl font-black ${
                      (selectedStudent.stats?.sanction_hours || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {selectedStudent.stats?.sanction_hours || 0}
                    </span>
                    <span className="text-xs font-bold text-slate-500">Sanction Hours</span>
                  </div>
                </div>

                {/* Control Mode Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => { setAdjustMode('deduct'); setAdjustHours(2); }}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow flex items-center gap-1.5 cursor-pointer"
                  >
                    <MinusCircle size={14} />
                    <span>Minus Hours</span>
                  </button>

                  <button
                    onClick={() => { setAdjustMode('add'); setAdjustHours(2); }}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle size={14} />
                    <span>Add Penalty</span>
                  </button>

                  <button
                    onClick={() => { setAdjustMode('clear'); setAdjustHours(0); }}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck size={14} />
                    <span>Resolve & Clear All</span>
                  </button>
                </div>
              </div>

              {/* ADJUSTMENT FORM MODE */}
              {adjustMode && (
                <form onSubmit={handleSanctionSubmit} className="p-4 bg-brand-900/10 dark:bg-brand-900/30 border border-brand-900/20 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-brand-900 dark:text-gold-400 tracking-wider">
                      {adjustMode === 'deduct' && 'Minus Sanction Hours'}
                      {adjustMode === 'add' && 'Issue Additional Penalty Hours'}
                      {adjustMode === 'clear' && 'Fully Resolve & Clear Student Sanctions'}
                    </h4>
                    <button type="button" onClick={() => setAdjustMode(null)} className="text-slate-400 hover:text-slate-600">
                      <X size={14} />
                    </button>
                  </div>

                  {adjustMode !== 'clear' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Hours to {adjustMode}:</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={adjustHours}
                        onChange={(e) => setAdjustHours(Number(e.target.value))}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Official Reason / OSSA Note:</label>
                    <input
                      type="text"
                      required
                      placeholder={
                        adjustMode === 'deduct' ? 'e.g. Rendered 2 hours SSG Community Clean-Up' :
                        adjustMode === 'add' ? 'e.g. Unexcused absence from University Convocation' :
                        'e.g. Completed all required community service tasks'
                      }
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setAdjustMode(null)}
                      className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-brand-900 hover:bg-brand-800 text-white text-xs font-black uppercase rounded-xl shadow"
                    >
                      Confirm Adjustment
                    </button>
                  </div>
                </form>
              )}

              {/* STUDENT PROFILE INFORMATION */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-2 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Academic Assignment</span>
                  <p><span className="font-bold">Level/Section:</span> {selectedStudent.school_data?.level || 'Grade 12'} - {selectedStudent.school_data?.section || 'Newton'}</p>
                  <p><span className="font-bold">Department:</span> {selectedStudent.school_data?.department || 'Senior High School'}</p>
                  <p><span className="font-bold">Track/Strand:</span> {selectedStudent.school_data?.track || 'Academic'} ({selectedStudent.school_data?.strand || 'STEM'})</p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-2 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Contact Details</span>
                  <p><span className="font-bold">Email:</span> {selectedStudent.email}</p>
                  <p><span className="font-bold">Guardian:</span> {selectedStudent.guardian?.name || 'On file'}</p>
                  <p><span className="font-bold">Contact:</span> {selectedStudent.guardian?.contact || '0917-123-4567'}</p>
                </div>
              </div>

              {/* SANCTION AUDIT LOG HISTORY FOR THIS STUDENT */}
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Sanction History & Action Log</h3>
                
                {(!studentDetails?.sanction_logs || studentDetails.sanction_logs.length === 0) ? (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-center text-slate-400 text-xs italic">
                    No sanction log history recorded for this student.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {studentDetails.sanction_logs.map((log: any, idx: number) => (
                      <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <p className="font-bold text-brand-900 dark:text-slate-100">{log.reason}</p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(log.timestamp).toLocaleString()} • Performed by: {log.performed_by || 'System'}
                          </p>
                        </div>
                        <span className={`font-mono font-black text-xs px-2.5 py-1 rounded-xl shrink-0 ${
                          log.change < 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                        }`}>
                          {log.change > 0 ? `+${log.change}h` : `${log.change}h`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-6 py-2.5 bg-brand-900 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-brand-800 transition-colors cursor-pointer"
              >
                Close Full Record
              </button>
            </div>

          </div>
        </div>
      )}

      {/* EXCUSE APPLICATION REVIEW MODAL */}
      {selectedExcuse && (
        <div className="fixed inset-0 z-50 bg-brand-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-brand-900 dark:text-slate-100 uppercase">Review Excuse Submission</h3>
              <button onClick={() => setSelectedExcuse(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p><span className="font-bold text-slate-500">Student:</span> {selectedExcuse.student_name} ({selectedExcuse.student_id})</p>
              <p><span className="font-bold text-slate-500">Event:</span> {selectedExcuse.event_title}</p>
              <p><span className="font-bold text-slate-500">Reason:</span> "{selectedExcuse.reason}"</p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Sanction Hours to Waive upon approval:</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={excuseWaiveHours}
                  onChange={(e) => setExcuseWaiveHours(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Director's Decision Note:</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Valid medical certificate verified with clinic."
                  value={excuseNote}
                  onChange={(e) => setExcuseNote(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3">
              <button
                onClick={() => handleReviewExcuse('rejected')}
                className="py-3 bg-red-100 hover:bg-red-200 text-red-700 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Reject Excuse
              </button>
              <button
                onClick={() => handleReviewExcuse('approved')}
                className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow cursor-pointer"
              >
                Approve & Waive Hours
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default OSSADashboard;
