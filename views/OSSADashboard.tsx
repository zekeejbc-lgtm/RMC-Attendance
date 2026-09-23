import ProfileAvatar from '../components/ui/ProfileAvatar';
import { downloadCsv } from '../lib/export';
import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  FileCheck2,
  Filter,
  MinusCircle,
  PlusCircle,
  RotateCcw,
  School,
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { appData, documentUrl } from '../lib/backend';
import { ExcuseApplication, UserProfile, UserStats } from '../types';

const excuseCategoryClasses: Record<ExcuseApplication['category'], string> = {
  medical: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  personal: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  institutional: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  emergency: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
};

const excuseStatusClasses: Record<ExcuseApplication['status'], string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
};
import Button from '../components/ui/Button';
import { MetricCard, Page, PageHeader, Surface } from '../components/ui/Page';
import { Modal } from '../components/ui/Modal';
import CustomSelect from '../components/ui/CustomSelect';
import SearchInput from '../components/ui/SearchInput';
import { useAuth } from '../components/AuthContext';
import { hasPermission } from '../lib/accessControl';

interface StudentWithStats extends UserProfile {
  stats: UserStats;
  sanction_logs?: any[];
}

const OSSADashboard: React.FC = () => {
  const { profile } = useAuth();
  const canManageSanctions = hasPermission(profile?.role, 'directory.manage_student_sanctions', appData.getCustomRoles(), appData.getCoreRoles());
  const [students, setStudents] = useState<StudentWithStats[]>([]);
  const [excuseApps, setExcuseApps] = useState<ExcuseApplication[]>([]);
  const [activeTab, setActiveTab] = useState<'roster' | 'excuses'>('roster');
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [sanctionFilter, setSanctionFilter] = useState<'all' | 'has_sanctions' | 'cleared'>('all');
  const [selectedStudent, setSelectedStudent] = useState<StudentWithStats | null>(null);
  const [studentDetails, setStudentDetails] = useState<any>(null);
  const [adjustMode, setAdjustMode] = useState<'deduct' | 'add' | 'clear' | null>(null);
  const [adjustHours, setAdjustHours] = useState(1);
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustSuccess, setAdjustSuccess] = useState<string | null>(null);
  const [selectedExcuse, setSelectedExcuse] = useState<ExcuseApplication | null>(null);
  const [excuseWaiveHours, setExcuseWaiveHours] = useState(2);
  const [excuseNote, setExcuseNote] = useState('');
  const [excuseActionSuccess, setExcuseActionSuccess] = useState<string | null>(null);

  const loadData = () => {
    setStudents((profile && typeof appData.getVisibleStudents === 'function' ? appData.getVisibleStudents(profile.uid) : appData.getAllStudents()) as StudentWithStats[]);
    setExcuseApps(profile && typeof appData.getVisibleExcuseApplications === 'function' ? appData.getVisibleExcuseApplications(profile.uid) : appData.getExcuseApplications());

    if (selectedStudent) {
      const updatedDetail = appData.getUserDetail(selectedStudent.uid);
      setStudentDetails(updatedDetail);
      if (updatedDetail) setSelectedStudent((current) => current ? { ...current, stats: updatedDetail.stats } : null);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('rmc_data_update', loadData);
    return () => window.removeEventListener('rmc_data_update', loadData);
  }, []);

  const totalStudents = students.length;
  const studentsWithSanctions = students.filter((student) => (student.stats?.sanction_hours || 0) > 0);
  const clearedStudents = students.filter((student) => (student.stats?.sanction_hours || 0) === 0);
  const totalSanctionHours = students.reduce((total, student) => total + (student.stats?.sanction_hours || 0), 0);
  const pendingExcuseCount = excuseApps.filter((application) => application.status === 'pending').length;
  const departments = Array.from(new Set(students.map((student) => student.school_data?.department).filter(Boolean) as string[]));

  const filteredStudents = students.filter((student) => {
    const normalizedQuery = searchQuery.toLowerCase();
    const matchesSearch = [
      student.name,
      student.student_id,
      student.school_data?.section,
      student.email,
    ].some((value) => (value || '').toLowerCase().includes(normalizedQuery));
    const department = student.school_data?.department || '';
    const matchesDepartment = deptFilter === 'all' || department === deptFilter;
    const hours = student.stats?.sanction_hours || 0;
    const matchesSanction = sanctionFilter === 'all'
      || (sanctionFilter === 'has_sanctions' && hours > 0)
      || (sanctionFilter === 'cleared' && hours === 0);
    return matchesSearch && matchesDepartment && matchesSanction;
  });

  const sanctionStatusData = [
    { name: 'With Sanctions', value: studentsWithSanctions.length, color: '#dc2626' },
    { name: 'Cleared', value: clearedStudents.length, color: '#059669' },
  ];

  const departmentSanctionData = Array.from(
    students.reduce((totals, student) => {
      const department = student.school_data?.department || 'Unassigned';
      totals.set(department, (totals.get(department) || 0) + (student.stats?.sanction_hours || 0));
      return totals;
    }, new Map<string, number>()),
    ([department, hours]) => ({ department, hours }),
  );

  const openStudentModal = (student: StudentWithStats) => {
    setSelectedStudent(student);
    setStudentDetails(appData.getUserDetail(student.uid));
    setAdjustMode(null);
    setAdjustReason('');
    setAdjustHours(1);
    setAdjustSuccess(null);
  };

  const handleSanctionSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedStudent || !adjustMode) return;

    if (adjustMode === 'clear') {
      const note = adjustReason || 'Fully cleared and resolved by OSSA Director.';
      await appData.resolveStudentSanctions(selectedStudent.uid, note);
      setAdjustSuccess('Sanctions successfully cleared!');
    } else if (adjustMode === 'deduct') {
      if (adjustHours <= 0) return;
      const reason = adjustReason || 'Sanction hours deducted for completed service.';
      await appData.adjustSanctionHours(selectedStudent.uid, -adjustHours, reason);
      setAdjustSuccess(`Deducted ${adjustHours} sanction hours.`);
    } else {
      if (adjustHours <= 0) return;
      const reason = adjustReason || 'Additional sanction hours issued by OSSA.';
      await appData.adjustSanctionHours(selectedStudent.uid, adjustHours, reason);
      setAdjustSuccess(`Added ${adjustHours} sanction hours.`);
    }

    loadData();
    setAdjustMode(null);
    setAdjustReason('');
    setTimeout(() => setAdjustSuccess(null), 3500);
  };

  const handleReviewExcuse = async (status: 'approved' | 'rejected') => {
    if (!selectedExcuse) return;
    const note = excuseNote || (status === 'approved' ? 'Approved by OSSA Director.' : 'Rejected due to insufficient documentation.');
    const waived = status === 'approved' ? Number(excuseWaiveHours) : 0;
    await appData.reviewExcuseApplication(selectedExcuse.id, status, note, waived);
    setExcuseActionSuccess(`Application ${status.toUpperCase()} successfully.`);
    loadData();
    setSelectedExcuse(null);
    setExcuseNote('');
    setTimeout(() => setExcuseActionSuccess(null), 3500);
  };

  return (
    <Page className="max-w-7xl animate-in fade-in duration-300">
      <Surface className="dark relative overflow-hidden border-gold-400/30 bg-gradient-to-r from-brand-950 via-brand-900 to-brand-950 p-5 shadow-xl sm:p-6">
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-10 -right-10 h-64 w-64 rounded-full bg-gold-500/10 blur-3xl" />
        <PageHeader
          actions={(
            <>
              <Button aria-label="Refresh records" className="border-white/20 bg-white/10 text-white hover:bg-white/20 sm:w-auto" onClick={loadData} size="sm" variant="secondary"><RotateCcw size={14} /> Refresh</Button>
              <Button aria-label="Export roster CSV" className="sm:w-auto" onClick={() => downloadCsv('sanction-roster.csv', [['Student ID', 'Name', 'Section', 'Sanction hours'], ...students.map(s => [s.student_id, s.name, s.school_data.section, s.stats?.sanction_hours || 0])])} size="sm" variant="gold"><Download size={14} /> Export</Button>
            </>
          )}
          className="relative z-10 flex-col sm:flex-row"
          description="Comprehensive oversight of student discipline, sanction ledger, resolution controls, and excuse applications."
          eyebrow={<span className="inline-flex items-center gap-1"><ShieldCheck size={12} /> Office of Student Services and Affairs{pendingExcuseCount > 0 ? ` · ${pendingExcuseCount} Pending Excuses` : ''}</span>}
          title="OSSA Student Affairs & Sanctions Hub"
        />
      </Surface>

      <div aria-label="OSSA summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard detail="Registered in portal" icon={<Users size={20} />} label="Total Enrolled" value={totalStudents} />
        <MetricCard detail={`${totalStudents > 0 ? Math.round((studentsWithSanctions.length / totalStudents) * 100) : 0}% of students`} icon={<ShieldAlert size={20} />} label="With Sanctions" value={studentsWithSanctions.length} />
        <MetricCard detail="No active penalty" icon={<CheckCircle2 size={20} />} label="Cleared Status" value={clearedStudents.length} />
        <MetricCard detail="Accumulated system-wide" icon={<Clock size={20} />} label="Total Penalty Hours" value={totalSanctionHours} />
        <MetricCard detail="Medical / absence letters" icon={<FileCheck2 size={20} />} label="Excuse Applications" value={pendingExcuseCount} />
      </div>

      <Surface aria-labelledby="ossa-analytics-heading" className="p-4 sm:p-6">
        <h2 id="ossa-analytics-heading" className="text-sm font-black uppercase tracking-widest text-brand-900 dark:text-white">Sanction Analytics</h2>
        <div className="mt-4 grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="min-w-0"><h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Student Status</h3><div aria-label="Sanction status chart" className="h-64 min-h-64 min-w-0 w-full sm:h-72 sm:min-h-72" role="region"><ResponsiveContainer height="100%" initialDimension={{ width: 1, height: 256 }} minHeight={256} minWidth={0} width="100%"><PieChart><Pie data={sanctionStatusData} dataKey="value" innerRadius={50} outerRadius={88} paddingAngle={3}>{sanctionStatusData.map((entry) => <Cell fill={entry.color} key={entry.name} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div></div>
          <div className="min-w-0"><h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Outstanding Hours by Department</h3><div aria-label="Department sanction hours chart" className="h-64 min-h-64 min-w-0 w-full sm:h-72 sm:min-h-72" role="region"><ResponsiveContainer height="100%" initialDimension={{ width: 1, height: 256 }} minHeight={256} minWidth={0} width="100%"><BarChart data={departmentSanctionData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="department" interval={0} tickFormatter={(label: string) => label.length > 16 ? `${label.slice(0, 16)}…` : label} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="hours" fill="#D4AF37" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
        </div>
      </Surface>

      {adjustSuccess ? <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300" role="status"><span className="flex items-center gap-2"><CheckCircle2 size={18} />{adjustSuccess}</span><button aria-label="Dismiss sanction update" onClick={() => setAdjustSuccess(null)} type="button"><X size={14} /></button></div> : null}
      {excuseActionSuccess ? <div className="flex items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs font-bold text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300" role="status"><span className="flex items-center gap-2"><CheckCircle2 size={18} />{excuseActionSuccess}</span><button aria-label="Dismiss excuse update" onClick={() => setExcuseActionSuccess(null)} type="button"><X size={14} /></button></div> : null}

      <Surface className="p-2">
        <div aria-label="OSSA dashboard sections" className="flex max-w-full gap-2 overflow-x-auto" role="tablist">
          <button aria-controls="ossa-roster-panel" aria-label={`Sanction roster, ${filteredStudents.length} students`} aria-selected={activeTab === 'roster'} className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider ${activeTab === 'roster' ? 'bg-brand-900 text-white dark:bg-gold-400 dark:text-slate-950' : 'text-slate-600 dark:text-slate-300'}`} id="ossa-roster-tab" onClick={() => setActiveTab('roster')} role="tab" type="button"><span className="flex items-center gap-2"><Users size={16} /> Roster ({filteredStudents.length})</span></button>
          <button aria-controls="ossa-excuses-panel" aria-label={`Excuse applications${pendingExcuseCount > 0 ? `, ${pendingExcuseCount} pending` : ''}`} aria-selected={activeTab === 'excuses'} className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider ${activeTab === 'excuses' ? 'bg-brand-900 text-white dark:bg-gold-400 dark:text-slate-950' : 'text-slate-600 dark:text-slate-300'}`} id="ossa-excuses-tab" onClick={() => setActiveTab('excuses')} role="tab" type="button"><span className="flex items-center gap-2"><FileCheck2 size={16} /> Excuses{pendingExcuseCount > 0 ? ` (${pendingExcuseCount})` : ''}</span></button>
        </div>
      </Surface>

      {activeTab === 'roster' ? (
        <div aria-labelledby="ossa-roster-tab" className="space-y-4" id="ossa-roster-panel" role="tabpanel">
          <Surface aria-labelledby="ossa-filters-heading" className="p-4">
            <h2 className="sr-only" id="ossa-filters-heading">Student sanction filters</h2>
            <div className="flex flex-wrap items-end gap-3">
              <SearchInput ariaLabel="Search student sanctions" className="min-w-[16rem] flex-1" label="Search students" onChange={setSearchQuery} placeholder="Search student name, ID, section..." value={searchQuery} />
              <div className="min-w-[14rem] flex-1"><CustomSelect ariaLabel="Filter by department" combobox label="Department" onChange={(value) => setDeptFilter(value as string)} options={[{ value: 'all', label: 'All Departments' }, ...departments.map((department) => ({ value: department, label: department }))]} searchable value={deptFilter} /></div>
              <div aria-label="Filter by sanction status" className="flex max-w-full flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900" role="group">
                <button aria-pressed={sanctionFilter === 'all'} className={`rounded-lg px-3 py-2 text-xs font-black ${sanctionFilter === 'all' ? 'bg-brand-900 text-white dark:bg-gold-400 dark:text-slate-950' : 'text-slate-600 dark:text-slate-300'}`} onClick={() => setSanctionFilter('all')} type="button">All ({students.length})</button>
                <button aria-label={`With sanctions, ${studentsWithSanctions.length}`} aria-pressed={sanctionFilter === 'has_sanctions'} className={`rounded-lg px-3 py-2 text-xs font-black ${sanctionFilter === 'has_sanctions' ? 'bg-red-600 text-white' : 'text-red-600 dark:text-red-400'}`} onClick={() => setSanctionFilter('has_sanctions')} type="button">Active ({studentsWithSanctions.length})</button>
                <button aria-pressed={sanctionFilter === 'cleared'} className={`rounded-lg px-3 py-2 text-xs font-black ${sanctionFilter === 'cleared' ? 'bg-emerald-600 text-white' : 'text-emerald-600 dark:text-emerald-400'}`} onClick={() => setSanctionFilter('cleared')} type="button">Cleared ({clearedStudents.length})</button>
              </div>
            </div>
          </Surface>

          <Surface aria-labelledby="ossa-roster-heading" className="overflow-hidden">
            <div className="border-b border-slate-200 p-4 dark:border-slate-700 sm:p-5"><h2 className="text-sm font-black uppercase tracking-widest text-brand-900 dark:text-white" id="ossa-roster-heading">Student Sanction Roster</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{filteredStudents.length} matching student records</p></div>
            {filteredStudents.length === 0 ? <div className="p-8 text-center"><ShieldCheck className="mx-auto text-slate-300 dark:text-slate-600" size={36} /><h3 className="mt-3 text-sm font-black uppercase text-slate-700 dark:text-slate-200">No Matching Student Records Found</h3><p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">Try resetting search parameters or filters to view student accounts.</p></div> : (
              <>
                <div className="desktop-data-table overflow-x-auto"><table aria-label="Student sanction roster" className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-900 dark:text-slate-300"><tr><th className="px-5 py-3">Student</th><th className="px-5 py-3">Department / Section</th><th className="px-5 py-3">Attendance</th><th className="px-5 py-3">Sanction Status</th><th className="px-5 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y divide-slate-200 dark:divide-slate-700">{filteredStudents.map((student) => { const hours = student.stats?.sanction_hours || 0; return <tr key={student.uid}><td className="px-5 py-4"><p className="max-w-xs [overflow-wrap:anywhere] font-bold text-brand-900 dark:text-white">{student.name}</p><p className="font-mono text-xs text-slate-500">{student.student_id}</p></td><td className="px-5 py-4"><p className="max-w-xs [overflow-wrap:anywhere] font-semibold text-slate-700 dark:text-slate-200">{student.school_data?.department || 'Department'}</p><p className="text-xs text-slate-500">{student.school_data?.section || 'N/A'}</p></td><td className="px-5 py-4 font-bold text-emerald-600 dark:text-emerald-400">{student.stats?.attendance_rate || 100}%</td><td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${hours > 0 ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'}`}>{hours > 0 ? `${hours}h Sanctions` : 'Cleared'}</span></td><td className="px-5 py-4 text-right"><Button aria-label={`Manage ${student.name}`} className="ml-auto w-auto" onClick={() => openStudentModal(student)} size="sm" variant="secondary">Manage <ChevronRight size={14} /></Button></td></tr>; })}</tbody></table></div>
                <div className="space-y-3 p-4 md:hidden">{filteredStudents.map((student) => { const hours = student.stats?.sanction_hours || 0; return <article aria-label={`${student.name} sanction record`} className="mobile-data-card rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900" key={student.uid}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="[overflow-wrap:anywhere] font-bold text-brand-900 dark:text-white">{student.name}</h3><p className="font-mono text-xs text-slate-500">{student.student_id}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${hours > 0 ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'}`}>{hours > 0 ? `${hours}h Sanctions` : 'Cleared'}</span></div><div className="mt-3 rounded-xl bg-white p-3 text-xs dark:bg-slate-800"><p className="[overflow-wrap:anywhere] font-semibold text-slate-700 dark:text-slate-200"><School className="mr-1 inline" size={12} />{student.school_data?.department || 'Department'}</p><p className="mt-1 text-slate-500">Section: {student.school_data?.section || 'N/A'}</p><p className="mt-1 font-bold text-emerald-600 dark:text-emerald-400">Attendance Rate: {student.stats?.attendance_rate || 100}%</p></div><Button aria-label={`Manage ${student.name}`} className="mt-3" onClick={() => openStudentModal(student)} size="sm">Manage <ChevronRight size={14} /></Button></article>; })}</div>
              </>
            )}
          </Surface>
        </div>
      ) : (
        <Surface aria-labelledby="ossa-excuses-tab" className="p-4 sm:p-6" id="ossa-excuses-panel" role="tabpanel">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-black uppercase tracking-tight text-brand-900 dark:text-white">Student Absence & Medical Excuse Queue</h2><p className="mt-1 text-xs text-slate-500">Submitted medical certificates and absence excuse letters.</p></div><span className="text-xs font-bold text-slate-500">{excuseApps.length} Total Submissions</span></div>
          {excuseApps.length === 0 ? <div className="py-10 text-center"><FileCheck2 className="mx-auto text-slate-300 dark:text-slate-600" size={36} /><h3 className="mt-3 text-sm font-black uppercase text-slate-700 dark:text-slate-200">No Excuse Applications Filed</h3></div> : <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">{excuseApps.map((application) => <article aria-label={`${application.student_name} ${application.event_title} excuse`} className="flex min-w-0 flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900" key={application.id}><div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${excuseCategoryClasses[application.category]}`}>{application.category} Excuse</span><span className={`rounded-full px-2.5 py-1 text-xs font-black uppercase ${excuseStatusClasses[application.status]}`}>{application.status}</span></div><div><h3 className="[overflow-wrap:anywhere] text-sm font-black text-brand-900 dark:text-white">{application.student_name}</h3><p className="[overflow-wrap:anywhere] text-xs text-slate-500">ID: {application.student_id} · {application.department} ({application.section})</p></div><div className="rounded-xl bg-white p-3 text-xs dark:bg-slate-800"><p className="font-bold text-brand-900 dark:text-gold-400">Event: {application.event_title}</p><p className="mt-1 [overflow-wrap:anywhere] italic text-slate-600 dark:text-slate-300">“{application.reason}”</p></div>{application.proof_url ? <a className="inline-flex items-center gap-2 text-xs font-bold text-brand-900 underline dark:text-gold-400" href="#" onClick={async event => { event.preventDefault(); const url = await documentUrl(application.proof_url!); window.open(url, '_blank', 'noopener,noreferrer'); }} rel="noreferrer" target="_blank"><ExternalLink size={14} /> Open Full Attachment</a> : null}</div><div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">{application.status === 'pending' ? <Button aria-label="Review and decide excuse" onClick={() => { setSelectedExcuse(application); setExcuseWaiveHours(2); setExcuseNote(''); }} size="sm"><FileCheck2 size={16} /> Review</Button> : <div className="space-y-1 text-xs text-slate-500"><p><strong>Reviewed by:</strong> {application.reviewed_by || 'OSSA'}</p>{application.review_notes ? <p className="[overflow-wrap:anywhere]"><strong>Note:</strong> {application.review_notes}</p> : null}{application.waived_hours ? <p className="font-bold text-emerald-600">Waived {application.waived_hours} sanction hours</p> : null}</div>}</div></article>)}</div>}
        </Surface>
      )}

      <Modal
        footer={<Button aria-label="Close full record" className="sm:w-auto" onClick={() => setSelectedStudent(null)}>Close</Button>}
        onClose={() => setSelectedStudent(null)}
        open={Boolean(selectedStudent)}
        size="lg"
        title={`Student Full Record — ${selectedStudent?.name || ''}`}
      >
        {selectedStudent ? <div className="space-y-5">
          <div className="flex min-w-0 items-center gap-3"><ProfileAvatar alt={selectedStudent.name} className="h-12 w-12 shrink-0 rounded-2xl object-cover ring-2 ring-gold-400" src={selectedStudent.photo_url || '/avatar-placeholder.svg'} /><div className="min-w-0"><p className="[overflow-wrap:anywhere] font-black text-brand-900 dark:text-white">{selectedStudent.name}</p><p className="[overflow-wrap:anywhere] text-xs text-slate-500">ID: {selectedStudent.student_id} · {selectedStudent.school_data?.department}</p></div></div>
          <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center"><div><span className="text-xs font-black uppercase tracking-wider text-slate-500">Current Sanction Balance</span><p className="mt-1 text-3xl font-black text-brand-900 dark:text-white">{selectedStudent.stats?.sanction_hours || 0} <span className="text-sm text-slate-500">Sanction Hours</span></p></div><div className="flex flex-wrap gap-2">{canManageSanctions ? <><Button aria-label="Subtract sanction hours" className="w-auto" onClick={() => { setAdjustMode('deduct'); setAdjustHours(2); }} size="sm" variant="secondary"><MinusCircle size={14} /> Subtract</Button><Button aria-label="Add penalty hours" className="w-auto" onClick={() => { setAdjustMode('add'); setAdjustHours(2); }} size="sm" variant="gold"><PlusCircle size={14} /> Add</Button><Button aria-label="Resolve and clear all sanctions" className="w-auto" onClick={() => { setAdjustMode('clear'); setAdjustHours(0); }} size="sm"><ShieldCheck size={14} /> Clear</Button></> : null}</div></div>
          {adjustMode ? <form className="space-y-3 rounded-2xl border border-brand-900/20 bg-brand-900/5 p-4 dark:bg-brand-900/30" onSubmit={handleSanctionSubmit}><div className="flex items-center justify-between gap-3"><h3 className="text-xs font-black uppercase tracking-wider text-brand-900 dark:text-gold-400">{adjustMode === 'deduct' ? 'Minus Sanction Hours' : adjustMode === 'add' ? 'Issue Additional Penalty Hours' : 'Fully Resolve & Clear Student Sanctions'}</h3><button aria-label="Cancel adjustment" onClick={() => setAdjustMode(null)} type="button"><X size={14} /></button></div>{adjustMode !== 'clear' ? <div className="space-y-1.5"><label className="text-xs font-bold text-slate-500" htmlFor="ossa-adjust-hours">Hours to {adjustMode}</label><input className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-white" id="ossa-adjust-hours" max="100" min="1" onChange={(event) => setAdjustHours(Number(event.target.value))} type="number" value={adjustHours} /></div> : null}<div className="space-y-1.5"><label className="text-xs font-bold text-slate-500" htmlFor="ossa-adjust-reason">Official Reason / OSSA Note</label><input className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-white" id="ossa-adjust-reason" onChange={(event) => setAdjustReason(event.target.value)} placeholder={adjustMode === 'deduct' ? 'e.g. Rendered 2 hours SSG Community Clean-Up' : adjustMode === 'add' ? 'e.g. Unexcused absence from University Convocation' : 'e.g. Completed all required community service tasks'} required type="text" value={adjustReason} /></div><div className="flex flex-col gap-2 sm:flex-row sm:justify-end"><Button className="sm:w-auto" onClick={() => setAdjustMode(null)} size="sm" variant="secondary">Cancel</Button><Button aria-label="Confirm adjustment" className="sm:w-auto" size="sm" type="submit">Confirm</Button></div></form> : null}
          <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900"><h3 className="font-black uppercase tracking-wider text-slate-500">Academic Assignment</h3><p className="mt-2 [overflow-wrap:anywhere]"><strong>Level/Section:</strong> {selectedStudent.school_data?.level || 'Grade 12'} - {selectedStudent.school_data?.section || 'Newton'}</p><p className="mt-1 [overflow-wrap:anywhere]"><strong>Department:</strong> {selectedStudent.school_data?.department || 'Senior High School'}</p><p className="mt-1 [overflow-wrap:anywhere]"><strong>Track/Strand:</strong> {selectedStudent.school_data?.track || 'Academic'} ({selectedStudent.school_data?.strand || 'STEM'})</p></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900"><h3 className="font-black uppercase tracking-wider text-slate-500">Contact Details</h3><p className="mt-2 [overflow-wrap:anywhere]"><strong>Email:</strong> {selectedStudent.email}</p><p className="mt-1 [overflow-wrap:anywhere]"><strong>Guardian:</strong> {selectedStudent.guardian?.name || 'On file'}</p><p className="mt-1"><strong>Contact:</strong> {selectedStudent.guardian?.contact || '0917-123-4567'}</p></div></div>
          <div><h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Sanction History & Action Log</h3>{!studentDetails?.sanction_logs?.length ? <div className="mt-2 rounded-2xl bg-slate-50 p-4 text-center text-xs italic text-slate-500 dark:bg-slate-900">No sanction log history recorded for this student.</div> : <div className="mt-2 space-y-2">{studentDetails.sanction_logs.map((log: any, index: number) => <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-900" key={index}><div className="min-w-0"><p className="[overflow-wrap:anywhere] font-bold text-brand-900 dark:text-white">{log.reason}</p><p className="text-slate-500">{new Date(log.timestamp).toLocaleString()} · Performed by: {log.performed_by || 'System'}</p></div><span className="shrink-0 font-mono font-black">{log.change > 0 ? `+${log.change}h` : `${log.change}h`}</span></div>)}</div>}</div>
        </div> : null}
      </Modal>

      <Modal
        footer={<><Button aria-label="Reject excuse" className="sm:w-auto" onClick={() => handleReviewExcuse('rejected')} variant="secondary">Reject</Button><Button aria-label="Approve & waive hours" className="sm:w-auto" onClick={() => handleReviewExcuse('approved')}>Approve</Button></>}
        onClose={() => setSelectedExcuse(null)}
        open={Boolean(selectedExcuse)}
        size="md"
        title="Review Excuse Submission"
      >
        {selectedExcuse ? <div className="space-y-4"><div className="space-y-2 text-sm"><p className="[overflow-wrap:anywhere]"><strong className="text-slate-500">Student:</strong> {selectedExcuse.student_name} ({selectedExcuse.student_id})</p><p className="[overflow-wrap:anywhere]"><strong className="text-slate-500">Event:</strong> {selectedExcuse.event_title}</p><p className="[overflow-wrap:anywhere]"><strong className="text-slate-500">Reason:</strong> “{selectedExcuse.reason}”</p></div><div className="space-y-1.5"><label className="text-xs font-bold text-slate-500" htmlFor="ossa-waive-hours">Sanction Hours to Waive upon approval</label><input className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-white" id="ossa-waive-hours" max="50" min="0" onChange={(event) => setExcuseWaiveHours(Number(event.target.value))} type="number" value={excuseWaiveHours} /></div><div className="space-y-1.5"><label className="text-xs font-bold text-slate-500" htmlFor="ossa-excuse-note">Director's Decision Note</label><textarea className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-white" id="ossa-excuse-note" onChange={(event) => setExcuseNote(event.target.value)} placeholder="e.g. Valid medical certificate verified with clinic." rows={3} value={excuseNote} /></div></div> : null}
      </Modal>
    </Page>
  );
};

export default OSSADashboard;

