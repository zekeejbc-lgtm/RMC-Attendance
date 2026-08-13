import React, { useState, useMemo } from 'react';
import { useAuth } from '../components/AuthContext';
import { 
  FileText, Search, Filter, CheckCircle2, Clock, XCircle, FileSpreadsheet, 
  Download, ShieldAlert, Award, Calendar, AlertCircle, ArrowUpRight, Sparkles
} from 'lucide-react';
import Button from '../components/ui/Button';
import { MetricCard, Page, PageHeader, Surface } from '../components/ui/Page';

interface AttendanceRecord {
  id: string;
  title: string;
  category: 'Event' | 'Ceremony';
  date: string;
  timeIn: string;
  status: 'present' | 'late' | 'absent' | 'excused';
  scannedBy: string;
  sanctionIncurred?: number; // hours
}

interface SanctionEntry {
  id: string;
  reason: string;
  hours: number;
  dateAssigned: string;
  status: 'active' | 'resolved' | 'waived';
  approvedBy: string;
}

const MOCK_ATTENDANCE_RECORDS: AttendanceRecord[] = [
  {
    id: 'r1',
    title: 'Weekly Institutional Flag Raising Ceremony',
    category: 'Ceremony',
    date: '2026-07-27',
    timeIn: '07:05 AM',
    status: 'present',
    scannedBy: 'Section Mayor (John Santos)'
  },
  {
    id: 'r2',
    title: 'University Midyear Leadership Convocation',
    category: 'Event',
    date: '2026-07-24',
    timeIn: '08:45 AM',
    status: 'late',
    scannedBy: 'SSG Officer (Maria Clara)',
    sanctionIncurred: 1
  },
  {
    id: 'r3',
    title: 'Disaster Risk & Safety Drill',
    category: 'Event',
    date: '2026-07-16',
    timeIn: 'N/A',
    status: 'absent',
    scannedBy: 'System Auto-Log',
    sanctionIncurred: 4
  },
  {
    id: 'r4',
    title: 'Monthly Flag Lowering & Retreat Ceremony',
    category: 'Ceremony',
    date: '2026-06-26',
    timeIn: '04:35 PM',
    status: 'present',
    scannedBy: 'Section Mayor (John Santos)'
  },
  {
    id: 'r5',
    title: 'First Semester General Assembly 2025',
    category: 'Event',
    date: '2026-06-12',
    timeIn: 'N/A',
    status: 'excused',
    scannedBy: 'Student Affairs (Approved Excuse Letter)'
  }
];

const MOCK_SANCTIONS: SanctionEntry[] = [
  {
    id: 's1',
    reason: 'Unexcused Absence - Disaster Risk & Safety Drill',
    hours: 4,
    dateAssigned: '2026-07-16',
    status: 'active',
    approvedBy: 'Prefect of Discipline'
  },
  {
    id: 's2',
    reason: 'Tardy Arrival - Midyear Leadership Convocation',
    hours: 1,
    dateAssigned: '2026-07-24',
    status: 'active',
    approvedBy: 'SSG Discipline Head'
  },
  {
    id: 's3',
    reason: 'Campus Library Community Service (Resolved)',
    hours: -3,
    dateAssigned: '2026-07-20',
    status: 'resolved',
    approvedBy: 'Head Librarian'
  }
];

const StudentRecords: React.FC = () => {
  const { profile } = useAuth();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredRecords = useMemo(() => {
    return MOCK_ATTENDANCE_RECORDS.filter(record => {
      const matchesSearch = record.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            record.scannedBy.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' ? true : record.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' ? true : record.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [searchTerm, statusFilter, categoryFilter]);

  // Statistics
  const stats = useMemo(() => {
    const presentCount = MOCK_ATTENDANCE_RECORDS.filter(r => r.status === 'present').length;
    const lateCount = MOCK_ATTENDANCE_RECORDS.filter(r => r.status === 'late').length;
    const absentCount = MOCK_ATTENDANCE_RECORDS.filter(r => r.status === 'absent').length;
    const excusedCount = MOCK_ATTENDANCE_RECORDS.filter(r => r.status === 'excused').length;
    const total = MOCK_ATTENDANCE_RECORDS.length;
    const rate = Math.round(((presentCount + lateCount * 0.8 + excusedCount) / total) * 100) || 100;
    const totalSanctionHours = MOCK_SANCTIONS.filter(s => s.status === 'active').reduce((acc, curr) => acc + curr.hours, 0);
    return { presentCount, lateCount, absentCount, excusedCount, rate, totalSanctionHours };
  }, []);

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>RMC Attendance & Sanction Official Transcript - ${profile?.student_id}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 40px; color: #0E1B42; }
            .header { text-align: center; border-bottom: 3px solid #D4AF37; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
            .header p { margin: 5px 0 0; color: #64748B; font-size: 14px; font-weight: bold; }
            .profile-box { background: #F8FAFC; padding: 20px; border-radius: 12px; margin-bottom: 30px; display: grid; grid-template-cols: 1fr 1fr; gap: 10px; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
            th, td { border: 1px solid #E2E8F0; padding: 10px; text-align: left; }
            th { background: #0E1B42; color: white; text-transform: uppercase; font-size: 11px; }
            .status-present { color: #16A34A; font-weight: bold; }
            .status-late { color: #D97706; font-weight: bold; }
            .status-absent { color: #DC2626; font-weight: bold; }
            .status-excused { color: #2563EB; font-weight: bold; }
            .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Rizal Memorial Colleges</h1>
            <p>PROJECT REGALIA • OFFICIAL STUDENT ATTENDANCE TRANSCRIPT</p>
          </div>

          <div class="profile-box">
            <div><strong>Student Name:</strong> ${profile?.name}</div>
            <div><strong>Student ID:</strong> ${profile?.student_id}</div>
            <div><strong>Department:</strong> ${profile?.school_data?.department}</div>
            <div><strong>Section:</strong> ${profile?.school_data?.section}</div>
            <div><strong>Attendance Rate:</strong> ${stats.rate}%</div>
            <div><strong>Active Sanction Hours:</strong> ${stats.totalSanctionHours} Hours</div>
          </div>

          <h3>Official Attendance Log</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Activity / Ceremony Title</th>
                <th>Category</th>
                <th>Time-In</th>
                <th>Status</th>
                <th>Verifier / Logger</th>
              </tr>
            </thead>
            <tbody>
              ${MOCK_ATTENDANCE_RECORDS.map(r => `
                <tr>
                  <td>${r.date}</td>
                  <td>${r.title}</td>
                  <td>${r.category}</td>
                  <td>${r.timeIn}</td>
                  <td class="status-${r.status}">${r.status.toUpperCase()}</td>
                  <td>${r.scannedBy}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <h3 style="margin-top: 30px;">Sanctions & Demerits Ledger</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Reason / Infraction</th>
                <th>Sanction Value</th>
                <th>Status</th>
                <th>Authorizing Official</th>
              </tr>
            </thead>
            <tbody>
              ${MOCK_SANCTIONS.map(s => `
                <tr>
                  <td>${s.dateAssigned}</td>
                  <td>${s.reason}</td>
                  <td>${s.hours > 0 ? `+${s.hours} Hours` : `${s.hours} Hours`}</td>
                  <td>${s.status.toUpperCase()}</td>
                  <td>${s.approvedBy}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            Generated from RMC Project Regalia System on ${new Date().toLocaleString()} • Certified Official Electronic Record
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <Page className="max-w-6xl animate-in fade-in duration-200">
      
      {/* HEADER & PDF EXPORT */}
      <PageHeader
        eyebrow={<span className="inline-flex items-center gap-1.5"><FileText size={14} /> Verified History</span>}
        title="Attendance & Sanction Records"
        description="Consolidated attendance history for mandatory campus events, ceremonies, and sanction hour balances."
        actions={
          <div className="w-[calc(100vw-2rem)] max-w-full sm:w-auto">
            <Button onClick={handleExportPDF} className="border border-gold-400/30 uppercase tracking-wider sm:w-auto">
              <Download size={15} className="text-gold-400" /> Export PDF Transcript
            </Button>
          </div>
        }
      />

      {/* KPI METRICS OVERVIEW */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Attendance summary">
        <MetricCard icon={<CheckCircle2 size={20} />} label="Attendance Rate" value={`${stats.rate}%`} detail="Present, late, and excused" />
        <MetricCard icon={<Clock size={20} />} label="Late Check-Ins" value={stats.lateCount} detail="Recorded tardy arrivals" />
        <MetricCard icon={<XCircle size={20} />} label="Unexcused Absences" value={stats.absentCount} detail="Attendance violations" />
        <MetricCard icon={<ShieldAlert size={20} />} label="Active Sanctions" value={`${stats.totalSanctionHours} Hours`} detail="Community service balance" />
      </div>

      {/* SEARCH AND FILTERS */}
      <Surface className="flex flex-col items-stretch justify-between gap-3 p-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <label htmlFor="record-search" className="sr-only">Search attendance records</label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input 
            id="record-search"
            type="search"
            placeholder="Search event/ceremony title..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field py-2 pl-9 pr-3 text-base sm:text-sm"
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label htmlFor="record-category" className="sr-only">Filter by category</label>
          <select
            id="record-category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field select-field cursor-pointer py-2 text-base sm:text-sm"
          >
            <option value="all">All Categories</option>
            <option value="Event">Events Only</option>
            <option value="Ceremony">Ceremonies Only</option>
          </select>

          <label htmlFor="record-status" className="sr-only">Filter by status</label>
          <select
            id="record-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field select-field cursor-pointer py-2 text-base sm:text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="absent">Absent</option>
            <option value="excused">Excused</option>
          </select>
        </div>
      </Surface>

      {/* ATTENDANCE RECORDS TABLE */}
      <Surface className="overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
          <h2 className="text-sm font-black text-brand-900 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
            <Calendar size={18} className="text-gold-600 dark:text-gold-400" /> Attendance Ledger ({filteredRecords.length})
          </h2>
        </div>

        <div className="mobile-data-card space-y-3 p-4" aria-label="Mobile attendance ledger">
          {filteredRecords.map(record => (
            <article
              key={record.id}
              aria-labelledby={`mobile-record-${record.id}`}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <time className="font-mono text-sm font-bold text-slate-500 dark:text-slate-400" dateTime={record.date}>{record.date}</time>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${
                  record.status === 'present' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-400' :
                  record.status === 'late' ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/60 dark:text-amber-400' :
                  record.status === 'absent' ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800/60 dark:bg-red-950/60 dark:text-red-400' :
                  'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/60 dark:text-blue-400'
                }`}>
                  {record.status === 'present' && <CheckCircle2 size={12} />}
                  {record.status === 'late' && <Clock size={12} />}
                  {record.status === 'absent' && <XCircle size={12} />}
                  {record.status === 'excused' && <FileText size={12} />}
                  {record.status === 'late' ? `Late (+${record.sanctionIncurred}h)` : record.status === 'absent' ? `Unexcused (+${record.sanctionIncurred}h)` : record.status}
                </span>
              </div>
              <div className="mt-3">
                <h3 id={`mobile-record-${record.id}`} className="text-sm font-black uppercase tracking-tight text-brand-900 dark:text-slate-100">{record.title}</h3>
                <p className="mt-1 text-xs font-bold text-gold-700 dark:text-gold-300">{record.category}</p>
              </div>
              <dl className="mt-3 grid gap-2 border-t border-slate-200 pt-3 text-xs dark:border-slate-700">
                <div className="flex items-start justify-between gap-3">
                  <dt className="font-semibold text-slate-500 dark:text-slate-400">Time-In</dt>
                  <dd className="font-mono font-bold text-slate-700 dark:text-slate-200">{record.timeIn}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 font-semibold text-slate-500 dark:text-slate-400">Verified By</dt>
                  <dd className="min-w-0 text-right font-medium text-slate-600 [overflow-wrap:anywhere] dark:text-slate-300">{record.scannedBy}</dd>
                </div>
              </dl>
            </article>
          ))}
          {filteredRecords.length === 0 ? <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">No attendance records match these filters.</p> : null}
        </div>

        <div className="desktop-data-table overflow-x-auto">
          <table className="w-full border-collapse text-left" aria-label="Attendance ledger">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50/50 dark:bg-slate-900/30">
                <th className="p-4 pl-6">Date</th>
                <th className="p-4">Activity Title</th>
                <th className="p-4">Type</th>
                <th className="p-4">Time-In</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6">Verified By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
              {filteredRecords.map(record => (
                <tr key={record.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors">
                  <td className="p-4 pl-6 font-mono font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">{record.date}</td>
                  <td className="p-4 font-black text-brand-900 dark:text-slate-100 uppercase tracking-tight">{record.title}</td>
                  <td className="p-4 whitespace-nowrap">
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                      {record.category}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">{record.timeIn}</td>
                  <td className="p-4 whitespace-nowrap">
                    {record.status === 'present' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 size={12} /> Present
                      </span>
                    )}
                    {record.status === 'late' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 px-2.5 py-0.5 rounded-full">
                        <Clock size={12} /> Late (+{record.sanctionIncurred}h)
                      </span>
                    )}
                    {record.status === 'absent' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/60 px-2.5 py-0.5 rounded-full">
                        <XCircle size={12} /> Unexcused (+{record.sanctionIncurred}h)
                      </span>
                    )}
                    {record.status === 'excused' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 px-2.5 py-0.5 rounded-full">
                        <FileText size={12} /> Excused
                      </span>
                    )}
                  </td>
                  <td className="p-4 pr-6 text-slate-500 dark:text-slate-400 font-medium text-[11px] whitespace-nowrap">{record.scannedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Surface>

      {/* SANCTION RECORDS SECTION */}
      <Surface className="overflow-hidden">
        <div className="flex flex-col items-start justify-between gap-3 border-b border-slate-200 bg-red-50/50 p-5 dark:border-slate-700 dark:bg-red-950/30 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <ShieldAlert size={20} className="text-red-600 dark:text-red-400" />
            <h2 className="text-sm font-black text-red-900 dark:text-red-300 uppercase tracking-widest">Sanctions & Demerits Ledger</h2>
          </div>
          <span className="text-xs font-bold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/50 px-3 py-1 rounded-full">
            Active Balance: {stats.totalSanctionHours} Hours
          </span>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {MOCK_SANCTIONS.map(sanc => (
              <div 
                key={sanc.id}
                className={`p-5 rounded-2xl border ${
                  sanc.status === 'active' ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50' : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-md ${
                    sanc.status === 'active' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                  }`}>
                    {sanc.status}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">{sanc.dateAssigned}</span>
                </div>

                <h4 className="text-xs font-black text-brand-900 dark:text-slate-100 uppercase tracking-tight">{sanc.reason}</h4>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-2">
                  Impact: <span className={sanc.hours > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>
                    {sanc.hours > 0 ? `+${sanc.hours} Hours` : `${sanc.hours} Hours`}
                  </span>
                </p>

                <p className="text-[10px] text-slate-400 dark:text-slate-400 font-medium mt-1">Authorized by: {sanc.approvedBy}</p>
              </div>
            ))}
          </div>
        </div>
      </Surface>

    </Page>
  );
};

export default StudentRecords;
