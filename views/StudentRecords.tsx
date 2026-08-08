import React, { useState, useMemo } from 'react';
import { useAuth } from '../components/AuthContext';
import { 
  FileText, Search, Filter, CheckCircle2, Clock, XCircle, FileSpreadsheet, 
  Download, ShieldAlert, Award, Calendar, AlertCircle, ArrowUpRight, Sparkles
} from 'lucide-react';

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
    <div className="p-4 sm:p-5 max-w-6xl mx-auto space-y-4 animate-in fade-in duration-200">
      
      {/* HEADER & PDF EXPORT */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-gold-600 dark:text-gold-400 font-bold text-[10px] uppercase tracking-wider mb-0.5">
            <FileText size={14} /> Verified History
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-900 dark:text-slate-100 uppercase tracking-tight">Attendance & Sanction Records</h1>
          <p className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">Consolidated attendance history for mandatory campus events, ceremonies, and sanction hour balances.</p>
        </div>

        <button
          onClick={handleExportPDF}
          className="px-4 py-2 bg-brand-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-brand-800 active:scale-98 transition-all flex items-center justify-center gap-1.5 border border-gold-400/30 self-start md:self-auto shrink-0"
        >
          <Download size={15} className="text-gold-400" /> Export PDF Transcript
        </button>
      </div>

      {/* KPI METRICS OVERVIEW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <p className="text-[9px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Attendance Rate</p>
            <h3 className="text-lg font-bold text-brand-900 dark:text-slate-100">{stats.rate}%</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
            <Clock size={18} />
          </div>
          <div>
            <p className="text-[9px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Late Check-Ins</p>
            <h3 className="text-lg font-bold text-brand-900 dark:text-slate-100">{stats.lateCount}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center font-bold shrink-0">
            <XCircle size={18} />
          </div>
          <div>
            <p className="text-[9px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Unexcused Absences</p>
            <h3 className="text-lg font-bold text-brand-900 dark:text-slate-100">{stats.absentCount}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 flex items-center justify-center font-bold shrink-0">
            <ShieldAlert size={18} />
          </div>
          <div>
            <p className="text-[9px] font-extrabold text-red-500 dark:text-red-400 uppercase tracking-wider">Active Sanctions</p>
            <h3 className="text-lg font-bold text-red-700 dark:text-red-400">{stats.totalSanctionHours} Hours</h3>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input 
            type="text" 
            placeholder="Search event/ceremony title..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-9 pr-3 py-1.5"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field select-field py-1.5 cursor-pointer text-xs"
          >
            <option value="all">All Categories</option>
            <option value="Event">Events Only</option>
            <option value="Ceremony">Ceremonies Only</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field select-field py-1.5 cursor-pointer text-xs"
          >
            <option value="all">All Statuses</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="absent">Absent</option>
            <option value="excused">Excused</option>
          </select>
        </div>
      </div>

      {/* ATTENDANCE RECORDS TABLE */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
          <h2 className="text-sm font-black text-brand-900 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
            <Calendar size={18} className="text-gold-600 dark:text-gold-400" /> Attendance Ledger ({filteredRecords.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
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
      </div>

      {/* SANCTION RECORDS SECTION */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-red-50/50 dark:bg-red-950/30 flex items-center justify-between">
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
      </div>

    </div>
  );
};

export default StudentRecords;
